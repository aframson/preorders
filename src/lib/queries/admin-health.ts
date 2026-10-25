import "server-only";

import { requireAdmin } from "@/lib/admin-auth";
import { formatGhs } from "@/lib/money";
import {
  fetchSubaccount,
  isPaystackConfigured,
  listSettlements,
  PaystackError,
} from "@/lib/paystack";
import { isFreightSettled } from "@/lib/settlement";
import { BATCH_STATUS, ORDER_STATUS } from "@/lib/status";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatAccraDateTime } from "@/lib/time";
import { isMissingApprovalTable } from "@/lib/vendor-approval";
import { approvalMatchesPayout, payoutIsComplete } from "@/lib/vendor-approval-core";

export type HealthFixKind =
  | "recheck_payment"
  | "waive_zero_freight"
  | "settle_batch"
  | "close_batch"
  | "open_batch"
  | "release_hold"
  | "reset_payout";

export type HealthItem = {
  id: string;
  label: string;
  detail: string;
  href: string;
  fix?: { kind: HealthFixKind; targetId: string };
};

export type HealthCheck = {
  key: string;
  title: string;
  /** What's wrong and who it hurts, in plain words. */
  why: string;
  severity: "critical" | "warning";
  items: HealthItem[];
  fixLabel?: string;
  fixConfirm?: { title: string; description: string; danger?: boolean };
};

const LIMIT = 50;
const MINUTE = 60_000;

type VendorRef = { id: string; business_name: string };

function orderHref(orderId: string): string {
  return `/admin/orders/${orderId}`;
}

function vendorHref(vendorId: string): string {
  return `/admin/vendors/${vendorId}`;
}

function batchLabel(batch: {
  number: number;
  drops: { title: string; vendors: VendorRef };
}): string {
  return `${batch.drops.vendors.business_name} · ${batch.drops.title} · Batch ${batch.number}`;
}

/**
 * Data-integrity checks for the problems this platform actually produces:
 * missed webhooks, background jobs that didn't fire, and states the app has
 * no path out of. Every fix routes through the same function the normal flow
 * (webhook, cutoff job, hold-expiry job, settle step) would have run.
 */
export async function getAdminHealth(): Promise<HealthCheck[]> {
  await requireAdmin();
  const admin = createAdminClient();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const minutesAgo = (minutes: number) => new Date(now - minutes * MINUTE).toISOString();

  const paymentSelect =
    "id, amount, type, created_at, paid_at, orders!inner(id, code, status, customers(name), batches!inner(drops!inner(vendors!inner(id, business_name))))";
  const batchSelect =
    "id, number, status, opens_at, closes_at, created_at, drops!inner(title, vendors!inner(id, business_name))";

  const [
    goodsNotApplied,
    freightNotApplied,
    pendingGoods,
    pendingFreight,
    zeroFreight,
    settleable,
    openPastCutoff,
    scheduledPastStart,
    expiredHolds,
    openBatches,
  ] = await Promise.all([
    admin
      .from("payments")
      .select(paymentSelect)
      .eq("status", "success")
      .eq("type", "goods")
      .in("orders.status", ["pending_payment", "cancelled"])
      .limit(LIMIT),
    admin
      .from("payments")
      .select(paymentSelect)
      .eq("status", "success")
      .eq("type", "freight")
      .in("orders.status", [
        "pending_payment",
        "paid",
        "purchased",
        "in_transit",
        "awaiting_freight",
        "cancelled",
      ])
      .limit(LIMIT),
    // Only payments whose order is still waiting on that money: a stale
    // second attempt on an order that's since been paid is just noise.
    admin
      .from("payments")
      .select(paymentSelect)
      .eq("status", "pending")
      .eq("type", "goods")
      .eq("orders.status", "pending_payment")
      .lt("created_at", minutesAgo(30))
      .order("created_at", { ascending: false })
      .limit(LIMIT),
    admin
      .from("payments")
      .select(paymentSelect)
      .eq("status", "pending")
      .eq("type", "freight")
      .eq("orders.status", "awaiting_freight")
      .lt("created_at", minutesAgo(30))
      .gt("created_at", minutesAgo(7 * 24 * 60))
      .order("created_at", { ascending: false })
      .limit(LIMIT),
    admin
      .from("orders")
      .select("id, code, freight_invoiced_at, customers(name), batches!inner(drops!inner(vendors!inner(id, business_name)))")
      .eq("status", "awaiting_freight")
      .eq("freight_amount", 0)
      .limit(LIMIT),
    admin
      .from("batches")
      .select(`${batchSelect}, orders(status, freight_paid_at)`)
      .in("status", ["freight_invoiced", "arrived"])
      .not("freight_finalised_at", "is", null)
      .limit(LIMIT),
    admin
      .from("batches")
      .select(batchSelect)
      .eq("status", "open")
      .lt("closes_at", nowIso)
      .order("closes_at", { ascending: true })
      .limit(LIMIT),
    admin
      .from("batches")
      .select(batchSelect)
      .eq("status", "scheduled")
      .lt("opens_at", nowIso)
      .limit(LIMIT),
    admin
      .from("orders")
      .select("id, code, goods_total, hold_expires_at, customers(name), batches!inner(drops!inner(vendors!inner(id, business_name)))")
      .eq("status", "pending_payment")
      .lt("hold_expires_at", minutesAgo(10))
      .limit(LIMIT),
    admin
      .from("batches")
      .select("drops!inner(vendors!inner(id, business_name, paystack_subaccount_code, payout_bank_code, payout_account_number, payout_account_name))")
      .eq("status", "open")
      .gt("closes_at", nowIso),
  ]);

  const checks: HealthCheck[] = [];

  // 1. Money taken, order never moved.
  const notApplied = [...(goodsNotApplied.data ?? []), ...(freightNotApplied.data ?? [])];
  checks.push({
    key: "paid_not_applied",
    title: "Paid, but the order never updated",
    why: "Paystack took the customer's money, but the order still shows unpaid or cancelled. The customer has paid for something the vendor can't see. Open each order and check the payment against Paystack before changing anything.",
    severity: "critical",
    items: notApplied.map((payment) => ({
      id: payment.id,
      label: `${payment.orders.code} · ${payment.orders.customers?.name ?? "Unknown"}`,
      detail: `${payment.type === "goods" ? "Goods" : "Shipping"} ${formatGhs(payment.amount)} paid ${payment.paid_at ? formatAccraDateTime(payment.paid_at) : ""} · order is ${ORDER_STATUS[payment.orders.status].label.toLowerCase()} · ${payment.orders.batches.drops.vendors.business_name}`,
      href: orderHref(payment.orders.id),
    })),
  });

  // 2. Vendors who can't take payments but are open for orders.
  const openVendors = new Map<
    string,
    {
      id: string;
      business_name: string;
      paystack_subaccount_code: string | null;
      payout_bank_code: string | null;
      payout_account_number: string | null;
      payout_account_name: string | null;
    }
  >();
  for (const batch of openBatches.data ?? []) {
    openVendors.set(batch.drops.vendors.id, batch.drops.vendors);
  }

  const blockedVendors: HealthItem[] = [];
  if (openVendors.size > 0) {
    const { data: approvals, error: approvalError } = await admin
      .from("vendor_approvals")
      .select("vendor_id, status, approved_subaccount_code, approved_bank_code, approved_account_number")
      .in("vendor_id", [...openVendors.keys()]);

    if (!isMissingApprovalTable(approvalError)) {
      const approvalByVendor = new Map((approvals ?? []).map((row) => [row.vendor_id, row]));
      for (const vendor of openVendors.values()) {
        const identity = {
          paystackSubaccountCode: vendor.paystack_subaccount_code,
          payoutBankCode: vendor.payout_bank_code,
          payoutAccountNumber: vendor.payout_account_number,
          payoutAccountName: vendor.payout_account_name,
        };
        const approval = approvalByVendor.get(vendor.id) ?? null;
        if (payoutIsComplete(identity) && approvalMatchesPayout(identity, approval)) continue;

        blockedVendors.push({
          id: vendor.id,
          label: vendor.business_name,
          detail: !payoutIsComplete(identity)
            ? "Payout account isn't connected"
            : approval?.status === "rejected"
              ? "Payout review was rejected"
              : approval?.status === "approved"
                ? "Payout details changed since approval — needs re-review"
                : "Payout is waiting for review",
          href: vendorHref(vendor.id),
        });
      }
    }
  }

  checks.push({
    key: "vendor_cannot_take_payments",
    title: "Open shops that can't take payments",
    why: "These vendors have a batch open for orders, but every checkout will fail because their payout isn't connected or approved. Customers see a working shop and then can't pay.",
    severity: "critical",
    items: blockedVendors,
  });

  // 2b. A subaccount code that looks complete and approved in our own data,
  // but no longer exists on Paystack's side (deleted, wrong environment,
  // recreated and never re-saved here) — and, for codes that do resolve,
  // whether their most recent payout actually went through. Nothing in the
  // normal flow ever asks Paystack either of these things — the split can be
  // calculated correctly while the money never actually reaches the vendor,
  // and the first sign would otherwise be a customer's checkout failing with
  // "invalid subaccount", or the vendor asking where their money is.
  const staleSubaccounts: HealthItem[] = [];
  const stuckPayouts: HealthItem[] = [];
  const THREE_DAYS = 3 * 24 * MINUTE * 60;

  if (isPaystackConfigured()) {
    const { data: vendorsWithCode } = await admin
      .from("vendors")
      .select("id, business_name, paystack_subaccount_code")
      .not("paystack_subaccount_code", "is", null);

    await Promise.all(
      (vendorsWithCode ?? []).map(async (vendor) => {
        const code = vendor.paystack_subaccount_code!;
        try {
          await fetchSubaccount(code);
        } catch (error) {
          if (!(error instanceof PaystackError)) {
            console.error("[admin-health] subaccount check failed", error);
            return;
          }
          staleSubaccounts.push({
            id: vendor.id,
            label: vendor.business_name,
            detail: `Paystack: "${error.message}" — the saved subaccount code doesn't resolve.`,
            href: vendorHref(vendor.id),
            fix: { kind: "reset_payout", targetId: vendor.id },
          });
          return;
        }

        try {
          const settlements = await listSettlements({ subaccountCode: code, perPage: 1 });
          const latest = settlements[0];
          if (!latest) return;

          const stale = now - new Date(latest.settlementDate).getTime() > THREE_DAYS;
          if (latest.status === "failed" || (stale && latest.status !== "success")) {
            stuckPayouts.push({
              id: vendor.id,
              label: vendor.business_name,
              detail: `Last payout ${formatGhs(latest.effectiveAmount)} on ${formatAccraDateTime(latest.settlementDate)} is still "${latest.status}" with Paystack.`,
              href: vendorHref(vendor.id),
            });
          }
        } catch (error) {
          if (!(error instanceof PaystackError)) {
            console.error("[admin-health] settlement check failed", error);
          }
        }
      }),
    );
  }

  checks.push({
    key: "invalid_subaccount",
    title: "Payout connections that no longer resolve on Paystack",
    why: "These vendors have a subaccount code on file that Paystack no longer recognises — deleted, created in the wrong test/live mode, or never actually valid. Any payment keeps the platform's cut but the vendor's share has nowhere real to go. Resetting clears the link so they reconnect and get a working code.",
    severity: "critical",
    items: staleSubaccounts,
    fixLabel: "Reset payout connection",
    fixConfirm: {
      title: "Reset this vendor's payout connection?",
      description:
        "Clears the stale subaccount link. The vendor needs to reconnect their payout account before they can sell again, and goes back through review.",
      danger: true,
    },
  });

  checks.push({
    key: "stuck_payouts",
    title: "Payouts not settling",
    why: "Paystack calculated these vendors' latest payout correctly, but it's been stuck pending (or failed outright) for days instead of settling to their bank/MoMo account — usually an unverified subaccount or a compliance hold on Paystack's side. There's no automatic fix: check the subaccount's verification status, and open a ticket with Paystack if it's verified and still stuck.",
    severity: "critical",
    items: stuckPayouts,
  });

  // 3. Checkouts we never heard back about.
  const pending = [...(pendingGoods.data ?? []), ...(pendingFreight.data ?? [])];
  checks.push({
    key: "stuck_pending_payments",
    title: "Payments with no answer from Paystack",
    why: "A checkout started over 30 minutes ago and Paystack never confirmed it. If the customer did pay, the webhook was missed. Re-checking asks Paystack directly and applies the payment only if it went through.",
    severity: "warning",
    items: pending.map((payment) => ({
      id: payment.id,
      label: `${payment.orders.code} · ${payment.orders.customers?.name ?? "Unknown"}`,
      detail: `${payment.type === "goods" ? "Goods" : "Shipping"} ${formatGhs(payment.amount)} · started ${formatAccraDateTime(payment.created_at)} · ${payment.orders.batches.drops.vendors.business_name}`,
      href: orderHref(payment.orders.id),
      fix: { kind: "recheck_payment", targetId: payment.id },
    })),
    fixLabel: "Re-check with Paystack",
  });

  // 4. ₵0 shipping invoices from before zero shares were auto-settled.
  checks.push({
    key: "zero_freight_stuck",
    title: "Customers billed GH₵0.00 shipping, stuck unpaid",
    why: "Paystack can't take a ₵0 payment, so these customers can never pay and their batch can never complete. Waiving marks their shipping as settled and emails them that nothing is owed.",
    severity: "warning",
    items: (zeroFreight.data ?? []).map((order) => ({
      id: order.id,
      label: `${order.code} · ${order.customers?.name ?? "Unknown"}`,
      detail: `Invoiced ${order.freight_invoiced_at ? formatAccraDateTime(order.freight_invoiced_at) : ""} · ${order.batches.drops.vendors.business_name}`,
      href: orderHref(order.id),
      fix: { kind: "waive_zero_freight", targetId: order.id },
    })),
    fixLabel: "Waive shipping",
    fixConfirm: {
      title: "Mark this order's shipping as settled?",
      description: "The order's shipping charge is GH₵0.00, so there is nothing to collect. The customer is emailed and the batch completes if everyone else has paid.",
    },
  });

  // 5. Fully paid batches still showing as invoiced.
  checks.push({
    key: "batch_should_settle",
    title: "Batches fully paid but not completed",
    why: "Every customer in these batches has settled shipping, but the batch never moved to Completed, so the vendor still sees it as waiting on payments.",
    severity: "warning",
    items: (settleable.data ?? [])
      .filter((batch) => {
        const shipping = (batch.orders ?? []).filter(
          (order) => order.status !== "pending_payment" && order.status !== "cancelled",
        );
        return (
          shipping.length > 0 &&
          shipping.every((order) =>
            isFreightSettled({ status: order.status, freightPaidAt: order.freight_paid_at }),
          )
        );
      })
      .map((batch) => ({
        id: batch.id,
        label: batchLabel(batch),
        detail: `Status: ${BATCH_STATUS[batch.status].label}`,
        href: vendorHref(batch.drops.vendors.id),
        fix: { kind: "settle_batch", targetId: batch.id },
      })),
    fixLabel: "Mark completed",
  });

  // 6. The cutoff job never fired.
  checks.push({
    key: "open_past_cutoff",
    title: "Batches still open after their cutoff",
    why: "Customers already see these as closed, since checkout checks the time. But the close never ran: unpaid holds weren't released, the buy-list never locked, and the next batch never opened. If the vendor wants to keep selling, they should set a new cutoff date in batch settings instead.",
    severity: "warning",
    items: (openPastCutoff.data ?? []).map((batch) => ({
      id: batch.id,
      label: batchLabel(batch),
      detail: `Cutoff was ${formatAccraDateTime(batch.closes_at)}`,
      href: vendorHref(batch.drops.vendors.id),
      fix: { kind: "close_batch", targetId: batch.id },
    })),
    fixLabel: "Close now",
    fixConfirm: {
      title: "Close this batch now?",
      description: "This runs what should have happened at its cutoff: unpaid holds are released, and the next batch opens if the vendor has auto-open on. If the vendor meant to keep selling, cancel and ask them to set a new cutoff date instead.",
      danger: true,
    },
  });

  // 7. The scheduled open never fired. A batch whose opens_at is just its
  // creation time is waiting for a manual open, not a missed schedule.
  checks.push({
    key: "scheduled_past_start",
    title: "Scheduled batches that didn't open on time",
    why: "The vendor picked a start time for these batches and it has passed, but they're still not open, so customers can't order.",
    severity: "warning",
    items: (scheduledPastStart.data ?? [])
      .filter(
        (batch) =>
          new Date(batch.opens_at).getTime() - new Date(batch.created_at).getTime() > MINUTE,
      )
      .map((batch) => ({
        id: batch.id,
        label: batchLabel(batch),
        detail: `Was due to open ${formatAccraDateTime(batch.opens_at)}`,
        href: vendorHref(batch.drops.vendors.id),
        fix: { kind: "open_batch", targetId: batch.id },
      })),
    fixLabel: "Open now",
  });

  // 8. The hold-expiry job never fired.
  checks.push({
    key: "expired_holds",
    title: "Unpaid orders past their hold",
    why: "These orders were never paid and their hold has run out, but they were never released, so they keep holding stock. A payment that still lands later will mark the order paid.",
    severity: "warning",
    items: (expiredHolds.data ?? []).map((order) => ({
      id: order.id,
      label: `${order.code} · ${order.customers?.name ?? "Unknown"}`,
      detail: `${formatGhs(order.goods_total)} · hold ended ${order.hold_expires_at ? formatAccraDateTime(order.hold_expires_at) : ""} · ${order.batches.drops.vendors.business_name}`,
      href: orderHref(order.id),
      fix: { kind: "release_hold", targetId: order.id },
    })),
    fixLabel: "Release",
    fixConfirm: {
      title: "Release this unpaid order?",
      description: "The order is cancelled and its stock freed, same as the automatic hold expiry. If the customer's payment still comes through later, it will be marked paid.",
    },
  });

  return checks;
}

export function countHealthIssues(checks: HealthCheck[]): {
  critical: number;
  warning: number;
} {
  return checks.reduce(
    (counts, check) => {
      counts[check.severity] += check.items.length;
      return counts;
    },
    { critical: 0, warning: 0 },
  );
}
