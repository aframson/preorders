import "server-only";

import { isPastCutoff } from "@/lib/jobs";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKETS, publicUrl } from "@/lib/storage";

export type VendorShareCard = {
  businessName: string;
  slug: string;
  logoUrl: string | null;
  openBatchCount: number;
  openDropTitles: string[];
  batchesDelivered: number;
  ratingAverage: number | null;
  reviewCount: number;
};

/**
 * Lean fields for the vendor landing OG / Twitter card.
 */
export async function getVendorShareCard(
  vendorSlug: string,
): Promise<VendorShareCard | null> {
  const admin = createAdminClient();

  const { data: vendor } = await admin
    .from("vendors")
    .select("id, slug, business_name, logo_path")
    .eq("slug", vendorSlug)
    .maybeSingle();

  if (!vendor) return null;

  const { data: drops } = await admin
    .from("drops")
    .select(
      "title, published, archived_at, batches(status, closes_at)",
    )
    .eq("vendor_id", vendor.id);

  const published = (drops ?? []).filter(
    (drop) => drop.published && !drop.archived_at,
  );

  const openDropTitles: string[] = [];
  let batchesDelivered = 0;

  for (const drop of published) {
    let dropHasOpen = false;
    for (const batch of drop.batches ?? []) {
      if (batch.status === "settled") batchesDelivered += 1;
      if (
        batch.status === "open" &&
        !isPastCutoff(batch.closes_at) &&
        !dropHasOpen
      ) {
        dropHasOpen = true;
        openDropTitles.push(drop.title);
      }
    }
  }

  const { data: ratingRows } = await admin
    .from("order_reviews")
    .select("rating")
    .eq("vendor_id", vendor.id);

  const reviewCount = ratingRows?.length ?? 0;
  const ratingAverage =
    reviewCount > 0
      ? (ratingRows ?? []).reduce((sum, row) => sum + row.rating, 0) /
        reviewCount
      : null;

  return {
    businessName: vendor.business_name,
    slug: vendor.slug,
    logoUrl: vendor.logo_path
      ? publicUrl(BUCKETS.vendorAssets, vendor.logo_path)
      : null,
    openBatchCount: openDropTitles.length,
    openDropTitles: openDropTitles.slice(0, 3),
    batchesDelivered,
    ratingAverage,
    reviewCount,
  };
}
