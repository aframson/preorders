import { redirect } from "next/navigation";

import { getVendor, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Drops the vendor back wherever they left off. */
export default async function OnboardingIndex() {
  await requireUser();

  const vendor = await getVendor();
  if (!vendor) redirect("/onboarding/business");
  if (!vendor.paystackSubaccountCode) redirect("/onboarding/payout");

  const supabase = await createClient();
  const { data: drop } = await supabase
    .from("drops")
    .select("id")
    .eq("vendor_id", vendor.id)
    .limit(1)
    .maybeSingle();

  redirect(drop ? "/dashboard" : "/onboarding/drop");
}
