import "server-only";

import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getAdminOverviewCounts(): Promise<{
  openBatches: number;
  paidOrders30d: number;
}> {
  await requireAdmin();
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [openBatches, paidOrders] = await Promise.all([
    admin
      .from("batches")
      .select("*", { count: "exact", head: true })
      .eq("status", "open")
      .gt("closes_at", nowIso),
    admin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("goods_paid_at", since),
  ]);

  return {
    openBatches: openBatches.count ?? 0,
    paidOrders30d: paidOrders.count ?? 0,
  };
}
