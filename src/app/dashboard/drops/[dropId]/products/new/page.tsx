import { randomUUID } from "node:crypto";

import { PageHeader } from "@/components/dashboard/page-header";
import { requireVendor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "../product-form";

export const metadata = { title: "Add product" };

export default async function NewProductPage({
  params,
}: PageProps<"/dashboard/drops/[dropId]/products/new">) {
  const { dropId } = await params;
  const vendor = await requireVendor();

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
