"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { resetVendorApproval } from "@/lib/vendor-approval";

export type ReviewVendorState = {
  error?: string | null;
  message?: string | null;
};

const reviewSchema = z.object({
  vendorId: z.uuid(),
  note: z.string().trim().max(500, "Keep the note under 500 characters"),
});

export async function approveVendor(
  _previous: ReviewVendorState,
  formData: FormData,
): Promise<ReviewVendorState> {
  const reviewer = await requireAdmin();
  const parsed = reviewSchema.safeParse({
    vendorId: formData.get("vendorId"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const admin = createAdminClient();
  const { data: vendor } = await admin
    .from("vendors")
    .select(
      "paystack_subaccount_code, payout_bank_code, payout_account_number, payout_account_name",
    )
    .eq("id", parsed.data.vendorId)
    .maybeSingle();

  if (
    !vendor?.paystack_subaccount_code ||
    !vendor.payout_bank_code ||
    !vendor.payout_account_number ||
    !vendor.payout_account_name
  ) {
    return {
      error:
        "This vendor must connect and resolve a complete payout account before approval.",
    };
  }

  const { error } = await admin.from("vendor_approvals").upsert({
    vendor_id: parsed.data.vendorId,
    status: "approved",
    note: parsed.data.note || null,
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewer.id,
    approved_subaccount_code: vendor.paystack_subaccount_code,
    approved_bank_code: vendor.payout_bank_code,
    approved_account_number: vendor.payout_account_number,
  });

  if (error) return { error: "Could not approve this vendor. Try again." };

  refreshVendorPages(parsed.data.vendorId);
  return { message: "Vendor approved. Products, batches and checkout are unlocked." };
}

export async function rejectVendor(
  _previous: ReviewVendorState,
  formData: FormData,
): Promise<ReviewVendorState> {
  const reviewer = await requireAdmin();
  const parsed = reviewSchema.safeParse({
    vendorId: formData.get("vendorId"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.note.length < 3) {
    return { error: "Add a short note explaining what the vendor must fix." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("vendor_approvals").upsert({
    vendor_id: parsed.data.vendorId,
    status: "rejected",
    note: parsed.data.note,
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewer.id,
    approved_subaccount_code: null,
    approved_bank_code: null,
    approved_account_number: null,
  });

  if (error) return { error: "Could not reject this vendor. Try again." };

  refreshVendorPages(parsed.data.vendorId);
  return { message: "Review saved. The vendor remains blocked." };
}

/**
 * For a subaccount code that's gone stale on Paystack's side (deleted,
 * mismatched environment, created in the wrong mode) — the payout form can't
 * recover from this itself because it only ever updates an existing code,
 * never replaces one. Clearing it here is what lets the vendor's next save
 * call `createSubaccount` instead and get a code that actually resolves.
 */
export async function resetVendorPayout(
  vendorId: string,
): Promise<ReviewVendorState> {
  await requireAdmin();
  const parsed = z.uuid().safeParse(vendorId);
  if (!parsed.success) return { error: "Invalid vendor." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("vendors")
    .update({ paystack_subaccount_code: null, payout_verified_at: null })
    .eq("id", parsed.data);

  if (error) {
    return { error: "Could not reset the payout connection. Try again." };
  }

  try {
    await resetVendorApproval(parsed.data);
  } catch {
    return {
      error:
        "Payout connection cleared, but the review status could not reset. Refresh and check it.",
    };
  }

  refreshVendorPages(parsed.data);
  return {
    message:
      "Payout connection cleared. The vendor needs to reconnect their payout account before they can sell again.",
  };
}

function refreshVendorPages(vendorId: string) {
  revalidatePath("/admin/vendors");
  revalidatePath(`/admin/vendors/${vendorId}`);
  revalidatePath("/dashboard");
}
