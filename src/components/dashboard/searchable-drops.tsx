"use client";

import { ChevronRight } from "lucide-react";
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
        className="ml-auto max-w-sm"
      />
      {filtered.length === 0 ? (
        <p className="rounded-card border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted">
          No drops match that search.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-card border border-border bg-surface shadow-sm">
          {filtered.map((drop) => (
            <li key={drop.id} className="flex items-center">
              <Link
                href={`/dashboard/drops/${drop.id}`}
                className="flex min-w-0 flex-1 items-center gap-4 px-4 py-4 transition-colors hover:bg-surface-muted sm:px-5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-control border border-border bg-surface-muted text-sm font-semibold text-ink">
                  {drop.title.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-display font-semibold text-ink">
                      {drop.title}
                    </h2>
                    {!drop.published && (
                      <StatusPill tone="neutral" dot={false}>
                        Hidden
                      </StatusPill>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-ink-muted">
                    {dropPath(vendorSlug, drop.slug)}
                  </p>
                </div>
                <div className="hidden shrink-0 sm:block">
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
                <ChevronRight
                  className="size-4 shrink-0 text-ink-subtle"
                  aria-hidden
                />
              </Link>
              <div className="border-l border-border px-2">
                <DeleteDropButton dropId={drop.id} title={drop.title} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
