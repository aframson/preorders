import { ArrowRight, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CustomerOrderList } from "@/components/public/customer-order-list";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getCustomerPortal } from "@/lib/queries/customer-portal";
import { myOrdersPath, vendorPath } from "@/lib/site";
import { BUCKETS, publicUrl } from "@/lib/storage";

export const metadata = {
  title: "Your orders",
  robots: { index: false, follow: false },
};

export default async function CustomerPortalPage({
  params,
}: PageProps<"/c/[token]">) {
  const { token } = await params;
  const portal = await getCustomerPortal(token);
  if (!portal) notFound();

  const shopHref = vendorPath(portal.vendor.slug);

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-5 py-4">
          <Link href={shopHref} className="flex min-w-0 items-center gap-3">
            {portal.vendor.logoPath ? (
              <Image
                src={publicUrl(BUCKETS.vendorAssets, portal.vendor.logoPath)}
                alt=""
                width={36}
                height={36}
                className="size-9 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
                {portal.vendor.businessName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{portal.vendor.businessName}</p>
              <p className="truncate text-xs text-ink-muted">Your orders</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-8 px-5 py-6">
        <section className="space-y-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Hi {portal.customerName.split(/\s+/)[0]}
          </h1>
          <p className="text-sm text-ink-muted">
            Every order you&apos;ve placed with {portal.vendor.businessName}
            {portal.email ? ` using ${portal.email}` : ""}.{" "}
            <Link href={myOrdersPath()} className="font-medium text-ink underline-offset-2 hover:underline">
              Sign in with your phone
            </Link>{" "}
            to see orders from every shop in one place.
          </p>
        </section>

        {portal.orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="When you place an order, it will show up here."
          />
        ) : (
          <CustomerOrderList orders={portal.orders} />
        )}

        <section className="border-t border-border pt-6">
          <ButtonLink href={shopHref} variant="secondary" block>
            Shop {portal.vendor.businessName} again
            <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </section>
      </main>
    </div>
  );
}
