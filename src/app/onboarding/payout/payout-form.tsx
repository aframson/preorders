"use client";

import { BadgeCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { StepShell } from "@/components/onboarding/step-shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { PLATFORM_FEE_PERCENT } from "@/lib/fees";
import {
  resolvePayoutAccount,
  savePayout,
  type ActionState,
  type ResolveState,
} from "../actions";

export function PayoutForm({
  banks,
  configured,
  mode = "test",
  defaultAccountNumber = "",
  defaultBankCode,
}: {
  banks: { name: string; code: string; type: string }[];
  configured: boolean;
  mode?: "test" | "live";
  /** Prefill from the WhatsApp number collected on the business step. */
  defaultAccountNumber?: string;
  defaultBankCode?: string;
}) {
  const [resolved, resolve, resolving] = useActionState<ResolveState, FormData>(
    resolvePayoutAccount,
    {},
  );
  const [saved, save, saving] = useActionState<ActionState, FormData>(
    savePayout,
    {},
  );

  const [accountNumber, setAccountNumber] = useState(defaultAccountNumber);
  const [bankCode, setBankCode] = useState(
    defaultBankCode ?? banks[0]?.code ?? "",
  );

  const confirmed = Boolean(resolved.accountName);

  return (
    <StepShell
      step={3}
      title="Get paid"
      description="Money from your customers goes straight to you, not to us."
    >
      {!configured ? (
        <div className="space-y-6">
          <div className="rounded-card border border-closing/30 bg-closing-tint px-4 py-3.5 text-sm text-ink">
            <p className="font-medium">Paystack {mode} keys are not set</p>
            <p className="mt-1 text-ink-muted">
              Add your{" "}
              <span className="font-medium text-ink">
                {mode === "live" ? "live" : "test"}
              </span>{" "}
              secret and public keys to{" "}
              <code className="rounded bg-surface px-1 py-0.5 text-xs">
                .env.local
              </code>
              , restart the app, then come back to connect MoMo. Until then you
              can skip and finish setup.
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-ink-muted">
              <li>
                <code>PAYSTACK_{mode === "live" ? "LIVE" : "TEST"}_SECRET_KEY</code>
              </li>
              <li>
                <code>PAYSTACK_{mode === "live" ? "LIVE" : "TEST"}_PUBLIC_KEY</code>
              </li>
              <li>
                <code>
                  NEXT_PUBLIC_PAYSTACK_{mode === "live" ? "LIVE" : "TEST"}
                  _PUBLIC_KEY
                </code>
              </li>
            </ul>
          </div>

          <ButtonLink href="/onboarding/drop" size="lg" block>
            Skip for now
          </ButtonLink>
          <p className="text-center text-xs text-ink-subtle">
            You can connect payouts later from Dashboard → More.
          </p>
        </div>
      ) : (
        <>
          <form action={resolve} className="space-y-6">
            {mode === "test" && (
              <p className="rounded-card border border-border bg-surface-muted px-4 py-3 text-xs leading-relaxed text-ink-muted">
                Test mode: use network{" "}
                <span className="font-medium text-ink">MTN</span> with{" "}
                <span className="font-medium text-ink" data-numeric>
                  055 123 4987
                </span>
                . A mismatched network returns “Account details are invalid”.
              </p>
            )}

            <Field label="Network" htmlFor="bankCode">
              <Select
                id="bankCode"
                name="bankCode"
                value={bankCode}
                onChange={(event) => setBankCode(event.target.value)}
              >
                {banks.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Mobile money number"
              htmlFor="accountNumber"
              error={resolved.error}
              hint={
                defaultAccountNumber
                  ? "Filled from your WhatsApp number. Change it if payouts should go elsewhere."
                  : "The number your payouts settle to."
              }
            >
              <Input
                id="accountNumber"
                name="accountNumber"
                type="tel"
                inputMode="numeric"
                required
                placeholder="024 123 4567"
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value)}
                aria-invalid={Boolean(resolved.error) || undefined}
              />
            </Field>

            {!confirmed && (
              <Button
                type="submit"
                variant="secondary"
                size="lg"
                block
                loading={resolving}
              >
                Check this number
              </Button>
            )}
          </form>

          {confirmed && (
            <div className="mt-6 space-y-6">
              <div className="flex items-start gap-3 rounded-card border border-open/30 bg-open-tint px-4 py-3.5">
                <BadgeCheck
                  className="mt-0.5 size-5 shrink-0 text-open"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-xs text-open">This account belongs to</p>
                  <p className="truncate font-display text-lg font-semibold text-ink">
                    {resolved.accountName}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted" data-numeric>
                    {resolved.accountNumber}
                  </p>
                </div>
              </div>

              <form action={save} className="space-y-4">
                <input
                  type="hidden"
                  name="accountNumber"
                  value={resolved.accountNumber ?? ""}
                />
                <input
                  type="hidden"
                  name="bankCode"
                  value={resolved.bankCode ?? ""}
                />

                <div className="flex items-start gap-3 rounded-card border border-border px-4 py-3.5 text-sm">
                  <ShieldCheck
                    className="mt-0.5 size-4 shrink-0 text-ink-muted"
                    aria-hidden
                  />
                  <p className="text-ink-muted">
                    We take{" "}
                    <span className="font-medium text-ink">
                      {PLATFORM_FEE_PERCENT.goods}%
                    </span>{" "}
                    of each goods payment. Nothing on the shipping you collect.
                    The rest lands on your number automatically.
                  </p>
                </div>

                {saved.error && (
                  <p role="alert" className="text-sm text-danger">
                    {saved.error}
                  </p>
                )}

                <Button type="submit" size="lg" block loading={saving}>
                  Connect this number
                </Button>
              </form>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-ink-subtle">
            Or{" "}
            <Link
              href="/onboarding/drop"
              className="font-medium text-brand-700 underline"
            >
              skip for now
            </Link>{" "}
            and connect later from More.
          </p>
        </>
      )}
    </StepShell>
  );
}
