"use client";

import { Layers } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { ListSearch } from "@/components/ui/list-search";
import { StatusPill } from "@/components/ui/status-pill";
import type { PublicVendorDrop } from "@/lib/queries/public-vendor";
import { matchesQuery } from "@/lib/search";
import { dropPath } from "@/lib/site";
import { BATCH_STATUS, batchTone } from "@/lib/status";
import { BUCKETS, publicUrl } from "@/lib/storage";
import { formatAccraDateTime } from "@/lib/time";

export function SearchableVendorDrops({
  vendorSlug,
  businessName,
  drops,
}: {
  vendorSlug: string;
  businessName: string;
  drops: PublicVendorDrop[];
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      drops.filter((drop) =>
        matchesQuery([drop.title, drop.slug, drop.description], query),
      ),
    [drops, query],
  );

  if (drops.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState
          icon={Layers}
          title="Nothing open yet"
          description={`${businessName} has not published a batch link yet.`}
        />
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      {drops.length > 1 && (
        <ListSearch
          value={query}
          onChange={setQuery}
          placeholder="Search batches…"
          label="Search batches"
        />
      )}
      {filtered.length === 0 ? (
        <p className="rounded-card border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted">
          No batches match that search.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((drop) => {
            const live = drop.openBatch;
            const upcoming = drop.nextBatch;
            const href = dropPath(vendorSlug, drop.slug);
            const tone = live
              ? batchTone("open", new Date(live.closesAt))
              : upcoming
                ? "neutral"
                : "closed";

            return (
              <li key={drop.id}>
                <Link
                  href={href}
                  className="flex gap-3 overflow-hidden rounded-card border border-border bg-surface transition-colors hover:border-brand-300"
                >
                  <div className="relative w-24 shrink-0 self-stretch bg-surface-muted sm:w-28">
                    {drop.coverPath ? (
                      <Image
                        src={publicUrl(BUCKETS.vendorAssets, drop.coverPath)}
                        alt=""
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-ink-subtle">
                        <Layers className="size-5" aria-hidden />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 py-3 pr-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-display text-base font-semibold text-ink">
                        {drop.title}
                      </h3>
                      <StatusPill tone={tone} pulse={tone === "closing"}>
                        {live
                          ? BATCH_STATUS.open.publicLabel
                          : upcoming
                            ? BATCH_STATUS.scheduled.publicLabel
                            : "Closed"}
                      </StatusPill>
                    </div>

                    {drop.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                        {drop.description}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-ink-subtle">
                      {live
                        ? `Batch ${live.number} · closes ${formatAccraDateTime(live.closesAt)}${
                            live.orderCount > 0
                              ? ` · ${live.orderCount} orders in`
                              : ""
                          }`
                        : upcoming
                          ? `Batch ${upcoming.number} opens ${formatAccraDateTime(upcoming.opensAt)}`
                          : "The next batch has not been scheduled yet."}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
