/**
 * Status is the one place colour carries meaning in this product, so the
 * palette is reserved: these tones are never used decoratively.
 *
 * Every status also has a label, because colour alone is not an accessible
 * signal and many vendors are on cheap screens with poor colour reproduction.
 */
export type Tone =
  | "open"
  | "closing"
  | "closed"
  | "transit"
  | "arrived"
  | "settled"
  | "danger"
  | "neutral";

export type BatchStatus =
  | "scheduled"
  | "open"
  | "closed"
  | "purchasing"
  | "in_transit"
  | "arrived"
  | "freight_invoiced"
  | "settled";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "purchased"
  | "in_transit"
  | "awaiting_freight"
  | "freight_paid"
  | "collected"
  | "cancelled";

type StatusMeta = {
  /** Shown to the vendor, who thinks in operations. */
  label: string;
  /** Shown to the customer, who only cares where their money and goods are. */
  publicLabel: string;
  tone: Tone;
};

export const BATCH_STATUS: Record<BatchStatus, StatusMeta> = {
  scheduled: {
    label: "Scheduled",
    publicLabel: "Opening soon",
    tone: "neutral",
  },
  open: { label: "Open", publicLabel: "Open for orders", tone: "open" },
  closed: { label: "Closed", publicLabel: "Closed", tone: "closed" },
  purchasing: {
    label: "Buying from supplier",
    publicLabel: "Being purchased",
    tone: "closed",
  },
  in_transit: {
    label: "In transit",
    publicLabel: "On its way",
    tone: "transit",
  },
  arrived: { label: "Arrived", publicLabel: "Arrived in Ghana", tone: "arrived" },
  freight_invoiced: {
    label: "Shipping invoiced",
    publicLabel: "Shipping fee due",
    tone: "arrived",
  },
  settled: { label: "Settled", publicLabel: "Completed", tone: "settled" },
};

export const ORDER_STATUS: Record<OrderStatus, StatusMeta> = {
  pending_payment: {
    label: "Awaiting payment",
    publicLabel: "Awaiting payment",
    tone: "closing",
  },
  paid: { label: "Paid", publicLabel: "Order confirmed", tone: "open" },
  purchased: {
    label: "Purchased",
    publicLabel: "Bought from supplier",
    tone: "closed",
  },
  in_transit: {
    label: "In transit",
    publicLabel: "On its way",
    tone: "transit",
  },
  awaiting_freight: {
    label: "Shipping fee due",
    publicLabel: "Shipping fee due",
    tone: "arrived",
  },
  freight_paid: {
    label: "Ready for pickup",
    publicLabel: "Ready for pickup",
    tone: "open",
  },
  collected: { label: "Collected", publicLabel: "Collected", tone: "settled" },
  cancelled: { label: "Cancelled", publicLabel: "Cancelled", tone: "danger" },
};

export type FulfilmentMethod = "pickup" | "delivery";

/**
 * Pickup vs delivery changes the words customers and vendors actually use.
 * Status keys stay the same (`freight_paid`, `collected`).
 */
export function orderStatusLabel(
  status: OrderStatus,
  fulfilment: FulfilmentMethod = "pickup",
  audience: "vendor" | "public" = "vendor",
): string {
  if (status === "freight_paid") {
    return fulfilment === "delivery" ? "Out for delivery" : "Ready for pickup";
  }
  if (status === "collected") {
    return fulfilment === "delivery" ? "Delivered" : "Picked up";
  }
  const meta = ORDER_STATUS[status];
  return audience === "public" ? meta.publicLabel : meta.label;
}

/** Button / confirmation copy for marking an order received. */
export function markReceivedLabel(fulfilment: FulfilmentMethod): string {
  return fulfilment === "delivery" ? "Mark delivered" : "Mark picked up";
}

export function customerReceivedLabel(fulfilment: FulfilmentMethod): string {
  return fulfilment === "delivery"
    ? "I've received delivery"
    : "I've picked this up";
}

/**
 * Tailwind cannot see through dynamic strings, so tone classes are written out
 * in full. In dark mode the tint and the base colour swap roles: a translucent
 * wash of the status colour becomes the background and the tint becomes text.
 */
export const TONE_CLASSES: Record<Tone, string> = {
  open: "bg-open-tint text-open dark:bg-open/15 dark:text-open-tint",
  closing:
    "bg-closing-tint text-closing dark:bg-closing/15 dark:text-closing-tint",
  closed: "bg-closed-tint text-closed dark:bg-closed/20 dark:text-closed-tint",
  transit:
    "bg-transit-tint text-transit dark:bg-transit/15 dark:text-transit-tint",
  arrived:
    "bg-arrived-tint text-arrived dark:bg-arrived/15 dark:text-arrived-tint",
  settled:
    "bg-settled-tint text-settled dark:bg-settled/20 dark:text-settled-tint",
  danger: "bg-danger-tint text-danger dark:bg-danger/15 dark:text-danger-tint",
  neutral: "bg-surface-muted text-ink-muted",
};

export const TONE_ACCENT: Record<Tone, string> = {
  open: "text-open",
  closing: "text-closing",
  closed: "text-closed",
  transit: "text-transit",
  arrived: "text-arrived",
  settled: "text-settled",
  danger: "text-danger",
  neutral: "text-ink-muted",
};

const CLOSING_SOON_MS = 48 * 60 * 60 * 1000;

/**
 * An open batch inside its final 48 hours is treated as a distinct visual
 * state, because urgency is what converts a browsing WhatsApp reader.
 */
export function batchTone(status: BatchStatus, closesAt?: Date | null): Tone {
  if (status === "open" && closesAt) {
    const remaining = closesAt.getTime() - Date.now();
    if (remaining > 0 && remaining <= CLOSING_SOON_MS) return "closing";
  }
  return BATCH_STATUS[status].tone;
}

export function isClosingSoon(closesAt: Date): boolean {
  const remaining = closesAt.getTime() - Date.now();
  return remaining > 0 && remaining <= CLOSING_SOON_MS;
}
