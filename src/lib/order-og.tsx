/**
 * Social unfurl for a customer order tracking page (1200×630).
 * Order code is the hero signal. No PII.
 */

import type { OrderShareCard } from "@/lib/queries/order-share-card";
import type { OrderStatus } from "@/lib/status";

const CREAM = "#FDFBF8";
const AUBERGINE = "#5A2A4E";
const INK = "#1A1614";
const MUTED = "#6B615C";
const SUBTLE = "#9A8F88";

const STATUS_PILL: Record<
  OrderStatus,
  { bg: string; fg: string }
> = {
  pending_payment: { bg: "#FFFBEB", fg: "#A16207" },
  paid: { bg: "#ECFDF5", fg: "#047857" },
  purchased: { bg: "#F1F5F9", fg: "#475569" },
  in_transit: { bg: "#EFF6FF", fg: "#2563EB" },
  awaiting_freight: { bg: "#FFF7ED", fg: "#C2410C" },
  freight_paid: { bg: "#ECFDF5", fg: "#047857" },
  collected: { bg: "#F9FAFB", fg: "#6B7280" },
  cancelled: { bg: "#FEF2F2", fg: "#DC2626" },
};

/** Order tracking share card — code first, then vendor + status. */
export function OrderOgCard({ card }: { card: OrderShareCard | null }) {
  const pill = card
    ? STATUS_PILL[card.status]
    : { bg: "#F1F5F9", fg: "#475569" };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: CREAM,
        padding: 72,
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
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                width: 24,
                height: 4,
                borderRadius: 2,
                background: AUBERGINE,
              }}
            />
            <div
              style={{
                width: 24,
                height: 4,
                borderRadius: 2,
                background: AUBERGINE,
                opacity: 0.65,
              }}
            />
            <div
              style={{
                width: 24,
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
            background: pill.bg,
            color: pill.fg,
            fontSize: 24,
            fontWeight: 700,
            padding: "12px 20px",
            borderRadius: 999,
          }}
        >
          {card?.statusLabel ?? "Your order"}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 26, color: MUTED, fontWeight: 600 }}>
          {card?.vendorName ?? "Order"}
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: INK,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
          }}
        >
          {card?.code ?? "Your order"}
        </div>
        <div style={{ fontSize: 28, color: SUBTLE }}>
          {card
            ? `${card.dropTitle} / Batch ${card.batchNumber}`
            : "Track your preorder"}
        </div>
      </div>
    </div>
  );
}
