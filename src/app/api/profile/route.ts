import { getAuth } from "@clerk/nextjs/server";
import db from "@/services/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const allergies: string[] | undefined = body?.allergies;
    const fitnessGoal: string | null | undefined = body?.fitnessGoal;
    const name: string | null | undefined = body?.name;

    const data: any = {};
    if (typeof allergies !== "undefined") data.allergies = Array.isArray(allergies) ? allergies : [];
    if (typeof fitnessGoal !== "undefined") data.fitnessGoal = fitnessGoal || null;
    if (typeof name !== "undefined" && name !== null) data.name = String(name).trim().slice(0, 80);

    const existing = await db.user.findUnique({ where: { clerkId: userId } });
    if (!existing) {
      await db.user.create({
        data: {
          clerkId: userId,
          email: `${userId}@example.com`,
          name: data.name || "User",
          ...data,
        },
      });
    } else {
      await db.user.update({ where: { clerkId: userId }, data });
    }

    return Response.json({ success: true, message: "Profile updated" });
  } catch (err: any) {
    console.error("/api/profile error", err);
    return Response.json({ success: false, message: err?.message || "Failed" }, { status: 500 });
  }
}


