"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  refreshPayoutVerification,
  type RefreshPayoutState,
} from "./payout-actions";

export function RefreshPayoutButton() {
  const [state, action, pending] = useActionState<
    RefreshPayoutState,
    FormData
  >(refreshPayoutVerification, {});

  return (
    <form action={action} className="space-y-2">
      <Button type="submit" variant="secondary" size="sm" loading={pending}>
        Refresh verification
      </Button>
      {state.message && (
        <p
          role="status"
          className={
            state.verified ? "text-sm text-open" : "text-sm text-ink-muted"
          }
        >
          {state.message}
        </p>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
