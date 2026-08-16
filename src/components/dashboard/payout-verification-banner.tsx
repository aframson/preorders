import Link from "next/link";

import type { VendorContext } from "@/lib/auth";
import { syncVendorPayoutStatus } from "@/lib/payout-verification";

/**
 * Dashboard strip while the vendor cannot sell yet — branded, short, grainy.
 * Avoids the generic amber "warning card" look.
 */
export async function PayoutVerificationBanner({
  vendor,
}: {
  vendor: VendorContext;
}) {
  const status = await syncVendorPayoutStatus(vendor);

  if (status.verified) return null;

  const pending = status.connected && !status.verified;

  return (
    <aside
      aria-live="polite"
      className="relative isolate overflow-hidden border-b border-brand-900/40 bg-brand-900 text-brand-50"
    >
      <span
        aria-hidden
        className="bg-grain-heavy pointer-events-none absolute inset-0 opacity-[0.55] mix-blend-overlay"
      />
      <span
        aria-hidden
        className="grain-film-soft grain-drift-slow pointer-events-none absolute inset-0 opacity-40 mix-blend-soft-light"
      />
      {/* Warm edge light — not a status tint, just depth on the plum. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-16 right-0 size-40 rounded-full bg-brand-400/20 blur-3xl"
      />

      <div className="relative mx-auto flex max-w-3xl flex-col gap-1 px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6 lg:px-8">
        <div className="min-w-0 space-y-1">
          <p className="font-display text-[0.7rem] font-semibold tracking-[0.18em] text-brand-200 uppercase">
            Preorders
          </p>
          <p className="font-display text-lg leading-snug font-semibold text-brand-50 sm:text-xl">
            {pending
              ? "Your account isn’t verified yet"
              : "Finish connecting payouts"}
          </p>
          <p className="max-w-md text-sm leading-relaxed text-brand-100/85">
            {pending
              ? "Verification is underway. You’ll be able to add products and open a batch once it’s done."
              : "Add MoMo or a bank account so we can start verifying your Preorders account."}
          </p>
        </div>

        <Link
          href={pending ? "/dashboard/more" : "/onboarding/payout"}
          className="shrink-0 pt-1 text-sm font-semibold text-brand-100 underline decoration-brand-300/50 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
        >
          {pending ? "See status" : "Connect payouts"}
        </Link>
      </div>
    </aside>
  );
}
