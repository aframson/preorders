/**
 * Social unfurl for the marketing homepage (1200×630).
 * Inline styles only — next/og / Satori has no Tailwind.
 */

import type { CSSProperties } from "react";

const CREAM = "#FDFBF8";
const SURFACE = "#FFFFFF";
const MUTED_SURFACE = "#F7F3EE";
const BORDER = "#E8E1DB";
const INK = "#1A1614";
const MUTED = "#6B615C";
const SUBTLE = "#9A8F88";
const AUBERGINE = "#5A2A4E";
const OPEN = "#047857";
const OPEN_TINT = "#C6F6DF";

function MiniBoard({ style }: { style?: CSSProperties }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 520,
        height: 360,
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 22,
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 22px",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 12, color: SUBTLE, fontWeight: 600 }}>
            China run · Batch 3
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: INK }}>
            September drop
          </div>
        </div>
        <div
          style={{
            display: "flex",
            background: OPEN_TINT,
            color: OPEN,
            fontSize: 14,
            fontWeight: 700,
            padding: "8px 12px",
            borderRadius: 999,
          }}
        >
          Open · 34
        </div>
      </div>
      <div style={{ display: "flex", flex: 1 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "42%",
            padding: 20,
            gap: 14,
            borderRight: `1px solid ${BORDER}`,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: MUTED_SURFACE,
              borderRadius: 14,
              padding: "14px 16px",
              gap: 4,
            }}
          >
            <div style={{ fontSize: 12, color: MUTED }}>Closes Sunday</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: INK }}>
              2d 14h
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: "10px 12px",
                gap: 2,
              }}
            >
              <div style={{ fontSize: 11, color: MUTED }}>Paid</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: INK }}>
                GH₵12.4k
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: "10px 12px",
                gap: 2,
              }}
            >
              <div style={{ fontSize: 11, color: MUTED }}>Units</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: INK }}>40</div>
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "16px 18px",
            gap: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: SUBTLE,
              letterSpacing: "0.06em",
            }}
          >
            PAID TODAY
          </div>
          {[
            ["Ama Mensah", "GH₵480"],
            ["Kwame Boateng", "GH₵320"],
            ["Yaa Asante", "GH₵185"],
          ].map(([name, amount]) => (
            <div
              key={name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: `1px solid ${BORDER}`,
                paddingBottom: 8,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>
                {name}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>
                {amount}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniCalendar({ style }: { style?: CSSProperties }) {
  const cells = Array.from({ length: 28 }, (_, i) => i + 1);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 340,
        height: 300,
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 20,
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 11, color: SUBTLE, fontWeight: 600 }}>
            Batch calendar
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: INK }}>
            September
          </div>
        </div>
        <div
          style={{
            display: "flex",
            background: OPEN_TINT,
            color: OPEN,
            fontSize: 12,
            fontWeight: 700,
            padding: "6px 10px",
            borderRadius: 999,
          }}
        >
          Live
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          padding: 10,
          gap: 4,
        }}
      >
        {cells.map((day) => (
          <div
            key={day}
            style={{
              display: "flex",
              width: 40,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              color: day === 18 ? "#FFFFFF" : MUTED,
              background: day === 18 ? AUBERGINE : MUTED_SURFACE,
              borderRadius: day === 18 ? 999 : 6,
              fontWeight: day === 18 ? 700 : 500,
            }}
          >
            {day}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          margin: "0 12px 12px",
          height: 18,
          background: OPEN,
          borderRadius: 6,
          color: "#FFFFFF",
          fontSize: 11,
          fontWeight: 600,
          alignItems: "center",
          paddingLeft: 10,
          width: 180,
        }}
      >
        B3 · Open
      </div>
    </div>
  );
}

/** Homepage share card: slogan + tilted board/calendar like the hero. */
export function MarketingOgCard() {
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
      {/* Soft brand wash on the right */}
      <div
        style={{
          position: "absolute",
          right: -80,
          top: -60,
          width: 520,
          height: 520,
          borderRadius: 999,
          background: "#F3E8EF",
          opacity: 0.7,
          display: "flex",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: 520,
          padding: "56px 48px 56px 64px",
          gap: 28,
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: AUBERGINE,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                width: 28,
                height: 5,
                borderRadius: 3,
                background: AUBERGINE,
              }}
            />
            <div
              style={{
                width: 28,
                height: 5,
                borderRadius: 3,
                background: AUBERGINE,
                opacity: 0.65,
              }}
            />
            <div
              style={{
                width: 28,
                height: 5,
                borderRadius: 3,
                background: AUBERGINE,
                opacity: 0.35,
              }}
            />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>
            Preorders
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 58,
              fontWeight: 800,
              color: INK,
              lineHeight: 1.02,
              letterSpacing: "-0.035em",
            }}
          >
            Run preorders like an operation.
          </div>
          <div
            style={{
              fontSize: 22,
              color: MUTED,
              lineHeight: 1.35,
              maxWidth: 420,
            }}
          >
            One link for customers. The board for you — not another week of chat
            screenshots.
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          position: "relative",
          height: "100%",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 70,
            left: 10,
            display: "flex",
            transform: "rotate(-7deg)",
          }}
        >
          <MiniBoard />
        </div>
        <div
          style={{
            position: "absolute",
            top: 250,
            left: 180,
            display: "flex",
            transform: "rotate(-4deg)",
          }}
        >
          <MiniCalendar />
        </div>
      </div>
    </div>
  );
}
