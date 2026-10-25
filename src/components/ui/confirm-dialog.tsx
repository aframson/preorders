"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { useMounted } from "@/lib/use-mounted";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive (closing a batch, deleting a drop). */
  danger?: boolean;
};

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

/**
 * Promise-based, in-brand replacement for `window.confirm()`.
 *
 * The native dialog looks like a browser error, can't be styled, and renders
 * inconsistently in an installed PWA (iOS/Android standalone mode) — exactly
 * where vendors are expected to be running this app. `confirm()` here resolves
 * the same way its native namesake did, so a call site only changes from
 * `if (!confirm(message)) return;` to `if (!(await confirm({ title }))) return;`.
 */
export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const mounted = useMounted();
  const titleId = useId();
  const descriptionId = useId();

  const resolveWith = useCallback((value: boolean) => {
    setPending((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!pending) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") resolveWith(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [pending, resolveWith]);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const dialog =
    mounted && pending
      ? createPortal(
          <div className="fixed inset-0 z-[150]">
            <button
              type="button"
              className="absolute inset-0 bg-ink/40"
              aria-label="Cancel"
              onClick={() => resolveWith(false)}
            />
            <div className="flex min-h-full items-end justify-center sm:items-center sm:p-4">
              <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={pending.description ? descriptionId : undefined}
                className="relative w-full max-w-sm space-y-4 rounded-t-sheet border border-border bg-surface p-5 shadow-sheet sm:rounded-card"
              >
                <div className="space-y-1.5">
                  <p
                    id={titleId}
                    className="font-display text-base font-semibold text-ink"
                  >
                    {pending.title}
                  </p>
                  {pending.description && (
                    <p
                      id={descriptionId}
                      className="text-sm leading-relaxed text-ink-muted"
                    >
                      {pending.description}
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    autoFocus
                    onClick={() => resolveWith(false)}
                  >
                    {pending.cancelLabel ?? "Cancel"}
                  </Button>
                  <Button
                    type="button"
                    variant={pending.danger ? "danger" : "primary"}
                    size="sm"
                    onClick={() => resolveWith(true)}
                  >
                    {pending.confirmLabel ?? "Confirm"}
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return { confirm, dialog };
}
