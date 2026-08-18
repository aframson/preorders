"use client";

import { Check, LoaderCircle, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { StepShell } from "@/components/onboarding/step-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/site";
import {
  checkVendorSlug,
  saveBusiness,
  type ActionState,
  type SlugCheckResult,
} from "../actions";

const INITIAL: ActionState = {};

export function BusinessForm({
  defaultBusinessName,
  defaultSlug,
  defaultWhatsapp,
}: {
  defaultBusinessName: string;
  defaultSlug: string;
  defaultWhatsapp: string;
}) {
  const [state, submit, pending] = useActionState(saveBusiness, INITIAL);

  const [businessName, setBusinessName] = useState(defaultBusinessName);
  // Once the vendor edits the link themselves we stop overwriting it, because
  // the link is what goes in their WhatsApp bio and they may have a preference.
  const [slugTouched, setSlugTouched] = useState(Boolean(defaultSlug));
  const [slug, setSlug] = useState(defaultSlug);
  const [slugCheck, setSlugCheck] = useState<SlugCheckResult>({
    status: "idle",
    message: "",
  });

  const effectiveSlug = slugTouched ? slug : slugify(businessName);

  useEffect(() => {
    const value = effectiveSlug.trim();
    if (!value) {
      setSlugCheck({ status: "idle", message: "" });
      return;
    }

    let cancelled = false;
    setSlugCheck({ status: "checking", message: "Checking…" });

    const timer = window.setTimeout(async () => {
      const result = await checkVendorSlug(value);
      if (!cancelled) setSlugCheck(result);
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [effectiveSlug]);

  const slugBlocked =
    slugCheck.status === "taken" ||
    slugCheck.status === "reserved" ||
    slugCheck.status === "invalid";

  const slugTone =
    slugCheck.status === "available" || slugCheck.status === "own"
      ? "ok"
      : slugCheck.status === "taken" ||
          slugCheck.status === "reserved" ||
          slugCheck.status === "invalid"
        ? "bad"
        : "neutral";

  return (
    <StepShell
      step={2}
      title="Your business"
      description="This is what customers see at the top of your link. Next you’ll connect payouts, then create your first drop — the shop page where batches of orders run."
    >
      <form action={submit} className="space-y-6">
        <Field
          label="Business name"
          htmlFor="businessName"
          error={state.error}
        >
          <Input
            id="businessName"
            name="businessName"
            required
            autoFocus
            autoComplete="organization"
            placeholder="Akosua Imports"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
          />
        </Field>

        <Field
          label="Your link"
          htmlFor="slug"
          hint="Keep it short. This is what you paste into your WhatsApp bio."
          error={
            slugTone === "bad" && slugCheck.message
              ? slugCheck.message
              : undefined
          }
        >
          <div
            className={cn(
              "flex items-center overflow-hidden rounded-control border bg-surface focus-within:border-brand-500",
              slugTone === "ok" && "border-open/50",
              slugTone === "bad" && "border-danger/50",
              slugTone === "neutral" && "border-border",
            )}
          >
            <span className="shrink-0 border-r border-border bg-surface-muted py-4 pl-3.5 pr-2 text-sm text-ink-muted sm:py-3">
              preorders.gh/
            </span>
            <input
              id="slug"
              name="slug"
              required
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]"
              placeholder="akosua"
              aria-invalid={slugTone === "bad" ? true : undefined}
              aria-describedby="slug-status"
              className="h-14 w-full bg-transparent px-3 text-base text-ink placeholder:text-ink-subtle focus:outline-none sm:h-12"
              value={effectiveSlug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(slugify(event.target.value));
              }}
            />
            <span className="flex size-10 shrink-0 items-center justify-center text-ink-muted">
              {slugCheck.status === "checking" ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : slugTone === "ok" ? (
                <Check className="size-4 text-open" aria-hidden />
              ) : slugTone === "bad" ? (
                <X className="size-4 text-danger" aria-hidden />
              ) : null}
            </span>
          </div>
          {slugCheck.message && slugTone !== "bad" && (
            <p
              id="slug-status"
              className={cn(
                "mt-1.5 text-sm",
                slugTone === "ok" ? "text-open" : "text-ink-muted",
              )}
            >
              {slugCheck.message}
            </p>
          )}
          {slugTone === "bad" && <span id="slug-status" className="sr-only" />}
        </Field>

        <Field
          label="WhatsApp number"
          htmlFor="whatsappNumber"
          hint="Customers tap through to this number with questions."
        >
          <Input
            id="whatsappNumber"
            name="whatsappNumber"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder="024 123 4567"
            defaultValue={defaultWhatsapp}
          />
        </Field>

        <Button
          type="submit"
          size="lg"
          block
          loading={pending}
          disabled={slugBlocked || !effectiveSlug}
        >
          Continue
        </Button>
      </form>
    </StepShell>
  );
}
