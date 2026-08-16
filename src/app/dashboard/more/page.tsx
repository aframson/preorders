import { BadgeCheck, ExternalLink, LogOut, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { signOut } from "@/app/(auth)/login/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { CopyButton } from "@/components/share/copy-button";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { requireVendor } from "@/lib/auth";
import { env } from "@/lib/env";
import { PLATFORM_FEE_PERCENT } from "@/lib/fees";
import { isPaystackConfigured, paystackMode } from "@/lib/paystack";
import { syncVendorPayoutStatus } from "@/lib/payout-verification";
import { absoluteUrl } from "@/lib/site";
import { PickupLocationForm } from "./pickup-form";
import { RefreshPayoutButton } from "./refresh-payout-button";

export const metadata = { title: "More" };

export default async function MorePage() {
  const vendor = await requireVendor();
  const payout = await syncVendorPayoutStatus(vendor);
  const profileUrl = absoluteUrl(`/${vendor.slug}`, env.NEXT_PUBLIC_SITE_URL);
  const paystackReady = isPaystackConfigured();
  const mode = paystackMode();
  const webhookUrl = absoluteUrl(
    "/api/webhooks/paystack",
    env.NEXT_PUBLIC_SITE_URL,
  );

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="More" />

      <Card>
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

      <Card>
        <CardHeader title="Pickup location" />
        <CardBody className="space-y-3">
          <p className="text-sm text-ink-muted">
            Optional. When set, customers can choose Pick up at checkout and see
            this Google Maps pin. Clear the link to offer delivery only.
          </p>
          <PickupLocationForm defaultMapsUrl={vendor.pickupMapsUrl} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Payments (Paystack)" />
        <CardBody className="space-y-3 text-sm">
          <dl className="space-y-3">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-muted">Mode</dt>
              <dd className="font-medium capitalize text-ink">{mode}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-muted">API keys</dt>
              <dd className="font-medium text-ink">
                {paystackReady ? "Configured" : "Missing"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-muted">Subaccount</dt>
              <dd className="font-medium text-ink" data-numeric>
                {payout.subaccountCode ?? "Not connected"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-muted">Paystack verification</dt>
              <dd className="font-medium text-ink">
                {!payout.connected
                  ? "Not connected"
                  : payout.verified
                    ? "Verified"
                    : "Pending admin"}
              </dd>
            </div>
          </dl>
          <p className="text-ink-muted">
            See{" "}
            <Link
              href="/dashboard/earnings"
              className="font-medium text-brand-700 underline-offset-2 hover:underline"
            >
              Earnings
            </Link>{" "}
            for how cash-out to MoMo works. Webhook endpoint (paste into
            Paystack → Settings → API Keys & Webhooks for both test and live):
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="truncate rounded-control bg-surface-muted px-2.5 py-1.5 text-xs text-ink">
              {webhookUrl}
            </code>
            <CopyButton value={webhookUrl} variant="secondary" size="sm" />
          </div>
          {!paystackReady && (
            <p className="text-closing">
              Add {mode === "live" ? "live" : "test"} secret and public keys to
              `.env.local`, then restart the app.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Payouts" />
        <CardBody className="space-y-4">
          {payout.verified ? (
            <>
              <p className="flex items-start gap-2.5 text-sm">
                <BadgeCheck className="mt-0.5 size-4 shrink-0 text-open" aria-hidden />
                <span className="text-ink-muted">
                  Verified on Paystack. Goods payments settle straight to your{" "}
                  {payout.payoutChannel === "bank"
                    ? "bank account"
                    : "mobile money number"}
                  , less our {PLATFORM_FEE_PERCENT.goods}% fee. We take nothing
                  on shipping.
                </span>
              </p>
              {(vendor.payoutAccountName || vendor.payoutAccountNumber) && (
                <dl className="space-y-2 rounded-card border border-border px-4 py-3 text-sm">
                  {vendor.payoutAccountName && (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-ink-muted">Account name</dt>
                      <dd className="font-medium text-ink">
                        {vendor.payoutAccountName}
                      </dd>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-ink-muted">Method</dt>
                    <dd className="font-medium text-ink">
                      {vendor.payoutChannel === "bank"
                        ? "Bank account"
                        : "Mobile money"}
                      {vendor.payoutBankCode
                        ? ` · ${vendor.payoutBankCode}`
                        : ""}
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
              )}
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
                  Connected, but Paystack still shows this subaccount as
                  unverified. An admin must verify it on the Paystack dashboard.
                  Until then you cannot add products or open a batch.
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                <RefreshPayoutButton />
                <ButtonLink
                  href="/onboarding/payout?from=more"
                  variant="secondary"
                  size="sm"
                >
                  Change payout method
                </ButtonLink>
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
    </div>
  );
}
