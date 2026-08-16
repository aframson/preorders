import { randomUUID } from "node:crypto";

import { PageHeader } from "@/components/dashboard/page-header";
import { ButtonLink } from "@/components/ui/button";
import { requireVendor } from "@/lib/auth";
import { syncVendorPayoutStatus } from "@/lib/payout-verification";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "../product-form";

export const metadata = { title: "Add product" };

export default async function NewProductPage({
  params,
}: PageProps<"/dashboard/drops/[dropId]/products/new">) {
  const { dropId } = await params;
  const vendor = await requireVendor();
  const payout = await syncVendorPayoutStatus(vendor);

  if (!payout.verified) {
    return (
      <>
        <PageHeader title="Add product" />
        <div className="max-w-lg space-y-4 rounded-card border border-closing/30 bg-closing-tint px-5 py-5 text-sm text-ink">
          <p className="font-medium">
            {payout.connected
              ? "Paystack verification required"
              : "Connect payouts first"}
          </p>
          <p className="text-ink-muted">
            {payout.connected
              ? "Your payout account is connected but still unverified on Paystack. Once an admin verifies the subaccount, you can upload products."
              : "Connect your MoMo number, then wait for Paystack verification before adding products."}
          </p>
          <ButtonLink
            href={payout.connected ? "/dashboard/more" : "/onboarding/payout"}
            size="sm"
          >
            {payout.connected ? "Check verification status" : "Connect payouts"}
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
          published: true,
          variants: [],
          images: [],
        }}
      />
    </>
  );
}
