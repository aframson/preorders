"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { formatGhs } from "@/lib/money";
import { resumeFreightPayment, resumeGoodsPayment, type PayState } from "./actions";

export function ResumeGoodsPay({
  token,
  amount,
}: {
  token: string;
  amount: number;
}) {
  const [state, action, pending] = useActionState<PayState, FormData>(
    resumeGoodsPayment,
    {},
  );

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="token" value={token} />
      <Button type="submit" block loading={pending}>
        Pay {formatGhs(amount)} now
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function ResumeFreightPay({
  token,
  amount,
}: {
  token: string;
  amount: number;
}) {
  const [state, action, pending] = useActionState<PayState, FormData>(
    resumeFreightPayment,
    {},
  );

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="token" value={token} />
      <Button type="submit" block loading={pending}>
        Pay {formatGhs(amount)} shipping
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
