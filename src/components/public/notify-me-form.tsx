"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";

import { joinWaitlist, type WaitlistState } from "@/app/[vendor]/[drop]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export function NotifyMeForm({ dropId }: { dropId: string }) {
  const [state, submit, pending] = useActionState<WaitlistState, FormData>(
    joinWaitlist,
    {},
  );

  if (state.joined) {
    return (
      <p className="flex items-center gap-2 text-sm text-open">
        <Check className="size-4" aria-hidden />
        We will email you when the next batch opens.
      </p>
    );
  }

  return (
    <form action={submit} className="space-y-2">
      <input type="hidden" name="dropId" value={dropId} />
      <div className="flex gap-2">
        <label htmlFor="waitlist-email" className="sr-only">
          Email address
        </label>
        <Input
          id="waitlist-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="Your email"
          className="h-12"
          aria-invalid={Boolean(state.error) || undefined}
        />
        <Button type="submit" loading={pending} className="h-12 shrink-0">
          Notify me
        </Button>
      </div>
      {state.error && (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
