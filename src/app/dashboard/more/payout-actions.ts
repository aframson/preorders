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
      message: "Paystack has verified your payout account. You can sell now.",
      verified: true,
    };
  }

  return {
    message:
      "Still pending on Paystack. Ask an admin to verify your subaccount, then check again.",
    verified: false,
  };
}
