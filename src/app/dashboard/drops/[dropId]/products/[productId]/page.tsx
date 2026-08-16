import { notFound } from "next/navigation";

import { PageHeader } from "@/components/dashboard/page-header";
import { requireVendor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "../product-form";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
}: PageProps<"/dashboard/drops/[dropId]/products/[productId]">) {
  const { dropId, productId } = await params;
  const vendor = await requireVendor();

  const supabase = await createClient();

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, description, price, category_id, weight_grams, volume_cm3, stock_limit, moq, published, product_variants(id, name, value, price_delta, weight_grams, volume_cm3, stock_limit, image_path, position), product_images(storage_path, width, height, position)",
      )
      .eq("id", productId)
      .eq("drop_id", dropId)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id, name")
      .eq("drop_id", dropId)
      .order("position"),
  ]);

  if (!product) notFound();

  return (
    <>
      <PageHeader title={product.name} />
      <ProductForm
        vendorId={vendor.id}
        dropId={dropId}
        productId={product.id}
        categories={categories ?? []}
        initial={{
          id: product.id,
          name: product.name,
          description: product.description ?? "",
          price: product.price,
          categoryId: product.category_id,
          weightGrams: product.weight_grams,
          volumeCm3: product.volume_cm3,
          stockLimit: product.stock_limit,
          moq: product.moq,
          published: product.published,
          variants: [...(product.product_variants ?? [])]
            .sort((a, b) => a.position - b.position)
            .map((variant) => ({
              id: variant.id,
              name: variant.name,
              value: variant.value,
              priceDelta: variant.price_delta,
              weightGrams: variant.weight_grams,
              volumeCm3: variant.volume_cm3,
              stockLimit: variant.stock_limit,
              imagePath: variant.image_path,
            })),
          images: [...(product.product_images ?? [])]
            .sort((a, b) => a.position - b.position)
            .map((image) => ({
              path: image.storage_path,
              width: image.width ?? 0,
              height: image.height ?? 0,
            })),
        }}
      />
    </>
  );
}
