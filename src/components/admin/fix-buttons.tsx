"use client";

import { recheckPayment, runHealthFix } from "@/app/admin/actions";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import type { ConfirmOptions } from "@/components/ui/confirm-dialog";
import type { HealthFixKind } from "@/lib/queries/admin-health";

export function HealthFixButton({
  kind,
  targetId,
  label,
  confirm,
}: {
  kind: HealthFixKind;
  targetId: string;
  label: string;
  confirm?: ConfirmOptions;
}) {
  return (
    <AdminActionButton
      label={label}
      run={() => runHealthFix(kind, targetId)}
      confirm={confirm}
      variant={confirm?.danger ? "danger" : "secondary"}
    />
  );
}

export function RecheckPaymentButton({ paymentId }: { paymentId: string }) {
  return (
    <AdminActionButton
      label="Re-check with Paystack"
      run={() => recheckPayment(paymentId)}
    />
  );
}
