import db from "@/services/prisma";
import { headers } from "next/headers";
import { Webhook } from "svix";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const hdrs = await headers();
  const svix_id = hdrs.get("svix-id");
  const svix_timestamp = hdrs.get("svix-timestamp");
  const svix_signature = hdrs.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const secret = process.env.CLERK_WEBHOOK_SECRET as string;
  if (!secret) {
    console.error("Missing CLERK_WEBHOOK_SECRET env var");
    return new Response("Server misconfigured", { status: 500 });
  }
  const wh = new Webhook(secret);

  try {
    const event = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as any;

    console.log("📩 Clerk webhook:", event.type, event.data?.id);

    const type = event.type as string;
    const data = event.data as any;
    const clerkId: string = data.id;
    const email: string | undefined = data.email_addresses?.[0]?.email_address;
    const rawFullName: string = `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim();
    const fullName: string | undefined = rawFullName.length > 0 ? rawFullName : undefined;
    const imageUrl: string | undefined = data.image_url;

    if (type === "user.created" || type === "user.updated") {
      await db.user.upsert({
        where: { clerkId },
        update: {
          email: email ?? undefined,
          name: fullName ?? undefined,
        },
        create: {
          clerkId,
          email: email ?? `${clerkId}@example.com`,
          name: fullName ?? "User",
        },
      });
      console.log(`🔄 Synced user ${type}:`, clerkId);
    }

    if (type === "user.deleted") {
      console.log("🗑 Delete event data:", JSON.stringify(data, null, 2));

      const emails: string[] = (data.email_addresses || [])
        .map((e: any) => e?.email_address)
        .filter(Boolean);

      const result = await db.user.deleteMany({
        where: {
          OR: [
            { clerkId },
            emails.length ? { email: { in: emails } } : undefined,
          ].filter(Boolean) as any,
        },
      });

      console.log("🧹 Deleted user from DB:", clerkId, "emails=", emails, "count=", result.count);
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook Error:", err);
    return new Response("Invalid signature", { status: 400 });
  }
}
