import { randomUUID } from "node:crypto";

import { PageHeader } from "@/components/dashboard/page-header";
import { ButtonLink } from "@/components/ui/button";
import { requireVendor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getVendorApproval } from "@/lib/vendor-approval";
import { ProductForm } from "../product-form";

export const metadata = { title: "Add product" };

export default async function NewProductPage({
  params,
}: PageProps<"/dashboard/drops/[dropId]/products/new">) {
  const { dropId } = await params;
  const vendor = await requireVendor();
  const approval = await getVendorApproval(vendor);

  if (!approval.approved) {
    return (
      <>
        <PageHeader title="Add product" />
        <div className="max-w-lg space-y-4 rounded-card border border-closing/30 bg-closing-tint px-5 py-5 text-sm text-ink">
          <p className="font-medium">
            {approval.status === "missing_payout"
              ? "Connect payouts first"
              : approval.status === "rejected"
                ? "Your account needs attention"
                : "Preorders approval required"}
          </p>
          <p className="text-ink-muted">
            {approval.status === "missing_payout"
              ? "Connect your MoMo or bank account before adding products."
              : approval.status === "rejected"
                ? approval.note ??
                  "Review your payout details, then submit them again."
                : "Your payout details are in the review queue. You can add products once an admin approves them."}
          </p>
          <ButtonLink
            href={
              approval.status === "missing_payout"
                ? "/onboarding/payout"
                : "/dashboard/more"
            }
            size="sm"
          >
            {approval.status === "missing_payout"
              ? "Connect payouts"
              : "See review status"}
          </ButtonLink>
        </div>
      </>
    );
  }

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("drop_id", dropId)
    .order("position");

  // Photos upload straight to storage under a product folder, so the id has to
  // exist before the row does.
  const productId = randomUUID();

  return (
    <>
      <PageHeader title="Add product" />
      <ProductForm
        vendorId={vendor.id}
        dropId={dropId}
        productId={productId}
        categories={categories ?? []}
        initial={{
          name: "",
          description: "",
          price: 0,
          categoryId: null,
          weightGrams: null,
          volumeCm3: null,
          stockLimit: null,
          moq: 1,
          availability: "preorder",
          published: true,
          variants: [],
          images: [],
        }}
      />
    </>
  );
}
