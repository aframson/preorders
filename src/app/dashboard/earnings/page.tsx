import { Banknote, Smartphone, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/dashboard/page-header";
import { ButtonLink } from "@/components/ui/button";
import { requireVendor } from "@/lib/auth";
import { PLATFORM_FEE_PERCENT } from "@/lib/fees";
import { formatGhs } from "@/lib/money";
import { getVendorMoney } from "@/lib/queries/money";
import { formatAccraDateTime } from "@/lib/time";

export const metadata = { title: "Earnings" };

export default async function EarningsPage() {
  const vendor = await requireVendor();
  const money = await getVendorMoney(vendor.id);

  const connected = Boolean(vendor.payoutVerifiedAt);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Earnings"
        description="What you have earned, and how money reaches your mobile money."
      />

      <p className="text-sm text-ink-muted">
        <Link
          href="/dashboard/money"
          className="font-medium text-brand-700 underline-offset-2 hover:underline"
        >
          ← Transactions
        </Link>
      </p>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Net earnings" value={formatGhs(money.net)} emphasis />
        <Stat label="Inbound collected" value={formatGhs(money.inbound)} />
        <Stat
          label={`Platform fee (${PLATFORM_FEE_PERCENT.goods}%)`}
          value={formatGhs(money.outbound)}
        />
      </dl>

      <section className="space-y-4 rounded-card border border-border bg-surface p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-800 dark:bg-brand-950">
            <Wallet className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-ink">
              How cash-out works
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              There is no Preorders wallet to withdraw. Customer payments go to
              Paystack first; your share is then settled to the MoMo or bank
              account you connected — after Paystack verifies the subaccount and
              on their Ghana schedule (next working day).
            </p>
          </div>
        </div>

        <ol className="space-y-4 border-t border-border pt-4">
          <Step
            icon={Smartphone}
            title="1. Connect payouts"
            body={
              connected
                ? `Payouts are connected${
                    vendor.payoutVerifiedAt
                      ? ` (verified ${formatAccraDateTime(vendor.payoutVerifiedAt)})`
                      : " — still waiting for Paystack admin verification"
                  }. Change details anytime under More → Payments.`
                : "Link MTN / Telecel / AirtelTigo MoMo or a bank account so Paystack knows where to settle."
            }
            action={
              connected ? (
                <ButtonLink href="/dashboard/more" size="sm" variant="secondary">
                  Manage payouts
                </ButtonLink>
              ) : (
                <ButtonLink href="/onboarding/payout" size="sm">
                  Connect payouts
                </ButtonLink>
              )
            }
          />
          <Step
            icon={Banknote}
            title="2. Customer pays"
            body={`On each goods payment we keep ${PLATFORM_FEE_PERCENT.goods}% on Paystack; the rest is earmarked for your subaccount. Shipping invoices settle at 100% to you.`}
          />
          <Step
            icon={Wallet}
            title="3. Paystack pays out to MoMo / bank"
            body="Ghana settlements are next working day (not weekends/holidays). The first payout to a new or updated subaccount is held until you verify that subaccount in the Paystack dashboard — then it pays out on the next working day."
          />
        </ol>
      </section>

      {!connected && (
        <div className="rounded-card border border-closing/30 bg-closing-tint px-5 py-4">
          <p className="font-medium text-ink">Payouts are not connected</p>
          <p className="mt-1 text-sm text-ink-muted">
            Customers cannot complete live payments until MoMo is linked.
          </p>
          <ButtonLink href="/onboarding/payout" size="sm" className="mt-3">
            Connect payouts
          </ButtonLink>
        </div>
      )}

      <section className="rounded-card border border-dashed border-border px-5 py-4 text-sm text-ink-muted">
        Need the full payment history? See{" "}
        <Link
          href="/dashboard/money"
          className="font-medium text-brand-700 underline-offset-2 hover:underline"
        >
          Money → Transactions
        </Link>
        .
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-card border border-border bg-surface px-4 py-3">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd
        className={
          emphasis
            ? "mt-0.5 font-display text-xl font-semibold text-open"
            : "mt-0.5 font-display text-lg font-semibold text-ink"
        }
        data-numeric
      >
        {value}
      </dd>
    </div>
  );
}

function Step({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden />
      <div className="min-w-0 space-y-2">
        <p className="font-medium text-ink">{title}</p>
        <p className="text-sm text-ink-muted">{body}</p>
        {action}
      </div>
    </li>
  );
}
