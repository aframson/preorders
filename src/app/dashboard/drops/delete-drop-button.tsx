"use client";

import { MoreHorizontal, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { deleteDrop } from "./actions";

export function DeleteDropButton({
  dropId,
  title,
}: {
  dropId: string;
  title: string;
}) {
  const [pending, start] = useTransition();

  return (
    <details className="group relative">
      <summary
        aria-label={`Options for ${title}`}
        className="flex size-9 cursor-pointer list-none items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </summary>
      <div className="absolute top-10 right-0 z-20 w-40 rounded-control border border-border bg-surface p-1 shadow-sheet">
        <button
          type="button"
          disabled={pending}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-tint disabled:opacity-50"
          onClick={(event) => {
            event.preventDefault();
            const ok = confirm(
              `Delete “${title}”?\n\nThe public link is removed and open batches stop taking orders.`,
            );
            if (!ok) return;
            start(async () => {
              const result = await deleteDrop(dropId);
              if (result?.error) toast.error(result.error);
            });
          }}
        >
          <Trash2 className="size-4" aria-hidden />
          Delete drop
        </button>
      </div>
    </details>
  );
}
