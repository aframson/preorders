import { PLATFORM_FEE_PERCENT } from "./fees";
import { percentOf, type Pesewas } from "./money";

export type FinancePayment = {
  amount: Pesewas;
  type: "goods" | "freight";
  status: "pending" | "success" | "failed" | "abandoned" | "refunded";
  vendorId: string;
  vendorName: string;
  /** From the stored Paystack payload; null when it wasn't captured. */
  paystackFees: Pesewas | null;
};

export type OutstandingFreight = {
  vendorId: string;
  vendorName: string;
  amount: Pesewas;
};

export type FinanceTotals = {
  goodsCollected: Pesewas;
  freightCollected: Pesewas;
  /** The flat charge sent to Paystack as `transaction_charge` on each payment. */
  platformFee: Pesewas;
  /** Known Paystack processing fees, paid out of the platform's share. */
  paystackFees: Pesewas;
  /** Successful payments whose Paystack fee isn't on record, so `paystackFees` is a floor. */
  unknownFeeCount: number;
  netToPlatform: Pesewas;
  /** What Paystack settles to vendor subaccounts: everything minus the platform fee. */
  vendorPayout: Pesewas;
  refunded: Pesewas;
  freightOutstanding: Pesewas;
  successCount: number;
};

export type VendorFinanceRow = FinanceTotals & {
  vendorId: string;
  vendorName: string;
  /** Filled in separately from Paystack's settlement API — null until then, not "no payout". */
  lastPayout?: { status: string; amount: Pesewas; date: string } | null;
};

function emptyTotals(): FinanceTotals {
  return {
    goodsCollected: 0,
    freightCollected: 0,
    platformFee: 0,
    paystackFees: 0,
    unknownFeeCount: 0,
    netToPlatform: 0,
    vendorPayout: 0,
    refunded: 0,
    freightOutstanding: 0,
    successCount: 0,
  };
}

function addPayment(totals: FinanceTotals, payment: FinancePayment): void {
  if (payment.status === "refunded") {
    totals.refunded += payment.amount;
    return;
  }
  if (payment.status !== "success") return;

  const fee = percentOf(payment.amount, PLATFORM_FEE_PERCENT[payment.type]);
  totals.successCount += 1;
  totals.platformFee += fee;
  totals.vendorPayout += payment.amount - fee;
  if (payment.type === "goods") totals.goodsCollected += payment.amount;
  else totals.freightCollected += payment.amount;

  if (payment.paystackFees === null) totals.unknownFeeCount += 1;
  else totals.paystackFees += payment.paystackFees;

  totals.netToPlatform = totals.platformFee - totals.paystackFees;
}

/**
 * Money that moved through the platform, overall and per vendor. Only
 * `success` payments count as collected; refunds are reported separately
 * rather than netted, so a refund never hides the sale it reversed.
 */
export function summariseFinance(
  payments: readonly FinancePayment[],
  outstanding: readonly OutstandingFreight[] = [],
): { totals: FinanceTotals; vendors: VendorFinanceRow[] } {
  const totals = emptyTotals();
  const byVendor = new Map<string, VendorFinanceRow>();

  const rowFor = (vendorId: string, vendorName: string) => {
    let row = byVendor.get(vendorId);
    if (!row) {
      row = { ...emptyTotals(), vendorId, vendorName };
      byVendor.set(vendorId, row);
    }
    return row;
  };

  for (const payment of payments) {
    addPayment(totals, payment);
    addPayment(rowFor(payment.vendorId, payment.vendorName), payment);
  }

  for (const item of outstanding) {
    totals.freightOutstanding += item.amount;
    rowFor(item.vendorId, item.vendorName).freightOutstanding += item.amount;
  }

  const vendors = [...byVendor.values()].sort(
    (a, b) =>
      b.goodsCollected + b.freightCollected - (a.goodsCollected + a.freightCollected) ||
      b.freightOutstanding - a.freightOutstanding,
  );

  return { totals, vendors };
}
