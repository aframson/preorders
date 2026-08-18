"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { DeleteDropButton } from "@/app/dashboard/drops/delete-drop-button";
import { ListSearch } from "@/components/ui/list-search";
import { StatusPill } from "@/components/ui/status-pill";
import { matchesQuery } from "@/lib/search";
import { dropPath } from "@/lib/site";
import { BATCH_STATUS, batchTone, type BatchStatus } from "@/lib/status";

export type SearchableDropCard = {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  latest: {
    number: number;
    status: BatchStatus;
  } | null;
};

export function SearchableDrops({
  vendorSlug,
  drops,
}: {
  vendorSlug: string;
  drops: SearchableDropCard[];
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      drops.filter((drop) =>
        matchesQuery(
          [drop.title, drop.slug, dropPath(vendorSlug, drop.slug)],
          query,
        ),
      ),
    [drops, query, vendorSlug],
  );

  return (
    <div className="space-y-4">
      <ListSearch
        value={query}
        onChange={setQuery}
        placeholder="Search drops…"
        label="Search drops"
      />
      {filtered.length === 0 ? (
        <p className="rounded-card border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted">
          No drops match that search.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((drop) => (
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
                  {dropPath(vendorSlug, drop.slug)}
                </p>

                <div className="mt-4">
                  {drop.latest ? (
                    <StatusPill tone={batchTone(drop.latest.status)}>
                      Batch {drop.latest.number} &middot;{" "}
                      {BATCH_STATUS[drop.latest.status].label}
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
          ))}
        </ul>
      )}
    </div>
  );
}
