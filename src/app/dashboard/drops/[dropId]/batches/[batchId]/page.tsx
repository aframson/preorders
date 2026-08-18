import { notFound } from "next/navigation";

import { BatchBoard } from "@/components/dashboard/batch-board";
import { SearchableOrders } from "@/components/dashboard/searchable-orders";
import { requireVendor } from "@/lib/auth";
import { getBatchDetail } from "@/lib/queries/batch";

export const metadata = { title: "Batch board" };

export default async function BatchOrdersPage({
  params,
}: PageProps<"/dashboard/drops/[dropId]/batches/[batchId]">) {
  const { dropId, batchId } = await params;
  await requireVendor();

  const batch = await getBatchDetail(batchId);
  if (!batch) notFound();

  return (
    <div className="space-y-10">
      <BatchBoard batch={batch} dropId={dropId} />

      {batch.orders.length > 0 && (
        <section id="all-orders" className="scroll-mt-24">
          <div className="-mx-5 border-y border-border bg-surface lg:-mx-8">
            <div className="flex items-baseline justify-between gap-3 border-b border-border px-5 py-2.5 lg:px-8">
              <h3 className="font-display text-sm font-semibold text-ink">
                All orders
              </h3>
              <p className="text-xs text-ink-muted">
                {batch.orders.length} · search &amp; mark received
              </p>
            </div>
            <SearchableOrders
              edge
              orders={batch.orders.map((order) => ({
                id: order.id,
                code: order.code,
                publicToken: order.publicToken,
                status: order.status,
                fulfilment: order.fulfilment,
                goodsTotal: order.goodsTotal,
                createdAt: order.createdAt,
                customerName: order.customer.name,
                phone: order.customer.phone,
                dropTitle: batch.dropTitle,
                batchNumber: batch.number,
              }))}
            />
          </div>
        </section>
      )}
    </div>
  );
}
