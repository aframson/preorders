"use client";

import { BadgeCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { StepShell } from "@/components/onboarding/step-shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { PLATFORM_FEE_PERCENT } from "@/lib/fees";
import {
  resolvePayoutAccount,
  savePayout,
  type ActionState,
  type PayoutChannel,
  type ResolveState,
} from "../actions";

type BankOption = { name: string; code: string; type: string };

export function PayoutForm({
  momoBanks,
  bankBanks,
  configured,
  mode = "test",
  defaultChannel = "mobile_money",
  defaultAccountNumber = "",
  momoPrefill = "",
  defaultBankCode,
  returnTo = "onboarding",
  title = "Get paid",
  description = "Money from your customers goes straight to you, not to us.",
}: {
  momoBanks: BankOption[];
  bankBanks: BankOption[];
  configured: boolean;
  mode?: "test" | "live";
  defaultChannel?: PayoutChannel;
  defaultAccountNumber?: string;
  /** WhatsApp-derived MoMo prefill when switching back to mobile money. */
  momoPrefill?: string;
  defaultBankCode?: string;
  returnTo?: "onboarding" | "more";
  title?: string;
  description?: string;
}) {
  const [resolved, resolve, resolving] = useActionState<ResolveState, FormData>(
    resolvePayoutAccount,
    {},
  );
  const [saved, save, saving] = useActionState<ActionState, FormData>(
    savePayout,
    {},
  );

  const [channel, setChannel] = useState<PayoutChannel>(defaultChannel);
  const banks = channel === "bank" ? bankBanks : momoBanks;
  const [bankCode, setBankCode] = useState(() =>
    pickDefaultCode(banks, defaultBankCode),
  );
  const [accountNumber, setAccountNumber] = useState(
    defaultChannel === "mobile_money" ? defaultAccountNumber : "",
  );

  const currentAccount =
    channel === "bank"
      ? accountNumber.replace(/\D/g, "")
      : normaliseLooseMomo(accountNumber);

  const showConfirmed =
    Boolean(resolved.accountName) &&
    !resolved.error &&
    resolved.channel === channel &&
    resolved.bankCode === bankCode &&
    resolved.accountNumber === currentAccount;

  function switchChannel(next: PayoutChannel) {
    setChannel(next);
    const nextBanks = next === "bank" ? bankBanks : momoBanks;
    setBankCode(pickDefaultCode(nextBanks, undefined));
    setAccountNumber(next === "mobile_money" ? momoPrefill : "");
  }

  const body = !configured ? (
    <div className="space-y-6">
      <div className="rounded-card border border-closing/30 bg-closing-tint px-4 py-3.5 text-sm text-ink">
        <p className="font-medium">Paystack {mode} keys are not set</p>
        <p className="mt-1 text-ink-muted">
          Add your{" "}
          <span className="font-medium text-ink">
            {mode === "live" ? "live" : "test"}
          </span>{" "}
          secret and public keys, restart the app, then come back to connect
          payouts.
        </p>
      </div>

      <ButtonLink
        href={returnTo === "more" ? "/dashboard/more" : "/onboarding/drop"}
        size="lg"
        block
      >
        {returnTo === "more" ? "Back to More" : "Skip for now"}
      </ButtonLink>
    </div>
  ) : (
    <>
      <form action={resolve} className="space-y-6">
        <input type="hidden" name="channel" value={channel} />

        <div className="grid grid-cols-2 gap-2 rounded-card border border-border bg-surface-muted p-1">
          {(
            [
              ["mobile_money", "Mobile money"],
              ["bank", "Bank account"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => switchChannel(value)}
              className={cn(
                "rounded-control px-3 py-2.5 text-sm font-medium transition-colors",
                channel === value
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "test" && channel === "mobile_money" && (
          <p className="rounded-card border border-border bg-surface-muted px-4 py-3 text-xs leading-relaxed text-ink-muted">
            Test mode: use network{" "}
            <span className="font-medium text-ink">MTN</span> with{" "}
            <span className="font-medium text-ink" data-numeric>
              055 123 4987
            </span>
            .
          </p>
        )}

        <Field
          label={channel === "bank" ? "Bank" : "Network"}
          htmlFor="bankCode"
        >
          <Select
            id="bankCode"
            name="bankCode"
            value={bankCode}
            onChange={(event) => setBankCode(event.target.value)}
          >
            {banks.map((bank) => (
              <option key={`${bank.type}-${bank.code}`} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={
            channel === "bank" ? "Account number" : "Mobile money number"
          }
          htmlFor="accountNumber"
          error={resolved.error}
          hint="We look up the registered name before you can connect it."
        >
          <Input
            id="accountNumber"
            name="accountNumber"
            type={channel === "bank" ? "text" : "tel"}
            inputMode="numeric"
            required
            placeholder={channel === "bank" ? "0123456789" : "024 123 4567"}
            value={accountNumber}
            onChange={(event) => setAccountNumber(event.target.value)}
            aria-invalid={Boolean(resolved.error) || undefined}
            data-numeric
          />
        </Field>

        {!showConfirmed && (
          <Button
            type="submit"
            variant="secondary"
            size="lg"
            block
            loading={resolving}
          >
            {channel === "bank" ? "Check account name" : "Check this number"}
          </Button>
        )}
      </form>

      {showConfirmed && (
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
            <input type="hidden" name="channel" value={channel} />
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
            <input
              type="hidden"
              name="accountName"
              value={resolved.accountName ?? ""}
            />
            <input type="hidden" name="returnTo" value={returnTo} />

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
                of each goods payment. Nothing on the shipping you collect. The
                rest settles to this{" "}
                {channel === "bank" ? "bank account" : "MoMo number"}{" "}
                automatically.
              </p>
            </div>

            {saved.error && (
              <p role="alert" className="text-sm text-danger">
                {saved.error}
              </p>
            )}

            <Button type="submit" size="lg" block loading={saving}>
              {channel === "bank"
                ? "Connect this bank account"
                : "Connect this number"}
            </Button>
          </form>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-ink-subtle">
        {returnTo === "more" ? (
          <>
            Or{" "}
            <Link
              href="/dashboard/more"
              className="font-medium text-brand-700 underline"
            >
              go back
            </Link>{" "}
            without changing payouts.
          </>
        ) : (
          <>
            Or{" "}
            <Link
              href="/onboarding/drop"
              className="font-medium text-brand-700 underline"
            >
              skip for now
            </Link>{" "}
            and connect later from More.
          </>
        )}
      </p>
    </>
  );

  if (returnTo === "more") {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            {title}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        </div>
        {body}
      </div>
    );
  }

  return (
    <StepShell step={3} title={title} description={description}>
      {body}
    </StepShell>
  );
}

function pickDefaultCode(banks: BankOption[], preferred?: string) {
  if (preferred && banks.some((bank) => bank.code === preferred)) {
    return preferred;
  }
  return banks.find((bank) => bank.code === "MTN")?.code ?? banks[0]?.code ?? "";
}

function normaliseLooseMomo(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("233") && digits.length >= 12) {
    return `0${digits.slice(3, 12)}`;
  }
  if (digits.length === 9) return `0${digits}`;
  return digits;
}
