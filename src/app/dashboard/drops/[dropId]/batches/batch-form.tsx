"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { FREIGHT_MODES, type FreightMode } from "@/lib/freight";
import { createBatch, updateBatch, type ActionState } from "./actions";

export type BatchFormValues = {
  batchId?: string;
  freightMode: FreightMode;
  /** Accra-time `datetime-local` value. */
  closesAt: string;
  /** Accra-time `date` value. */
  expectedDeliveryAt: string;
  /** Pesewas per billable unit. */
  freightRateEstimate: number;
  autoOpenNext: boolean;
};

export function BatchForm({
  dropId,
  initial,
  submitLabel,
}: {
  dropId: string;
  initial: BatchFormValues;
  submitLabel: string;
}) {
  const [state, submit, pending] = useActionState<ActionState, FormData>(
    initial.batchId ? updateBatch : createBatch,
    {},
  );
  const [mode, setMode] = useState<FreightMode>(initial.freightMode);

  return (
    <form action={submit} className="max-w-lg space-y-6">
      <input type="hidden" name="dropId" value={dropId} />
      {initial.batchId && (
        <input type="hidden" name="batchId" value={initial.batchId} />
      )}

      <Field
        label="How is this batch shipping?"
        htmlFor="freightMode"
        hint="This decides whether shipping is split by weight or by volume."
      >
        <Select
          id="freightMode"
          name="freightMode"
          value={mode}
          onChange={(event) => setMode(event.target.value as FreightMode)}
        >
          <option value="sea_cbm">Sea &mdash; split by volume (CBM)</option>
          <option value="air_kg">Air &mdash; split by weight (kg)</option>
        </Select>
      </Field>

      <Field
        label="Orders close"
        htmlFor="closesAt"
        hint="Ghana time. We close the batch for you at this moment."
        error={state.error}
      >
        <Input
          id="closesAt"
          name="closesAt"
          type="datetime-local"
          required
          defaultValue={initial.closesAt}
        />
      </Field>

      <Field
        label="Expected in Accra"
        htmlFor="expectedDeliveryAt"
        hint="Optional, shown to customers as a rough window like 'late September'."
      >
        <Input
          id="expectedDeliveryAt"
          name="expectedDeliveryAt"
          type="date"
          defaultValue={initial.expectedDeliveryAt}
        />
      </Field>

      <Field
        label={`Estimated shipping rate (${FREIGHT_MODES[mode].rateLabel})`}
        htmlFor="freightRateEstimate"
        hint="Your forwarder's current rate. Customers see this as an estimate at checkout, and the real bill is charged on arrival."
      >
        <div className="flex items-center overflow-hidden rounded-control border border-border bg-surface focus-within:border-brand-500">
          <span className="shrink-0 border-r border-border bg-surface-muted px-3.5 py-4 text-sm text-ink-muted sm:py-3">
            GHS
          </span>
          <input
            id="freightRateEstimate"
            name="freightRateEstimate"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            defaultValue={initial.freightRateEstimate / 100}
            className="h-14 w-full bg-transparent px-3 text-base text-ink focus:outline-none sm:h-12"
            data-numeric
          />
          <span className="shrink-0 pr-3.5 text-sm text-ink-muted">
            {FREIGHT_MODES[mode].rateLabel}
          </span>
        </div>
      </Field>

      <label className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3.5">
        <input
          type="checkbox"
          name="autoOpenNext"
          defaultChecked={initial.autoOpenNext}
          className="size-5 accent-brand-700"
        />
        <span className="text-sm">
          <span className="block font-medium text-ink">
            Open the next batch automatically
          </span>
          <span className="block text-ink-muted">
            Your link keeps taking orders instead of going dead at cutoff.
          </span>
        </span>
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" loading={pending}>
          {submitLabel}
        </Button>
        {state.message && (
          <span role="status" className="text-sm text-open">
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
