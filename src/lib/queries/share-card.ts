import "server-only";

import { isPastCutoff } from "@/lib/jobs";
import { createAdminClient } from "@/lib/supabase/admin";

export type ShareCard = {
  vendorName: string;
  dropTitle: string;
  batchNumber: number | null;
  orderCount: number;
  open: boolean;
};

/**
 * The handful of fields an OG or WhatsApp Status card needs.
 *
 * Runs under the service role so the paid-order count is visible. Anon RLS
 * deliberately hides the orders table, and a share card that always says
 * "0 orders in" is worse than no card.
 */
export async function getShareCard(
  vendorSlug: string,
  dropSlug: string,
): Promise<ShareCard | null> {
  const admin = createAdminClient();

  const { data: vendor } = await admin
    .from("vendors")
    .select("id, business_name")
    .eq("slug", vendorSlug)
    .maybeSingle();

  if (!vendor) return null;

  const { data: drop } = await admin
    .from("drops")
    .select("id, title, published, archived_at")
    .eq("vendor_id", vendor.id)
    .eq("slug", dropSlug)
    .maybeSingle();

  if (!drop || !drop.published || drop.archived_at) return null;

  const { data: batches } = await admin
    .from("batches")
    .select("id, number, status, closes_at, orders(status)")
    .eq("drop_id", drop.id)
    .order("number", { ascending: false });

  const open = (batches ?? []).find(
    (batch) => batch.status === "open" && !isPastCutoff(batch.closes_at),
  );

  const orderCount = open
    ? (open.orders ?? []).filter(
        (order) =>
          order.status !== "pending_payment" && order.status !== "cancelled",
      ).length
    : 0;

  return {
    vendorName: vendor.business_name,
    dropTitle: drop.title,
    batchNumber: open?.number ?? null,
    orderCount,
    open: Boolean(open),
  };
}
