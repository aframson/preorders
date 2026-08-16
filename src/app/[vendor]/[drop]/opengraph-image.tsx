import { ImageResponse } from "next/og";

import { getShareCard } from "@/lib/queries/share-card";
import { OgCard } from "@/lib/share-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Preorder batch";

export default async function Image({
  params,
}: {
  params: Promise<{ vendor: string; drop: string }>;
}) {
  const { vendor, drop } = await params;

  try {
    const card = await getShareCard(vendor, drop);
    return new ImageResponse(<OgCard card={card} />, size);
  } catch {
    // Missing env / unknown drop during build or cold start — still return a
    // valid OG image so the route never fails the deploy.
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0f172a",
            color: "#f8fafc",
            fontSize: 64,
            fontWeight: 700,
          }}
        >
          Preorders
        </div>
      ),
      size,
    );
  }
}
