import type { Pesewas } from "./money";

export type PaystackRawSummary = {
  /** What Paystack charged for this transaction. The platform bears it (`bearer: "account"`). */
  fees: Pesewas | null;
  channel: string | null;
  gatewayResponse: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * `payments.raw` holds one of two shapes: the whole webhook event
 * (`{ event, data: {...} }`) or the bare transaction from a verify call made
 * on the customer's redirect. Both carry the same transaction fields, just at
 * different depths.
 */
export function summarisePaystackRaw(raw: unknown): PaystackRawSummary {
  const transaction =
    isRecord(raw) && isRecord(raw.data) ? raw.data : isRecord(raw) ? raw : null;

  if (!transaction) return { fees: null, channel: null, gatewayResponse: null };

  return {
    fees:
      typeof transaction.fees === "number" && Number.isFinite(transaction.fees)
        ? transaction.fees
        : null,
    channel: typeof transaction.channel === "string" ? transaction.channel : null,
    gatewayResponse:
      typeof transaction.gateway_response === "string"
        ? transaction.gateway_response
        : null,
  };
}
