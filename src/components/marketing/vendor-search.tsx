"use client";

import { ArrowRight, Search, Store, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useEffectEvent,
  useId,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";

import { ListSearch } from "@/components/ui/list-search";
import { cn } from "@/lib/cn";
import type { VendorSearchHit } from "@/lib/vendor-search";
import { dropPath, vendorPath } from "@/lib/site";

export function VendorSearch({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<VendorSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();
  const titleId = useId();
  const inputId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useEffectEvent(() => {
    setVisible(false);
    window.setTimeout(() => {
      setOpen(false);
      setQuery("");
      setHits([]);
      setSearched(false);
    }, 220);
  });

  const openSearch = useEffectEvent(() => {
    setOpen(true);
    // Next frame so CSS can transition from the closed state.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 1) {
      setHits([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search/vendors?q=${encodeURIComponent(q)}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as { vendors: VendorSearchHit[] };
        startTransition(() => {
          setHits(data.vendors ?? []);
          setSearched(true);
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setHits([]);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, open]);

  const overlay =
    open && mounted
      ? createPortal(
          <div
            className={cn(
              "fixed inset-0 z-[100] flex flex-col bg-canvas transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
              visible
                ? "translate-y-0 opacity-100"
                : "translate-y-3 opacity-0 motion-reduce:translate-y-0",
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="border-b border-border/70 bg-surface px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 sm:px-6">
              <div className="mx-auto w-full max-w-2xl space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p
                    id={titleId}
                    className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl"
                  >
                    Search vendors
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <ListSearch
                    id={inputId}
                    value={query}
                    onChange={setQuery}
                    autoFocus
                    label="Search vendors"
                    placeholder="Business name…"
                    className="min-w-0 flex-1"
                    inputClassName="h-14 text-lg font-medium shadow-none sm:h-14"
                  />
                  <button
                    type="button"
                    onClick={() => close()}
                    className="flex size-14 shrink-0 items-center justify-center rounded-control border border-border/70 bg-surface text-ink-muted shadow-none transition-colors hover:bg-surface-muted hover:text-ink"
                    aria-label="Close search"
                  >
                    <X className="size-5" aria-hidden />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
              <div className="mx-auto w-full max-w-2xl">
                {!query.trim() ? (
                  <p className="text-center text-sm text-ink-muted">
                    Type a shop name to find vendors with open catalogues.
                  </p>
                ) : loading ? (
                  <p className="text-center text-sm text-ink-muted">Searching…</p>
                ) : searched && hits.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <Store className="size-8 text-ink-subtle" aria-hidden />
                    <p className="font-medium text-ink">No vendors found</p>
                    <p className="max-w-sm text-sm text-ink-muted">
                      Try another name, or ask your seller for their Preorders
                      link.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border/70 overflow-hidden rounded-card border border-border/70 bg-surface shadow-none">
                    {hits.map((hit) => {
                      const href = hit.openDropSlug
                        ? dropPath(hit.slug, hit.openDropSlug)
                        : vendorPath(hit.slug);
                      return (
                        <li key={hit.slug}>
                          <Link
                            href={href}
                            onClick={() => close()}
                            className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-muted"
                          >
                            {hit.logoUrl ? (
                              <Image
                                src={hit.logoUrl}
                                alt=""
                                width={44}
                                height={44}
                                className="size-11 rounded-full object-cover"
                              />
                            ) : (
                              <span className="flex size-11 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800">
                                {hit.businessName.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-ink">
                                {hit.businessName}
                              </span>
                              <span className="block text-xs text-ink-muted">
                                {hit.openDropSlug
                                  ? "Batch open · browse products"
                                  : `${hit.dropCount} drop${hit.dropCount === 1 ? "" : "s"}`}
                              </span>
                            </span>
                            <ArrowRight
                              className="size-4 shrink-0 text-ink-subtle"
                              aria-hidden
                            />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => openSearch()}
        className={cn(
          "group flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-surface px-5 py-4 text-left shadow-none transition-colors hover:border-border sm:px-6 sm:py-5",
          className,
        )}
      >
        <Search
          className="size-6 shrink-0 text-ink-muted transition-colors group-hover:text-brand-700 sm:size-7"
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-bold tracking-tight text-ink sm:text-xl">
            Find a vendor
          </span>
          <span className="mt-0.5 block truncate text-sm text-ink-muted">
            Search shops and browse what they are selling
          </span>
        </span>
        <ArrowRight
          className="size-5 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-brand-700"
          aria-hidden
        />
      </button>

      {overlay}
    </>
  );
}
