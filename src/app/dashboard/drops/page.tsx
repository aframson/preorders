import { Layers, Plus } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/dashboard/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { requireVendor } from "@/lib/auth";
import { dropPath } from "@/lib/site";
import { BATCH_STATUS, batchTone } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";
import { DeleteDropButton } from "./delete-drop-button";

export const metadata = { title: "Drops" };

export default async function DropsPage() {
  const vendor = await requireVendor();
  const supabase = await createClient();

  const { data: drops } = await supabase
    .from("drops")
    .select(
      "id, slug, title, published, archived_at, batches(id, number, status, closes_at)",
    )
    .eq("vendor_id", vendor.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Drops"
        description="Each drop is a permanent link with batches running inside it."
        action={
          <ButtonLink href="/dashboard/drops/new" size="sm">
            <Plus className="size-4" aria-hidden />
            New drop
          </ButtonLink>
        }
      />

      {!drops?.length ? (
        <EmptyState
          icon={Layers}
          title="No drops yet"
          description="A drop holds your products and runs your batches. Most vendors only ever need one."
          action={
            <ButtonLink href="/dashboard/drops/new">
              Create your first drop
            </ButtonLink>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {drops.map((drop) => {
            const batches = [...(drop.batches ?? [])].sort(
              (a, b) => b.number - a.number,
            );
            const live = batches.find((batch) => batch.status === "open");
            const latest = live ?? batches[0];

            return (
              <li key={drop.id} className="relative">
                <Link
                  href={`/dashboard/drops/${drop.id}`}
                  className="block rounded-card border border-border bg-surface p-4 pr-12 transition-colors hover:border-brand-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 truncate font-display font-semibold text-ink">
                      {drop.title}
                    </h2>
                    {!drop.published && (
                      <StatusPill tone="neutral" dot={false}>
                        Hidden
                      </StatusPill>
                    )}
                  </div>

                  <p className="mt-1 truncate text-sm text-ink-muted">
                    {dropPath(vendor.slug, drop.slug)}
                  </p>

                  <div className="mt-4">
                    {latest ? (
                      <StatusPill tone={batchTone(latest.status)}>
                        Batch {latest.number} &middot;{" "}
                        {BATCH_STATUS[latest.status].label}
                      </StatusPill>
                    ) : (
                      <StatusPill tone="neutral" dot={false}>
                        No batches yet
                      </StatusPill>
                    )}
                  </div>
                </Link>
                <div className="absolute top-3 right-3">
                  <DeleteDropButton dropId={drop.id} title={drop.title} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
