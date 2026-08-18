import { Receipt } from "lucide-react";

import { SearchableOrders } from "@/components/dashboard/searchable-orders";
import { EmptyState } from "@/components/ui/empty-state";
import { requireVendor } from "@/lib/auth";
import type { OrderStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const vendor = await requireVendor();
  const supabase = await createClient();

  const { data: drops } = await supabase
    .from("drops")
    .select(
      "id, title, batches(id, number, orders(id, code, public_token, status, fulfilment, goods_total, created_at, customers(name, phone)))",
    )
    .eq("vendor_id", vendor.id)
    .is("archived_at", null);

  const orders = (drops ?? []).flatMap((drop) =>
    (drop.batches ?? []).flatMap((batch) =>
      (batch.orders ?? []).map((order) => ({
        id: order.id,
        code: order.code,
        publicToken: order.public_token,
        status: order.status as OrderStatus,
        fulfilment: order.fulfilment as "pickup" | "delivery",
        goodsTotal: order.goods_total,
        createdAt: order.created_at,
        customerName: order.customers?.name ?? "Unknown",
        phone: order.customers?.phone ?? "",
        dropTitle: drop.title,
        batchNumber: batch.number,
      })),
    ),
  );

  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="-mx-5 -my-6 lg:-mx-8 lg:-my-8">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border px-5 py-3 lg:px-8">
        <div>
          <h1 className="font-display text-lg font-semibold tracking-tight text-ink">
            Orders
          </h1>
          <p className="text-xs text-ink-muted">
            {orders.length} total · newest first
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="px-5 py-10 lg:px-8">
          <EmptyState
            icon={Receipt}
            title="No orders yet"
            description="Share your link. Paid orders land here."
          />
        </div>
      ) : (
        <SearchableOrders orders={orders} edge />
      )}
    </div>
  );
}
