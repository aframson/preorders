import { ImageResponse } from "next/og";

import { OrderOgCard } from "@/lib/order-og";
import { getOrderShareCard } from "@/lib/queries/order-share-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Your order";

export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  try {
    const card = await getOrderShareCard(token);
    return new ImageResponse(<OrderOgCard card={card} />, size);
  } catch {
    return new ImageResponse(<OrderOgCard card={null} />, size);
  }
}
