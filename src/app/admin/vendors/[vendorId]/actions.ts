"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

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

function refreshVendorPages(vendorId: string) {
  revalidatePath("/admin/vendors");
  revalidatePath(`/admin/vendors/${vendorId}`);
  revalidatePath("/dashboard");
}
