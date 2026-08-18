import { ImageResponse } from "next/og";

import { toOgLogoSrc } from "@/lib/og-logo";
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
    const logoUrl = await toOgLogoSrc(card?.logoUrl);
    return new ImageResponse(
      <VendorOgCard card={card ? { ...card, logoUrl } : null} />,
      size,
    );
  } catch {
    return new ImageResponse(<VendorOgCard card={null} />, size);
  }
}
