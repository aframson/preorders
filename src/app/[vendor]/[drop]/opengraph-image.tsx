import { ImageResponse } from "next/og";

import { getShareCard } from "@/lib/queries/share-card";
import { OgCard } from "@/lib/share-card";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Preorder batch";

export default async function Image({
  params,
}: {
  params: Promise<{ vendor: string; drop: string }>;
}) {
  const { vendor, drop } = await params;
  const card = await getShareCard(vendor, drop);

  return new ImageResponse(<OgCard card={card} />, size);
}
