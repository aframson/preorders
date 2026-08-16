import { ShieldAlert } from "lucide-react";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import type { VendorContext } from "@/lib/auth";
import { syncVendorPayoutStatus } from "@/lib/payout-verification";

/**
 * Shown across the vendor dashboard while Paystack still has the subaccount
 * as unverified (or payouts were never connected).
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
    <div className="border-b border-closing/30 bg-closing-tint px-5 py-3 lg:px-8">
      <div className="mx-auto flex max-w-3xl items-start gap-3 text-sm text-ink">
        <ShieldAlert
          className="mt-0.5 size-4 shrink-0 text-closing"
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-2">
          {pending ? (
            <>
              <p className="font-medium">Payout pending Paystack verification</p>
              <p className="text-ink-muted">
                Your MoMo account is connected, but Paystack still shows it as
                unverified. An admin must verify the subaccount on the Paystack
                dashboard before you can add products or open a batch for
                orders.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">Connect payouts to sell</p>
              <p className="text-ink-muted">
                Add your mobile money number so customers can pay you. After
                that, Paystack verification unlocks products and batches.
              </p>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            {!status.connected && (
              <ButtonLink href="/onboarding/payout" size="sm">
                Connect payouts
              </ButtonLink>
            )}
            <Link
              href="/dashboard/more"
              className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
            >
              Check status in More
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
