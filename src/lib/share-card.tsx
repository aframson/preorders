type ShareCard = {
  vendorName: string;
  dropTitle: string;
  batchNumber: number | null;
  orderCount: number;
  open: boolean;
};

const CREAM = "#FDFBF8";
const AUBERGINE = "#5A2A4E";
const INK = "#1A1614";
const MUTED = "#6B615C";
const OPEN_BG = "#ECFDF5";
const OPEN_FG = "#059669";
const CLOSED_BG = "#F1F5F9";
const CLOSED_FG = "#475569";

export function shareSubtitle(card: ShareCard | null): string {
  if (!card) return "Preorder batches for Ghana";
  if (card.open && card.batchNumber !== null) {
    const orders =
      card.orderCount > 0
        ? ` · ${card.orderCount} order${card.orderCount === 1 ? "" : "s"} in`
        : "";
    return `Batch ${card.batchNumber} is open${orders}`;
  }
  return "Orders closed · next batch soon";
}

/** 1200×630 unfurl card. Inline styles only: next/og has no Tailwind. */
export function OgCard({ card }: { card: ShareCard | null }) {
  const open = Boolean(card?.open);

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
          color: AUBERGINE,
          fontSize: 28,
          fontWeight: 700,
        }}
      >
        Preorders
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 28, color: MUTED }}>
          {card?.vendorName ?? "Preorders"}
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: INK,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
          }}
        >
          {card?.dropTitle ?? "Batch link"}
        </div>
        <div
          style={{
            marginTop: 8,
            display: "flex",
            background: open ? OPEN_BG : CLOSED_BG,
            color: open ? OPEN_FG : CLOSED_FG,
            fontSize: 28,
            fontWeight: 600,
            padding: "12px 20px",
            borderRadius: 16,
          }}
        >
          {shareSubtitle(card)}
        </div>
      </div>
    </div>
  );
}

/** 1080×1920 WhatsApp Status card. */
export function StatusCard({ card }: { card: ShareCard | null }) {
  const open = Boolean(card?.open);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: CREAM,
        padding: 80,
      }}
    >
      <div
        style={{
          display: "flex",
          color: AUBERGINE,
          fontSize: 32,
          fontWeight: 700,
        }}
      >
        Preorders
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 32, color: MUTED }}>
          {card?.vendorName ?? "Preorders"}
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: INK,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
          }}
        >
          {card?.dropTitle ?? "Batch link"}
        </div>
        <div
          style={{
            marginTop: 12,
            display: "flex",
            background: open ? OPEN_BG : CLOSED_BG,
            color: open ? OPEN_FG : CLOSED_FG,
            fontSize: 36,
            fontWeight: 600,
            padding: "20px 28px",
            borderRadius: 20,
          }}
        >
          {shareSubtitle(card)}
        </div>
      </div>

      <div style={{ display: "flex", fontSize: 28, color: MUTED }}>
        Pay for goods now. Shipping when they land.
      </div>
    </div>
  );
}
