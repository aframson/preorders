"use client";

import { SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import {
  VendorOrderRow,
  type VendorOrderRowData,
} from "@/components/dashboard/vendor-order-row";
import { ListSearch } from "@/components/ui/list-search";
import { matchesQuery } from "@/lib/search";
import { ORDER_STATUS, type OrderStatus } from "@/lib/status";

export function SearchableOrders({
  orders,
  edge = false,
}: {
  orders: VendorOrderRowData[];
  /** Flush to layout edges (no card chrome). */
  edge?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [fulfilment, setFulfilment] = useState<"all" | "pickup" | "delivery">(
    "all",
  );
  const statuses = useMemo(
    () => Array.from(new Set(orders.map((order) => order.status))),
    [orders],
  );
  const filtered = useMemo(
    () =>
      orders.filter(
        (order) =>
          (status === "all" || order.status === status) &&
          (fulfilment === "all" || order.fulfilment === fulfilment) &&
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
    [fulfilment, orders, query, status],
  );

  return (
    <div className={edge ? "space-y-0" : "space-y-3"}>
      <div
        className={
          edge
            ? "flex flex-col gap-2 border-b border-border px-5 py-3 sm:flex-row sm:items-center lg:px-8"
            : "flex flex-col gap-2 sm:flex-row sm:items-center"
        }
      >
        <ListSearch
          value={query}
          onChange={setQuery}
          placeholder="Search orders…"
          label="Search orders"
          inputClassName={edge ? "h-9 rounded-none border-0 bg-transparent pl-9 text-sm shadow-none focus:border-0" : undefined}
          className="min-w-0 flex-1"
        />
        <div className="flex items-center gap-2">
          <SlidersHorizontal
            className="hidden size-4 text-ink-subtle sm:block"
            aria-hidden
          />
          <label className="sr-only" htmlFor="order-status-filter">
            Filter by status
          </label>
          <select
            id="order-status-filter"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as "all" | OrderStatus)
            }
            className="h-9 min-w-0 flex-1 rounded-control border border-border bg-surface px-3 text-sm text-ink shadow-sm focus:border-ink focus:outline-none sm:flex-none"
          >
            <option value="all">All statuses</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {ORDER_STATUS[value].label}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="order-method-filter">
            Filter by fulfilment method
          </label>
          <select
            id="order-method-filter"
            value={fulfilment}
            onChange={(event) =>
              setFulfilment(
                event.target.value as "all" | "pickup" | "delivery",
              )
            }
            className="h-9 min-w-0 flex-1 rounded-control border border-border bg-surface px-3 text-sm text-ink shadow-sm focus:border-ink focus:outline-none sm:flex-none"
          >
            <option value="all">All methods</option>
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>
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
