import { Banknote, HandCoins, Landmark, PackageCheck, Ship, TrendingDown, Wallet } from "lucide-react";
import Link from "next/link";

import { AdminMetric } from "@/components/admin/admin-metric";
import { DownloadCsvButton } from "@/components/admin/download-csv-button";
import {
  FilterChips,
  firstParam,
  hrefWith,
  type SearchParamsRecord,
} from "@/components/admin/filter-chips";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { PLATFORM_FEE_PERCENT } from "@/lib/fees";
import { formatGhs } from "@/lib/money";
import type { VendorFinanceRow } from "@/lib/admin-finance";
import {
  FINANCE_PERIODS,
  getAdminFinance,
  isFinancePeriod,
} from "@/lib/queries/admin-finance";
import type { Tone } from "@/lib/status";
import { formatAccraDate } from "@/lib/time";

export const metadata = { title: "Finance · Admin" };

const PATH = "/admin/finance";

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  const params = await searchParams;
  const requested = firstParam(params.period);
  const period = isFinancePeriod(requested) ? requested : "30d";
  const { totals, vendors } = await getAdminFinance(period);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Finance"
        description="Money that moved through Paystack, what the platform kept, and what was settled to vendors."
      />

      <FilterChips
        label="Period"
        options={Object.entries(FINANCE_PERIODS).map(([key, meta]) => ({
          label: meta.label,
          href: hrefWith(PATH, params, "period", key === "30d" ? undefined : key),
          active: period === key,
        }))}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminMetric icon={Banknote} label="Goods collected" value={formatGhs(totals.goodsCollected)} hint={`${totals.successCount} successful payments`} />
        <AdminMetric icon={Ship} label="Shipping collected" value={formatGhs(totals.freightCollected)} />
        <AdminMetric icon={Wallet} label="Settled to vendors" value={formatGhs(totals.vendorPayout)} />
        <AdminMetric icon={PackageCheck} label="Shipping still owed" value={formatGhs(totals.freightOutstanding)} hint="Invoiced, not yet paid" />
        <AdminMetric icon={Landmark} label="Platform fee" value={formatGhs(totals.platformFee)} hint={`${PLATFORM_FEE_PERCENT.goods}% of goods`} />
        <AdminMetric
          icon={TrendingDown}
          label="Paystack fees"
          value={formatGhs(totals.paystackFees)}
          hint={totals.unknownFeeCount > 0 ? `${totals.unknownFeeCount} payment(s) missing a fee` : "Paid by the platform"}
        />
        <AdminMetric
          icon={HandCoins}
          label="Net to platform"
          value={formatGhs(totals.netToPlatform)}
          negative={totals.netToPlatform < 0}
          hint="Platform fee minus Paystack fees"
        />
        <AdminMetric icon={TrendingDown} label="Refunded" value={formatGhs(totals.refunded)} />
      </section>

      <Card>
        <CardHeader title="How the money moves" />
        <CardBody className="space-y-2 text-sm text-ink-muted">
          <p>
            Each payment is split by Paystack at checkout. The platform keeps a flat{" "}
            {PLATFORM_FEE_PERCENT.goods}% of goods ({PLATFORM_FEE_PERCENT.freight}% of shipping),
            and the rest settles straight to the vendor&apos;s subaccount.
          </p>
          <p>
            The platform also pays Paystack&apos;s processing fee on every payment, shipping
            included. That&apos;s why net can be lower than the fee, or below zero when shipping
            makes up most of the volume.
          </p>
          {totals.unknownFeeCount > 0 && (
            <p className="text-closing">
              {totals.unknownFeeCount} successful payment(s) have no Paystack fee on record, so
              Paystack fees and net are estimates. Check those in the Paystack dashboard.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="By vendor"
          description={FINANCE_PERIODS[period].label}
          action={
            <DownloadCsvButton
              filename={`finance-${period}.csv`}
              rows={[
                ["vendor", "goods_ghs", "shipping_ghs", "platform_fee_ghs", "paystack_fees_ghs", "settled_to_vendor_ghs", "shipping_owed_ghs", "refunded_ghs", "payments", "last_payout_status"],
                ...vendors.map((row) => [
                  row.vendorName,
                  (row.goodsCollected / 100).toFixed(2),
                  (row.freightCollected / 100).toFixed(2),
                  (row.platformFee / 100).toFixed(2),
                  (row.paystackFees / 100).toFixed(2),
                  (row.vendorPayout / 100).toFixed(2),
                  (row.freightOutstanding / 100).toFixed(2),
                  (row.refunded / 100).toFixed(2),
                  row.successCount,
                  row.lastPayout?.status ?? "unknown",
                ]),
              ]}
            />
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="border-b border-border bg-surface-muted text-xs text-ink-muted">
              <tr>
                <th className="px-5 py-2.5 font-medium">Vendor</th>
                <th className="px-4 py-2.5 text-right font-medium">Goods</th>
                <th className="px-4 py-2.5 text-right font-medium">Shipping</th>
                <th className="px-4 py-2.5 text-right font-medium">Platform fee</th>
                <th className="px-4 py-2.5 text-right font-medium">Settled to vendor</th>
                <th className="px-4 py-2.5 text-right font-medium">Shipping owed</th>
                <th className="px-4 py-2.5 text-right font-medium">Refunded</th>
                <th className="px-4 py-2.5 text-left font-medium">Last payout</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((row) => (
                <tr key={row.vendorId} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <Link href={`/admin/vendors/${row.vendorId}`} className="font-medium text-ink hover:underline">
                      {row.vendorName}
                    </Link>
                    <p className="text-xs text-ink-muted">
                      <Link href={`/admin/payments?vendor=${row.vendorId}`} className="hover:underline">
                        {row.successCount} payment{row.successCount === 1 ? "" : "s"}
                      </Link>
                    </p>
                  </td>
                  <Money value={row.goodsCollected} />
                  <Money value={row.freightCollected} />
                  <Money value={row.platformFee} />
                  <Money value={row.vendorPayout} />
                  <Money value={row.freightOutstanding} />
                  <Money value={row.refunded} />
                  <td className="px-4 py-3 text-left">
                    <LastPayout payout={row.lastPayout} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {vendors.length === 0 && (
            <p className="px-5 py-12 text-center text-sm text-ink-muted">No money moved in this period.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

const PAYOUT_TONE: Record<string, Tone> = {
  success: "open",
  pending: "closing",
  processing: "closing",
  failed: "danger",
};

function LastPayout({ payout }: { payout: VendorFinanceRow["lastPayout"] }) {
  if (payout === undefined) {
    return <span className="text-xs text-ink-subtle">Not connected</span>;
  }
  if (payout === null) {
    return <span className="text-xs text-ink-subtle">Not checked</span>;
  }
  return (
    <div className="space-y-0.5">
      <StatusPill tone={PAYOUT_TONE[payout.status] ?? "neutral"}>
        {payout.status}
      </StatusPill>
      <p className="text-xs text-ink-subtle">
        {formatGhs(payout.amount)} &middot; {formatAccraDate(payout.date)}
      </p>
    </div>
  );
}

function Money({ value }: { value: number }) {
  return (
    <td className={`px-4 py-3 text-right ${value === 0 ? "text-ink-subtle" : "text-ink"}`} data-numeric>
      {formatGhs(value)}
    </td>
  );
}
