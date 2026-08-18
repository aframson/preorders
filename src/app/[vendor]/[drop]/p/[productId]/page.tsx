import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getPublicDrop } from "@/lib/queries/public-drop";
import { dropPath } from "@/lib/site";
import { ProductDetail } from "./product-detail";

export async function generateMetadata({
  params,
}: PageProps<"/[vendor]/[drop]/p/[productId]">): Promise<Metadata> {
  const { vendor, drop, productId } = await params;
  const data = await getPublicDrop(vendor, drop);
  const product = data?.products.find((item) => item.id === productId);

  return product
    ? { title: `${product.name} — ${data!.vendor.businessName}` }
    : {};
}

export default async function ProductPage({
  params,
}: PageProps<"/[vendor]/[drop]/p/[productId]">) {
  const { vendor: vendorSlug, drop: dropSlug, productId } = await params;

  const data = await getPublicDrop(vendorSlug, dropSlug);
  if (!data) notFound();

  const product = data.products.find((item) => item.id === productId);
  if (!product) notFound();

  const base = dropPath(vendorSlug, dropSlug);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-canvas/95 px-5 py-3 backdrop-blur">
        <Link
          href={base}
          className="inline-flex items-center gap-1 text-sm text-ink-muted"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Back to {data.drop.title}
        </Link>
      </header>

      <ProductDetail
        product={product}
        batch={data.openBatch}
        checkoutHref={`${base}/checkout`}
        shopHref={base}
      />
    </div>
  );
}
