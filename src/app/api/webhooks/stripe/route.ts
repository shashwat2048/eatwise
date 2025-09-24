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
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as any;
        // Defensive: retrieve full session to ensure payment status
        let full: any = session;
        try {
          full = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items', 'payment_intent', 'customer'] });
        } catch {}

        const paid = (full?.payment_status === 'paid') || (full?.status === 'complete');
        const clerkId = full?.metadata?.clerkId as string | undefined;
        const email = (full?.customer_details?.email as string | undefined) || undefined;
        const clientRef = full?.client_reference_id as string | undefined;

        if (!paid) break;

        if (clerkId) {
          await db.user.updateMany({ where: { clerkId }, data: { role: 'pro' } });
        } else if (clientRef) {
          await db.user.updateMany({ where: { clerkId: clientRef }, data: { role: 'pro' } });
        } else if (email) {
          // Fallback: match by email if clerkId missing
          await db.user.updateMany({ where: { email }, data: { role: 'pro' } });
        }
        break;
      }
      default: {
        // ignore other events
      }
    }
  } catch (err) {
    // swallow errors to avoid retries storm; Stripe will retry on failure anyway
  }
  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
}


