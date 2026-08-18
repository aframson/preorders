import { ImageResponse } from "next/og";

import { DropOgCard } from "@/lib/drop-og";
import { getShareCard } from "@/lib/queries/share-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Open preorder batch";

export default async function Image({
  params,
}: {
  params: Promise<{ vendor: string; drop: string }>;
}) {
  const { vendor, drop } = await params;

  try {
    const card = await getShareCard(vendor, drop);
    return new ImageResponse(<DropOgCard card={card} />, size);
  } catch {
    return new ImageResponse(<DropOgCard card={null} />, size);
  }
}
