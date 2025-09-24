import { NextRequest } from "next/server";
import db from "@/services/prisma";
import { stripe } from "@/services/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const debug = url.searchParams.get('debug') === '1';
  const hasSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  const payload = debug
    ? { ok: true, message: 'Stripe webhook reachable', hasSecret, runtime: 'nodejs', region: process.env.VERCEL_REGION || null }
    : { ok: true, message: 'Stripe webhook reachable' };
  return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET as string | undefined;
  const skipVerify = process.env.STRIPE_WEBHOOK_UNSAFE_SKIP_VERIFY === '1';
  if (!whSecret) return new Response("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });
  if (!sig && !skipVerify) return new Response("Missing Stripe signature", { status: 400 });

  let event: any;
  try {
    // IMPORTANT: use the raw request body for signature verification
    if (skipVerify) {
      const json = await req.json().catch(()=>null);
      if (!json) throw new Error('Invalid JSON body');
      event = json;
    } else {
      const body = await req.text();
      event = stripe.webhooks.constructEvent(body, sig as string, whSecret);
    }
  } catch (err: any) {
    return new Response(`Webhook Error: ${err?.message || 'invalid signature'}`, { status: 400 });
  }

  try {
    console.log("[stripe] event", event?.id, event?.type);
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

        let updated = 0;
        if (clerkId) {
          const res = await db.user.updateMany({ where: { clerkId }, data: { role: 'pro' } });
          updated = res.count;
        } else if (clientRef) {
          const res = await db.user.updateMany({ where: { clerkId: clientRef }, data: { role: 'pro' } });
          updated = res.count;
        } else if (email) {
          const res = await db.user.updateMany({ where: { email }, data: { role: 'pro' } });
          updated = res.count;
        }
        console.log('[stripe] upgraded users:', updated, { clerkId, clientRef, email });
        break;
      }
      default: {
        // ignore other events
      }
    }
  } catch (err) {
    console.error('[stripe] handler error', err);
  }
  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
}


