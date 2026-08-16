"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { BatchStatus } from "@/lib/status";
import { openBatch, setBatchStatus } from "../actions";

/**
 * The batch lifecycle is strictly sequential, so the vendor is only ever shown
 * the one move that comes next. Freight invoicing is deliberately absent: it
 * happens on the freight screen, behind an allocation preview, because it puts
 * a bill in front of every customer at once.
 */
const NEXT_STEP: Partial<
  Record<BatchStatus, { status: BatchStatus; label: string; confirm?: string }>
> = {
  open: {
    status: "closed",
    label: "Close batch now",
    confirm:
      "Close this batch now? Customers will no longer be able to order, and unpaid orders are released.",
  },
  closed: { status: "purchasing", label: "Mark as buying from supplier" },
  purchasing: { status: "in_transit", label: "Mark as shipped" },
  in_transit: { status: "arrived", label: "Mark as arrived in Ghana" },
};

export function StatusControl({
  batchId,
  dropId,
  status,
}: {
  batchId: string;
  dropId: string;
  status: BatchStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ error?: string | null; message?: string | null }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
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
        {error && (
          <p role="alert" className="max-w-sm text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  const next = NEXT_STEP[status];
  if (!next) return null;

  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        loading={pending}
        onClick={() => {
          if (next.confirm && !confirm(next.confirm)) return;
          run(() => setBatchStatus(batchId, dropId, next.status));
        }}
      >
        {next.label}
      </Button>
      {error && (
        <p role="alert" className="max-w-sm text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
