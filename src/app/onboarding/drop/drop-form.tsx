"use client";

import { Layers, Plane, Ship } from "lucide-react";
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
  defaultClosesAt,
}: {
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
      title="Create your first drop"
      description="A drop is your permanent shop link. You add products once; each batch is a round of orders with a cutoff. When a batch closes, the next one opens automatically with the same products."
    >
      <div className="mb-6 flex gap-3 rounded-card border border-brand-200 bg-brand-50 px-4 py-3.5 dark:border-brand-800 dark:bg-brand-950/40">
        <Layers
          className="mt-0.5 size-5 shrink-0 text-brand-700"
          strokeWidth={1.75}
          aria-hidden
        />
        <div className="min-w-0 space-y-1 text-sm">
          <p className="font-medium text-ink">What you’re creating</p>
          <p className="leading-relaxed text-ink-muted">
            Think of a drop as “September China run” — one link you share on
            WhatsApp. Inside it, Batch 1 takes orders until the cutoff, then
            Batch 2 opens on its own so the link never goes dead.
          </p>
        </div>
      </div>

      <form action={submit} className="space-y-6">
        <Field
          label="Drop name"
          htmlFor="title"
          hint={
            <>
              Customers see this on your link. Example:{" "}
              <span className="text-ink-muted">September China run</span>
            </>
          }
        >
          <Input
            id="title"
            name="title"
            required
            autoFocus
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
          label="When does Batch 1 close?"
          htmlFor="closesAt"
          hint="At this time we close Batch 1 and open Batch 2 automatically with the same products."
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
          Create my drop
        </Button>
      </form>
    </StepShell>
  );
}
