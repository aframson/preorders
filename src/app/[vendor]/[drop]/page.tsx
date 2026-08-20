import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  BatchBanner,
  DeliveryExpectation,
} from "@/components/public/batch-banner";
import { DropShopFooter } from "@/components/public/drop-shop-footer";
import { NotifyMeForm } from "@/components/public/notify-me-form";
import { PublicProductCatalog } from "@/components/public/public-product-catalog";
import { VendorHeader } from "@/components/public/vendor-header";
import { ShopHeaderActions } from "@/components/public/shop-header-actions";
import { NavChip } from "@/components/ui/nav-chip";
import { getVendor } from "@/lib/auth";
import { getPublicDrop } from "@/lib/queries/public-drop";
import { dropPath, vendorPath, whatsappChatLink } from "@/lib/site";

export async function generateMetadata({
  params,
}: PageProps<"/[vendor]/[drop]">): Promise<Metadata> {
  const { vendor, drop } = await params;
  const data = await getPublicDrop(vendor, drop);
  if (!data) return {};

  const title = `${data.vendor.businessName} — ${data.drop.title}`;
  const description = data.openBatch
    ? `Batch ${data.openBatch.number} is open. ${data.openBatch.orderCount} orders in. Pick what you want and pay online.`
    : `Orders are closed right now. Leave your email to hear when the next batch opens.`;

  const canonicalPath = data.openBatch
    ? `/${vendor}/${drop}?b=${data.openBatch.number}`
    : `/${vendor}/${drop}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalPath,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PublicDropPage({
  params,
  searchParams,
}: PageProps<"/[vendor]/[drop]">) {
  const { vendor: vendorSlug, drop: dropSlug } = await params;
  const query = await searchParams;
  const activeCategory =
    typeof query.category === "string" ? query.category : null;

  const data = await getPublicDrop(vendorSlug, dropSlug);
  if (!data) notFound();

  const { vendor, drop, categories, products, openBatch, nextBatch } = data;
  const base = dropPath(vendorSlug, dropSlug);
  const sessionVendor = await getVendor();

  const visible = activeCategory
    ? products.filter((product) => product.categoryId === activeCategory)
    : products;

  const usedCategories = categories.filter((category) =>
    products.some((product) => product.categoryId === category.id),
  );

  const questionsHref = vendor.whatsappNumber
    ? whatsappChatLink(
        vendor.whatsappNumber,
        `Hi ${vendor.businessName}, I have a question about your preorders.`,
      )
    : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <VendorHeader
        businessName={vendor.businessName}
        logoPath={vendor.logoPath}
        batchesDelivered={vendor.batchesDelivered}
        description={drop.description}
        href={vendorPath(vendorSlug)}
        actions={
          <ShopHeaderActions
            vendorSlug={vendorSlug}
            dashboardHref={sessionVendor ? "/dashboard" : null}
          />
        }
      />

      <div className="sticky top-0 z-20">
        <BatchBanner
          openBatch={openBatch}
          nextBatch={nextBatch}
          notifySlot={<NotifyMeForm dropId={drop.id} />}
        />

        {openBatch && <DeliveryExpectation batch={openBatch} />}

        {usedCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto border-b border-border bg-canvas/95 px-5 py-3 backdrop-blur scrollbar-none">
            <NavChip href={base} active={!activeCategory}>
              All
            </NavChip>
            {usedCategories.map((category) => (
              <NavChip
                key={category.id}
                href={`${base}?category=${category.id}`}
                active={activeCategory === category.id}
              >
                {category.name}
              </NavChip>
            ))}
          </div>
        )}
      </div>

      <main id="products" className="mx-auto w-full max-w-3xl flex-1 pb-6">
        <PublicProductCatalog
          products={visible}
          base={base}
          freightMode={openBatch?.freightMode ?? "sea_cbm"}
          freightRateEstimate={openBatch?.freightRateEstimate ?? 0}
          categoryNames={Object.fromEntries(
            categories.map((category) => [category.id, category.name]),
          )}
          emptyTitle={
            activeCategory ? "Nothing in this category" : "Nothing here yet"
          }
          emptyDescription={
            activeCategory
              ? "Try another category."
              : `${vendor.businessName} has not added products to this link yet.`
          }
        />

        {!questionsHref && (
          <p className="px-5 pt-4 text-center text-xs text-ink-subtle">
            You pay for your goods now. Shipping is charged when they arrive,
            split fairly by{" "}
            {openBatch?.freightMode === "air_kg" ? "weight" : "size"}.
          </p>
        )}
      </main>

      <DropShopFooter
        checkoutHref={`${base}/checkout`}
        questionsHref={questionsHref}
        vendorFirstName={vendor.businessName.split(" ")[0] ?? vendor.businessName}
        freightModeLabel={
          openBatch?.freightMode === "air_kg" ? "weight" : "size"
        }
        showCart={Boolean(openBatch)}
      />
    </div>
  );
}
