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
const AUBERGINE_DEEP = "#3B1B33";
const OPEN = "#047857";
const OPEN_TINT = "#C6F6DF";

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

function nameSize(name: string): number {
  if (name.length > 28) return 52;
  if (name.length > 18) return 64;
  return 76;
}

/** Vendor profile share card — bold name + loud open-batch panel. */
export function VendorOgCard({ card }: { card: VendorShareCard | null }) {
  const name = card?.businessName ?? "Preorders vendor";
  const openCount = card?.openBatchCount ?? 0;
  const openTitles = card?.openDropTitles ?? [];

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
      {/* Left brand rail */}
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

      {/* Soft atmosphere */}
      <div
        style={{
          position: "absolute",
          right: -60,
          top: -120,
          width: 420,
          height: 420,
          borderRadius: 999,
          background: "#F3E8EF",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 80,
          bottom: -180,
          width: 380,
          height: 380,
          borderRadius: 999,
          background: MUTED_SURFACE,
          display: "flex",
        }}
      />

      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "48px 48px 48px 56px",
          position: "relative",
          gap: 36,
        }}
      >
        {/* Main column */}
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
              letterSpacing: "-0.02em",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  display: "flex",
                  width: 24,
                  height: 5,
                  borderRadius: 3,
                  background: AUBERGINE,
                }}
              />
              <div
                style={{
                  display: "flex",
                  width: 24,
                  height: 5,
                  borderRadius: 3,
                  background: AUBERGINE,
                  opacity: 0.65,
                }}
              />
              <div
                style={{
                  display: "flex",
                  width: 24,
                  height: 5,
                  borderRadius: 3,
                  background: AUBERGINE,
                  opacity: 0.35,
                }}
              />
            </div>
            <div style={{ display: "flex" }}>Preorders</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {card?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- next/og requires <img>
              <img
                src={card.logoUrl}
                width={168}
                height={168}
                alt=""
                style={{
                  width: 168,
                  height: 168,
                  borderRadius: 36,
                  objectFit: "cover",
                  border: `4px solid ${SURFACE}`,
                  background: SURFACE,
                }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  width: 168,
                  height: 168,
                  borderRadius: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  background: AUBERGINE,
                  color: CREAM,
                  fontSize: 56,
                  fontWeight: 800,
                }}
              >
                {initials(name)}
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                flex: 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  fontWeight: 700,
                  color: AUBERGINE,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Vendor shop
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: nameSize(name),
                  fontWeight: 800,
                  color: INK,
                  lineHeight: 0.98,
                  letterSpacing: "-0.045em",
                }}
              >
                {name}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 24,
                  color: MUTED,
                  fontWeight: 600,
                }}
              >
                {card ? `${card.slug}.preorders` : "on Preorders"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            {card && card.reviewCount > 0 && card.ratingAverage != null ? (
              <MetaPill
                value={formatRating(card.ratingAverage)}
                label={`${card.reviewCount} review${card.reviewCount === 1 ? "" : "s"}`}
              />
            ) : null}
            {card && card.batchesDelivered > 0 ? (
              <MetaPill
                value={`${card.batchesDelivered}`}
                label={`delivered`}
              />
            ) : (
              <MetaPill value="Pay now" label="Ship later" />
            )}
          </div>
        </div>

        {/* Bold open-batch panel */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 380,
            borderRadius: 28,
            background: openCount > 0 ? AUBERGINE_DEEP : MUTED_SURFACE,
            padding: 36,
            justifyContent: "space-between",
            border: openCount > 0 ? "none" : `2px solid ${BORDER}`,
          }}
        >
          {openCount > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: OPEN,
                    color: "#FFFFFF",
                    alignSelf: "flex-start",
                    padding: "10px 16px",
                    borderRadius: 999,
                    fontSize: 18,
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                  }}
                >
                  LIVE
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      fontSize: 72,
                      fontWeight: 800,
                      color: CREAM,
                      lineHeight: 0.95,
                      letterSpacing: "-0.04em",
                    }}
                  >
                    {String(openCount)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 30,
                      fontWeight: 800,
                      color: CREAM,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {`open batch${openCount === 1 ? "" : "es"}`}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      marginTop: 8,
                      fontSize: 20,
                      color: "#D0A8C4",
                      fontWeight: 600,
                    }}
                  >
                    Order now / pay goods today
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {openTitles.map((title) => (
                  <div
                    key={title}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: "rgba(253,251,248,0.1)",
                      borderRadius: 16,
                      padding: "14px 16px",
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: OPEN_TINT,
                        display: "flex",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        fontSize: 22,
                        fontWeight: 700,
                        color: CREAM,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {title}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: 20,
                    fontWeight: 800,
                    color: MUTED,
                    letterSpacing: "0.08em",
                  }}
                >
                  NEXT UP
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 42,
                    fontWeight: 800,
                    color: INK,
                    lineHeight: 1.05,
                    letterSpacing: "-0.03em",
                  }}
                >
                  Batches coming soon
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 22,
                    color: MUTED,
                    fontWeight: 600,
                  }}
                >
                  Bookmark this shop - open windows show here first.
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
                {card ? `${card.slug} on Preorders` : "on Preorders"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaPill({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        background: SURFACE,
        border: `2px solid ${BORDER}`,
        borderRadius: 18,
        padding: "14px 20px",
        minWidth: 128,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 28,
          fontWeight: 800,
          color: INK,
          letterSpacing: "-0.03em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 16,
          color: SUBTLE,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
    </div>
  );
}
