"use client";

import { Trash2 } from "lucide-react";
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
    <button
      type="button"
      disabled={pending}
      aria-label={`Delete ${title}`}
      title="Delete drop"
      className="flex size-9 shrink-0 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-danger-tint hover:text-danger disabled:opacity-50"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
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
    </button>
  );
}
