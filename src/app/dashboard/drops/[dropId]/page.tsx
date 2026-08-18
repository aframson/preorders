import { AlertTriangle, PackagePlus, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AvailabilityTag } from "@/components/product-availability-tag";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { requireVendor } from "@/lib/auth";
import { FREIGHT_MODES, type FreightMode } from "@/lib/freight";
import { formatGhsCompact } from "@/lib/money";
import type { ProductAvailability } from "@/lib/product-availability";
import { BUCKETS, publicUrl } from "@/lib/storage";
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

  // The batch cannot open while any published product is missing the
  // measurement its freight mode needs, so surface it here rather than at the
  // moment the vendor tries to open.
  const unmeasured = (products ?? []).filter(
    (product) =>
      product.published &&
      (mode === "air_kg"
        ? product.weight_grams === null
        : product.volume_cm3 === null),
  );

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
          <CategoryChip href={`/dashboard/drops/${dropId}`} active={!activeCategory}>
            All
          </CategoryChip>
          {categories.map((category) => (
            <CategoryChip
              key={category.id}
              href={`/dashboard/drops/${dropId}?category=${category.id}`}
              active={activeCategory === category.id}
            >
              {category.name}
            </CategoryChip>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={PackagePlus}
          title={activeCategory ? "Nothing in this category" : "No products yet"}
          description={
            activeCategory
              ? "Move a product into this category, or pick another one."
              : "Add three or four products to start. You can always add more while the batch is open."
          }
          action={
            <ButtonLink href={`/dashboard/drops/${dropId}/products/new`}>
              Add a product
            </ButtonLink>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((product) => {
            const cover = [...(product.product_images ?? [])].sort(
              (a, b) => a.position - b.position,
            )[0];

            const measurement =
              mode === "air_kg" ? product.weight_grams : product.volume_cm3;
            const measurementLabel =
              measurement === null
                ? null
                : mode === "air_kg"
                  ? `${(measurement / 1000).toFixed(2)} kg`
                  : `${(measurement / 1_000_000).toFixed(3)} ${FREIGHT_MODES.sea_cbm.unitLabel}`;

            return (
              <li key={product.id}>
                <Link
                  href={`/dashboard/drops/${dropId}/products/${product.id}`}
                  className="group block"
                >
                  <div className="relative aspect-4/5 overflow-hidden rounded-card border border-border bg-surface-muted">
                    {cover ? (
                      <Image
                        src={publicUrl(BUCKETS.productImages, cover.storage_path)}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                        className="object-cover transition-opacity group-hover:opacity-90"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-ink-subtle">
                        <PackagePlus className="size-6" aria-hidden />
                      </div>
                    )}

                    <AvailabilityTag
                      availability={
                        product.availability as ProductAvailability
                      }
                    />

                    {measurementLabel === null && (
                      <span className="absolute top-9 left-2 flex items-center gap-1 rounded-full bg-closing px-2 py-0.5 text-[10px] font-medium text-white">
                        <AlertTriangle className="size-3" aria-hidden />
                        No {mode === "air_kg" ? "weight" : "volume"}
                      </span>
                    )}

                    {!product.published && (
                      <span className="absolute top-2 right-2 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-medium text-white">
                        Hidden
                      </span>
                    )}
                  </div>

                  <p className="mt-2 truncate text-sm font-medium text-ink">
                    {product.name}
                  </p>
                  <p className="text-sm text-ink-muted" data-numeric>
                    {formatGhsCompact(product.price)}
                    {measurementLabel && (
                      <span className="text-ink-subtle"> &middot; {measurementLabel}</span>
                    )}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/*
        Plain Link, not ButtonLink: the button base ships `relative` + grain
        overlays that fight a viewport FAB. Keep this pinned to the corner.
      */}
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

function CategoryChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-2 text-sm transition-colors",
        active
          ? "bg-brand-700 font-medium text-white"
          : "bg-surface-muted text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
