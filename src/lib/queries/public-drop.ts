import "server-only";

import type { FreightMode } from "@/lib/freight";
import { isPastCutoff } from "@/lib/jobs";
import type { Pesewas } from "@/lib/money";
import type { BatchStatus } from "@/lib/status";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PublicVariant = {
  id: string;
  name: string;
  value: string;
  priceDelta: Pesewas;
  weightGrams: number | null;
  volumeCm3: number | null;
  stockLimit: number | null;
  imagePath: string | null;
};

export type PublicProduct = {
  id: string;
  name: string;
  description: string | null;
  price: Pesewas;
  categoryId: string | null;
  weightGrams: number | null;
  volumeCm3: number | null;
  stockLimit: number | null;
  moq: number;
  images: { path: string; width: number | null; height: number | null }[];
  variants: PublicVariant[];
};

export type PublicBatch = {
  id: string;
  number: number;
  status: BatchStatus;
  opensAt: string;
  closesAt: string;
  expectedDeliveryAt: string | null;
  freightMode: FreightMode;
  freightRateEstimate: Pesewas;
  orderCount: number;
  /** True once the cutoff has passed, whatever the stored status says. */
  expired: boolean;
};

export type PublicDrop = {
  vendor: {
    id: string;
    slug: string;
    businessName: string;
    logoPath: string | null;
    whatsappNumber: string | null;
    /** Google Maps pin for in-person collection. Null → pickup not offered. */
    pickupMapsUrl: string | null;
    batchesDelivered: number;
  };
  drop: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    coverPath: string | null;
  };
  categories: { id: string; name: string }[];
  products: PublicProduct[];
  /** The batch currently taking orders, if any. */
  openBatch: PublicBatch | null;
  /** The next scheduled batch, shown when nothing is open. */
  nextBatch: PublicBatch | null;
  lastBatch: PublicBatch | null;
};

/**
 * Everything the public drop page renders, resolved from the two slugs in the
 * URL. Runs as the anonymous role, so row level security is what decides what
 * a stranger can see rather than anything in this function.
 */
export async function getPublicDrop(
  vendorSlug: string,
  dropSlug: string,
): Promise<PublicDrop | null> {
  const supabase = await createClient();

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, slug, business_name, logo_path, whatsapp_number, pickup_maps_url")
    .eq("slug", vendorSlug)
    .maybeSingle();

  if (!vendor) return null;

  const { data: drop } = await supabase
    .from("drops")
    .select("id, slug, title, description, cover_path")
    .eq("vendor_id", vendor.id)
    .eq("slug", dropSlug)
    .maybeSingle();

  if (!drop) return null;

  const [{ data: batches }, { data: categories }, { data: products }] =
    await Promise.all([
      supabase
        .from("batches")
        .select(
          "id, number, status, opens_at, closes_at, expected_delivery_at, freight_mode, freight_rate_estimate",
        )
        .eq("drop_id", drop.id)
        .order("number", { ascending: false }),
      supabase
        .from("categories")
        .select("id, name")
        .eq("drop_id", drop.id)
        .order("position"),
      supabase
        .from("products")
        .select(
          "id, name, description, price, category_id, weight_grams, volume_cm3, stock_limit, moq, product_images(storage_path, width, height, position), product_variants(id, name, value, price_delta, weight_grams, volume_cm3, stock_limit, image_path, position)",
        )
        .eq("drop_id", drop.id)
        .eq("published", true)
        .order("position"),
    ]);

  // Anon RLS hides the orders table, so the public count has to be read
  // under the service role. Only paid orders count: an unpaid hold is not
  // social proof.
  const countByBatch = new Map<string, number>();
  const batchIds = (batches ?? []).map((batch) => batch.id);
  if (batchIds.length > 0) {
    const admin = createAdminClient();
    const { data: orderRows } = await admin
      .from("orders")
      .select("batch_id, status")
      .in("batch_id", batchIds);

    for (const row of orderRows ?? []) {
      if (row.status === "pending_payment" || row.status === "cancelled") {
        continue;
      }
      countByBatch.set(row.batch_id, (countByBatch.get(row.batch_id) ?? 0) + 1);
    }
  }

  const mapped = (batches ?? []).map<PublicBatch>((batch) => ({
    id: batch.id,
    number: batch.number,
    status: batch.status,
    opensAt: batch.opens_at,
    closesAt: batch.closes_at,
    expectedDeliveryAt: batch.expected_delivery_at,
    freightMode: batch.freight_mode,
    freightRateEstimate: batch.freight_rate_estimate,
    orderCount: countByBatch.get(batch.id) ?? 0,
    expired: isPastCutoff(batch.closes_at),
  }));

  const openBatch =
    mapped.find((batch) => batch.status === "open" && !batch.expired) ?? null;

  return {
    vendor: {
      id: vendor.id,
      slug: vendor.slug,
      businessName: vendor.business_name,
      logoPath: vendor.logo_path,
      whatsappNumber: vendor.whatsapp_number,
      pickupMapsUrl: vendor.pickup_maps_url,
      batchesDelivered: mapped.filter((batch) => batch.status === "settled")
        .length,
    },
    drop: {
      id: drop.id,
      slug: drop.slug,
      title: drop.title,
      description: drop.description,
      coverPath: drop.cover_path,
    },
    categories: categories ?? [],
    products: (products ?? []).map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      categoryId: product.category_id,
      weightGrams: product.weight_grams,
      volumeCm3: product.volume_cm3,
      stockLimit: product.stock_limit,
      moq: product.moq,
      images: [...(product.product_images ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((image) => ({
          path: image.storage_path,
          width: image.width,
          height: image.height,
        })),
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
    })),
    openBatch,
    nextBatch:
      mapped
        .filter((batch) => batch.status === "scheduled")
        .sort((a, b) => a.number - b.number)[0] ?? null,
    lastBatch: mapped[0] ?? null,
  };
}
