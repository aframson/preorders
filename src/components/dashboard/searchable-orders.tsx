"use client";

import { useMemo, useState } from "react";

import {
  VendorOrderRow,
  type VendorOrderRowData,
} from "@/components/dashboard/vendor-order-row";
import { ListSearch } from "@/components/ui/list-search";
import { matchesQuery } from "@/lib/search";

export function SearchableOrders({ orders }: { orders: VendorOrderRowData[] }) {
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
    <div className="space-y-4">
      <ListSearch
        value={query}
        onChange={setQuery}
        placeholder="Search orders…"
        label="Search orders"
      />
      {filtered.length === 0 ? (
        <p className="rounded-card border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted">
          No orders match that search.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((order) => (
            <VendorOrderRow key={order.id} order={order} />
          ))}
        </ul>
      )}
    </div>
  );
}
