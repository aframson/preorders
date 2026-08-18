import { AlertTriangle, PackagePlus, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SearchableProductGrid } from "@/components/dashboard/searchable-product-grid";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { NavChip } from "@/components/ui/nav-chip";
import { requireVendor } from "@/lib/auth";
import type { FreightMode } from "@/lib/freight";
import type { ProductAvailability } from "@/lib/product-availability";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Products" };

export default async function DropProductsPage({
  params,
  searchParams,
}: PageProps<"/dashboard/drops/[dropId]">) {
  const { dropId } = await params;
  const query = await searchParams;
  const activeCategory =
    typeof query.category === "string" ? query.category : null;

  await requireVendor();
  const supabase = await createClient();

  const { data: drop } = await supabase
    .from("drops")
    .select("id, default_freight_mode")
    .eq("id", dropId)
    .maybeSingle();

  if (!drop) notFound();

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .eq("drop_id", dropId)
      .order("position"),
    supabase
      .from("products")
      .select(
        "id, name, price, published, stock_limit, weight_grams, volume_cm3, category_id, availability, product_images(storage_path, position)",
      )
      .eq("drop_id", dropId)
      .order("position"),
  ]);

  const mode = drop.default_freight_mode as FreightMode;
  const visible = activeCategory
    ? (products ?? []).filter((product) => product.category_id === activeCategory)
    : (products ?? []);

  const unmeasured = (products ?? []).filter(
    (product) =>
      product.published &&
      (mode === "air_kg"
        ? product.weight_grams === null
        : product.volume_cm3 === null),
  );

  const cards = visible.map((product) => {
    const cover = [...(product.product_images ?? [])].sort(
      (a, b) => a.position - b.position,
    )[0];
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      published: product.published,
      weightGrams: product.weight_grams,
      volumeCm3: product.volume_cm3,
      availability: product.availability as ProductAvailability,
      coverPath: cover?.storage_path ?? null,
    };
  });

  return (
    <>
      {unmeasured.length > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-card border border-closing/40 bg-closing-tint px-4 py-3.5">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-closing"
            aria-hidden
          />
          <div className="text-sm">
            <p className="font-medium text-ink">
              {unmeasured.length}{" "}
              {unmeasured.length === 1 ? "product needs" : "products need"} a{" "}
              {mode === "air_kg" ? "weight" : "volume"}
            </p>
            <p className="mt-0.5 text-ink-muted">
              Your batch cannot open until every product can be costed for
              shipping.
            </p>
          </div>
        </div>
      )}

      {categories && categories.length > 0 && (
        <div className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 scrollbar-none lg:-mx-8 lg:px-8">
          <NavChip href={`/dashboard/drops/${dropId}`} active={!activeCategory}>
            All
          </NavChip>
          {categories.map((category) => (
            <NavChip
              key={category.id}
              href={`/dashboard/drops/${dropId}?category=${category.id}`}
              active={activeCategory === category.id}
            >
              {category.name}
            </NavChip>
          ))}
        </div>
      )}

      {products?.length === 0 ? (
        <EmptyState
          icon={PackagePlus}
          title="No products yet"
          description="Add three or four products to start. You can always add more while the batch is open."
          action={
            <ButtonLink href={`/dashboard/drops/${dropId}/products/new`}>
              Add a product
            </ButtonLink>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={PackagePlus}
          title="Nothing in this category"
          description="Move a product into this category, or pick another one."
          action={
            <ButtonLink href={`/dashboard/drops/${dropId}/products/new`}>
              Add a product
            </ButtonLink>
          }
        />
      ) : (
        <SearchableProductGrid dropId={dropId} mode={mode} products={cards} />
      )}

      <Link
        href={`/dashboard/drops/${dropId}/products/new`}
        aria-label="Add product"
        className="grain-ink fixed right-5 bottom-24 z-40 flex size-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-sheet hover:bg-brand-800 lg:right-8 lg:bottom-8"
      >
        <Plus className="size-6" aria-hidden />
      </Link>
    </>
  );
}
