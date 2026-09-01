import "server-only";

import type { VendorContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  approvalMatchesPayout,
  payoutIsComplete,
} from "@/lib/vendor-approval-core";

export type VendorApprovalState = {
  status: "missing_payout" | "pending" | "approved" | "rejected";
  approved: boolean;
  note: string | null;
  reviewedAt: string | null;
};

export const PAYOUT_MISSING_MESSAGE =
  "Connect your MoMo or bank payout account before you can add products or open a batch.";

export const APPROVAL_PENDING_MESSAGE =
  "Your payout account is waiting for Preorders review. You can continue once an admin approves it.";

export const APPROVAL_REJECTED_MESSAGE =
  "Your payout account needs attention before you can sell. Check the review note in More.";

export async function getVendorApproval(
  vendor: VendorContext,
): Promise<VendorApprovalState> {
  if (!payoutIsComplete(vendor)) {
    return {
      status: "missing_payout",
      approved: false,
      note: null,
      reviewedAt: null,
    };
  }

  const admin = createAdminClient();
  const { data: approval, error } = await admin
    .from("vendor_approvals")
    .select(
      "status, note, reviewed_at, approved_subaccount_code, approved_bank_code, approved_account_number",
    )
    .eq("vendor_id", vendor.id)
    .maybeSingle();

  // Deployment compatibility: ship application code before the grant-changing
  // migration. Until the table exists, preserve the previous Paystack gate.
  if (isMissingApprovalTable(error)) {
    return {
      status: vendor.payoutVerifiedAt ? "approved" : "pending",
      approved: Boolean(vendor.payoutVerifiedAt),
      note: null,
      reviewedAt: vendor.payoutVerifiedAt,
    };
  }

  if (approvalMatchesPayout(vendor, approval)) {
    return {
      status: "approved",
      approved: true,
      note: approval?.note ?? null,
      reviewedAt: approval?.reviewed_at ?? null,
    };
  }

  if (approval?.status === "rejected") {
    return {
      status: "rejected",
      approved: false,
      note: approval.note,
      reviewedAt: approval.reviewed_at,
    };
  }

  return {
    status: "pending",
    approved: false,
    note: approval?.note ?? null,
    reviewedAt: approval?.reviewed_at ?? null,
  };
}

/** Service paths that only have a vendor id use this before selling. */
export async function isVendorApprovedForSelling(
  vendorId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const [
    { data: vendor },
    { data: approval, error: approvalError },
  ] = await Promise.all([
    admin
      .from("vendors")
      .select(
        "paystack_subaccount_code, payout_bank_code, payout_account_number, payout_account_name, payout_verified_at",
      )
      .eq("id", vendorId)
      .maybeSingle(),
    admin
      .from("vendor_approvals")
      .select(
        "status, approved_subaccount_code, approved_bank_code, approved_account_number",
      )
      .eq("vendor_id", vendorId)
      .maybeSingle(),
  ]);

  if (
    !vendor?.paystack_subaccount_code ||
    !vendor.payout_bank_code ||
    !vendor.payout_account_number ||
    !vendor.payout_account_name
  ) {
    return false;
  }

  if (isMissingApprovalTable(approvalError)) {
    return Boolean(vendor.payout_verified_at);
  }

  return approvalMatchesPayout(
    {
      paystackSubaccountCode: vendor.paystack_subaccount_code,
      payoutBankCode: vendor.payout_bank_code,
      payoutAccountNumber: vendor.payout_account_number,
    },
    approval,
  );
}

export async function requireVendorApproval(
  vendor: VendorContext,
): Promise<
  | { ok: true; vendor: VendorContext; approval: VendorApprovalState }
  | { ok: false; error: string; approval: VendorApprovalState }
> {
  const approval = await getVendorApproval(vendor);
  if (approval.approved) return { ok: true, vendor, approval };

  const error =
    approval.status === "missing_payout"
      ? PAYOUT_MISSING_MESSAGE
      : approval.status === "rejected"
        ? APPROVAL_REJECTED_MESSAGE
        : APPROVAL_PENDING_MESSAGE;

  return { ok: false, error, approval };
}

/** Any payout edit must return the vendor to the review queue. */
export async function resetVendorApproval(vendorId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("vendor_approvals").upsert({
    vendor_id: vendorId,
    status: "pending",
    note: null,
    reviewed_at: null,
    reviewed_by: null,
    approved_subaccount_code: null,
    approved_bank_code: null,
    approved_account_number: null,
  });

  if (isMissingApprovalTable(error)) return;
  if (error) throw new Error("Could not reset vendor approval");
}

export function isMissingApprovalTable(
  error: { code?: string } | null | undefined,
): boolean {
  return error?.code === "42P01";
}
