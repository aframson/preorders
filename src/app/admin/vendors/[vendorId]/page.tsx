import {
  ArrowLeft,
  Boxes,
  ExternalLink,
  Package,
  ShoppingBag,
  Users,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApprovalActions } from "@/app/admin/vendors/[vendorId]/approval-actions";
import { StatusBadge } from "@/app/admin/vendors/vendor-list";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatGhs } from "@/lib/money";
import {
  fetchSubaccount,
  isPaystackConfigured,
  PaystackError,
} from "@/lib/paystack";
import {
  getAdminVendor,
  maskAccountNumber,
} from "@/lib/queries/admin-vendors";

export const metadata = { title: "Vendor review · Admin" };

export default async function AdminVendorPage({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}) {
  const { vendorId } = await params;
  const vendor = await getAdminVendor(vendorId);
  if (!vendor) notFound();

  let paystackStatus: "verified" | "unverified" | "unavailable" | "not_connected" =
    vendor.paystackSubaccountCode ? "unavailable" : "not_connected";

  if (vendor.paystackSubaccountCode && isPaystackConfigured()) {
    try {
      const subaccount = await fetchSubaccount(vendor.paystackSubaccountCode);
      paystackStatus = subaccount.isVerified ? "verified" : "unverified";
    } catch (error) {
      if (!(error instanceof PaystackError)) {
        console.error("[admin/vendor] Paystack status failed", error);
      }
    }
  }

  const payoutComplete = Boolean(
    vendor.paystackSubaccountCode &&
      vendor.payoutBankCode &&
      vendor.payoutAccountNumber &&
      vendor.payoutAccountName,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <Link
          href="/admin/vendors"
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Vendors
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
                {vendor.businessName}
              </h1>
              <StatusBadge status={vendor.approval.status} />
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Registered {formatDate(vendor.createdAt)}
            </p>
          </div>
          <Link
            href={`/${vendor.slug}`}
            target="_blank"
            className="inline-flex h-10 items-center gap-2 rounded-control border border-border bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-muted"
          >
            Open shop
            <ExternalLink className="size-4" aria-hidden />
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric icon={Boxes} label="Drops" value={vendor.metrics.drops} />
        <Metric icon={Package} label="Products" value={vendor.metrics.products} />
        <Metric icon={Users} label="Customers" value={vendor.metrics.customers} />
        <Metric icon={ShoppingBag} label="Paid orders" value={vendor.metrics.orders} />
        <Metric
          icon={WalletCards}
          label="Goods value"
          value={formatGhs(vendor.metrics.paidOrderValue)}
          wide
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Business details" />
          <CardBody>
            <DetailList
              rows={[
                ["Shop link", `/${vendor.slug}`],
                ["Email", vendor.supportEmail ?? "Not set"],
                ["WhatsApp", vendor.whatsappNumber ?? "Not set"],
                ["Pickup map", vendor.pickupMapsUrl ? "Connected" : "Not set"],
                ["Last updated", formatDate(vendor.updatedAt)],
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Payout destination"
            description="Resolved by Paystack before the vendor saved it."
          />
          <CardBody>
            <DetailList
              rows={[
                [
                  "Method",
                  vendor.payoutChannel === "bank"
                    ? "Bank account"
                    : vendor.payoutChannel === "mobile_money"
                      ? "Mobile money"
                      : "Not connected",
                ],
                ["Account name", vendor.payoutAccountName ?? "Not resolved"],
                ["Bank / network", vendor.payoutBankCode ?? "Not set"],
                ["Account", maskAccountNumber(vendor.payoutAccountNumber)],
                ["Subaccount", vendor.paystackSubaccountCode ?? "Not connected"],
                [
                  "Paystack status",
                  paystackStatus === "not_connected"
                    ? "Not connected"
                    : paystackStatus === "verified"
                      ? "Verified by Paystack"
                      : paystackStatus === "unverified"
                        ? "Not verified by Paystack"
                        : "Could not check",
                ],
              ]}
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Preorders review"
          description="This approval controls products, batches, checkout and payment."
        />
        <CardBody className="space-y-5">
          {vendor.approval.note ? (
            <div className="rounded-control bg-surface-muted px-4 py-3 text-sm">
              <p className="font-medium text-ink">Latest review note</p>
              <p className="mt-1 text-ink-muted">{vendor.approval.note}</p>
              {vendor.approval.reviewedAt ? (
                <p className="mt-2 text-xs text-ink-subtle">
                  Reviewed {formatDate(vendor.approval.reviewedAt)}
                </p>
              ) : null}
            </div>
          ) : null}
          <ApprovalActions
            vendorId={vendor.id}
            payoutComplete={payoutComplete}
          />
        </CardBody>
      </Card>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  wide = false,
}: {
  icon: typeof Boxes;
  label: string;
  value: string | number;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-card border border-border bg-surface p-4 ${wide ? "col-span-2 lg:col-span-1" : ""}`}
    >
      <Icon className="size-4 text-brand-700" aria-hidden />
      <p className="mt-3 text-xs text-ink-muted">{label}</p>
      <p className="mt-0.5 truncate font-display text-lg font-semibold text-ink">
        {value}
      </p>
    </div>
  );
}

function DetailList({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="space-y-3 text-sm">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-start justify-between gap-4 border-b border-border/60 pb-3 last:border-0 last:pb-0"
        >
          <dt className="text-ink-muted">{label}</dt>
          <dd className="max-w-[65%] break-words text-right font-medium text-ink">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
