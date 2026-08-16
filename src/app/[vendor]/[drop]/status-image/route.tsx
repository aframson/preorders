import { ImageResponse } from "next/og";

import { getShareCard } from "@/lib/queries/share-card";
import { StatusCard } from "@/lib/share-card";

export const runtime = "nodejs";

const size = { width: 1080, height: 1920 };

/**
 * 9:16 card a vendor saves to their camera roll and posts as a WhatsApp
 * Status. Linked from the dashboard share sheet, not from the public drop.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ vendor: string; drop: string }> },
) {
  const { vendor, drop } = await params;
  const card = await getShareCard(vendor, drop);
  const filename = card
    ? `${card.dropTitle.replace(/[^\w]+/g, "-").toLowerCase()}-status.png`
    : "status.png";

  const image = new ImageResponse(<StatusCard card={card} />, size);

  return new Response(image.body, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
