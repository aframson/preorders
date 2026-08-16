import {
  AlertTriangle,
  CalendarClock,
  PackagePlus,
  Ship,
  Timer,
  Wallet,
} from "lucide-react";

import { ActionQueue, type ActionItem } from "@/components/dashboard/action-queue";
import { BatchCard } from "@/components/dashboard/batch-card";
import { ShareSheet } from "@/components/share/share-sheet";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireVendor } from "@/lib/auth";
import { env } from "@/lib/env";
import { syncVendorPayoutStatus } from "@/lib/payout-verification";
import { batchTotals, getDashboardBatches } from "@/lib/queries/dashboard";
import { absoluteUrl, dropPath, shareUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Home" };

export default async function DashboardHome() {
  const vendor = await syncVendorPayoutStatus(await requireVendor());
  const supabase = await createClient();

  const [batches, { data: drops }] = await Promise.all([
    getDashboardBatches(vendor.id),
    supabase
      .from("drops")
      .select(
        "id, slug, title, default_freight_mode, products(id, published, weight_grams, volume_cm3)",
      )
      .eq("vendor_id", vendor.id)
      .is("archived_at", null)
      .order("created_at", { ascending: true }),
  ]);

  const primaryDrop = drops?.[0];
  const live =
    batches.find((batch) => batch.status === "open") ??
    batches.find((batch) => batch.status === "scheduled") ??
    batches[0];

  const actions = buildActionQueue({
    vendor,
    drops: drops ?? [],
    batches,
  });

  const link = primaryDrop
    ? live
      ? shareUrl(
          vendor.slug,
          primaryDrop.slug,
          live.number,
          env.NEXT_PUBLIC_SITE_URL,
        )
      : absoluteUrl(
          dropPath(vendor.slug, primaryDrop.slug),
          env.NEXT_PUBLIC_SITE_URL,
        )
    : null;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <p className="text-sm text-ink-muted">Welcome back</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
          {vendor.businessName}
        </h1>
      </div>

      {live ? (
        <BatchCard
          batch={{
            id: live.id,
            dropId: live.dropId,
            number: live.number,
            status: live.status,
            opensAt: live.opensAt,
            closesAt: live.closesAt,
            ...batchTotals(live),
          }}
        />
      ) : (
        <EmptyState
          icon={CalendarClock}
          title="No batch running"
          description="Schedule a batch to start taking orders on your link."
          action={
            primaryDrop ? (
              <ButtonLink href={`/dashboard/drops/${primaryDrop.id}/batches`}>
                Schedule a batch
              </ButtonLink>
            ) : (
              <ButtonLink href="/dashboard/drops/new">Create a drop</ButtonLink>
            )
          }
        />
      )}

      <section className="space-y-3">
        <h2 className="font-display font-semibold text-ink">Needs you</h2>
        <ActionQueue items={actions} />
      </section>

      {link && primaryDrop && (
        <ShareSheet
          url={link}
          businessName={vendor.businessName}
          dropTitle={primaryDrop.title}
          batchNumber={live?.number}
          statusImageHref={`${dropPath(vendor.slug, primaryDrop.slug)}/status-image`}
        />
      )}
    </div>
  );
}

type DropWithProducts = {
  id: string;
  title: string;
  default_freight_mode: string;
  products: {
    id: string;
    published: boolean;
    weight_grams: number | null;
    volume_cm3: number | null;
  }[];
};

function buildActionQueue({
  vendor,
  drops,
  batches,
}: {
  vendor: {
    payoutVerifiedAt: string | null;
    paystackSubaccountCode: string | null;
  };
  drops: DropWithProducts[];
  batches: Awaited<ReturnType<typeof getDashboardBatches>>;
}): ActionItem[] {
  const items: ActionItem[] = [];

  if (!vendor.paystackSubaccountCode) {
    items.push({
      id: "payout",
      icon: Wallet,
      label: "Connect your payout number",
      detail: "Customers cannot pay you until this is done",
      href: "/onboarding/payout",
      tone: "danger",
    });
  } else if (!vendor.payoutVerifiedAt) {
    items.push({
      id: "payout-verify",
      icon: Wallet,
      label: "Preorders account not verified yet",
      detail: "Verification is underway — products and batches unlock after",
      href: "/dashboard/more",
      tone: "danger",
    });
  }

  for (const drop of drops) {
    const published = drop.products.filter((product) => product.published);

    if (published.length === 0) {
      items.push({
        id: `no-products-${drop.id}`,
        icon: PackagePlus,
        label: `Add products to ${drop.title}`,
        detail: "A batch cannot open with an empty catalogue",
        href: `/dashboard/drops/${drop.id}/products/new`,
        tone: "closing",
      });
      continue;
    }

    const unmeasured = published.filter((product) =>
      drop.default_freight_mode === "air_kg"
        ? product.weight_grams === null
        : product.volume_cm3 === null,
    );

    if (unmeasured.length > 0) {
      items.push({
        id: `unmeasured-${drop.id}`,
        icon: AlertTriangle,
        label: `${unmeasured.length} product${unmeasured.length === 1 ? "" : "s"} missing a shipping size`,
        detail: "Your batch cannot open until every product can be costed",
        href: `/dashboard/drops/${drop.id}`,
        tone: "closing",
      });
    }
  }

  for (const batch of batches) {
    const totals = batchTotals(batch);

    if (totals.awaitingPayment > 0) {
      items.push({
        id: `awaiting-payment-${batch.id}`,
        icon: Timer,
        label: `${totals.awaitingPayment} order${totals.awaitingPayment === 1 ? "" : "s"} awaiting payment`,
        detail: `Batch ${batch.number} · ${batch.dropTitle}`,
        href: `/dashboard/drops/${batch.dropId}/batches/${batch.id}`,
        tone: "closing",
      });
    }

    if (batch.status === "arrived" && !batch.freightFinalisedAt) {
      items.push({
        id: `freight-${batch.id}`,
        icon: Ship,
        label: `Enter the shipping bill for Batch ${batch.number}`,
        detail: "Customers are waiting to be invoiced",
        href: `/dashboard/drops/${batch.dropId}/batches/${batch.id}/freight`,
        tone: "arrived",
      });
    }

    if (totals.awaitingFreight > 0) {
      items.push({
        id: `freight-unpaid-${batch.id}`,
        icon: Wallet,
        label: `${totals.awaitingFreight} customer${totals.awaitingFreight === 1 ? "" : "s"} owe shipping`,
        detail: `Batch ${batch.number} · goods held until paid`,
        href: `/dashboard/drops/${batch.dropId}/batches/${batch.id}/freight`,
        tone: "arrived",
      });
    }
  }

  return items;
}
