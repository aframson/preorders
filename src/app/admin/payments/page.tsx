import Link from "next/link";

import { PaymentsTable } from "@/app/admin/payments/payments-table";
import {
  FilterChips,
  firstParam,
  hrefWith,
  type SearchParamsRecord,
} from "@/components/admin/filter-chips";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  isPaymentStatus,
  isPaymentType,
  PAYMENT_STATUS,
  PAYMENT_TYPE_LABEL,
} from "@/lib/payment-status";
import { ADMIN_PAYMENTS_LIMIT, getAdminPayments } from "@/lib/queries/admin-payments";

export const metadata = { title: "Payments · Admin" };

const PATH = "/admin/payments";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  const params = await searchParams;
  const status = firstParam(params.status);
  const type = firstParam(params.type);
  const vendorId = firstParam(params.vendor);

  const payments = await getAdminPayments({
    status: isPaymentStatus(status) ? status : undefined,
    type: isPaymentType(type) ? type : undefined,
    vendorId: vendorId && /^[0-9a-f-]{36}$/i.test(vendorId) ? vendorId : undefined,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title="Payments"
        description={`Every Paystack checkout across all shops, newest first. Showing up to ${ADMIN_PAYMENTS_LIMIT}.`}
      />

      {vendorId && (
        <p className="rounded-control bg-surface-muted px-4 py-2.5 text-sm text-ink">
          Only payments for {payments[0]?.vendor.name ?? "this vendor"}.{" "}
          <Link href={hrefWith(PATH, params, "vendor", undefined)} className="font-medium underline">
            Show all vendors
          </Link>
        </p>
      )}

      <FilterChips
        label="Payment status"
        options={[
          { label: "All statuses", href: hrefWith(PATH, params, "status", undefined), active: !isPaymentStatus(status) },
          ...Object.entries(PAYMENT_STATUS).map(([key, meta]) => ({
            label: meta.label,
            href: hrefWith(PATH, params, "status", key),
            active: status === key,
          })),
        ]}
      />
      <FilterChips
        label="Payment type"
        options={[
          { label: "Goods and shipping", href: hrefWith(PATH, params, "type", undefined), active: !isPaymentType(type) },
          ...Object.entries(PAYMENT_TYPE_LABEL).map(([key, label]) => ({
            label,
            href: hrefWith(PATH, params, "type", key),
            active: type === key,
          })),
        ]}
      />

      <PaymentsTable payments={payments} />
    </div>
  );
}
