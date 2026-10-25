import { BadgeCheck, ExternalLink, LogOut, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { signOut } from "@/app/(auth)/login/actions";
import { PushEnableCard } from "@/components/dashboard/push-enable-card";
import { CopyButton } from "@/components/share/copy-button";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { requireVendor, type VendorContext } from "@/lib/auth";
import { env } from "@/lib/env";
import { PLATFORM_FEE_PERCENT } from "@/lib/fees";
import { syncVendorPayoutStatus } from "@/lib/payout-verification";
import { absoluteUrl } from "@/lib/site";
import { getVendorApproval } from "@/lib/vendor-approval";
import { PickupLocationForm } from "./pickup-form";
import { RefreshPayoutButton } from "./refresh-payout-button";

export const metadata = { title: "Settings" };

export default async function MorePage() {
  const vendor = await requireVendor();
  const [payout, approval] = await Promise.all([
    syncVendorPayoutStatus(vendor),
    getVendorApproval(vendor),
  ]);
  const profileUrl = absoluteUrl(`/${vendor.slug}`, env.NEXT_PUBLIC_SITE_URL);

  return (
    <div className="-mx-5 -my-6 lg:-mx-8 lg:-my-7">
      <header className="min-h-20 border-b border-border px-5 py-4 lg:px-8">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          Settings
        </h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          Business details, notifications, fulfilment, and payouts.
        </p>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-5 py-6 lg:grid-cols-[11rem_minmax(0,1fr)] lg:px-8 lg:py-8">
        <aside className="hidden lg:block">
          <nav
            aria-label="Settings sections"
            className="sticky top-8 space-y-1 text-sm"
          >
            {[
              ["#business", "Business"],
              ["#notifications", "Notifications"],
              ["#pickup", "Pickup"],
              ["#payouts", "Payouts"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="block rounded-control px-3 py-2 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
              >
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 max-w-2xl space-y-6">

      <Card className="scroll-mt-8" id="business">
        <CardHeader title="Your business" />
        <CardBody className="space-y-4">
          <dl className="space-y-3 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-muted">Business name</dt>
              <dd className="font-medium text-ink">{vendor.businessName}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-muted">Your link</dt>
              <dd className="truncate font-medium text-ink">{profileUrl}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-muted">WhatsApp</dt>
              <dd className="font-medium text-ink" data-numeric>
                {vendor.whatsappNumber ?? "Not set"}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            <CopyButton value={profileUrl} variant="secondary" size="sm" />
            <ButtonLink
              href="/onboarding/business"
              variant="secondary"
              size="sm"
            >
              Edit details
            </ButtonLink>
          </div>
        </CardBody>
      </Card>

      <Card className="scroll-mt-8" id="notifications">
        <CardHeader title="Push alerts" />
        <CardBody>
          <PushEnableCard
            vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
          />
        </CardBody>
      </Card>

      <Card className="scroll-mt-8" id="pickup">
        <CardHeader title="Pickup location" />
        <CardBody className="space-y-3">
          <p className="text-sm text-ink-muted">
            Optional. When set, customers can choose Pick up at checkout and see
            this Google Maps pin. Clear the link to offer delivery only.
          </p>
          <PickupLocationForm defaultMapsUrl={vendor.pickupMapsUrl} />
        </CardBody>
      </Card>

      <Card className="scroll-mt-8" id="payouts">
        <CardHeader title="Payouts" />
        <CardBody className="space-y-4">
          {approval.approved ? (
            <>
              <p className="flex items-start gap-2.5 text-sm">
                <BadgeCheck className="mt-0.5 size-4 shrink-0 text-open" aria-hidden />
                <span className="text-ink-muted">
                  Approved by Preorders. Goods payments settle straight to your{" "}
                  {payout.payoutChannel === "bank"
                    ? "bank account"
                    : "mobile money number"}
                  , less our {PLATFORM_FEE_PERCENT.goods}% fee. We take nothing
                  on shipping.
                </span>
              </p>
              <PayoutAccountSummary vendor={vendor} />
              <ButtonLink href="/onboarding/payout?from=more" size="sm">
                Change payout method
              </ButtonLink>
            </>
          ) : payout.connected ? (
            <>
              <p className="flex items-start gap-2.5 text-sm">
                <ShieldAlert
                  className="mt-0.5 size-4 shrink-0 text-closing"
                  aria-hidden
                />
                <span className="text-ink-muted">
                  {approval.status === "rejected"
                    ? approval.note ??
                      "Your payout details need attention. Update them to submit a new review."
                    : "Your payout details are waiting for Preorders review. Products, batches and checkout unlock after approval."}
                </span>
              </p>
              <PayoutAccountSummary vendor={vendor} />
              <div className="flex flex-wrap gap-2">
                <ButtonLink
                  href="/onboarding/payout?from=more"
                  variant="secondary"
                  size="sm"
                >
                  Change payout method
                </ButtonLink>
                <RefreshPayoutButton />
              </div>
            </>
          ) : (
            <>
              <p className="flex items-start gap-2.5 text-sm">
                <ShieldAlert
                  className="mt-0.5 size-4 shrink-0 text-closing"
                  aria-hidden
                />
                <span className="text-ink-muted">
                  You have not connected a payout account yet. Choose mobile
                  money or a bank account — we show the registered name before
                  you save.
                </span>
              </p>
              <ButtonLink href="/onboarding/payout?from=more" size="sm">
                Connect payouts
              </ButtonLink>
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Help" />
        <CardBody>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-brand-700"
          >
            How Preorders works
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        </CardBody>
      </Card>

      <form action={signOut}>
        <Button type="submit" variant="secondary" block>
          <LogOut className="size-4" aria-hidden />
          Sign out
        </Button>
      </form>
        </main>
      </div>
    </div>
  );
}

/** What was submitted, so a vendor can check it against what they typed — whether it's approved, pending, or rejected. */
function PayoutAccountSummary({
  vendor,
}: {
  vendor: Pick<
    VendorContext,
    "payoutAccountName" | "payoutChannel" | "payoutBankCode" | "payoutAccountNumber"
  >;
}) {
  if (!vendor.payoutAccountName && !vendor.payoutAccountNumber) return null;

  return (
    <dl className="space-y-2 rounded-card border border-border px-4 py-3 text-sm">
      {vendor.payoutAccountName && (
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-muted">Account name</dt>
          <dd className="font-medium text-ink">{vendor.payoutAccountName}</dd>
        </div>
      )}
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-ink-muted">Method</dt>
        <dd className="font-medium text-ink">
          {vendor.payoutChannel === "bank" ? "Bank account" : "Mobile money"}
          {vendor.payoutBankCode ? ` · ${vendor.payoutBankCode}` : ""}
        </dd>
      </div>
      {vendor.payoutAccountNumber && (
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-muted">Account</dt>
          <dd className="font-medium text-ink" data-numeric>
            {vendor.payoutAccountNumber}
          </dd>
        </div>
      )}
    </dl>
  );
}
