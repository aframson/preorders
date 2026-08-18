import { ImageResponse } from "next/og";

import { getVendorShareCard } from "@/lib/queries/vendor-share-card";
import { VendorOgCard } from "@/lib/vendor-og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Vendor on Preorders";

export default async function Image({
  params,
}: {
  params: Promise<{ vendor: string }>;
}) {
  const { vendor } = await params;

  try {
    const card = await getVendorShareCard(vendor);
    return new ImageResponse(<VendorOgCard card={card} />, size);
  } catch {
    return new ImageResponse(<VendorOgCard card={null} />, size);
  }
}
