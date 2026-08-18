/**
 * Social unfurl for a vendor landing page (1200×630).
 * Inline styles only — next/og / Satori has no Tailwind.
 */

import type { VendorShareCard } from "@/lib/queries/vendor-share-card";

const CREAM = "#FDFBF8";
const SURFACE = "#FFFFFF";
const MUTED_SURFACE = "#F7F3EE";
const BORDER = "#E8E1DB";
const INK = "#1A1614";
const MUTED = "#6B615C";
const SUBTLE = "#9A8F88";
const AUBERGINE = "#5A2A4E";
const OPEN_BG = "#ECFDF5";
const OPEN_FG = "#047857";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatRating(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

/** Vendor profile share card — business name + live batch signal. */
export function VendorOgCard({ card }: { card: VendorShareCard | null }) {
  const name = card?.businessName ?? "Preorders vendor";
  const openCount = card?.openBatchCount ?? 0;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: CREAM,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -100,
          top: -80,
          width: 480,
          height: 480,
          borderRadius: 999,
          background: "#F3E8EF",
          opacity: 0.85,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -120,
          bottom: -140,
          width: 360,
          height: 360,
          borderRadius: 999,
          background: MUTED_SURFACE,
          display: "flex",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: 64,
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: AUBERGINE,
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  width: 22,
                  height: 4,
                  borderRadius: 2,
                  background: AUBERGINE,
                }}
              />
              <div
                style={{
                  width: 22,
                  height: 4,
                  borderRadius: 2,
                  background: AUBERGINE,
                  opacity: 0.65,
                }}
              />
              <div
                style={{
                  width: 22,
                  height: 4,
                  borderRadius: 2,
                  background: AUBERGINE,
                  opacity: 0.35,
                }}
              />
            </div>
            Preorders
          </div>

          <div
            style={{
              display: "flex",
              background: openCount > 0 ? OPEN_BG : MUTED_SURFACE,
              color: openCount > 0 ? OPEN_FG : MUTED,
              fontSize: 22,
              fontWeight: 700,
              padding: "12px 18px",
              borderRadius: 999,
            }}
          >
            {openCount > 0
              ? `${openCount} open batch${openCount === 1 ? "" : "es"}`
              : "Batches coming soon"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          {card?.logoUrl ? (
            // next/og ImageResponse accepts <img> with remote public URLs.
            <img
              src={card.logoUrl}
              width={148}
              height={148}
              alt=""
              style={{
                width: 148,
                height: 148,
                borderRadius: 999,
                objectFit: "cover",
                border: `3px solid ${BORDER}`,
                background: SURFACE,
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                width: 148,
                height: 148,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                background: "#F3E8EF",
                color: AUBERGINE,
                fontSize: 48,
                fontWeight: 800,
                border: `3px solid ${BORDER}`,
              }}
            >
              {initials(name)}
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: 64,
                fontWeight: 800,
                color: INK,
                lineHeight: 1.05,
                letterSpacing: "-0.035em",
              }}
            >
              {name}
            </div>
            <div style={{ fontSize: 26, color: MUTED }}>
              Preorder batches · pay goods now, shipping when they land
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", gap: 14 }}>
            {card && card.reviewCount > 0 && card.ratingAverage != null ? (
              <StatChip
                label={`${formatRating(card.ratingAverage)}★`}
                detail={`${card.reviewCount} review${card.reviewCount === 1 ? "" : "s"}`}
              />
            ) : null}
            {card && card.batchesDelivered > 0 ? (
              <StatChip
                label={`${card.batchesDelivered}`}
                detail={`batch${card.batchesDelivered === 1 ? "" : "es"} delivered`}
              />
            ) : null}
            {card?.openDropTitles.map((title) => (
              <StatChip key={title} label={title} detail="Open now" accent />
            ))}
          </div>

          <div style={{ fontSize: 22, color: SUBTLE, fontWeight: 600 }}>
            {card ? `${card.slug} on Preorders` : "on Preorders"}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatChip({
  label,
  detail,
  accent = false,
}: {
  label: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        background: accent ? OPEN_BG : SURFACE,
        border: `1px solid ${accent ? "#A7F3D0" : BORDER}`,
        borderRadius: 18,
        padding: "14px 18px",
        minWidth: 120,
      }}
    >
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: accent ? OPEN_FG : INK,
          letterSpacing: "-0.02em",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 16, color: accent ? OPEN_FG : MUTED }}>{detail}</div>
    </div>
  );
}
