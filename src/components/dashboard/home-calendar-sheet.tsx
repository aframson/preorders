"use client";

import { CalendarDays, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import {
  VendorBatchCalendar,
  type VendorCalendarBatch,
} from "@/components/dashboard/vendor-batch-calendar";
import { cn } from "@/lib/cn";

/**
 * Mobile-only: calendar icon opens a bottom sheet with the full batch calendar.
 * Desktop keeps the side-by-side calendar in the home layout.
 */
export function HomeCalendarSheet({
  batches,
}: {
  batches: VendorCalendarBatch[];
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-5 bottom-24 z-40 flex size-14 items-center justify-center rounded-full border border-border bg-surface text-brand-700 xl:hidden"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Open batch calendar"
      >
        <CalendarDays className="size-6" aria-hidden />
      </button>

      {mounted &&
        createPortal(
          <div
            className={cn(
              "fixed inset-0 z-[120] xl:hidden",
              open ? "pointer-events-auto" : "pointer-events-none",
            )}
            aria-hidden={!open}
          >
            <button
              type="button"
              className={cn(
                "absolute inset-0 bg-ink/40 transition-opacity",
                open ? "opacity-100" : "opacity-0",
              )}
              aria-label="Close calendar"
              onClick={() => setOpen(false)}
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className={cn(
                "absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col border-t border-border bg-surface transition-transform duration-300 ease-out",
                open ? "translate-y-0" : "translate-y-full",
              )}
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3">
                <div>
                  <p
                    id={titleId}
                    className="font-display text-base font-semibold text-ink"
                  >
                    Batch calendar
                  </p>
                  <p className="text-xs text-ink-muted">Accra time</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex size-9 items-center justify-center text-ink-muted hover:bg-surface-muted hover:text-ink"
                  aria-label="Close"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <VendorBatchCalendar batches={batches} />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
