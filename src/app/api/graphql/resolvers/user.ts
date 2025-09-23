import db from "@/services/prisma"
import { uploadImageBase64 } from "@/services/cloudinary"
import { getAuth } from "@clerk/nextjs/server"

export async function me(_: any, __: any, context: { auth?: { userId?: string } }) {
    try {
        const clerkId = context?.auth?.userId;
        if (!clerkId) return null;

        const user = await db.user.findUnique({
            where: { clerkId },
        });

        return user;
    } catch (err) {
        console.error(err);
        return null;
    }
}

export async function getUser(_:any, args:{
    clerkId:string
}){
    try{
        const { clerkId } = args;
        const user = await db.user.findUnique({
            where:{
                clerkId
            }
        })
        if(!user){
            return null;
        }
        return user;
    }catch(err){
        console.error(err);
        return null;
    }
}

export async function updateUser(_:any, args:{
    id: string,
    name: string,                   
    fitnessGoal: string,
    allergies: string[]
}, __: any, context: { auth?: { userId?: string } }){
    try{
        const clerkId = context?.auth?.userId;
        if (!clerkId) {
            return { success: false, message: "Unauthorized" };
        }
        const current = await db.user.findUnique({ where: { clerkId } });
        if (!current || current.id !== args.id) {
            return { success: false, message: "invalid action" };
        }
        const user = await db.user.update({
            where:{
                id: args.id
            },
            data: {
                name: args.name,
                fitnessGoal: args.fitnessGoal,
                allergies: args.allergies,
            }
        })
        if(!user){
            return { success: false, message: "Failed to update user" };
        }
        return { success: true, message: "User updated successfully" };
    }catch(err){
        console.error(err);
        return {
            success: false,
            message: "Failed to update user"
        };
    }
}

export async function getProfile(_: any, __: any, context: { auth?: { userId?: string } }) {
    try {
        const clerkId = context?.auth?.userId;
        if (!clerkId) return null;
        const user = await db.user.findUnique({ where: { clerkId } });
        if (!user) return null;
        return {
            name: user.name,
            fitnessGoal: user.fitnessGoal ?? null,
            allergies: user.allergies ?? [],
        };
    } catch (err) {
        console.error(err);
        return null;
    }
}

export async function createOrUpdateProfile(
    _: any,
    args: { fitnessGoal?: string | null; allergies?: string[] | null },
    __: any,
    context: { auth?: { userId?: string } }
) {
    try {
        const clerkId = context?.auth?.userId;
        if (!clerkId) {
            return { success: false, message: "Unauthorized" };
        }
        const existing = await db.user.findUnique({ where: { clerkId } });
        const data: any = {};
        if (typeof args.fitnessGoal !== 'undefined') data.fitnessGoal = args.fitnessGoal || null;
        if (typeof args.allergies !== 'undefined') data.allergies = args.allergies || [];

        if (!existing) {
            await db.user.create({
                data: {
                    clerkId,
                    email: `${clerkId}@example.com`,
                    name: "User",
                    ...data,
                }
            });
        } else {
            await db.user.update({ where: { clerkId }, data });
        }
        return { success: true, message: "Profile saved" };
    } catch (err) {
        console.error(err);
        return { success: false, message: "Failed to save profile" };
    }
}

export async function updateUserProfile(
    _: any,
    args: { allergies?: string[] | null; fitnessGoal?: string | null },
    __: any,
    context: { auth?: { userId?: string } }
) {
    try {
        const clerkId = context?.auth?.userId;
        if (!clerkId) return { success: false, message: "Unauthorized" };
        const data: any = {};
        if (typeof args.allergies !== 'undefined') data.allergies = args.allergies || [];
        if (typeof args.fitnessGoal !== 'undefined') data.fitnessGoal = args.fitnessGoal || null;

        // Ensure user exists; create if missing (use webhook in prod but safe-guard here)
        const existing = await db.user.findUnique({ where: { clerkId } });
        if (!existing) {
            await db.user.create({
                data: {
                    clerkId,
                    email: `${clerkId}@example.com`,
                    name: "User",
                    ...data,
                },
            });
        } else {
            await db.user.update({ where: { clerkId }, data });
        }
        return { success: true, message: "Profile updated" };
    } catch (err) {
        console.error(err);
        return { success: false, message: "Failed to update profile" };
    }
}

export async function analyzeLabel(
    _: any,
    args: { imageBase64: string },
    context: { req?: Request, auth?: { userId?: string } }
) {
    try {
        const base64 = args.imageBase64;
        if (!base64) return null;

        // 1) Upload to Cloudinary (store copy)
        const uploaded = await uploadImageBase64(base64, 'eatwise');
        const imageUrl = uploaded.secureUrl;
        // Prepare base64 for Gemini inlineData (strip dataURL prefix if present)
        const isDataUrl = base64.startsWith('data:');
        const mimeFromInput = isDataUrl ? base64.substring(5, base64.indexOf(';')) : (uploaded.format ? `image/${uploaded.format}` : 'image/jpeg');
        const pureBase64 = isDataUrl ? base64.split('base64,')[1] : base64;

        // 2) Call Gemini with the Cloudinary URL
        const apiKey = (
            process.env.GOOGLE_API_KEY ||
            process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
            process.env.GEMINI_API_KEY ||
            process.env.NEXT_PUBLIC_GEMINI_API_KEY
        ) as string;
        if (!apiKey) throw new Error('Missing GOOGLE_API_KEY or GEMINI_API_KEY (server env)');
        // Pull user allergies for context
        let userAllergies: string[] = [];
        try {
            const uid = context?.auth?.userId;
            if (uid) {
                const u = await db.user.findUnique({ where: { clerkId: uid } });
                userAllergies = u?.allergies || [];
            }
        } catch {}

        const prompt = `You are given an image of a food product label. Carefully extract all text, especially ingredients and nutrition.\n\nYou are a nutrition assistant for EatWise. Analyze and return structured JSON.\n\nUser allergies (treat these as high-risk): ${JSON.stringify(userAllergies)}\n\nReturn ONLY JSON with these fields:\n- name: string (concise product/label name; if missing, derive from visible brand/product text)\n- ingredients: array of strings (clean, lowercase)\n- allergens: array of confirmed allergens (from label)\n- possibleAllergens: array of likely allergens inferred from ingredients (e.g., 'whey' -> 'milk', 'albumin' -> 'eggs', 'soy lecithin' -> 'soy', 'almonds' -> 'nuts', 'gluten', 'shellfish')\n- nutrition: object (calories, protein, fat, sugar, fiber, saturated_fat, sodium, etc.)\n- health_analysis: short paragraph\n- grade: one of 'A','B','C','D','E' (Nutri-Score style, best=A, worst=E) based on overall nutrition\n- isAllergic: boolean (true if any ingredient matches the user allergies above)\n- allergensMatched: array of strings (which of the user allergies matched)`;
        // 2) Call Gemini using inlineData (recommended when you already have base64)
        const body = {
            contents: [
              {
                role: "user",
                parts: [
                  { text: prompt },
                  { inlineData: { mimeType: mimeFromInput || 'image/jpeg', data: pureBase64 } },
                ],
              },
            ],
            generationConfig: { temperature: 0 },
        } as any;
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
            { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(body) }
        );
        if (!resp.ok) {
            const t = await resp.text();
            throw new Error(`Gemini failed: ${t}`);
        }
        const gemini = await resp.json() as any;
        if (!gemini?.candidates || gemini.candidates.length === 0) {
            throw new Error('Gemini returned no candidates');
        }
        const text = extractTextFromGemini(gemini);
        const parsed = parseStructured(text);

        const ingredients: string[] = parsed.ingredients || [];
        const allergens: string[] = parsed.allergens || [];
        const possibleAllergens: string[] = parsed.possibleAllergens || inferPossibleAllergens(ingredients);
        const nutrition = parsed.nutrition || {};
        const grade: string | null = parsed.grade || inferGrade(nutrition, ingredients);
        const health_analysis = parsed.health_analysis || "";
        const name: string = (parsed as any)?.name || "Food Label";

        // 3) Evaluate allergy overlap deterministically as well
        const userId = context?.auth?.userId;
        let explanation = "";
        let allergensMatched: string[] = [];
        try {
            if (userId) {
                const user = await db.user.findUnique({ where: { clerkId: userId } });
                const lower = ingredients.map(s=>s.toLowerCase());
                const hits = (user?.allergies || []).filter(a => lower.some(i => i.includes(a.toLowerCase())));
                allergensMatched = hits;
                explanation = hits.length ? `Allergy risk: ${hits.join(', ')}` : "No major concerns detected";
            }
        } catch {}

        // 4) Save report and increment analysesDone for free users
        let saved = false;
        let reportId: string | null = null;
        try {
            if (userId) {
                const user = await db.user.findUnique({ where: { clerkId: userId } });
                if (user) {
                    const r = await db.report.create({
                        data: {
                            userId: user.id,
                            title: 'Food Label Analysis',
                            imageUrl: imageUrl,
                            content: JSON.stringify({ name, ingredients, allergens, possibleAllergens, nutrition, health_analysis, grade, explanation, isAllergic: Boolean((parsed as any)?.isAllergic) || (allergensMatched.length>0), allergensMatched }),
                        }
                    })
                    saved = true;
                    reportId = r.id;
                    // increment analysesDone if user is on free plan
                    if ((user as any).role !== 'pro') {
                        await db.user.update({ where: { id: user.id }, data: { analysesDone: (user.analysesDone || 0) + 1 } });
                    }
                }
            }
        } catch (e) { console.error(e); }

        return {
            imageUrl,
            ingredients,
            allergens,
            possibleAllergens,
            grade,
            analysisJson: JSON.stringify({ nutrition, health_analysis }),
            isAllergic: Boolean((parsed as any)?.isAllergic) || (allergensMatched.length>0),
            allergensMatched,
            explanation,
            saved,
            reportId,
        }
    } catch (err) {
        console.error(err);
        return null;
    }
}

function extractTextFromGemini(data: any): string {
    const parts: string[] = [];
    try {
        for (const c of (data?.candidates||[])) {
            for (const p of (c?.content?.parts||[])) {
                if (typeof p?.text === 'string') parts.push(p.text)
            }
        }
    } catch {}
    return parts.join('\n');
}

function parseStructured(text: string): { ingredients?: string[]; allergens?: string[]; possibleAllergens?: string[]; nutrition?: any; health_analysis?: string; grade?: string } {
    if (!text) return {};
    const tryParse = (s: string) => { try { return JSON.parse(s) } catch { return null } };
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (fence) {
        const obj = tryParse(fence.trim());
        if (obj) return obj;
    }
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
        const obj = tryParse(objMatch[0]);
        if (obj) return obj;
    }
    return {};
}

function inferPossibleAllergens(ingredients: string[]): string[] {
    const hits = new Set<string>();
    const lower = ingredients.map(s=>s.toLowerCase());
    const rules: Array<[string, string]> = [
        ['whey', 'milk'],
        ['casein', 'milk'],
        ['lactose', 'milk'],
        ['milk', 'milk'],
        ['almond', 'nuts'],
        ['hazelnut', 'nuts'],
        ['peanut', 'nuts'],
        ['cashew', 'nuts'],
        ['pistachio', 'nuts'],
        ['walnut', 'nuts'],
        ['soy', 'soy'],
        ['soy lecithin', 'soy'],
        ['lecithin (soy)', 'soy'],
        ['egg', 'eggs'],
        ['albumin', 'eggs'],
        ['gluten', 'gluten'],
        ['wheat', 'gluten'],
        ['barley', 'gluten'],
        ['rye', 'gluten'],
        ['shrimp', 'shellfish'],
        ['crab', 'shellfish'],
        ['lobster', 'shellfish'],
        ['shellfish', 'shellfish'],
    ];
    for (const ing of lower) {
        for (const [needle, category] of rules) {
            if (ing.includes(needle)) hits.add(category);
        }
    }
    return Array.from(hits);
}

function inferGrade(nutrition: any, ingredients: string[]): string {
    // Very simple heuristic placeholder until model returns explicit grade
    const sugar = Number(nutrition?.sugar || nutrition?.sugars || 0);
    const protein = Number(nutrition?.protein || 0);
    const satFat = Number(nutrition?.saturated_fat || nutrition?.saturatedFat || 0);
    let score = 3; // C
    if (protein >= 10) score -= 1; // better
    if (sugar >= 10) score += 1; // worse
    if (satFat >= 5) score += 1; // worse
    const map = ['A','B','C','D','E'];
    return map[Math.max(0, Math.min(4, Math.round(score)))]
}

export async function getReports(_: any, args: { clerkId: string }) {
    try {
        const user = await db.user.findUnique({ where: { clerkId: args.clerkId } });
        if (!user) return [];

        // Fetch from Report model only
        const rows = await db.report.findMany({ where: { userId: user.id } });
        const mapped = rows.map(r => {
            let parsed: any = {};
            try { parsed = JSON.parse(r.content || '{}'); } catch {}
            const ts = objectIdToDate(r.id)?.toISOString() || new Date().toISOString();
            return {
                id: r.id,
                ingredients: parsed.ingredients || [],
                allergensFound: parsed.allergens || [],
                score: typeof parsed.score === 'number' ? parsed.score : null,
                createdAt: ts,
                imageUrl: r.imageUrl || null,
                content: r.content || null,
            };
        });
        return mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
        console.error(err);
        return [];
    }
}

export async function myReports(_: any, __: any, context: { auth?: { userId?: string } }) {
    try {
        const clerkId = context?.auth?.userId;
        if (!clerkId) return [];
        const user = await db.user.findUnique({ where: { clerkId } });
        if (!user) return [];
        const rows = await db.report.findMany({ where: { userId: user.id } });
        const mapped = rows.map(r => {
            let parsed: any = {};
            try { parsed = JSON.parse(r.content || '{}'); } catch {}
            const ts = objectIdToDate(r.id)?.toISOString() || new Date().toISOString();
            return {
                id: r.id,
                ingredients: parsed.ingredients || [],
                allergensFound: parsed.allergens || [],
                score: typeof parsed.score === 'number' ? parsed.score : null,
                createdAt: ts,
                imageUrl: r.imageUrl || null,
                content: r.content || null,
            };
        });
        return mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
        console.error(err);
        return [];
    }
}

function objectIdToDate(id: string): Date | null {
    try {
        const hex = id.substring(0, 8);
        const seconds = parseInt(hex, 16);
        return new Date(seconds * 1000);
    } catch { return null; }
}