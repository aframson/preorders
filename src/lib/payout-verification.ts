import "server-only";

import type { VendorContext } from "@/lib/auth";
import {
  fetchSubaccount,
  isPaystackConfigured,
  PaystackError,
} from "@/lib/paystack";
import { createAdminClient } from "@/lib/supabase/admin";

export type PayoutStatus = {
  connected: boolean;
  verified: boolean;
  subaccountCode: string | null;
  payoutVerifiedAt: string | null;
};

/**
 * Pull `is_verified` from Paystack and mirror it onto `vendors.payout_verified_at`.
 * Creating a subaccount is not the same as being verified — a Paystack admin
 * must confirm it on the dashboard before payouts (and catalogue publishing) unlock.
 */
export async function syncVendorPayoutStatus(
  vendor: VendorContext,
): Promise<VendorContext & PayoutStatus> {
  const code = vendor.paystackSubaccountCode;
  if (!code || !isPaystackConfigured()) {
    return {
      ...vendor,
      connected: Boolean(code),
      verified: false,
      subaccountCode: code,
      payoutVerifiedAt: null,
    };
  }

  try {
    const subaccount = await fetchSubaccount(code);
    const verifiedAt = subaccount.isVerified
      ? (vendor.payoutVerifiedAt ?? new Date().toISOString())
      : null;

    if (verifiedAt !== vendor.payoutVerifiedAt) {
      const admin = createAdminClient();
      await admin
        .from("vendors")
        .update({ payout_verified_at: verifiedAt })
        .eq("id", vendor.id);
    }

    return {
      ...vendor,
      payoutVerifiedAt: verifiedAt,
      connected: true,
      verified: Boolean(verifiedAt),
      subaccountCode: code,
    };
  } catch (error) {
    // Keep the last known local flag if Paystack is briefly unreachable.
    if (!(error instanceof PaystackError)) {
      console.error("syncVendorPayoutStatus failed", error);
    }
    return {
      ...vendor,
      connected: true,
      verified: Boolean(vendor.payoutVerifiedAt),
      subaccountCode: code,
      payoutVerifiedAt: vendor.payoutVerifiedAt,
    };
  }
}
