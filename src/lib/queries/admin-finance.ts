import "server-only";

import { requireAdmin } from "@/lib/admin-auth";
import {
  summariseFinance,
  type FinancePayment,
  type FinanceTotals,
  type OutstandingFreight,
  type VendorFinanceRow,
} from "@/lib/admin-finance";
import { isPaystackConfigured, listSettlements, PaystackError } from "@/lib/paystack";
import { createAdminClient } from "@/lib/supabase/admin";

export const FINANCE_PERIODS = {
  "7d": { label: "Last 7 days", days: 7 },
  "30d": { label: "Last 30 days", days: 30 },
  "90d": { label: "Last 90 days", days: 90 },
  all: { label: "All time", days: null },
} as const;

export type FinancePeriod = keyof typeof FINANCE_PERIODS;

export function isFinancePeriod(value: unknown): value is FinancePeriod {
  return typeof value === "string" && value in FINANCE_PERIODS;
}

/** PostgREST caps each response; finance totals must never silently truncate. */
const PAGE_SIZE = 1000;

function feesFrom(eventFees: unknown, directFees: unknown): number | null {
  if (typeof eventFees === "number" && Number.isFinite(eventFees)) return eventFees;
  if (typeof directFees === "number" && Number.isFinite(directFees)) return directFees;
  return null;
}

export async function getAdminFinance(period: FinancePeriod): Promise<{
  totals: FinanceTotals;
  vendors: VendorFinanceRow[];
}> {
  await requireAdmin();
  const admin = createAdminClient();
  const days = FINANCE_PERIODS[period].days;
  const since = days === null ? null : new Date(Date.now() - days * 86_400_000).toISOString();

  const payments: FinancePayment[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = admin
      .from("payments")
      .select(
        // Only the fee is needed from the Paystack payload, not the whole thing.
        // It sits under `data` for webhook events and at the top for verify calls.
        "amount, type, status, fees_event:raw->data->fees, fees_direct:raw->fees, orders!inner(batches!inner(drops!inner(vendors!inner(id, business_name))))",
      )
      .in("status", ["success", "refunded"])
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (since) query = query.gte("created_at", since);

    const { data, error } = await query;
    if (error) throw new Error(`Could not load payments: ${error.message}`);

    for (const row of data ?? []) {
      const vendor = row.orders.batches.drops.vendors;
      payments.push({
        amount: row.amount,
        type: row.type,
        status: row.status,
        vendorId: vendor.id,
        vendorName: vendor.business_name,
        paystackFees: feesFrom(row.fees_event, row.fees_direct),
      });
    }

    if ((data ?? []).length < PAGE_SIZE) break;
  }

  // Outstanding shipping is a balance right now, not activity in a window,
  // so it ignores the period.
  const { data: owing, error: owingError } = await admin
    .from("orders")
    .select("freight_amount, batches!inner(drops!inner(vendors!inner(id, business_name)))")
    .eq("status", "awaiting_freight")
    .gt("freight_amount", 0);

  if (owingError) throw new Error(`Could not load outstanding shipping: ${owingError.message}`);

  const outstanding: OutstandingFreight[] = (owing ?? []).map((order) => ({
    vendorId: order.batches.drops.vendors.id,
    vendorName: order.batches.drops.vendors.business_name,
    amount: order.freight_amount ?? 0,
  }));

  const result = summariseFinance(payments, outstanding);
  await attachLastPayouts(result.vendors);
  return result;
}

/**
 * What `vendorPayout` leaves unanswered: that figure is this app's own split
 * math, not confirmation Paystack actually settled it. This asks Paystack
 * directly, per vendor, for their most recent payout — same data as the
 * Health page's stuck-payout check, surfaced here instead as a glance
 * alongside the numbers it's explaining.
 */
async function attachLastPayouts(vendors: VendorFinanceRow[]): Promise<void> {
  if (!isPaystackConfigured() || vendors.length === 0) return;

  const admin = createAdminClient();
  const { data: codes } = await admin
    .from("vendors")
    .select("id, paystack_subaccount_code")
    .in("id", vendors.map((v) => v.vendorId))
    .not("paystack_subaccount_code", "is", null);

  const codeByVendor = new Map(
    (codes ?? []).map((row) => [row.id, row.paystack_subaccount_code!]),
  );

  await Promise.all(
    vendors.map(async (row) => {
      const code = codeByVendor.get(row.vendorId);
      // Left unset (not `null`) when there's no code at all — the page tells
      // "never connected" apart from "connected, but nothing to check yet".
      if (!code) return;
      try {
        const settlements = await listSettlements({ subaccountCode: code, perPage: 1 });
        const latest = settlements[0];
        row.lastPayout = latest
          ? { status: latest.status, amount: latest.effectiveAmount, date: latest.settlementDate }
          : null;
      } catch (error) {
        if (!(error instanceof PaystackError)) {
          console.error("[admin-finance] settlement lookup failed", error);
        }
        row.lastPayout = null;
      }
    }),
  );
}
