"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser, requireVendor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

type PushSubscriptionRow = {
  vendor_id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  updated_at: string;
};

export async function savePushSubscription(
  raw: z.infer<typeof subscriptionSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = subscriptionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid subscription" };

  const user = await requireUser();
  const vendor = await requireVendor();
  const supabase = await createClient();
  const headerStore = await headers();

  const row: PushSubscriptionRow = {
    vendor_id: vendor.id,
    user_id: user.id,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    user_agent: headerStore.get("user-agent"),
    updated_at: new Date().toISOString(),
  };

  // Table lands via migration; cast until `pnpm db:types` is regenerated.
  const { error } = await supabase
    .from("push_subscriptions" as never)
    .upsert(row as never, { onConflict: "endpoint" });

  if (error) {
    console.error("[push] save", error);
    return { ok: false, error: "Could not save subscription" };
  }

  revalidatePath("/dashboard/more");
  return { ok: true };
}

export async function removePushSubscription(
  endpoint: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!endpoint) return { ok: false, error: "Missing endpoint" };

  await requireUser();
  await requireVendor();
  const supabase = await createClient();

  const { error } = await supabase
    .from("push_subscriptions" as never)
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    console.error("[push] remove", error);
    return { ok: false, error: "Could not remove subscription" };
  }

  revalidatePath("/dashboard/more");
  return { ok: true };
}
