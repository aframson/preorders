"use client";

import { useState } from "react";

import { Countdown, CountdownRing } from "@/components/ui/countdown";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { StatusPill } from "@/components/ui/status-pill";

export function StepperDemo() {
  const [qty, setQty] = useState(1);
  return <QuantityStepper value={qty} onChange={setQty} />;
}

// Fixed dates rather than an offset from now, so the preview renders the same
// thing on every machine and nothing reads the clock during render. The
// countdown still ticks live toward the target.
const DEMO_OPENS_AT = new Date("2026-12-01T09:00:00Z");
const DEMO_CLOSES_AT = new Date("2027-01-15T18:00:00Z");

export function CountdownDemo() {
  return (
    <div className="flex items-center gap-8 rounded-card border border-border bg-surface p-5">
      <CountdownRing
        target={DEMO_CLOSES_AT}
        from={DEMO_OPENS_AT}
        className="text-brand-500"
      />
      <div className="space-y-2">
        <StatusPill tone="closing" pulse>
          Closing soon
        </StatusPill>
        <p className="text-sm text-ink-muted">
          Batch 3 closes in <Countdown target={DEMO_CLOSES_AT} />
        </p>
      </div>
    </div>
  );
}
