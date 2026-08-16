"use client";

import { useActionState, useState } from "react";

import { StepShell } from "@/components/onboarding/step-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { slugify } from "@/lib/site";
import { saveBusiness, type ActionState } from "../actions";

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

  const effectiveSlug = slugTouched ? slug : slugify(businessName);

  return (
    <StepShell
      step={2}
      title="Your business"
      description="This is what customers see at the top of your link."
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
        >
          <div className="flex items-center overflow-hidden rounded-control border border-border bg-surface focus-within:border-brand-500">
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
              className="h-14 w-full bg-transparent px-3 text-base text-ink placeholder:text-ink-subtle focus:outline-none sm:h-12"
              value={effectiveSlug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(slugify(event.target.value));
              }}
            />
          </div>
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

        <Button type="submit" size="lg" block loading={pending}>
          Continue
        </Button>
      </form>
    </StepShell>
  );
}
