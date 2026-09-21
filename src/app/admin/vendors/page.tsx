import { VendorList } from "@/app/admin/vendors/vendor-list";
import { PageHeader } from "@/components/dashboard/page-header";
import { getAdminVendors } from "@/lib/queries/admin-vendors";

export const metadata = { title: "Vendors · Admin" };

export default async function AdminVendorsPage() {
  const vendors = await getAdminVendors();
  const pending = vendors.filter(
    (vendor) => vendor.approvalStatus === "pending",
  ).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Vendors"
        description={
          pending > 0
            ? `${pending} vendor${pending === 1 ? "" : "s"} waiting for review`
            : "No vendors waiting for review"
        }
      />

      <VendorList vendors={vendors} />
    </div>
  );
}
