import "server-only";

import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";

export type VendorPushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type PushSubRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function vapidConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim(),
  );
}

function configureVapid(): boolean {
  if (!vapidConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT?.trim() || "mailto:hello@preorders.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!.trim(),
    process.env.VAPID_PRIVATE_KEY!.trim(),
  );
  return true;
}

/** Fan-out a notification to every device registered for this vendor. */
export async function sendVendorPush(
  vendorId: string,
  payload: VendorPushPayload,
): Promise<{ sent: number; removed: number }> {
  if (!configureVapid()) return { sent: 0, removed: 0 };

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("push_subscriptions" as never)
    .select("id, endpoint, p256dh, auth")
    .eq("vendor_id", vendorId);

  const subscriptions = (rows ?? []) as PushSubRow[];
  if (!subscriptions.length) return { sent: 0, removed: 0 };

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/dashboard",
    tag: payload.tag ?? "preorders",
  });

  let sent = 0;
  let removed = 0;

  await Promise.all(
    subscriptions.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          body,
          { TTL: 60 * 60 },
        );
        sent += 1;
      } catch (error) {
        const status =
          error && typeof error === "object" && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : 0;
        if (status === 404 || status === 410) {
          await admin
            .from("push_subscriptions" as never)
            .delete()
            .eq("id", row.id);
          removed += 1;
        } else {
          console.error("[push] send failed", row.id, error);
        }
      }
    }),
  );

  return { sent, removed };
}
