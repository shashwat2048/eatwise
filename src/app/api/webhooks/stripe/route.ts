import { NextRequest } from "next/server";
import db from "@/services/prisma";
import { stripe } from "@/services/stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET as string | undefined;
  if (!whSecret) return new Response("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });
  if (!sig) return new Response("Missing Stripe signature", { status: 400 });

  let event: any;
  try {
    const buf = await req.arrayBuffer();
    const text = Buffer.from(buf).toString("utf8");
    event = stripe.webhooks.constructEvent(text, sig, whSecret);
  } catch (err: any) {
    return new Response(`Webhook Error: ${err?.message || 'invalid signature'}`, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const clerkId = session?.metadata?.clerkId as string | undefined;
      if (clerkId) {
        await db.user.updateMany({ where: { clerkId }, data: { role: 'pro' } });
      }
    }
  } catch (err) {
    // swallow errors to avoid retries storm; Stripe will retry on failure anyway
  }
  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
}


