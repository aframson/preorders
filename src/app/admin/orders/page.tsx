import { Search } from "lucide-react";
import Link from "next/link";

import {
  FilterChips,
  firstParam,
  hrefWith,
  type SearchParamsRecord,
} from "@/components/admin/filter-chips";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { formatGhs } from "@/lib/money";
import { ADMIN_ORDERS_LIMIT, searchAdminOrders } from "@/lib/queries/admin-orders";
import { ORDER_STATUS, type OrderStatus } from "@/lib/status";
import { formatAccraDateTime } from "@/lib/time";

export const metadata = { title: "Orders · Admin" };

const PATH = "/admin/orders";

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && value in ORDER_STATUS;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  const params = await searchParams;
  const q = firstParam(params.q)?.trim() ?? "";
  const status = firstParam(params.status);
  const vendorId = firstParam(params.vendor);

  const orders = await searchAdminOrders({
    q,
    status: isOrderStatus(status) ? status : undefined,
    vendorId: vendorId && /^[0-9a-f-]{36}$/i.test(vendorId) ? vendorId : undefined,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title="Orders"
        description="Find any order across every shop by its code, the Paystack reference on a receipt, or the customer's phone, email or name."
      />

      <form action={PATH} className="flex gap-2">
        {/* Keep the other filters when searching. */}
        {isOrderStatus(status) && <input type="hidden" name="status" value={status} />}
        {vendorId && <input type="hidden" name="vendor" value={vendorId} />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <label htmlFor="order-search" className="sr-only">Search orders</label>
          <input
            id="order-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Order code, goods_… reference, 024 123 4567, or email"
            className="h-11 w-full rounded-control border border-border-strong bg-surface pr-3 pl-10 text-ink shadow-sm placeholder:text-ink-subtle focus:border-ink focus:ring-1 focus:ring-ink focus:outline-none"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {vendorId && (
        <p className="rounded-control bg-surface-muted px-4 py-2.5 text-sm text-ink">
          Only orders for {orders[0]?.vendor.name ?? "this vendor"}.{" "}
          <Link href={hrefWith(PATH, params, "vendor", undefined)} className="font-medium underline">
            Show all vendors
          </Link>
        </p>
      )}

      <FilterChips
        label="Order status"
        options={[
          { label: "All", href: hrefWith(PATH, params, "status", undefined), active: !isOrderStatus(status) },
          ...Object.entries(ORDER_STATUS).map(([key, meta]) => ({
            label: meta.label,
            href: hrefWith(PATH, params, "status", key),
            active: status === key,
          })),
        ]}
      />

      <p className="text-xs text-ink-muted">
        {q
          ? `${orders.length} match${orders.length === 1 ? "" : "es"} for "${q}"`
          : `Latest ${Math.min(orders.length, ADMIN_ORDERS_LIMIT)} orders`}
      </p>

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b border-border bg-surface-muted text-xs text-ink-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Order</th>
              <th className="px-4 py-2.5 font-medium">Customer</th>
              <th className="px-4 py-2.5 font-medium">Shop</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">Goods</th>
              <th className="px-4 py-2.5 text-right font-medium">Shipping</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-border align-top last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${order.id}`} className="font-medium text-ink hover:underline" data-numeric>
                    {order.code}
                  </Link>
                  <p className="text-xs text-ink-muted">{formatAccraDateTime(order.createdAt)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-ink">{order.customer.name}</p>
                  <p className="text-xs text-ink-muted">{order.customer.phone}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-ink">{order.vendor.name}</p>
                  <p className="text-xs text-ink-muted">
                    {order.dropTitle} · Batch {order.batchNumber}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <StatusPill tone={ORDER_STATUS[order.status].tone}>
                    {ORDER_STATUS[order.status].label}
                  </StatusPill>
                </td>
                <td className="px-4 py-3 text-right text-ink" data-numeric>
                  {formatGhs(order.goodsTotal)}
                </td>
                <td className="px-4 py-3 text-right text-ink-muted" data-numeric>
                  {order.freightAmount === null ? "—" : formatGhs(order.freightAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <p className="px-5 py-12 text-center text-sm text-ink-muted">
            {q ? "No orders match that search." : "No orders yet."}
          </p>
        )}
      </div>
    </div>
  );
}
