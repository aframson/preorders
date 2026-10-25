"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import type { AdminActionResult } from "@/app/admin/actions";

/**
 * One button for every admin fix: optional confirm step, a locked pending
 * state so a double-tap can't run it twice, and the server's own message as
 * the toast, since it says what actually happened.
 */
export function AdminActionButton({
  label,
  run,
  confirm: confirmOptions,
  variant = "secondary",
}: {
  label: string;
  run: () => Promise<AdminActionResult>;
  confirm?: ConfirmOptions;
  variant?: "primary" | "secondary" | "danger";
}) {
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirmDialog();

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={variant}
        loading={pending}
        onClick={async () => {
          if (confirmOptions && !(await confirm(confirmOptions))) return;

          startTransition(async () => {
            const result = await run();
            if (result.error) toast.error(result.error, { duration: 10_000 });
            else if (result.message) toast.success(result.message, { duration: 8_000 });
          });
        }}
      >
        {label}
      </Button>
      {dialog}
    </>
  );
}
