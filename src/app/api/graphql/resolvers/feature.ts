import db from "@/services/prisma";
import { getAuth } from "@clerk/nextjs/server";

export async function deleteReport(_: any, args: { id: string }, context: { auth?: { userId?: string } }) {
  try {
    const clerkId = context?.auth?.userId;
    if (!clerkId) return { success: false, message: "Unauthorized" };
    const user = await db.user.findUnique({ where: { clerkId } });
    if (!user) return { success: false, message: "Unauthorized" };

    const report = await db.report.findUnique({ where: { id: args.id } });
    if (!report || report.userId !== user.id) return { success: false, message: "Not found" };

    await db.report.delete({ where: { id: args.id } });
    return { success: true };
  } catch (e: any) {
    console.error("deleteReport error", e);
    return { success: false, message: e?.message || "Failed" };
  }
}


