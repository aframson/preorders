"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import type { BatchStatus } from "@/lib/status";
import { openBatch, setBatchStatus } from "../actions";

/**
 * The batch lifecycle is strictly sequential, so the vendor is only ever shown
 * the one move that comes next. Freight invoicing is deliberately absent: it
 * happens on the freight screen, behind an allocation preview, because it puts
 * a bill in front of every customer at once.
 */
const NEXT_STEP: Partial<
  Record<
    BatchStatus,
    { status: BatchStatus; label: string; confirm?: Omit<ConfirmOptions, "danger"> }
  >
> = {
  open: {
    status: "closed",
    label: "Close batch now",
    confirm: {
      title: "Close this batch now?",
      description:
        "Customers will no longer be able to order, and unpaid orders are released.",
      confirmLabel: "Close batch",
    },
  },
  closed: { status: "purchasing", label: "Mark as buying from supplier" },
  purchasing: { status: "in_transit", label: "Mark as shipped" },
  in_transit: { status: "arrived", label: "Mark as arrived in Ghana" },
  freight_invoiced: {
    status: "settled",
    label: "Mark batch complete",
    confirm: {
      title: "Mark this batch complete?",
      description: "Use this when every customer has paid shipping.",
      confirmLabel: "Mark complete",
    },
  },
  arrived: {
    status: "settled",
    label: "Mark batch complete",
    confirm: {
      title: "Mark this batch complete?",
      description: "Use this when every customer has paid shipping.",
      confirmLabel: "Mark complete",
    },
  },
};

export function StatusControl({
  batchId,
  dropId,
  status,
  canSettle = false,
}: {
  batchId: string;
  dropId: string;
  status: BatchStatus;
  /** When status is freight_invoiced and nobody still owes shipping. */
  canSettle?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirmDialog();

  function run(action: () => Promise<{ error?: string | null; message?: string | null }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
      } else if (result.message) {
        toast.success(result.message);
      }
    });
  }

  if (status === "scheduled") {
    return (
      <div className="space-y-2">
        <Button
          loading={pending}
          onClick={() => run(() => openBatch(batchId, dropId))}
        >
          Open for orders
        </Button>
        {dialog}
      </div>
    );
  }

  const next = NEXT_STEP[status];
  if (!next) return null;
  if (status === "freight_invoiced" && !canSettle) return null;
  if (status === "arrived" && !canSettle) return null;

  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        loading={pending}
        onClick={async () => {
          if (next.confirm) {
            const ok = await confirm({
              ...next.confirm,
              danger: next.status === "closed",
            });
            if (!ok) return;
          }
          run(() => setBatchStatus(batchId, dropId, next.status));
        }}
      >
        {next.label}
      </Button>
      {dialog}
    </div>
  );
}
