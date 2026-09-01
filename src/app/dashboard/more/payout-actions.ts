"use server";

import { revalidatePath } from "next/cache";

import { requireVendor } from "@/lib/auth";
import { syncVendorPayoutStatus } from "@/lib/payout-verification";

export type RefreshPayoutState = {
  error?: string | null;
  message?: string | null;
  verified?: boolean;
};

export async function refreshPayoutVerification(
  _prev: RefreshPayoutState,
  _formData: FormData,
): Promise<RefreshPayoutState> {
  void _prev;
  void _formData;
  const vendor = await requireVendor();

  if (!vendor.paystackSubaccountCode) {
    return {
      error: "Connect a payout number first.",
      verified: false,
    };
  }

  const synced = await syncVendorPayoutStatus(vendor);
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/more");

  if (synced.verified) {
    return {
      message: "Paystack reports this payout account as verified.",
      verified: true,
    };
  }

  return {
    message:
      "Paystack still reports this subaccount as unverified. Preorders approval is shown separately.",
    verified: false,
  };
}
