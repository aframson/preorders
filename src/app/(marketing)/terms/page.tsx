import type { Metadata } from "next";

import { Container } from "@/components/ui/container";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <Container className="max-w-2xl py-16">
      <p className="text-sm font-medium tracking-wide text-brand-600 uppercase">
        Legal
      </p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">
        Terms of use
      </h1>
      <p className="mt-3 text-sm text-ink-subtle">Last updated 13 August 2026</p>

      <div className="mt-10 space-y-8 text-base leading-relaxed text-ink-muted">
        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-ink">
            What this is
          </h2>
          <p>
            Preorders is software for vendors who sell imported goods in
            batches. Customers pay for goods when they order, then pay their
            share of shipping when the goods land. These terms cover both
            vendors using the dashboard and customers using a vendor&apos;s
            public link.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-ink">
            The vendor is the seller
          </h2>
          <p>
            Each order is a contract between the customer and the vendor, not
            with Preorders. The vendor sets prices, catalogues, cutoffs,
            delivery promises and how goods are handed over. If something is
            wrong with an order, the customer should message the vendor first.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-ink">
            Payments
          </h2>
          <p>
            Payments are processed by Paystack. Goods money settles to the
            vendor&apos;s registered MoMo or bank account. We take a small
            platform fee on goods payments only — never on the shipping bill,
            which is a pass-through of what the forwarder charged.
          </p>
          <p>
            An unpaid hold expires and the slot is released. A paid order is
            confirmed. Shipping is invoiced later, split across the batch by
            weight or size as the vendor configured.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-ink">
            Vendor duties
          </h2>
          <p>
            Vendors must describe products honestly, honour paid orders, post
            batch updates, and split shipping using the real freight bill. You
            may not use the platform for illegal goods or to collect money you
            do not intend to fulfil.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-ink">
            Our role
          </h2>
          <p>
            We provide the software: the public link, checkout, tracking page,
            supplier buy-list and freight split. We do not warehouse goods, run
            the shipping, or hold customer funds. We can suspend an account that
            breaks these terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-ink">
            Ghana law
          </h2>
          <p>
            These terms are governed by the laws of Ghana. If a part of them
            cannot be enforced, the rest still applies.
          </p>
        </section>
      </div>
    </Container>
  );
}
