/**
 * Social unfurl for a drop / batch shop link (1200×630).
 * Bold batch number + vendor name — what people see when sharing in WhatsApp.
 */

import type { ShareCard } from "@/lib/queries/share-card";

const CREAM = "#FDFBF8";
const SURFACE = "#FFFFFF";
const MUTED_SURFACE = "#F7F3EE";
const BORDER = "#E8E1DB";
const INK = "#1A1614";
const MUTED = "#6B615C";
const SUBTLE = "#9A8F88";
const AUBERGINE = "#5A2A4E";
const AUBERGINE_DEEP = "#3B1B33";
const OPEN = "#047857";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function vendorNameSize(name: string): number {
  if (name.length > 28) return 44;
  if (name.length > 18) return 54;
  return 62;
}

/** Drop shop share card — BATCH first, then vendor + drop title. */
export function DropOgCard({ card }: { card: ShareCard | null }) {
  const vendorName = card?.vendorName ?? "Preorders";
  const dropTitle = card?.dropTitle ?? "Preorder batch";
  const open = Boolean(card?.open && card.batchNumber != null);
  const batchNumber = card?.batchNumber;

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
          left: 0,
          top: 0,
          bottom: 0,
          width: 18,
          background: AUBERGINE,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -80,
          top: -100,
          width: 440,
          height: 440,
          borderRadius: 999,
          background: "#F3E8EF",
          display: "flex",
        }}
      />

      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "48px 48px 48px 56px",
          gap: 36,
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: AUBERGINE,
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  width: 24,
                  height: 5,
                  borderRadius: 3,
                  background: AUBERGINE,
                }}
              />
              <div
                style={{
                  width: 24,
                  height: 5,
                  borderRadius: 3,
                  background: AUBERGINE,
                  opacity: 0.65,
                }}
              />
              <div
                style={{
                  width: 24,
                  height: 5,
                  borderRadius: 3,
                  background: AUBERGINE,
                  opacity: 0.35,
                }}
              />
            </div>
            Preorders
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {card?.logoUrl ? (
              <img
                src={card.logoUrl}
                width={132}
                height={132}
                alt=""
                style={{
                  width: 132,
                  height: 132,
                  borderRadius: 32,
                  objectFit: "cover",
                  border: `4px solid ${SURFACE}`,
                  background: SURFACE,
                }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  width: 132,
                  height: 132,
                  borderRadius: 32,
                  alignItems: "center",
                  justifyContent: "center",
                  background: AUBERGINE,
                  color: CREAM,
                  fontSize: 44,
                  fontWeight: 800,
                }}
              >
                {initials(vendorName)}
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: vendorNameSize(vendorName),
                  fontWeight: 800,
                  color: INK,
                  lineHeight: 0.98,
                  letterSpacing: "-0.04em",
                }}
              >
                {vendorName}
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: MUTED,
                  letterSpacing: "-0.02em",
                }}
              >
                {dropTitle}
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: 22,
              color: SUBTLE,
              fontWeight: 600,
            }}
          >
            Pay for goods now · shipping when they land
          </div>
        </div>

        {/* Bold batch panel */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 400,
            borderRadius: 28,
            background: open ? AUBERGINE_DEEP : MUTED_SURFACE,
            padding: 36,
            justifyContent: "space-between",
            border: open ? "none" : `2px solid ${BORDER}`,
          }}
        >
          {open && batchNumber != null ? (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div
                  style={{
                    display: "flex",
                    alignSelf: "flex-start",
                    background: OPEN,
                    color: "#FFFFFF",
                    padding: "10px 16px",
                    borderRadius: 999,
                    fontSize: 18,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                  }}
                >
                  ● OPEN NOW
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#D0A8C4",
                    letterSpacing: "0.12em",
                  }}
                >
                  BATCH
                </div>
                <div
                  style={{
                    fontSize: 140,
                    fontWeight: 800,
                    color: CREAM,
                    lineHeight: 0.85,
                    letterSpacing: "-0.06em",
                  }}
                >
                  {batchNumber}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  background: "rgba(253,251,248,0.1)",
                  borderRadius: 18,
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: CREAM,
                  }}
                >
                  {card?.orderCount ?? 0} order
                  {(card?.orderCount ?? 0) === 1 ? "" : "s"} in
                </div>
                <div style={{ fontSize: 20, color: "#D0A8C4", fontWeight: 600 }}>
                  Tap to shop this batch
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: MUTED,
                    letterSpacing: "0.1em",
                  }}
                >
                  CLOSED
                </div>
                <div
                  style={{
                    fontSize: 48,
                    fontWeight: 800,
                    color: INK,
                    lineHeight: 1.05,
                    letterSpacing: "-0.03em",
                  }}
                >
                  Next batch soon
                </div>
                <div style={{ fontSize: 22, color: MUTED, fontWeight: 600 }}>
                  Leave your email on the page to get told when it opens.
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 16,
                  padding: "16px 18px",
                  color: AUBERGINE,
                  fontSize: 20,
                  fontWeight: 800,
                }}
              >
                on Preorders
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
