"use client";

import { useMemo, useState } from "react";

import {
  VendorOrderRow,
  type VendorOrderRowData,
} from "@/components/dashboard/vendor-order-row";
import { ListSearch } from "@/components/ui/list-search";
import { matchesQuery } from "@/lib/search";

export function SearchableOrders({
  orders,
  edge = false,
}: {
  orders: VendorOrderRowData[];
  /** Flush to layout edges (no card chrome). */
  edge?: boolean;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      orders.filter((order) =>
        matchesQuery(
          [
            order.code,
            order.customerName,
            order.phone,
            order.dropTitle,
            String(order.batchNumber),
          ],
          query,
        ),
      ),
    [orders, query],
  );

  return (
    <div className={edge ? "space-y-0" : "space-y-3"}>
      <div className={edge ? "border-b border-border px-5 py-2.5 lg:px-8" : ""}>
        <ListSearch
          value={query}
          onChange={setQuery}
          placeholder="Search orders…"
          label="Search orders"
          inputClassName={edge ? "h-9 rounded-none border-0 bg-transparent pl-9 text-sm shadow-none focus:border-0" : undefined}
          className={edge ? "max-w-md" : undefined}
        />
      </div>
      {filtered.length === 0 ? (
        <p
          className={
            edge
              ? "px-5 py-10 text-center text-sm text-ink-muted lg:px-8"
              : "border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted"
          }
        >
          No orders match that search.
        </p>
      ) : (
        <ul className={edge ? "bg-surface" : "divide-y divide-border border border-border bg-surface"}>
          {filtered.map((order) => (
            <VendorOrderRow key={order.id} order={order} />
          ))}
        </ul>
      )}
    </div>
  );
}
