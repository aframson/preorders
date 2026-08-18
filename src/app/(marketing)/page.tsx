import {
  ArrowRight,
  CalendarClock,
  Images,
  ListChecks,
  Receipt,
  Search,
  Send,
  Wallet,
} from "lucide-react";

import { BeforeAfterSplit } from "@/components/marketing/before-after-split";
import { FreightExplainer } from "@/components/marketing/freight-explainer";
import { FeatureStage } from "@/components/marketing/feature-stage";
import {
  FreightSplitMockup,
  LiveUpdatesMockup,
  ManifestMockup,
  ScheduleMockup,
} from "@/components/marketing/feature-mockups";
import { HeroChatStage } from "@/components/marketing/hero-chat-stage";
import { HeroCalendarMockup } from "@/components/marketing/hero-calendar-mockup";
import { HeroDashboardMockup } from "@/components/marketing/hero-dashboard-mockup";
import { LiveManifestStrip } from "@/components/marketing/live-manifest-strip";
import { ManifestComparison } from "@/components/marketing/manifest-comparison";
import { PlatformPeek } from "@/components/marketing/platform-peek";
import { VendorSearch } from "@/components/marketing/vendor-search";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { StatusPill } from "@/components/ui/status-pill";

const PROBLEMS = [
  {
    icon: Search,
    title: "Scrolling to find who ordered what",
    body: "Four days of messages, three people who changed their minds, and one order you will definitely miss.",
  },
  {
    icon: Wallet,
    title: "Chasing who has actually paid",
    body: "Screenshots of MoMo receipts buried between product photos, and no running total anywhere.",
  },
  {
    icon: Receipt,
    title: "Answering \u201chas it shipped?\u201d fifty times",
    body: "The same question from thirty different people, every day, for the six weeks your goods are at sea.",
  },
];

const STEPS = [
  {
    icon: Images,
    title: "Add your products once",
    body: "Photos, prices, sizes. Your catalogue stays put between batches, so you set it up once and reuse it forever.",
  },
  {
    icon: Send,
    title: "Share one link",
    body: "Put it in your WhatsApp bio and status. It always shows whichever batch is currently open, so you never resend it.",
  },
  {
    icon: CalendarClock,
    title: "The batch closes itself",
    body: "At your cutoff time orders stop, your supplier buy-list is ready, and the next batch opens automatically.",
  },
  {
    icon: ListChecks,
    title: "Collect shipping on arrival",
    body: "Enter what the forwarder charged. Everyone is billed their fair share by weight, and paid invoices are tracked for you.",
  },
];

// Placeholder commercial terms. Adjust once the fee model is settled.
const PLANS = [
  {
    name: "Starter",
    price: "Free",
    cadence: "",
    blurb: "Enough to run your first few batches properly.",
    features: [
      "1 active link",
      "Up to 25 orders per batch",
      "Automatic batch cutoff",
      "Supplier buy-list",
      "2% on goods payments",
    ],
    cta: "Create your link",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "GH\u20b5150",
    cadence: "/month",
    blurb: "For vendors running batches back to back.",
    features: [
      "Unlimited links and orders",
      "WhatsApp status cards",
      "Shipping invoices and reminders",
      "CSV exports",
      "1% on goods payments",
    ],
    cta: "Start free, upgrade later",
    highlighted: true,
  },
];

const FAQ = [
  {
    q: "Does the money come to me?",
    a: "Yes, straight to your MoMo. Customers pay through your own Paystack subaccount, so funds settle to the number you registered. We never hold your money.",
  },
  {
    q: "Do my customers need to download anything?",
    a: "No. They tap your link inside WhatsApp, pick what they want, and pay with MoMo or card. No app, no account, no password.",
  },
  {
    q: "Why is shipping charged separately?",
    a: "Because nobody knows the freight cost until the goods are consolidated in China and your forwarder weighs them. Charging a guess upfront means either overcharging your customers or absorbing the difference yourself. We show an estimate at checkout and bill the real amount on arrival.",
  },
  {
    q: "What if a customer refuses to pay the shipping fee?",
    a: "You keep the goods until they do. We send escalating reminders on your behalf and flag the order as unclaimed after two weeks, so you always know exactly who is holding things up.",
  },
  {
    q: "Am I replacing WhatsApp?",
    a: "No. WhatsApp stays how you sell. This is the ops layer underneath — paid orders, buy-lists, tracking, and shipping — so chat stays chat.",
  },
  {
    q: "What happens to my link when a batch closes?",
    a: "It keeps working. Visitors see that the batch closed, when the next one opens, and can leave their email to be told. A closed batch still collects demand instead of losing it.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero ------------------------------------------------------------- */}
      <section className="relative min-h-[calc(100dvh-4rem)] overflow-hidden lg:h-[calc(100dvh-4rem)] lg:min-h-0">
        <Container className="relative z-10 h-full lg:grid lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] lg:items-stretch lg:gap-x-24">
          <div className="relative z-20 max-w-xl py-10 lg:self-center">
            <h1 className="font-display text-5xl leading-[0.98] font-bold tracking-tight sm:text-6xl lg:text-[4.75rem]">
              Run preorders like an operation.
            </h1>

            <p className="mt-5 text-lg leading-relaxed text-ink-muted">
              Paid catalog, automatic cutoff, supplier buy-list, fair freight
              when the bill lands. One link for customers. The board for you —
              not another week of chat screenshots.
            </p>

            <div className="mt-8">
              <VendorSearch />
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/onboarding" size="lg">
                Start your preorder ops
                <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/akosua/china-run" size="lg" variant="secondary">
                See a live example
              </ButtonLink>
            </div>

            <p className="mt-4 text-sm text-ink-subtle">
              Free to start. No card needed. Your first batch can be open in ten
              minutes.
            </p>
          </div>

          <div className="relative hidden h-full lg:block">
            <HeroChatStage
              className="hero-chat-fade pointer-events-none absolute top-[6%] -bottom-[10%] -left-[10%] z-0 w-[min(900px,70vw)] origin-top-left"
            >
              <HeroDashboardMockup className="h-full" />
            </HeroChatStage>
            <HeroChatStage
              variant="calendar"
              className="pointer-events-none absolute top-[38%] -bottom-[28%] left-[2%] z-20 w-[min(680px,58vw)] origin-top-left"
            >
              <HeroCalendarMockup className="hero-cal-fade h-full min-h-[34rem]" />
            </HeroChatStage>
          </div>
        </Container>

        <div
          className="relative mt-8 h-[min(44rem,128vw)] overflow-hidden lg:hidden"
          aria-hidden
        >
          <HeroChatStage className="hero-chat-fade pointer-events-none absolute top-[0%] -left-[16%] z-0 w-[130%] origin-top-left">
            <HeroDashboardMockup />
          </HeroChatStage>
          <HeroChatStage
            variant="calendar"
            className="pointer-events-none absolute top-[40%] -bottom-[18%] -left-[6%] z-20 w-[112%] origin-top-left"
          >
            <HeroCalendarMockup className="hero-cal-fade h-full min-h-[30rem]" />
          </HeroChatStage>
        </div>
      </section>

      <BeforeAfterSplit />

      <PlatformPeek />

      <LiveManifestStrip />

      {/* Problem ---------------------------------------------------------- */}
      <section className="py-16">
        <Container>
          <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight">
            You are not disorganised. The tool is wrong.
          </h2>
          <p className="mt-3 max-w-2xl text-ink-muted">
            Social selling is brilliant for demand and terrible for running the
            batch. Three things eat your week:
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PROBLEMS.map((problem) => (
              <div
                key={problem.title}
                className="rounded-card border border-border bg-surface p-5"
              >
                <div className="mb-3 flex size-9 items-center justify-center rounded-full bg-danger-tint text-danger dark:bg-danger/15">
                  <problem.icon className="size-4" aria-hidden />
                </div>
                <h3 className="font-display text-base font-semibold">
                  {problem.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                  {problem.body}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* How it works ----------------------------------------------------- */}
      <section id="how" className="scroll-mt-20 py-16">
        <Container>
          <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight">
            How a batch runs
          </h2>

          <ol className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="relative rounded-card border border-border bg-surface p-5"
              >
                <span
                  className="font-display text-sm font-bold text-brand-400"
                  data-numeric
                >
                  0{index + 1}
                </span>
                <div className="mt-3 mb-3 flex size-9 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                  <step.icon className="size-4" aria-hidden />
                </div>
                <h3 className="font-display text-base font-semibold">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Automatic cutoff ------------------------------------------------- */}
      <FeatureStage
        id="schedule"
        eyebrow="Automatic scheduling"
        title="The batch closes itself"
        mockup={<ScheduleMockup />}
      >
        <p>
          Set a cutoff once. At that time orders stop, the buy-list locks, and
          the next batch can open without you being at your phone.
        </p>
        <p>
          No more &ldquo;last order last order&rdquo; in the group at 11pm. The
          clock is the referee.
        </p>
      </FeatureStage>

      {/* Manifest mockup -------------------------------------------------- */}
      <FeatureStage
        eyebrow="The manifest"
        title="A buy-list, not a scrollback"
        reverse
        mockup={<ManifestMockup />}
      >
        <p>
          Paid orders collapse into one list of exactly what to buy, with sizes
          and quantities already totalled.
        </p>
        <p>
          Copy it to your supplier the moment the batch closes. You never count
          from chat again.
        </p>
      </FeatureStage>

      {/* Freight split mockup --------------------------------------------- */}
      <FeatureStage
        eyebrow="Shipping split"
        title="The bill splits itself"
        mockup={<FreightSplitMockup />}
      >
        <p>
          Enter what the forwarder charged. We divide it by weight or volume so
          every share adds back to the exact bill — nobody subsidises anybody.
        </p>
        <p>
          Then each customer gets their own invoice. You do not become the
          group calculator.
        </p>
      </FeatureStage>

      {/* Live customer updates -------------------------------------------- */}
      <FeatureStage
        eyebrow="Live tracking"
        title="Tell them once. They all see it."
        reverse
        mockup={<LiveUpdatesMockup />}
      >
        <p>
          Post that the goods have moved. Every tracking page updates in the
          same moment.
        </p>
        <p>
          Customers stop asking &ldquo;has it shipped?&rdquo; You stop typing
          the same answer thirty times.
        </p>
      </FeatureStage>

      {/* Manifest --------------------------------------------------------- */}
      <section className="py-16">
        <Container>
          <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight">
            The buy-list writes itself
          </h2>
          <p className="mt-3 max-w-2xl text-ink-muted">
            The moment your batch closes, every order collapses into one
            aggregated list of exactly what to buy, with sizes and quantities
            already totalled.
          </p>

          <div className="mt-8">
            <ManifestComparison />
          </div>
        </Container>
      </section>

      {/* Fair shipping ---------------------------------------------------- */}
      <section id="shipping" className="scroll-mt-20 py-16">
        <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-bold tracking-tight">
              Shipping split fairly, not guessed
            </h2>
            <p className="mt-3 leading-relaxed text-ink-muted">
              When your goods arrive you enter what the forwarder charged. We
              divide it across every order in the batch by weight for air, or by
              volume for sea, then send each customer their own invoice.
            </p>
            <p className="mt-3 leading-relaxed text-ink-muted">
              Customers see an estimate at checkout, so the bill is never a
              surprise, and they can see exactly how their share was worked out.
            </p>
          </div>

          <FreightExplainer />
        </Container>
      </section>

      {/* Pricing ---------------------------------------------------------- */}
      <section id="pricing" className="scroll-mt-20 py-16">
        <Container>
          <h2 className="font-display text-3xl font-bold tracking-tight">
            Simple pricing, in cedis
          </h2>
          <p className="mt-3 max-w-2xl text-ink-muted">
            No fee on the shipping you collect, because that money is not yours
            to begin with.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:max-w-3xl">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={
                  plan.highlighted
                    ? "rounded-card border-2 border-brand-700 bg-surface p-6"
                    : "rounded-card border border-border bg-surface p-6"
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold">
                    {plan.name}
                  </h3>
                  {plan.highlighted && (
                    <StatusPill tone="open" dot={false}>
                      Most popular
                    </StatusPill>
                  )}
                </div>

                <p className="mt-3">
                  <span
                    className="font-display text-3xl font-bold"
                    data-numeric
                  >
                    {plan.price}
                  </span>
                  <span className="text-sm text-ink-muted">{plan.cadence}</span>
                </p>
                <p className="mt-1 text-sm text-ink-muted">{plan.blurb}</p>

                <ul className="mt-5 space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span
                        aria-hidden
                        className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-400"
                      />
                      <span className="text-ink-muted">{feature}</span>
                    </li>
                  ))}
                </ul>

                <ButtonLink
                  href="/onboarding"
                  block
                  className="mt-6"
                  variant={plan.highlighted ? "primary" : "secondary"}
                >
                  {plan.cta}
                </ButtonLink>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* FAQ -------------------------------------------------------------- */}
      <section id="faq" className="scroll-mt-20 py-16">
        <Container className="max-w-3xl">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            Questions people actually ask
          </h2>

          <div className="mt-8 divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
            {FAQ.map((item) => (
              <details key={item.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-medium transition-colors hover:bg-surface-muted">
                  {item.q}
                  <span
                    aria-hidden
                    className="shrink-0 text-ink-subtle transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="px-5 pb-4 text-sm leading-relaxed text-ink-muted">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* Footer CTA ------------------------------------------------------- */}
      <section className="py-16">
        <Container>
          <div className="grain-ink rounded-sheet bg-brand-700 px-6 py-12 text-center sm:px-12">
            <h2 className="font-display text-3xl font-bold tracking-tight text-white">
              Open your next batch properly
            </h2>
            <p className="mx-auto mt-3 max-w-md leading-relaxed text-brand-100">
              Set up your link, add a few products, and share it in your status
              tonight.
            </p>
            <ButtonLink
              href="/onboarding"
              size="lg"
              className="mt-7 bg-white text-brand-800 hover:bg-brand-50"
            >
              Create your batch link
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
