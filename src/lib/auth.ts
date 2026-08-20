import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { SessionNav } from "@/lib/session-nav";

export type { SessionNav };

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export type VendorContext = {
  id: string;
  slug: string;
  businessName: string;
  logoPath: string | null;
  whatsappNumber: string | null;
  pickupMapsUrl: string | null;
  paystackSubaccountCode: string | null;
  payoutVerifiedAt: string | null;
  payoutChannel: "mobile_money" | "bank" | null;
  payoutBankCode: string | null;
  payoutAccountNumber: string | null;
  payoutAccountName: string | null;
};

/** The vendor the signed-in user belongs to, or null if onboarding is unfinished. */
export async function getVendor(): Promise<VendorContext | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("vendor_members")
    .select(
      "vendors(id, slug, business_name, logo_path, whatsapp_number, pickup_maps_url, paystack_subaccount_code, payout_verified_at, payout_channel, payout_bank_code, payout_account_number, payout_account_name)",
    )
    .limit(1)
    .maybeSingle();

  const vendor = data?.vendors;
  if (!vendor) return null;

  const channel =
    vendor.payout_channel === "mobile_money" || vendor.payout_channel === "bank"
      ? vendor.payout_channel
      : null;

  return {
    id: vendor.id,
    slug: vendor.slug,
    businessName: vendor.business_name,
    logoPath: vendor.logo_path,
    whatsappNumber: vendor.whatsapp_number,
    pickupMapsUrl: vendor.pickup_maps_url,
    paystackSubaccountCode: vendor.paystack_subaccount_code,
    payoutVerifiedAt: vendor.payout_verified_at,
    payoutChannel: channel,
    payoutBankCode: vendor.payout_bank_code,
    payoutAccountNumber: vendor.payout_account_number,
    payoutAccountName: vendor.payout_account_name,
  };
}

/**
 * For dashboard routes: a signed-in user without a vendor has not finished
 * onboarding, so send them back rather than rendering an empty dashboard.
 */
export async function requireVendor(): Promise<VendorContext> {
  await requireUser();
  const vendor = await getVendor();
  if (!vendor) redirect("/onboarding/business");
  return vendor;
}

/** Marketing / public chrome: what to show instead of Sign in / Get started. */
export async function getSessionNav(): Promise<SessionNav> {
  const user = await getUser();
  if (!user) return { status: "guest" };
  const vendor = await getVendor();
  if (!vendor) return { status: "onboarding" };
  return { status: "vendor", businessName: vendor.businessName };
}
