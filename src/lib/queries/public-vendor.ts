import "server-only";

import { isPastCutoff } from "@/lib/jobs";
import type { PublicBatch } from "@/lib/queries/public-drop";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PublicVendorDrop = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverPath: string | null;
  openBatch: PublicBatch | null;
  nextBatch: PublicBatch | null;
};

export type PublicVendorReview = {
  id: string;
  rating: number;
  comment: string | null;
  customerDisplayName: string;
  createdAt: string;
};

export type PublicVendor = {
  vendor: {
    id: string;
    slug: string;
    businessName: string;
    logoPath: string | null;
    whatsappNumber: string | null;
    batchesDelivered: number;
    ratingAverage: number | null;
    reviewCount: number;
  };
  drops: PublicVendorDrop[];
  recentReviews: PublicVendorReview[];
};

/**
 * The vendor's public landing page: every published drop, plus whichever
 * batch is currently taking orders. Anonymous RLS still decides visibility.
 */
export async function getPublicVendor(
  vendorSlug: string,
): Promise<PublicVendor | null> {
  const supabase = await createClient();

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, slug, business_name, logo_path, whatsapp_number")
    .eq("slug", vendorSlug)
    .maybeSingle();

  if (!vendor) return null;

  const { data: drops } = await supabase
    .from("drops")
    .select(
      "id, slug, title, description, cover_path, batches(id, number, status, opens_at, closes_at, expected_delivery_at, freight_mode, freight_rate_estimate)",
    )
    .eq("vendor_id", vendor.id)
    .eq("published", true)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  const allBatches = (drops ?? []).flatMap((drop) => drop.batches ?? []);
  const countByBatch = new Map<string, number>();
  const batchIds = allBatches.map((batch) => batch.id);

  const admin = createAdminClient();

  if (batchIds.length > 0) {
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

  const { data: reviewRows } = await supabase
    .from("order_reviews")
    .select("id, rating, comment, customer_display_name, created_at")
    .eq("vendor_id", vendor.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: ratingRows } = await supabase
    .from("order_reviews")
    .select("rating")
    .eq("vendor_id", vendor.id);

  const reviewCount = ratingRows?.length ?? 0;
  const ratingAverage =
    reviewCount > 0
      ? (ratingRows ?? []).reduce((sum, row) => sum + row.rating, 0) /
        reviewCount
      : null;

  function asPublic(
    batch: NonNullable<(typeof allBatches)[number]>,
  ): PublicBatch {
    return {
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
    };
  }

  return {
    vendor: {
      id: vendor.id,
      slug: vendor.slug,
      businessName: vendor.business_name,
      logoPath: vendor.logo_path,
      whatsappNumber: vendor.whatsapp_number,
      batchesDelivered: allBatches.filter((batch) => batch.status === "settled")
        .length,
      ratingAverage,
      reviewCount,
    },
    recentReviews: (reviewRows ?? []).map((row) => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment,
      customerDisplayName: row.customer_display_name,
      createdAt: row.created_at,
    })),
    drops: (drops ?? []).map((drop) => {
      const mapped = (drop.batches ?? [])
        .map(asPublic)
        .sort((a, b) => b.number - a.number);

      return {
        id: drop.id,
        slug: drop.slug,
        title: drop.title,
        description: drop.description,
        coverPath: drop.cover_path,
        openBatch:
          mapped.find((batch) => batch.status === "open" && !batch.expired) ??
          null,
        nextBatch:
          mapped
            .filter((batch) => batch.status === "scheduled")
            .sort((a, b) => a.number - b.number)[0] ?? null,
      };
    }),
  };
}
