import { GraphQLError } from "graphql";
import db from "@/services/prisma";

type Auth = { userId?: string } | undefined;

export type Role = "free" | "pro";

export async function enforceAnalyzeQuota(req: Request, auth: Auth): Promise<{ role: Role; remaining: number | null }>{
  const headers = req.headers || new Headers();

  // Logged-in users: check DB for role and usage
  const clerkId = auth?.userId;
  if (!clerkId) {
    throw new GraphQLError("Unauthorized");
  }

  // Fetch user
  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) {
    // Default to free; create a placeholder user if needed
    // Note: we avoid creating here to keep side-effects minimal. Treat as FREE with 0 usage.
    return { role: "free", remaining: 10 };
  }

  // Role detection: allow reading custom field if present
  const role: Role = (user.role === 'pro') ? 'pro' : 'free';

  if (role === "pro") {
    return { role: "pro", remaining: null };
  }

  // free: use analysesDone counter
  const count = typeof user.analysesDone === 'number' ? user.analysesDone : 0;
  const max = 10;
  const remaining = Math.max(0, max - count);
  if (remaining <= 0) {
    throw new GraphQLError("Free plan limit reached: 10 analyses. Upgrade to Pro for unlimited.");
  }
  return { role: "free", remaining };
}


