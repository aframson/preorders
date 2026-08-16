import { Wallet } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/dashboard/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { requireVendor } from "@/lib/auth";
import { PLATFORM_FEE_PERCENT } from "@/lib/fees";
import { formatGhs } from "@/lib/money";
import { isPaystackConfigured, paystackMode } from "@/lib/paystack";
import {
  getVendorMoney,
  type VendorSettlement,
} from "@/lib/queries/money";
import { ORDER_STATUS } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";
import { formatAccraDateTime } from "@/lib/time";

export const metadata = { title: "Money" };

export default async function MoneyPage() {
  const vendor = await requireVendor();
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
  const payoutReady = Boolean(vendor.payoutVerifiedAt);
  const channel =
    vendor.payoutChannel === "bank" ? "bank account" : "mobile money";

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Money"
        description="What customers paid, what you keep, and when Paystack pays you out. There is no wallet inside Preorders."
      />

      <section className="space-y-3 rounded-card border border-border bg-surface p-5">
        <h2 className="font-display text-base font-semibold text-ink">
          How you get paid
        </h2>
        <ul className="space-y-2 text-sm text-ink-muted">
          <li>
            Customer pays → Paystack holds the money briefly → your share goes
            to your connected {channel}.
          </li>
          <li>
            On goods we keep{" "}
            <span className="font-medium text-ink">
              {PLATFORM_FEE_PERCENT.goods}%
            </span>
            . Shipping is 100% yours.
          </li>
          <li>
            Ghana payouts are{" "}
            <span className="font-medium text-ink">next working day</span>{" "}
            (not weekends or holidays). The first payout waits until your
            Paystack subaccount is verified.
          </li>
        </ul>
        <p className="text-sm">
          <Link
            href="/dashboard/earnings"
            className="font-medium text-brand-700 underline-offset-2 hover:underline"
          >
            More detail on earnings →
          </Link>
        </p>
      </section>

      <div
        className={
          paystackReady
            ? "rounded-card border border-open/30 bg-open-tint px-5 py-4"
            : "rounded-card border border-closing/30 bg-closing-tint px-5 py-4"
        }
      >
        <p className="font-medium text-ink">
          Paystack {mode} · {paystackReady ? "connected" : "keys missing"}
          {payoutReady ? " · payout verified" : " · payout pending verification"}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {mode === "test"
            ? "Test mode: charges do not move real MoMo money."
            : payoutReady
              ? `Live mode. Your share settles to your ${channel} on Paystack’s next working-day payout.`
              : "Live mode, but Paystack still needs the subaccount verified before the first MoMo/bank payout leaves."}
        </p>
      </div>

      {!vendor.paystackSubaccountCode && (
        <div className="rounded-card border border-closing/30 bg-closing-tint px-5 py-4">
          <p className="font-medium text-ink">Connect payouts to receive money</p>
          <p className="mt-1 text-sm text-ink-muted">
            Link MoMo or a bank account so Paystack knows where your share
            should go.
          </p>
          <ButtonLink href="/onboarding/payout?from=more" size="sm" className="mt-3">
            Connect payouts
          </ButtonLink>
        </div>
      )}

      <section aria-label="Totals">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat
            label="Customers paid"
            hint="All successful charges"
            value={formatGhs(money.inbound)}
          />
          <Stat
            label={`Our fee (${PLATFORM_FEE_PERCENT.goods}%)`}
            hint="Kept on Paystack"
            value={formatGhs(money.outbound)}
            tone="out"
          />
          <Stat
            label="Your share"
            hint="What settles to you"
            value={formatGhs(money.net)}
            tone="net"
          />
        </dl>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-base font-semibold text-ink">
            Payments
          </h2>
          <p className="text-sm text-ink-muted">
            Each row shows what the customer paid and what you should receive.
          </p>
        </div>

        {money.settlements.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No payments yet"
            description="When a customer pays for goods or shipping, the split appears here."
          />
        ) : (
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {money.settlements.map((row) => (
              <SettlementRow
                key={row.id}
                row={row}
                payoutReady={payoutReady}
                channel={channel}
              />
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

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "out" | "net";
}) {
  return (
    <div className="rounded-card border border-border bg-surface px-4 py-3">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd
        className={
          tone === "out"
            ? "mt-0.5 font-display text-lg font-semibold text-closing"
            : tone === "net"
              ? "mt-0.5 font-display text-lg font-semibold text-open"
              : "mt-0.5 font-display text-lg font-semibold text-ink"
        }
        data-numeric
      >
        {value}
      </dd>
      {hint && <p className="mt-0.5 text-[11px] text-ink-subtle">{hint}</p>}
    </div>
  );
}
