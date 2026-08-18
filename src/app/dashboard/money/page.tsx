import { Wallet } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/dashboard/page-header";
import { SearchableSettlements } from "@/components/dashboard/searchable-settlements";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { requireVendor } from "@/lib/auth";
import { PLATFORM_FEE_PERCENT } from "@/lib/fees";
import { formatGhs } from "@/lib/money";
import { getVendorMoney } from "@/lib/queries/money";
import { ORDER_STATUS } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

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
          <SearchableSettlements
            settlements={money.settlements}
            payoutReady={payoutReady}
            channel={channel}
          />
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
