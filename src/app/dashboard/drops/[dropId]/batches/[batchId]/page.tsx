import { Inbox } from "lucide-react";
import { notFound } from "next/navigation";

import { SearchableOrders } from "@/components/dashboard/searchable-orders";
import { EmptyState } from "@/components/ui/empty-state";
import { requireVendor } from "@/lib/auth";
import { getBatchDetail } from "@/lib/queries/batch";

export const metadata = { title: "Batch orders" };

export default async function BatchOrdersPage({
  params,
}: PageProps<"/dashboard/drops/[dropId]/batches/[batchId]">) {
  const { batchId } = await params;
  await requireVendor();

  const batch = await getBatchDetail(batchId);
  if (!batch) notFound();

  if (batch.orders.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No orders yet"
        description={
          batch.status === "open"
            ? "Share your link. Orders land here the moment someone pays."
            : "This batch closed without any orders."
        }
      />
    );
  }

  return (
    <SearchableOrders
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
  );
}
