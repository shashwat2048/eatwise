export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No file" }), { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY as string | undefined;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing GOOGLE_API_KEY" }), { status: 500 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const prompt = "You are given an image of a food product label. Carefully extract all the text from the label, especially the ingredients and nutritional information.  \n\nYou are a nutrition analysis assistant for a health app called EatWise.  \n\nYour job is to analyze food label text and return structured, accurate results.  \n\nList the ingredients clearly.  \nIdentify any common allergens (nuts, milk, soy, gluten, eggs, shellfish).  \nHighlight harmful additives/preservatives if present.  \nSummarize nutrition (calories, protein, fat, sugar, fiber, etc.).  \nGive a short health analysis for weight loss, muscle gain, and wellness.  \n\nReturn result in JSON with fields:  \n- ingredients (array of strings)  \n- allergens (array of strings)  \n- nutrition (object)  \n- health_analysis (string)";
    const body = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: file.type || "image/jpeg", data: base64 } },
          ],
        },
      ],
      generationConfig: { temperature: 0 },
    };

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: "Gemini request failed", details: text }), { status: 502 });
    }

    const data = (await resp.json()) as any;
    const combinedText = extractTextFromGeminiResponse(data);
    const parsed = parseStructuredResult(combinedText);

    const ingredients = parsed.ingredients || [];
    const allergens = parsed.allergens || [];
    const nutrition = parsed.nutrition || {};
    const health_analysis = parsed.health_analysis || "";

    const { score, explanation, allergyHits, userDbId } = await evaluateCompatibility(req, ingredients);

    // Persist report if user is logged in (save into Report model)
    let saved = false;
    try {
      if (userDbId) {
        await db.report.create({
          data: {
            userId: userDbId,
            title: "Food Label Analysis",
            content: JSON.stringify({ ingredients, allergens: allergyHits.length ? allergyHits : allergens, nutrition, health_analysis, explanation }),
          },
        });
        saved = true;
      }
    } catch (e) {
      console.error("Failed to save analysis report", e);
    }

    return new Response(JSON.stringify({ ingredients, allergens, nutrition, health_analysis, explanation, allergyHits, saved }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Failed" }), { status: 500 });
  }
}

function parseIngredientsFromText(text: string): string[] {
  if (!text) return [];

  // Try direct JSON parse first
  const tryParse = (s: string) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  // Extract JSON block if wrapped in code fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    const obj = tryParse(fenceMatch[1].trim());
    const arr = coerceToArray(obj);
    if (arr) return arr;
  }

  // Find first JSON array in text
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    const obj = tryParse(arrayMatch[0]);
    const arr = coerceToArray(obj);
    if (arr) return arr;
  }

  // Parse object form like {"ingredients": [...]}
  const obj = tryParse(text);
  const arr = coerceToArray(obj);
  if (arr) return arr;

  // Fallback: split lines
  return text
    .split(/\r?\n|,/) 
    .map((s: string) => s.trim())
    .filter(Boolean);
}

function coerceToArray(obj: any): string[] | null {
  if (Array.isArray(obj)) {
    return obj.map(String).map((s: string) => s.trim()).filter(Boolean);
  }
  if (obj && Array.isArray(obj.ingredients)) {
    return obj.ingredients.map(String).map((s: string) => s.trim()).filter(Boolean);
  }
  return null;
}

// --- Compatibility evaluation ---
import { getAuth } from "@clerk/nextjs/server";
import db from "@/services/prisma";

async function evaluateCompatibility(req: Request, ingredients: string[]) {
  const lowerIngredients = ingredients.map((s) => s.toLowerCase());
  let score = 100;
  const notes: string[] = [];
  const { userId } = getAuth(req as any);

  let allergies: string[] = [];
  let fitnessGoal: string | null = null;
  let userDbId: string | null = null;
  try {
    if (userId) {
      const user = await db.user.findUnique({ where: { clerkId: userId } });
      allergies = user?.allergies ?? [];
      fitnessGoal = user?.fitnessGoal ?? null;
      userDbId = user?.id ?? null;
    }
  } catch {}

  // Allergy cross-check
  const allergyHits: string[] = [];
  for (const allergy of allergies) {
    const a = allergy.toLowerCase();
    const hit = lowerIngredients.find((ing) => ing.includes(a));
    if (hit) {
      allergyHits.push(allergy);
    }
  }
  if (allergyHits.length > 0) {
    const penalty = Math.min(60, allergyHits.length * 30);
    score -= penalty;
    notes.push(`Allergy risk: ${allergyHits.join(", ")}`);
  }

  // Fitness goal heuristics
  const sugarKeywords = [
    "sugar",
    "sucrose",
    "glucose",
    "fructose",
    "dextrose",
    "corn syrup",
    "high fructose corn syrup",
    "maltose",
    "molasses",
    "syrup",
  ];
  const proteinKeywords = [
    "protein",
    "whey",
    "casein",
    "pea protein",
    "soy protein",
    "egg",
    "albumin",
  ];
  const hasSugar = lowerIngredients.some((ing) => sugarKeywords.some((k) => ing.includes(k)));
  const hasProtein = lowerIngredients.some((ing) => proteinKeywords.some((k) => ing.includes(k)));

  if (fitnessGoal === "weight_loss") {
    if (hasSugar) {
      score -= 20;
      notes.push("Contains added sugars; not ideal for weight loss");
    }
  } else if (fitnessGoal === "muscle_gain") {
    if (hasProtein) {
      score += 10;
      notes.push("Protein sources detected; supportive for muscle gain");
    } else {
      score -= 10;
      notes.push("Low protein indicators; less supportive for muscle gain");
    }
  } else if (fitnessGoal === "endurance") {
    if (hasSugar) {
      score -= 10;
      notes.push("Added sugars present; may not be ideal for overall nutrition");
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const explanation = notes.length ? notes.join(". ") : "No major concerns detected";
  return { score, explanation, allergyHits, userDbId };
}

function extractTextFromGeminiResponse(data: any): string {
  const textParts: string[] = [];
  try {
    const candidates = data?.candidates || [];
    for (const c of candidates) {
      const parts = c?.content?.parts || [];
      for (const p of parts) {
        if (typeof p?.text === "string") textParts.push(p.text);
      }
    }
  } catch {}
  return textParts.join("\n");
}

function parseStructuredResult(text: string): { ingredients?: string[]; allergens?: string[]; nutrition?: Record<string, any>; health_analysis?: string } {
  if (!text) return {};
  const tryParse = (s: string) => {
    try { return JSON.parse(s); } catch { return null; }
  };
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fence) {
    const obj = tryParse(fence.trim());
    if (obj) return coerceStructured(obj);
  }
  const arrMatch = text.match(/\{[\s\S]*\}/);
  if (arrMatch) {
    const obj = tryParse(arrMatch[0]);
    if (obj) return coerceStructured(obj);
  }
  // Fallback to just ingredients list parsing
  return { ingredients: parseIngredientsFromText(text) };
}

function coerceStructured(obj: any) {
  const ingredients = Array.isArray(obj?.ingredients) ? obj.ingredients.map(String).map((s: string)=>s.trim()).filter(Boolean) : [];
  const allergens = Array.isArray(obj?.allergens) ? obj.allergens.map(String).map((s: string)=>s.trim()).filter(Boolean) : [];
  const nutrition = obj?.nutrition && typeof obj.nutrition === 'object' ? obj.nutrition : {};
  const health_analysis = typeof obj?.health_analysis === 'string' ? obj.health_analysis : '';
  return { ingredients, allergens, nutrition, health_analysis };
}


