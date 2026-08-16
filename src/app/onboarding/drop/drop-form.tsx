"use client";

import { Plane, Ship } from "lucide-react";
import { useActionState, useState } from "react";

import { StepShell } from "@/components/onboarding/step-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { createFirstDrop, type ActionState } from "../actions";

const MODES = [
  {
    value: "air_kg",
    icon: Plane,
    label: "Air",
    blurb: "Faster, costs more. Shipping is split by weight.",
  },
  {
    value: "sea_cbm",
    icon: Ship,
    label: "Sea",
    blurb: "Cheaper, 30 to 60 days. Shipping is split by volume.",
  },
] as const;

export function DropForm({
  defaultTitle,
  defaultClosesAt,
}: {
  defaultTitle: string;
  /** Accra-time `datetime-local` value, computed on the server. */
  defaultClosesAt: string;
}) {
  const [state, submit, pending] = useActionState<ActionState, FormData>(
    createFirstDrop,
    {},
  );
  const [mode, setMode] = useState<string>("sea_cbm");
  const [closesAt, setClosesAt] = useState(defaultClosesAt);

  return (
    <StepShell
      step={4}
      title="Your first drop"
      description="A drop is your permanent link. Batches run inside it, one at a time."
    >
      <form action={submit} className="space-y-6">
        <Field label="Drop name" htmlFor="title">
          <Input
            id="title"
            name="title"
            required
            autoFocus
            defaultValue={defaultTitle}
            placeholder="September China run"
          />
        </Field>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">
            How are you shipping?
          </legend>
          <div className="grid gap-2">
            {MODES.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-card border px-4 py-3.5 transition-colors",
                  mode === option.value
                    ? "border-brand-700 bg-brand-50 dark:bg-brand-950/40"
                    : "border-border bg-surface hover:bg-surface-muted",
                )}
              >
                <input
                  type="radio"
                  name="freightMode"
                  value={option.value}
                  checked={mode === option.value}
                  onChange={() => setMode(option.value)}
                  className="sr-only"
                />
                <option.icon
                  className={cn(
                    "mt-0.5 size-5 shrink-0",
                    mode === option.value ? "text-brand-700" : "text-ink-subtle",
                  )}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block font-medium text-ink">
                    {option.label}
                  </span>
                  <span className="block text-sm text-ink-muted">
                    {option.blurb}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field
          label="When do orders close?"
          htmlFor="closesAt"
          hint="We close the batch for you and open the next one automatically."
          error={state.error}
        >
          <Input
            id="closesAt"
            name="closesAt"
            type="datetime-local"
            required
            value={closesAt}
            onChange={(event) => setClosesAt(event.target.value)}
          />
        </Field>

        <Button type="submit" size="lg" block loading={pending}>
          Create my link
        </Button>
      </form>
    </StepShell>
  );
}
