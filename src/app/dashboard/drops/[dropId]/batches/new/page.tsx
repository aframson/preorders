import { notFound } from "next/navigation";

import { PageHeader } from "@/components/dashboard/page-header";
import { requireVendor } from "@/lib/auth";
import type { FreightMode } from "@/lib/freight";
import { createClient } from "@/lib/supabase/server";
import { defaultCutoff, toAccraInputValue } from "@/lib/time";
import { BatchForm } from "../batch-form";

export const metadata = { title: "New batch" };

export default async function NewBatchPage({
  params,
}: PageProps<"/dashboard/drops/[dropId]/batches/new">) {
  const { dropId } = await params;
  await requireVendor();

  const supabase = await createClient();
  const { data: drop } = await supabase
    .from("drops")
    .select("id, default_freight_mode")
    .eq("id", dropId)
    .maybeSingle();

  if (!drop) notFound();

  // Carry the previous batch's rate forward: forwarder rates move slowly, and
  // re-typing it every cycle is exactly the kind of friction that gets skipped.
  const { data: previous } = await supabase
    .from("batches")
    .select("freight_rate_estimate")
    .eq("drop_id", dropId)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <>
      <PageHeader title="New batch" />
      <BatchForm
        dropId={dropId}
        submitLabel="Schedule batch"
        initial={{
          freightMode: drop.default_freight_mode as FreightMode,
          closesAt: toAccraInputValue(defaultCutoff(14)),
          expectedDeliveryAt: "",
          freightRateEstimate: previous?.freight_rate_estimate ?? 0,
          autoOpenNext: true,
        }}
      />
    </>
  );
}
