import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKETS, publicUrl } from "@/lib/storage";
import type { VendorSearchHit } from "@/lib/vendor-search";

export type { VendorSearchHit };

/**
 * Public vendor discovery for the marketing homepage overlay.
 * Only returns vendors with at least one published, non-archived drop.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = (searchParams.get("q") ?? "").trim();
  // Strip PostgREST filter metacharacters so user input cannot break `.or()`.
  const q = raw.replace(/[%_,.()]/g, " ").replace(/\s+/g, " ").trim();

  if (q.length < 1) {
    return NextResponse.json(
      { vendors: [] satisfies VendorSearchHit[] },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  }

  const pattern = `%${q}%`;
  const admin = createAdminClient();

  const { data: vendors, error } = await admin
    .from("vendors")
    .select(
      "slug, business_name, logo_path, drops(id, slug, published, archived_at, batches(id, status))",
    )
    .or(`business_name.ilike."${pattern}",slug.ilike."${pattern}"`)
    .order("business_name")
    .limit(40);

  if (error) {
    console.error("[search/vendors]", error.message);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  const hits: VendorSearchHit[] = [];

  for (const vendor of vendors ?? []) {
    const drops = (vendor.drops ?? []).filter(
      (drop) => drop.published && drop.archived_at === null,
    );
    if (drops.length === 0) continue;

    let openDropSlug: string | null = null;
    for (const drop of drops) {
      const open = (drop.batches ?? []).some((batch) => batch.status === "open");
      if (open) {
        openDropSlug = drop.slug;
        break;
      }
    }

    hits.push({
      slug: vendor.slug,
      businessName: vendor.business_name,
      logoUrl: vendor.logo_path
        ? publicUrl(BUCKETS.vendorAssets, vendor.logo_path)
        : null,
      dropCount: drops.length,
      openDropSlug,
    });

    if (hits.length >= 12) break;
  }

  return NextResponse.json(
    { vendors: hits },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    },
  );
}
