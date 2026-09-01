import { Store } from "lucide-react";

import { VendorList } from "@/app/admin/vendors/vendor-list";
import { getAdminVendors } from "@/lib/queries/admin-vendors";

export const metadata = { title: "Vendors · Admin" };

export default async function AdminVendorsPage() {
  const vendors = await getAdminVendors();
  const pending = vendors.filter(
    (vendor) => vendor.approvalStatus === "pending",
  ).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-card bg-brand-100 text-brand-800">
          <Store className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Vendors
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {pending > 0
              ? `${pending} vendor${pending === 1 ? "" : "s"} waiting for review`
              : "No vendors waiting for review"}
          </p>
        </div>
      </header>

      <VendorList vendors={vendors} />
    </div>
  );
}
