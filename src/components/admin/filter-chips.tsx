import Link from "next/link";

import { cn } from "@/lib/cn";

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Same page, one parameter changed (or removed when `value` is undefined). */
export function hrefWith(
  path: string,
  current: SearchParamsRecord,
  key: string,
  value: string | undefined,
): string {
  const params = new URLSearchParams();
  for (const [name, raw] of Object.entries(current)) {
    const existing = firstParam(raw);
    if (name !== key && existing) params.set(name, existing);
  }
  if (value) params.set(key, value);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/** Filters as plain links, so any filtered view is a URL you can share or bookmark. */
export function FilterChips({
  label,
  options,
}: {
  label: string;
  options: { label: string; href: string; active: boolean }[];
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label={label}>
      {options.map((option) => (
        <Link
          key={option.href}
          href={option.href}
          aria-current={option.active ? "true" : undefined}
          className={cn(
            "inline-flex h-8 shrink-0 items-center rounded-control border px-3 text-sm font-medium shadow-sm transition-colors",
            option.active
              ? "border-ink bg-ink text-white"
              : "border-border bg-surface text-ink-muted hover:bg-surface-muted hover:text-ink",
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
