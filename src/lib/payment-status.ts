import type { Database } from "./database.types";
import type { Tone } from "./status";

export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type PaymentType = Database["public"]["Enums"]["payment_type"];

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "closing" },
  success: { label: "Paid", tone: "open" },
  failed: { label: "Failed", tone: "danger" },
  abandoned: { label: "Abandoned", tone: "neutral" },
  refunded: { label: "Refunded", tone: "settled" },
};

export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = {
  goods: "Goods",
  freight: "Shipping",
};

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return typeof value === "string" && value in PAYMENT_STATUS;
}

export function isPaymentType(value: unknown): value is PaymentType {
  return value === "goods" || value === "freight";
}
