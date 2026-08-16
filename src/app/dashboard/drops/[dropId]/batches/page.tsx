import { CalendarClock, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { requireVendor } from "@/lib/auth";
import { FREIGHT_MODES, type FreightMode } from "@/lib/freight";
import { formatGhs } from "@/lib/money";
import { isCounted } from "@/lib/queries/dashboard";
import { BATCH_STATUS, batchTone } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";
import { formatAccraDateTime } from "@/lib/time";

export const metadata = { title: "Batches" };

export default async function BatchesPage({
  params,
}: PageProps<"/dashboard/drops/[dropId]/batches">) {
  const { dropId } = await params;
  await requireVendor();

  const supabase = await createClient();
  const { data: drop } = await supabase
    .from("drops")
    .select("id")
    .eq("id", dropId)
    .maybeSingle();

  if (!drop) notFound();

  const { data: batches } = await supabase
    .from("batches")
    .select(
      "id, number, status, opens_at, closes_at, freight_mode, orders(id, status, goods_total)",
    )
    .eq("drop_id", dropId)
    .order("number", { ascending: false });

  return (
    <>
      <div className="mb-5 flex justify-end">
        <ButtonLink href={`/dashboard/drops/${dropId}/batches/new`} size="sm">
          <Plus className="size-4" aria-hidden />
          New batch
        </ButtonLink>
      </div>

      {!batches?.length ? (
        <EmptyState
          icon={CalendarClock}
          title="No batches yet"
          description="A batch is one round of orders with a cutoff date. Schedule one to start selling."
          action={
            <ButtonLink href={`/dashboard/drops/${dropId}/batches/new`}>
              Schedule a batch
            </ButtonLink>
          }
        />
      ) : (
        <ul className="space-y-3">
          {batches.map((batch) => {
            const counted = (batch.orders ?? []).filter((order) =>
              isCounted(order.status),
            );
            const value = counted.reduce(
              (sum, order) => sum + order.goods_total,
              0,
            );
            const closesAt = new Date(batch.closes_at);

            return (
              <li key={batch.id}>
                <Link
                  href={`/dashboard/drops/${dropId}/batches/${batch.id}`}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-border bg-surface px-5 py-4 transition-colors hover:border-brand-300"
                >
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-ink">
                      Batch {batch.number}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {FREIGHT_MODES[batch.freight_mode as FreightMode].label}{" "}
                      &middot; closes {formatAccraDateTime(closesAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <p className="text-xs text-ink-muted">Orders</p>
                      <p
                        className="font-display font-semibold text-ink"
                        data-numeric
                      >
                        {counted.length}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-ink-muted">Value</p>
                      <p
                        className="font-display font-semibold text-ink"
                        data-numeric
                      >
                        {formatGhs(value)}
                      </p>
                    </div>
                    <StatusPill tone={batchTone(batch.status, closesAt)}>
                      {BATCH_STATUS[batch.status].label}
                    </StatusPill>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
