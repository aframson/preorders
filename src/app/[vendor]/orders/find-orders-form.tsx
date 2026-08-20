"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { portalStorageKey } from "@/lib/customer-portal-storage";
import { customerPortalPath } from "@/lib/site";
import { findOrdersAction, type FindOrdersState } from "./actions";

export function FindOrdersForm({ vendorSlug }: { vendorSlug: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FindOrdersState, FormData>(
    findOrdersAction,
    {},
  );

  useEffect(() => {
    try {
      const token = window.localStorage.getItem(portalStorageKey(vendorSlug));
      if (token) router.prefetch(customerPortalPath(token));
    } catch {
      // ignore
    }
  }, [vendorSlug, router]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="vendorSlug" value={vendorSlug} />

      <Field label="Email used at checkout" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@email.com"
          inputMode="email"
        />
      </Field>

      <Field
        label="Order code (optional)"
        htmlFor="orderCode"
        hint="Looks like AFR-B3-0001 — opens that order directly"
      >
        <Input
          id="orderCode"
          name="orderCode"
          autoComplete="off"
          placeholder="AFR-B3-0001"
          className="uppercase"
        />
      </Field>

      {state.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" block loading={pending}>
        Find my orders
      </Button>
    </form>
  );
}
