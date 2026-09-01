"use client";

import { Check, X } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import {
  approveVendor,
  rejectVendor,
  type ReviewVendorState,
} from "./actions";

export function ApprovalActions({
  vendorId,
  payoutComplete,
}: {
  vendorId: string;
  payoutComplete: boolean;
}) {
  const [approved, approveAction, approving] = useActionState<
    ReviewVendorState,
    FormData
  >(approveVendor, {});
  const [rejected, rejectAction, rejecting] = useActionState<
    ReviewVendorState,
    FormData
  >(rejectVendor, {});

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form
        action={approveAction}
        className="space-y-4 rounded-card border border-open/30 bg-open-tint p-4"
      >
        <input type="hidden" name="vendorId" value={vendorId} />
        <Field
          label="Approval note (optional)"
          htmlFor="approve-note"
          hint="Visible only to platform admins."
        >
          <Textarea
            id="approve-note"
            name="note"
            maxLength={500}
            placeholder="Account details reviewed"
          />
        </Field>
        {approved.error || approved.message ? (
          <p
            className={approved.error ? "text-sm text-danger" : "text-sm text-open"}
            role="status"
          >
            {approved.error ?? approved.message}
          </p>
        ) : null}
        <Button
          type="submit"
          block
          loading={approving}
          disabled={!payoutComplete}
        >
          <Check className="size-4" aria-hidden />
          Approve vendor
        </Button>
        {!payoutComplete ? (
          <p className="text-xs text-ink-muted">
            Approval unlocks after the vendor connects a complete payout account.
          </p>
        ) : null}
      </form>

      <form
        action={rejectAction}
        className="space-y-4 rounded-card border border-danger/25 bg-danger/5 p-4"
      >
        <input type="hidden" name="vendorId" value={vendorId} />
        <Field
          label="What must they fix?"
          htmlFor="reject-note"
          hint="This guidance is shown to the vendor."
        >
          <Textarea
            id="reject-note"
            name="note"
            required
            minLength={3}
            maxLength={500}
            placeholder="The payout name does not match the business owner"
          />
        </Field>
        {rejected.error || rejected.message ? (
          <p
            className={rejected.error ? "text-sm text-danger" : "text-sm text-open"}
            role="status"
          >
            {rejected.error ?? rejected.message}
          </p>
        ) : null}
        <Button type="submit" variant="danger" block loading={rejecting}>
          <X className="size-4" aria-hidden />
          Reject vendor
        </Button>
      </form>
    </div>
  );
}
