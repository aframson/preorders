"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ListSearch } from "@/components/ui/list-search";
import { PLATFORM_FEE_PERCENT } from "@/lib/fees";
import { formatGhs } from "@/lib/money";
import type { VendorSettlement } from "@/lib/queries/money";
import { matchesQuery } from "@/lib/search";
import { formatAccraDateTime } from "@/lib/time";

export function SearchableSettlements({
  settlements,
  payoutReady,
  channel,
}: {
  settlements: VendorSettlement[];
  payoutReady: boolean;
  channel: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      settlements.filter((row) =>
        matchesQuery(
          [
            row.customerName,
            row.orderCode,
            row.dropTitle,
            String(row.batchNumber),
            row.kind,
          ],
          query,
        ),
      ),
    [settlements, query],
  );

  return (
    <div className="space-y-4">
      <ListSearch
        value={query}
        onChange={setQuery}
        placeholder="Search payments…"
        label="Search payments"
      />
      {filtered.length === 0 ? (
        <p className="rounded-card border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted">
          No payments match that search.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {filtered.map((row) => (
            <SettlementRow
              key={row.id}
              row={row}
              payoutReady={payoutReady}
              channel={channel}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SettlementRow({
  row,
  payoutReady,
  channel,
}: {
  row: VendorSettlement;
  payoutReady: boolean;
  channel: string;
}) {
  const isGoods = row.kind === "goods";

  return (
    <li>
      <Link
        href={`/o/${row.publicToken}`}
        className="block px-4 py-4 transition-colors hover:bg-surface-muted"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{row.customerName}</p>
            <p className="text-xs text-ink-muted">
              {isGoods ? "Goods" : "Shipping"} ·{" "}
              <span data-numeric>{row.orderCode}</span>
            </p>
            <p className="text-xs text-ink-subtle">
              {row.dropTitle} · Batch {row.batchNumber} ·{" "}
              {formatAccraDateTime(row.paidAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] tracking-wide text-ink-subtle uppercase">
              Your share
            </p>
            <p
              className="font-display text-lg font-semibold text-open"
              data-numeric
            >
              {formatGhs(row.yourShare)}
            </p>
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          <div className="rounded-control bg-surface-muted px-3 py-2">
            <dt className="text-ink-subtle">Customer paid</dt>
            <dd className="mt-0.5 font-medium text-ink" data-numeric>
              {formatGhs(row.customerPaid)}
            </dd>
          </div>
          <div className="rounded-control bg-surface-muted px-3 py-2">
            <dt className="text-ink-subtle">
              Our fee{isGoods ? ` (${PLATFORM_FEE_PERCENT.goods}%)` : ""}
            </dt>
            <dd className="mt-0.5 font-medium text-closing" data-numeric>
              {formatGhs(row.platformFee)}
            </dd>
          </div>
          <div className="col-span-2 rounded-control bg-surface-muted px-3 py-2 sm:col-span-1">
            <dt className="text-ink-subtle">When you receive it</dt>
            <dd className="mt-0.5 font-medium text-ink">
              {!payoutReady
                ? "After Paystack verifies your payout, then next working day"
                : `Next working day to your ${channel}`}
            </dd>
          </div>
        </dl>
      </Link>
    </li>
  );
}
