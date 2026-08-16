import { notFound } from "next/navigation";

import { requireVendor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatAccraDateTime } from "@/lib/time";
import { UpdateForm } from "./update-form";

export const metadata = { title: "Batch timeline" };

export default async function BatchTimelinePage({
  params,
}: PageProps<"/dashboard/drops/[dropId]/batches/[batchId]/timeline">) {
  const { dropId, batchId } = await params;
  await requireVendor();

  const supabase = await createClient();

  const { data: batch } = await supabase
    .from("batches")
    .select("id")
    .eq("id", batchId)
    .maybeSingle();

  if (!batch) notFound();

  const { data: events } = await supabase
    .from("batch_events")
    .select("id, type, message, created_at")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl space-y-6">
      <UpdateForm batchId={batchId} dropId={dropId} />

      {events && events.length > 0 && (
        <ol className="space-y-4 border-l border-border pl-5">
          {events.map((event) => (
            <li key={event.id} className="relative">
              <span
                aria-hidden
                className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-brand-400 ring-4 ring-canvas"
              />
              <p className="text-sm text-ink">{event.message}</p>
              <p className="mt-0.5 text-xs text-ink-subtle">
                {formatAccraDateTime(new Date(event.created_at))}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
