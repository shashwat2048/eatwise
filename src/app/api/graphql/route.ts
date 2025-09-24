import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { ApolloServer } from "@apollo/server";
import { NextRequest } from "next/server";
import { gql } from "graphql-tag";
import { getUser, me, updateUser, getProfile, createOrUpdateProfile } from "./resolvers/user";
import { updateUserProfile } from "./resolvers/user";
import { analyzeLabel } from "./resolvers/user";
import { myReports, getReports } from "./resolvers/user";
import { getAuth } from "@clerk/nextjs/server";
import { signToken } from "@/services/jwt";
import { enforceAnalyzeQuota } from "./rbac";
import db from "@/services/prisma";

export const runtime = "nodejs";

const typeDefs = gql`
  type Query {
    me: User
    getUser(clerkId: String!): User
    getProfile: Profile
    getReports(clerkId: String!): [AnalysisReport!]
    myReports: [AnalysisReport!]
    myQuota: Quota
  }
  type Mutation {
    updateUser(id: String!, name: String, avatar: String, fitnessGoal: String, allergies: [String]): Response
    createOrUpdateProfile(fitnessGoal: String, allergies: [String]): Response
    updateUserProfile(allergies: [String], fitnessGoal: String, name: String): Response
    analyzeLabel(imageBase64: String!): AnalyzeResult
    upgradeToPro(coupon: String): UpgradeResponse
    migrateGuestAnalyses(items: [GuestAnalysisInput!]!): Response
  }
  type Response {
    success: Boolean
    message: String
  }
  type AnalyzeResult {
    imageUrl: String
    ingredients: [String]
    allergens: [String]
    possibleAllergens: [String]
    grade: String
    isAllergic: Boolean
    allergensMatched: [String]
    analysisJson: String
    explanation: String
    saved: Boolean
    reportId: String
  }
  type AnalysisReport {
    id: String
    ingredients: [String]
    allergensFound: [String]
    createdAt: String
    imageUrl: String
    content: String
  }
  type Profile {
    name: String
    fitnessGoal: String
    allergies: [String]
  }
  type User {
    id: String
    name: String
    email: String
    avatar: String
    fitnessGoal: String
    allergies: [String]
    role: String
    analysesDone: Int
  }
  type Quota {
    role: String
    used: Int
    max: Int
    remaining: Int
    unlimited: Boolean
  }
  type UpgradeResponse {
    success: Boolean
    message: String
    checkoutUrl: String
  }
  input GuestAnalysisInput {
    ingredients: [String!]
    allergens: [String!]
    possibleAllergens: [String!]
    nutrition: String
    health_analysis: String
    grade: String
    imageUrl: String
  }
`;

const resolvers = {
  Query: {
    me: me,
    getUser: getUser,
    getProfile: getProfile,
    getReports: getReports,
    myReports: myReports,
    myQuota: async (_: any, __: any, context: any) => {
      const clerkId = context?.auth?.userId;
      if (!clerkId) return { role: 'guest', used: 0, max: 5, remaining: 5, unlimited: false };
      const user = await db.user.findUnique({ where: { clerkId } }).catch(()=>null);
      const role = user?.role === 'pro' ? 'pro' : 'free';
      const used = user?.analysesDone || 0;
      const max = role === 'free' ? 10 : 0;
      const unlimited = role === 'pro';
      const remaining = unlimited ? 0 : Math.max(0, max - used);
      return { role, used, max, remaining, unlimited };
    }
  },
  Mutation: {
    updateUser: updateUser,
    createOrUpdateProfile: createOrUpdateProfile,
    updateUserProfile: updateUserProfile,
    analyzeLabel: async (_: any, args: { imageBase64: string }, context: any) => {
      // Enforce RBAC and quotas before calling resolver
      await enforceAnalyzeQuota(context.req, context.auth);
      return analyzeLabel(_, args, context);
    },
    upgradeToPro: async (_: any, args: { coupon?: string | null }, context: any) => {
      try {
        const { userId } = context?.auth || {};
        if (!userId) return { success: false, message: 'Unauthorized', checkoutUrl: null };
        const user = await db.user.findUnique({ where: { clerkId: userId } });
        if (!user) return { success: false, message: 'User not found', checkoutUrl: null };

        const { stripe } = await import('@/services/stripe');

        const priceId = process.env.STRIPE_PRO_PRICE_ID as string | undefined;
        if (!priceId) return { success: false, message: 'Missing STRIPE_PRO_PRICE_ID', checkoutUrl: null };

        // Resolve absolute app origin robustly
        // Build a robust absolute origin
        const reqAny = context?.req as any;
        const hdrs: Headers | undefined = reqAny?.headers;
        const proto = hdrs?.get('x-forwarded-proto') || 'http';
        const host = hdrs?.get('x-forwarded-host') || hdrs?.get('host') || 'localhost:3000';
        const origin = reqAny?.nextUrl?.origin || `${proto}://${host}` || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Support both direct coupon IDs and human-friendly promotion codes
        // Priority: try promotion code by code, then coupon by ID
        let discounts: Array<{ coupon?: string; promotion_code?: string }> = [];
        if (args?.coupon && args.coupon.trim().length > 0) {
          const raw = args.coupon.trim();
          try {
            // Attempt promotion code search by code (e.g., "SAVE20")
            const promos = await stripe.promotionCodes.list({ code: raw, limit: 1 });
            const promo = promos.data?.[0];
            if (promo && promo.active && promo.coupon?.valid) {
              discounts = [{ promotion_code: promo.id }];
            } else {
              // Fall back to coupon ID retrieval (e.g., "coupon_abc123")
              const c = await stripe.coupons.retrieve(raw);
              if (!c.valid) throw new Error('Invalid or expired coupon');
              discounts = [{ coupon: c.id }];
            }
          } catch (e: any) {
            return { success: false, message: e?.message || 'Invalid coupon code', checkoutUrl: null };
          }
        }

        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          ui_mode: 'hosted',
          line_items: [{ price: priceId, quantity: 1 }],
          discounts: discounts.length ? discounts : undefined,
          success_url: `${origin}/profile?upgrade=success`,
          cancel_url: `${origin}/profile?upgrade=cancelled`,
          metadata: { clerkId: user.clerkId, userId: user.id },
          customer_email: user.email || undefined,
        });

        if (!session?.url) {
          // Fallback: use Session ID redirect pattern if url missing
          // Client can redirect to: https://checkout.stripe.com/c/session_id: {session.id}
          const fallback = session?.id ? `https://checkout.stripe.com/c/${session.id}` : null;
          if (fallback) {
            return { success: true, message: 'Checkout created', checkoutUrl: fallback };
          }
          return { success: false, message: 'Failed to create checkout session URL', checkoutUrl: null };
        }
        return { success: true, message: 'Checkout created', checkoutUrl: session.url };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Failed to create checkout', checkoutUrl: null };
      }
    },
    migrateGuestAnalyses: async (_: any, args: { items: Array<{ ingredients?: string[]; allergens?: string[]; possibleAllergens?: string[]; nutrition?: string; health_analysis?: string; grade?: string; imageUrl?: string | null }> }, context: any) => {
      try {
        const { userId } = context?.auth || {};
        if (!userId) return { success: false, message: 'Unauthorized' };
        const user = await db.user.findUnique({ where: { clerkId: userId } });
        if (!user) return { success: false, message: 'User not found' };

        const role = user.role === 'pro' ? 'pro' : 'free';
        let used = user.analysesDone || 0;
        const max = role === 'free' ? 10 : Number.POSITIVE_INFINITY;
        const remaining = role === 'free' ? Math.max(0, 10 - used) : Number.POSITIVE_INFINITY;
        if (role === 'free' && remaining <= 0) {
          return { success: false, message: 'Free plan limit reached: 10 analyses' };
        }

        const toImport = Array.isArray(args.items) ? args.items : [];
        if (toImport.length === 0) return { success: true, message: 'Nothing to migrate' };

        const allowed = role === 'free' ? Math.min(remaining, toImport.length) : toImport.length;
        const slice = toImport.slice(0, allowed);

        for (const it of slice) {
          const contentObj: any = {
            ingredients: it.ingredients || [],
            allergens: it.allergens || [],
            possibleAllergens: it.possibleAllergens || [],
            nutrition: (()=>{ try { return it.nutrition ? JSON.parse(it.nutrition) : {} } catch { return {} } })(),
            health_analysis: it.health_analysis || '',
            grade: it.grade || null,
          };
          await db.report.create({
            data: {
              userId: user.id,
              title: 'Food Label Analysis (imported)',
              imageUrl: it.imageUrl || null,
              content: JSON.stringify(contentObj),
            },
          });
          used += 1;
        }

        if (role === 'free') {
          await db.user.update({ where: { id: user.id }, data: { analysesDone: used } });
        }

        const skipped = toImport.length - slice.length;
        const msg = skipped > 0 ? `Migrated ${slice.length}, skipped ${skipped} (limit).` : `Migrated ${slice.length} analyses.`;
        return { success: true, message: msg };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Migration failed' };
      }
    },
  },
};

const server = new ApolloServer({
    typeDefs,
    resolvers,
});

// Typescript: req has the type NextRequest
const handler = startServerAndCreateNextHandler<NextRequest>(server, {
    context: async (req) => ({ req, auth: getAuth(req) }),
});

function setOrClearAuthCookie(req: NextRequest, res: Response) {
  const { userId } = getAuth(req);
  if (userId) {
    const token = signToken({ id: userId });
    if (token) {
      const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
      res.headers.append(
        "Set-Cookie",
        `token=${token}; Path=/; SameSite=Lax${secure}`
      );
    }
  } else {
    res.headers.append(
      "Set-Cookie",
      "token=; Path=/; Max-Age=0"
    );
  }
}

export async function GET(req: NextRequest) {
  const res = await handler(req);
  setOrClearAuthCookie(req, res);
  return res;
}

export async function POST(req: NextRequest) {
  const res = await handler(req);
  setOrClearAuthCookie(req, res);
  return res;
}