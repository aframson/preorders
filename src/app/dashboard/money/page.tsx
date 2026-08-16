import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/dashboard/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/cn";
import { requireVendor } from "@/lib/auth";
import { PLATFORM_FEE_PERCENT } from "@/lib/fees";
import { formatGhs } from "@/lib/money";
import { isPaystackConfigured, paystackMode } from "@/lib/paystack";
import {
  getVendorMoney,
  type VendorTransaction,
} from "@/lib/queries/money";
import { ORDER_STATUS } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";
import { formatAccraDateTime } from "@/lib/time";

export const metadata = { title: "Money" };

export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const vendor = await requireVendor();
  const query = await searchParams;
  const tab =
    query.tab === "outbound" || query.tab === "inbound" ? query.tab : "all";

  const money = await getVendorMoney(vendor.id);
  const supabase = await createClient();

  const { data: drops } = await supabase
    .from("drops")
    .select(
      "id, title, batches(id, number, orders(id, status, freight_amount, freight_paid_at, code, customers(name)))",
    )
    .eq("vendor_id", vendor.id)
    .is("archived_at", null);

  const outstanding = (drops ?? []).flatMap((drop) =>
    (drop.batches ?? []).flatMap((batch) =>
      (batch.orders ?? [])
        .filter(
          (order) =>
            order.status === "awaiting_freight" && !order.freight_paid_at,
        )
        .map((order) => ({
          id: order.id,
          code: order.code,
          name: order.customers?.name ?? "Unknown",
          amount: order.freight_amount ?? 0,
          dropTitle: drop.title,
          batchNumber: batch.number,
        })),
    ),
  );

  const paystackReady = isPaystackConfigured();
  const mode = paystackMode();

  const visible =
    tab === "all"
      ? money.transactions
      : money.transactions.filter((row) => row.direction === tab);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Money"
        description="Inbound customer payments, outbound platform fees, and every order transaction."
      />

      <p className="text-sm text-ink-muted">
        <Link
          href="/dashboard/earnings"
          className="font-medium text-brand-700 underline-offset-2 hover:underline"
        >
          Earnings & how to cash out →
        </Link>
      </p>

      <div
        className={
          paystackReady
            ? "rounded-card border border-open/30 bg-open-tint px-5 py-4"
            : "rounded-card border border-closing/30 bg-closing-tint px-5 py-4"
        }
      >
        <p className="font-medium text-ink">
          Paystack {mode} mode · {paystackReady ? "connected" : "keys missing"}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {paystackReady
            ? mode === "test"
              ? "Using test keys. Charges will not move real money."
              : "Using live keys. Customer payments are real."
            : "Add PAYSTACK_TEST_* or PAYSTACK_LIVE_* keys in .env.local and restart. See More → Payments."}
        </p>
      </div>

      {!vendor.payoutVerifiedAt && (
        <div className="rounded-card border border-closing/30 bg-closing-tint px-5 py-4">
          <p className="font-medium text-ink">Payouts are not connected</p>
          <p className="mt-1 text-sm text-ink-muted">
            Customers cannot pay you until a mobile money number is linked.
          </p>
          <ButtonLink href="/onboarding/payout" size="sm" className="mt-3">
            Connect payouts
          </ButtonLink>
        </div>
      )}

      <section aria-label="Revenue summary">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Inbound"
            hint="Goods + shipping paid"
            value={formatGhs(money.inbound)}
            tone="in"
          />
          <Stat
            label="Outbound"
            hint={`Platform fee (${PLATFORM_FEE_PERCENT.goods}%)`}
            value={formatGhs(money.outbound)}
            tone="out"
          />
          <Stat
            label="Net to you"
            hint="Inbound − fee"
            value={formatGhs(money.net)}
            tone="net"
          />
          <Stat
            label="Shipping in"
            hint="Pass-through, no fee"
            value={formatGhs(money.freightInbound)}
          />
        </dl>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">
              Transactions
            </h2>
            <p className="text-sm text-ink-muted">
              Every successful payment across your orders.
            </p>
          </div>
          <TabLinks active={tab} />
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No transactions yet"
            description="When a customer pays for goods or shipping, the row lands here."
          />
        ) : (
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {visible.map((row) => (
              <TransactionRow key={row.id} row={row} />
            ))}
          </ul>
        )}
      </section>

      {outstanding.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">
              Outstanding shipping
            </h2>
            <p className="text-sm text-ink-muted">
              Invoiced but not yet paid by the customer.
            </p>
          </div>
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {outstanding.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{row.name}</p>
                  <p className="text-xs text-ink-subtle" data-numeric>
                    {row.code} · {row.dropTitle} · Batch {row.batchNumber}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p
                    className="font-display font-semibold text-ink"
                    data-numeric
                  >
                    {formatGhs(row.amount)}
                  </p>
                  <StatusPill tone={ORDER_STATUS.awaiting_freight.tone}>
                    Due
                  </StatusPill>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TabLinks({ active }: { active: "all" | "inbound" | "outbound" }) {
  const tabs = [
    { id: "all" as const, label: "All", href: "/dashboard/money" },
    {
      id: "inbound" as const,
      label: "Inbound",
      href: "/dashboard/money?tab=inbound",
    },
    {
      id: "outbound" as const,
      label: "Outbound",
      href: "/dashboard/money?tab=outbound",
    },
  ];

  return (
    <div className="flex rounded-control border border-border bg-surface p-0.5 text-sm">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={cn(
            "rounded-[calc(var(--radius-control)-2px)] px-3 py-1.5 transition-colors",
            active === tab.id
              ? "bg-brand-50 font-medium text-brand-800 dark:bg-brand-950/60 dark:text-brand-100"
              : "text-ink-muted hover:text-ink",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

function TransactionRow({ row }: { row: VendorTransaction }) {
  const inbound = row.direction === "inbound";
  const label =
    row.kind === "goods"
      ? "Goods payment"
      : row.kind === "freight"
        ? "Shipping payment"
        : "Platform fee";

  return (
    <li>
      <Link
        href={`/o/${row.publicToken}`}
        className="flex items-start justify-between gap-4 px-4 py-3 transition-colors hover:bg-surface-muted"
      >
        <div className="flex min-w-0 gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
              inbound ? "bg-open-tint text-open" : "bg-closing-tint text-closing",
            )}
            aria-hidden
          >
            {inbound ? (
              <ArrowDownLeft className="size-4" />
            ) : (
              <ArrowUpRight className="size-4" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{row.customerName}</p>
            <p className="text-xs text-ink-muted">
              {label} · <span data-numeric>{row.orderCode}</span>
            </p>
            <p className="text-xs text-ink-subtle">
              {row.dropTitle} · Batch {row.batchNumber} ·{" "}
              {formatAccraDateTime(row.paidAt)}
            </p>
          </div>
        </div>
        <p
          className={cn(
            "shrink-0 font-display font-semibold tabular-nums",
            inbound ? "text-open" : "text-closing",
          )}
          data-numeric
        >
          {inbound ? "+" : "−"}
          {formatGhs(row.amount)}
        </p>
      </Link>
    </li>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "in" | "out" | "net";
}) {
  return (
    <div className="rounded-card border border-border bg-surface px-4 py-3">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 font-display text-lg font-semibold",
          tone === "in" && "text-open",
          tone === "out" && "text-closing",
          tone === "net" && "text-ink",
          !tone && "text-ink",
        )}
        data-numeric
      >
        {value}
      </dd>
      {hint && <p className="mt-0.5 text-[11px] text-ink-subtle">{hint}</p>}
    </div>
  );
}
