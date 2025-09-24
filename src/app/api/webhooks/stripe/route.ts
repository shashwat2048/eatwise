import { NextRequest } from "next/server";
import { headers } from "next/headers";
import db from "@/services/prisma";
import { stripe } from "@/services/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET as string | undefined;
  if (!whSecret) {
    console.error('[stripe] Missing STRIPE_WEBHOOK_SECRET');
    return new Response("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });
  }

  // Read signature from headers using next/headers, fallback to req.headers
  const hdrs = await headers();
  const sig = hdrs.get('stripe-signature') || req.headers.get('stripe-signature');
  if (!sig) {
    console.error('[stripe] Missing Stripe signature header');
    return new Response("Missing Stripe signature", { status: 400 });
  }

  let event: any;
  try {
    // Use raw body; do not parse JSON before verification
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, whSecret);
  } catch (err: any) {
    console.error('[stripe] Webhook signature verification failed:', err?.message);
    return new Response(`Webhook Error: ${err?.message || 'invalid signature'}`, { status: 400 });
  }

  // Debug logs
  try {
    console.log('[stripe] event', event?.id, event?.type);
    console.log('[stripe] object', event?.data?.object);
  } catch {}

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        // Retrieve full session for safety
        let full: any = session;
        try {
          full = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items', 'payment_intent', 'customer'] });
        } catch (e) {
          console.error('[stripe] failed to retrieve session', e);
        }

        const paid = (full?.payment_status === 'paid') || (full?.status === 'complete');
        if (!paid) {
          console.warn('[stripe] checkout completed but not paid; skipping');
          break;
        }

        const clerkId = full?.metadata?.clerkId as string | undefined;
        const clientRef = full?.client_reference_id as string | undefined;
        const email = (full?.customer_details?.email as string | undefined) || undefined;

        if (clerkId) {
          const res = await db.user.updateMany({ where: { clerkId }, data: { role: 'pro' } });
          console.log('[stripe] upgraded users by clerkId:', res.count, clerkId);
        } else if (clientRef) {
          const res = await db.user.updateMany({ where: { clerkId: clientRef }, data: { role: 'pro' } });
          console.log('[stripe] upgraded users by client_reference_id:', res.count, clientRef);
        } else if (email) {
          const res = await db.user.updateMany({ where: { email }, data: { role: 'pro' } });
          console.log('[stripe] upgraded users by email:', res.count, email);
        } else {
          console.warn('[stripe] no identifiers on session (clerkId/client_reference_id/email); cannot upgrade');
        }
        break;
      }
      default: {
        // Unhandled event types can be logged for visibility
        console.log('[stripe] unhandled event', event.type);
      }
    }
  } catch (err) {
    console.error('[stripe] handler error', err);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
}


