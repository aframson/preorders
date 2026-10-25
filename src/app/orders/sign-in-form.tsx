"use client";

import { Mail } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { signInAction, type SignInState } from "./actions";

export function SignInForm() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signInAction, {
    step: "email",
  });

  if (state.step === "code" && state.email) {
    return (
      <form action={formAction} className="space-y-4">
        <p className="flex items-start gap-2 text-sm text-ink-muted">
          <Mail className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
          <span>
            We emailed a 6-digit code to{" "}
            <span className="font-medium text-ink">{state.email}</span>.
          </span>
        </p>

        <Field label="Code" htmlFor="code" error={state.error}>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            required
            autoFocus
            placeholder="••••••"
            className="text-center font-display text-2xl tracking-[0.5em]"
            aria-invalid={state.error ? true : undefined}
            data-numeric
          />
        </Field>

        {state.notice && (
          <p className="text-sm text-open" role="status">
            {state.notice}
          </p>
        )}

        <Button type="submit" name="intent" value="verify" block size="lg" loading={pending}>
          Sign in
        </Button>

        <div className="flex items-center justify-between gap-3 text-sm">
          <button
            type="submit"
            name="intent"
            value="change"
            formNoValidate
            className="text-ink-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Use a different email
          </button>
          <button
            type="submit"
            name="intent"
            value="resend"
            formNoValidate
            className="font-medium text-ink underline-offset-2 hover:underline"
          >
            Resend code
          </button>
        </div>
      </form>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Your email"
        htmlFor="email"
        hint="The email you order with. We'll send you a code to sign in. No password needed."
        error={state.error}
      >
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="ama@example.com"
          defaultValue={state.typed ?? ""}
          aria-invalid={state.error ? true : undefined}
        />
      </Field>

      <Button type="submit" name="intent" value="send" block size="lg" loading={pending}>
        Email me a code
      </Button>
    </form>
  );
}
