"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { resetVendorPayout } from "./actions";

export function ResetPayoutButton({ vendorId }: { vendorId: string }) {
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirmDialog();

  return (
    <>
      <Button
        type="button"
        variant="danger"
        size="sm"
        loading={pending}
        onClick={async () => {
          const ok = await confirm({
            title: "Clear this vendor's payout connection?",
            description:
              "Use this when their Paystack subaccount code no longer resolves (deleted, wrong environment, etc). They'll need to reconnect a payout account before selling again, and go back through review.",
            confirmLabel: "Clear connection",
            danger: true,
          });
          if (!ok) return;

          startTransition(async () => {
            const result = await resetVendorPayout(vendorId);
            if (result.error) toast.error(result.error);
            else if (result.message) toast.success(result.message);
          });
        }}
      >
        Reset payout connection
      </Button>
      {dialog}
    </>
  );
}
