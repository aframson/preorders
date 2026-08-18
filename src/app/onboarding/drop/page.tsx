import { redirect } from "next/navigation";

import { requireVendor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { defaultCutoff, toAccraInputValue } from "@/lib/time";
import { DropForm } from "./drop-form";

export const metadata = { title: "Your first drop" };

export default async function DropStep() {
  const vendor = await requireVendor();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("drops")
    .select("slug")
    .eq("vendor_id", vendor.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Already created on a previous submit — skip the form.
  if (existing) redirect(`/onboarding/done?drop=${existing.slug}`);

  return (
    <DropForm defaultClosesAt={toAccraInputValue(defaultCutoff(14))} />
  );
}
