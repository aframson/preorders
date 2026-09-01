import { CircleAlert, Hourglass } from "lucide-react";
import Link from "next/link";

import type { VendorContext } from "@/lib/auth";
import { getVendorApproval } from "@/lib/vendor-approval";

/**
 * Dashboard strip while the vendor cannot sell yet — branded, short, grainy.
 * Avoids the generic amber "warning card" look.
 */
export async function VendorApprovalBanner({
  vendor,
}: {
  vendor: VendorContext;
}) {
  const approval = await getVendorApproval(vendor);

  if (approval.approved) return null;

  const missing = approval.status === "missing_payout";
  const rejected = approval.status === "rejected";
  const Icon = rejected ? CircleAlert : Hourglass;

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
      <span
        aria-hidden
        className="pointer-events-none absolute -top-16 right-0 size-40 rounded-full bg-brand-400/20 blur-3xl"
      />

      <div className="relative mx-auto flex max-w-3xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6 lg:px-8">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-brand-200/25 bg-brand-800/80 text-brand-100">
            <Icon className="size-4" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="font-display text-[0.7rem] font-semibold tracking-[0.18em] text-brand-200 uppercase">
              Preorders
            </p>
            <p className="font-display text-lg leading-snug font-semibold text-brand-50 sm:text-xl">
              {missing
                ? "Finish connecting payouts"
                : rejected
                  ? "Your account needs attention"
                  : "Your account is waiting for review"}
            </p>
            <p className="max-w-md text-sm leading-relaxed text-brand-100/85">
              {missing
                ? "Add MoMo or a bank account so we can review your Preorders account."
                : rejected
                  ? approval.note ??
                    "Check your payout details and submit them again for review."
                  : "Your payout details are in the Preorders review queue. We’ll unlock selling once they’re approved."}
            </p>
          </div>
        </div>

        <Link
          href={missing ? "/onboarding/payout" : "/dashboard/more"}
          className="shrink-0 self-start pt-0.5 text-sm font-semibold text-brand-100 underline decoration-brand-300/50 underline-offset-4 transition-colors hover:text-white hover:decoration-white sm:self-end"
        >
          {missing ? "Connect payouts" : "See status"}
        </Link>
      </div>
    </aside>
  );
}
