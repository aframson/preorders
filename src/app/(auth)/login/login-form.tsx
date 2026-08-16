"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { requestCode, verifyCode, type LoginState } from "./actions";

const INITIAL: LoginState = { step: "request", email: "" };

export function LoginForm({ next }: { next: string }) {
  const [state, submit, pending] = useActionState(
    async (prev: LoginState, formData: FormData) =>
      prev.step === "request"
        ? requestCode(prev, formData)
        : verifyCode(prev, formData),
    INITIAL,
  );

  const verifying = state.step === "verify";

  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        {verifying ? "Enter your code" : "Sign in"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        {verifying
          ? "Check your email. The code expires in an hour."
          : "We will email you a 6 digit code. No password to remember."}
      </p>

      <form action={submit} className="mt-7 space-y-5">
        <input type="hidden" name="next" value={next} />

        {verifying ? (
          <>
            <input type="hidden" name="email" value={state.email} />

            {state.message && (
              <p className="flex items-start gap-2 rounded-control bg-open-tint px-3.5 py-3 text-sm text-open">
                <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                {state.message}
              </p>
            )}

            <Field label="6 digit code" htmlFor="code" error={state.error}>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                autoFocus
                placeholder="000000"
                aria-invalid={Boolean(state.error) || undefined}
                className="text-center text-xl tracking-[0.4em]"
                data-numeric
              />
            </Field>
          </>
        ) : (
          <Field
            label="Email address"
            htmlFor="email"
            error={state.error}
            hint="Use the email you want your order notifications sent from."
          >
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              autoFocus
              defaultValue={state.email}
              placeholder="you@example.com"
              aria-invalid={Boolean(state.error) || undefined}
            />
          </Field>
        )}

        <Button type="submit" size="lg" block loading={pending}>
          {verifying ? "Verify and continue" : "Send me a code"}
        </Button>
      </form>

      {verifying && (
        <p className="mt-4 text-center text-sm text-ink-muted">
          Wrong address?{" "}
          <Link href="/login" className="font-medium text-brand-700 underline">
            Start again
          </Link>
        </p>
      )}
    </div>
  );
}
