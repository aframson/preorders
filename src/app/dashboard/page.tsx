import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  PackagePlus,
  Plus,
  Ship,
  Timer,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import {
  ActionQueue,
  type ActionItem,
} from "@/components/dashboard/action-queue";
import { ShareSheet } from "@/components/share/share-sheet";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { requireVendor } from "@/lib/auth";
import { env } from "@/lib/env";
import { formatGhs } from "@/lib/money";
import {
  batchTotals,
  getDashboardBatches,
  type DashboardBatch,
} from "@/lib/queries/dashboard";
import { absoluteUrl, dropPath, shareUrl } from "@/lib/site";
import { BATCH_STATUS, batchTone } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";
import { formatAccraDateTime } from "@/lib/time";
import {
  getVendorApproval,
  type VendorApprovalState,
} from "@/lib/vendor-approval";

export const metadata = { title: "Overview" };

export default async function DashboardHome() {
  const vendor = await requireVendor();
  const supabase = await createClient();

  const [approval, batches, { data: drops }] = await Promise.all([
    getVendorApproval(vendor),
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

  const activeBatches = batches.filter(
    (batch) => batch.status === "open" || batch.status === "scheduled",
  );
  const displayedBatches =
    activeBatches.length > 0 ? activeBatches : batches.slice(0, 3);
  const totals = batches.reduce(
    (summary, batch) => {
      const batchSummary = batchTotals(batch);
      return {
        orders: summary.orders + batchSummary.orderCount,
        value: summary.value + batchSummary.value,
      };
    },
    { orders: 0, value: 0 },
  );

  const primaryDrop = drops?.[0];
  const live =
    batches.find((batch) => batch.status === "open") ??
    batches.find((batch) => batch.status === "scheduled") ??
    batches[0];
  const linkDrop = live
    ? drops?.find((drop) => drop.id === live.dropId) ?? primaryDrop
    : primaryDrop;
  const actions = buildActionQueue({
    vendor,
    approval,
    drops: drops ?? [],
    batches,
  });
  const link = linkDrop
    ? live
      ? shareUrl(
          vendor.slug,
          linkDrop.slug,
          live.number,
          env.NEXT_PUBLIC_SITE_URL,
        )
      : absoluteUrl(
          dropPath(vendor.slug, linkDrop.slug),
          env.NEXT_PUBLIC_SITE_URL,
        )
    : null;

  return (
    <div className="-mx-5 -my-6 lg:-mx-8 lg:-my-7">
      <header className="flex min-h-20 flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4 lg:px-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            Overview
          </h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Run today&apos;s preorder work for {vendor.businessName}.
          </p>
        </div>
        <ButtonLink href="/dashboard/drops/new" size="sm">
          <Plus className="size-4" aria-hidden />
          New drop
        </ButtonLink>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-5 py-6 lg:px-8 lg:py-8">
        <section aria-label="Business summary">
          <dl className="grid overflow-hidden rounded-card border border-border bg-surface shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <SummaryStat label="Drops" value={String(drops?.length ?? 0)} />
            <SummaryStat label="Paid orders" value={String(totals.orders)} />
            <SummaryStat label="Goods collected" value={formatGhs(totals.value)} />
          </dl>
        </section>

        <section className="space-y-3">
          <SectionHeading
            title="Needs you"
            description="The next actions blocking orders, freight, or customers."
            count={actions.length}
          />
          <ActionQueue items={actions} />
        </section>

        <section className="space-y-3">
          <SectionHeading
            title={activeBatches.length > 0 ? "Active batches" : "Recent batches"}
            description={
              activeBatches.length > 0
                ? "Open and scheduled selling windows."
                : "Your latest preorder activity."
            }
            action={
              <Link
                href="/dashboard/drops"
                className="inline-flex items-center gap-1 text-sm font-medium text-ink-muted hover:text-ink"
              >
                All drops
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            }
          />

          {displayedBatches.length > 0 ? (
            <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface shadow-sm">
              {displayedBatches.map((batch) => (
                <BatchRow key={batch.id} batch={batch} />
              ))}
            </ul>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-card border border-dashed border-border-strong bg-surface px-6 text-center">
              <CalendarClock className="size-5 text-ink-subtle" aria-hidden />
              <p className="mt-3 font-medium text-ink">No batches yet</p>
              <p className="mt-1 max-w-sm text-sm text-ink-muted">
                Create a drop, add products, then schedule the first
                selling window.
              </p>
              <ButtonLink href="/dashboard/drops/new" size="sm" className="mt-4">
                Create a drop
              </ButtonLink>
            </div>
          )}
        </section>

        {link && linkDrop ? (
          <section className="space-y-3">
            <SectionHeading
              title="Share your link"
              description="Send customers to the batch that is currently relevant."
            />
            <ShareSheet
              url={link}
              businessName={vendor.businessName}
              dropTitle={linkDrop.title}
              batchNumber={live?.number}
              statusImageHref={`${dropPath(vendor.slug, linkDrop.slug)}/status-image`}
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border px-5 py-4 last:border-b-0 sm:border-b-0">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tracking-tight text-ink" data-numeric>
        {value}
      </dd>
    </div>
  );
}

function SectionHeading({
  title,
  description,
  count,
  action,
}: {
  title: string;
  description: string;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {count !== undefined ? (
            <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-ink-muted">
              {count}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

function BatchRow({ batch }: { batch: DashboardBatch }) {
  const totals = batchTotals(batch);
  const closesAt = new Date(batch.closesAt);

  return (
    <li>
      <Link
        href={`/dashboard/drops/${batch.dropId}/batches/${batch.id}`}
        className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-surface-muted sm:px-5"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-control border border-border bg-surface-muted text-sm font-semibold text-ink">
          B{batch.number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-ink">
              {batch.dropTitle}
            </span>
            <StatusPill
              tone={batchTone(batch.status, closesAt)}
              className="!px-2 !py-0.5 !text-[11px]"
            >
              {BATCH_STATUS[batch.status].label}
            </StatusPill>
          </span>
          <span className="mt-0.5 block truncate text-sm text-ink-muted">
            {batch.status === "scheduled" ? "Opens" : "Closes"}{" "}
            {formatAccraDateTime(
              batch.status === "scheduled" ? batch.opensAt : batch.closesAt,
            )}
          </span>
        </span>
        <span className="hidden shrink-0 text-right sm:block">
          <span className="block text-sm font-medium text-ink" data-numeric>
            {totals.orderCount} orders
          </span>
          <span className="block text-xs text-ink-muted" data-numeric>
            {formatGhs(totals.value)}
          </span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-ink-subtle" aria-hidden />
      </Link>
    </li>
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
  approval,
  drops,
  batches,
}: {
  vendor: {
    paystackSubaccountCode: string | null;
  };
  approval: VendorApprovalState;
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
  } else if (!approval.approved) {
    items.push({
      id: "vendor-approval",
      icon: Wallet,
      label:
        approval.status === "rejected"
          ? "Your Preorders review needs attention"
          : "Preorders review is pending",
      detail:
        approval.status === "rejected"
          ? approval.note ?? "Review your payout details and submit them again"
          : "Products and batches unlock after approval",
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
