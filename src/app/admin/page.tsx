import {
  AlertOctagon,
  Banknote,
  CheckCircle2,
  ChevronRight,
  HandCoins,
  PackageCheck,
  Search,
  Ship,
  ShoppingBag,
  Store,
  Timer,
} from "lucide-react";
import Link from "next/link";

import { AdminMetric } from "@/components/admin/admin-metric";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/cn";
import { formatGhs } from "@/lib/money";
import { PAYMENT_STATUS, PAYMENT_TYPE_LABEL } from "@/lib/payment-status";
import { getAdminFinance } from "@/lib/queries/admin-finance";
import { countHealthIssues, getAdminHealth } from "@/lib/queries/admin-health";
import { getAdminOverviewCounts } from "@/lib/queries/admin-overview";
import { getAdminPayments } from "@/lib/queries/admin-payments";
import { getAdminVendors } from "@/lib/queries/admin-vendors";
import { formatAccraDateTime } from "@/lib/time";

export const metadata = { title: "Overview · Admin" };

export default async function AdminOverviewPage() {
  const [finance, health, recent, vendors, counts] = await Promise.all([
    getAdminFinance("30d"),
    getAdminHealth(),
    getAdminPayments({ limit: 8 }),
    getAdminVendors(),
    getAdminOverviewCounts(),
  ]);

  const issues = countHealthIssues(health);
  const pendingReview = vendors.filter((vendor) => vendor.approvalStatus === "pending").length;
  const { totals } = finance;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Overview" description="Last 30 days across every shop." />

      <form action="/admin/orders" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <label htmlFor="admin-find" className="sr-only">Find an order</label>
          <input
            id="admin-find"
            name="q"
            type="search"
            placeholder="Find an order: code, Paystack reference, phone or email"
            className="h-11 w-full rounded-control border border-border-strong bg-surface pr-3 pl-10 text-ink shadow-sm placeholder:text-ink-subtle focus:border-ink focus:ring-1 focus:ring-ink focus:outline-none"
          />
        </div>
        <Button type="submit">Find</Button>
      </form>

      <Link
        href="/admin/health"
        className={cn(
          "flex items-center gap-3 rounded-card border px-4 py-3 text-sm transition-colors",
          issues.critical > 0
            ? "border-danger/40 bg-danger-tint text-ink hover:bg-danger/10"
            : issues.warning > 0
              ? "border-closing/30 bg-closing-tint text-ink hover:bg-closing/10"
              : "border-open/30 bg-open-tint text-ink",
        )}
      >
        {issues.critical + issues.warning > 0 ? (
          <AlertOctagon className={cn("size-5 shrink-0", issues.critical > 0 ? "text-danger" : "text-closing")} aria-hidden />
        ) : (
          <CheckCircle2 className="size-5 shrink-0 text-open" aria-hidden />
        )}
        <span className="flex-1">
          {issues.critical + issues.warning === 0
            ? "All health checks are passing."
            : `${issues.critical} critical and ${issues.warning} other issue${issues.warning === 1 ? "" : "s"} need attention.`}
        </span>
        <ChevronRight className="size-4 shrink-0 text-ink-subtle" aria-hidden />
      </Link>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminMetric icon={Banknote} label="Goods collected" value={formatGhs(totals.goodsCollected)} />
        <AdminMetric icon={Ship} label="Shipping collected" value={formatGhs(totals.freightCollected)} />
        <AdminMetric
          icon={HandCoins}
          label="Net to platform"
          value={formatGhs(totals.netToPlatform)}
          negative={totals.netToPlatform < 0}
          hint="After Paystack fees"
        />
        <AdminMetric icon={PackageCheck} label="Shipping still owed" value={formatGhs(totals.freightOutstanding)} hint="Right now" />
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <QuickLink href="/admin/vendors" icon={Store} label="Vendors waiting for review" value={pendingReview} />
        <QuickLink href="/admin/payments?status=success&type=goods" icon={ShoppingBag} label="Paid orders" value={counts.paidOrders30d} />
        <QuickLink icon={Timer} label="Batches open for orders now" value={counts.openBatches} />
      </section>

      <Card>
        <CardHeader
          title="Latest payments"
          action={
            <Link href="/admin/payments" className="text-sm font-medium text-ink-muted hover:text-ink">
              All payments
            </Link>
          }
        />
        <ul className="divide-y divide-border">
          {recent.map((payment) => (
            <li key={payment.id}>
              <Link
                href={`/admin/orders/${payment.order.id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm hover:bg-surface-muted"
              >
                <span className="font-medium text-ink" data-numeric>{payment.order.code}</span>
                <span className="text-ink-muted">
                  {PAYMENT_TYPE_LABEL[payment.type]} · {payment.vendor.name}
                </span>
                <span className="ml-auto flex items-center gap-3">
                  <span className="text-ink" data-numeric>{formatGhs(payment.amount)}</span>
                  <StatusPill tone={PAYMENT_STATUS[payment.status].tone}>
                    {PAYMENT_STATUS[payment.status].label}
                  </StatusPill>
                  <span className="hidden text-xs text-ink-subtle sm:inline">
                    {formatAccraDateTime(payment.createdAt)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
          {recent.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-ink-muted">No payments yet.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
  value,
}: {
  href?: string;
  icon: typeof Store;
  label: string;
  value: number;
}) {
  const body = (
    <>
      <Icon className="size-4 shrink-0 text-ink-muted" aria-hidden />
      <span className="flex-1 text-sm text-ink-muted">{label}</span>
      <span className="font-display text-lg font-semibold text-ink" data-numeric>{value}</span>
    </>
  );
  const className = "flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3";

  return href ? (
    <Link href={href} className={cn(className, "transition-colors hover:bg-surface-muted")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
