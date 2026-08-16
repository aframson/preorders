import { PackageOpen } from "lucide-react";

import { CostBreakdown } from "@/components/cost-breakdown";
import { StepperTimeline } from "@/components/stepper-timeline";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { BATCH_STATUS, type BatchStatus } from "@/lib/status";
import { CountdownDemo, StepperDemo } from "./demos";

export const metadata = { title: "Design system" };

const BRAND_SCALE = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
];

const STATUS_TOKENS = [
  "open",
  "closing",
  "closed",
  "transit",
  "arrived",
  "settled",
  "danger",
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-12 px-5 py-12">
      <header>
        <p className="text-sm font-medium text-brand-500">Preorders</p>
        <h1 className="mt-1 font-display text-3xl font-bold">
          Aubergine &amp; Cream
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
          The brand sits in the plum family so it never collides with the status
          palette. Status colours are reserved: they only ever describe batch or
          order state, never decoration.
        </p>
      </header>

      <Section title="Brand">
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
          {BRAND_SCALE.map((step) => (
            <div key={step} className="space-y-1">
              <div
                className="h-12 rounded-md border border-border"
                style={{ backgroundColor: `var(--color-brand-${step})` }}
              />
              <p className="text-center text-[10px] text-ink-muted">{step}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Status palette"
        description="Reserved. Each tone always pairs a colour with a written label."
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STATUS_TOKENS.map((token) => (
            <div key={token} className="space-y-1">
              <div
                className="h-12 rounded-md border border-border"
                style={{ backgroundColor: `var(--color-${token})` }}
              />
              <p className="text-center text-[10px] text-ink-muted">{token}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(BATCH_STATUS) as BatchStatus[]).map((status) => (
            <StatusPill
              key={status}
              tone={BATCH_STATUS[status].tone}
              pulse={status === "open"}
            >
              {BATCH_STATUS[status].label}
            </StatusPill>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Pay GHS 480.00</Button>
          <Button variant="secondary">Copy link</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger">Close batch</Button>
          <Button loading>Sending invoices</Button>
          <Button disabled>Sold out</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section
        title="Countdown"
        description="Steps up from minute to second precision as the cutoff nears."
      >
        <CountdownDemo />
      </Section>

      <Section
        title="Cost breakdown"
        description="The deferred block is visually separated so it can never read as part of today's total."
      >
        <div className="rounded-card border border-border bg-surface p-5">
          <CostBreakdown
            lines={[
              { label: "Nike Air Force 1 \u00d7 2", amount: 36000 },
              { label: "Cargo trousers \u00d7 1", amount: 12000 },
            ]}
            payNow={{ label: "Pay now", amount: 48000 }}
            deferred={{
              label: "Shipping",
              amount: 6200,
              estimate: true,
              note: "Charged when your goods arrive in Accra. The final amount is confirmed then, based on the weight of your order.",
            }}
          />
        </div>
      </Section>

      <Section title="Order timeline">
        <div className="rounded-card border border-border bg-surface p-5">
          <StepperTimeline
            steps={[
              { label: "Order placed", at: new Date("2026-07-02") },
              { label: "Batch closed", at: new Date("2026-07-11") },
              { label: "Bought from supplier", at: new Date("2026-07-15") },
              { label: "On its way", at: new Date("2026-07-28") },
              { label: "Arrived in Ghana" },
              { label: "Ready for pickup" },
            ]}
          />
        </div>
      </Section>

      <Section title="Quantity stepper">
        <StepperDemo />
      </Section>

      <Section title="Empty state">
        <EmptyState
          icon={PackageOpen}
          title="No products yet"
          description="Add your first product and your batch link will be ready to share."
          action={<Button size="sm">Add product</Button>}
        />
      </Section>
    </main>
  );
}
