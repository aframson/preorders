import type { Metadata } from "next";

import { Container } from "@/components/ui/container";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <Container className="max-w-2xl py-16">
      <p className="text-sm font-medium tracking-wide text-brand-600 uppercase">
        Legal
      </p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">
        Privacy
      </h1>
      <p className="mt-3 text-sm text-ink-subtle">Last updated 13 August 2026</p>

      <div className="mt-10 space-y-8 text-base leading-relaxed text-ink-muted">
        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-ink">
            What we collect
          </h2>
          <p>
            Vendors give us a business name, a public slug, a WhatsApp number
            and a payout account so money can settle to them. Customers give a
            name, phone, email and optionally a delivery note so the vendor can
            fulfil the order.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-ink">
            Why we collect it
          </h2>
          <p>
            To run checkout, show the tracking page, build the supplier
            buy-list, split shipping, and send payment links. We do not sell
            this information. A vendor sees their own customers; other vendors
            do not.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-ink">
            Who else sees it
          </h2>
          <p>
            Paystack processes the payment and therefore receives the
            customer&apos;s email and the charge amount. Supabase stores the
            application data. If a vendor connects WhatsApp or email later,
            those providers will receive the messages the vendor chooses to
            send.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-ink">
            How long we keep it
          </h2>
          <p>
            Order records stay for as long as the vendor&apos;s account exists,
            because a customer may reopen their tracking link months later.
            Waitlist emails are kept until the next batch opens or the vendor
            deletes the drop. You can ask a vendor, or us, to correct or delete
            your details.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-ink">
            Contact
          </h2>
          <p>
            Questions about this policy can go to the vendor you ordered from,
            or to Preorders through the support number on the site.
          </p>
        </section>
      </div>
    </Container>
  );
}
