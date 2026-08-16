import { ImageOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { estimateFreight, freightUnits, type FreightMode } from "@/lib/freight";
import { formatGhsCompact } from "@/lib/money";
import type { PublicProduct } from "@/lib/queries/public-drop";
import { BUCKETS, publicUrl } from "@/lib/storage";

function isSoldOut(product: PublicProduct): boolean {
  if (product.variants.length > 0) {
    return product.variants.every((variant) => variant.stockLimit === 0);
  }
  return product.stockLimit === 0;
}

export function ProductCard({
  product,
  href,
  freightMode,
  freightRateEstimate,
}: {
  product: PublicProduct;
  href: string;
  freightMode: FreightMode;
  /** Pesewas per kg or per CBM, from the open batch. */
  freightRateEstimate: number;
}) {
  const cover = product.images[0];
  const soldOut = isSoldOut(product);

  // A customer cannot reason about "0.009 CBM", but they can reason about
  // "+GHS 25 shipping". Cubic metres are the vendor's unit, not theirs.
  const shipping = estimateFreight(
    freightMode,
    freightUnits(freightMode, [
      {
        qty: 1,
        weightGrams: product.weightGrams ?? 0,
        volumeCm3: product.volumeCm3 ?? 0,
      },
    ]),
    freightRateEstimate,
  );

  return (
    <Link href={href} className="group block">
      <div className="relative aspect-4/5 overflow-hidden rounded-card border border-border bg-surface-muted">
        {cover ? (
          <>
            <Image
              src={publicUrl(BUCKETS.productImages, cover.path)}
              alt={product.name}
              fill
              sizes="(min-width: 640px) 33vw, 50vw"
              className="object-cover transition-opacity group-hover:opacity-90"
            />
            <span className="bg-grain-heavy pointer-events-none absolute inset-0 mix-blend-overlay opacity-60" />
          </>
        ) : (
          <div className="flex size-full items-center justify-center text-ink-subtle">
            <ImageOff className="size-6" aria-hidden />
          </div>
        )}
        {soldOut && (
          <span className="absolute inset-x-2 bottom-2 rounded-full bg-ink/80 px-2 py-1 text-center text-xs font-medium text-white">
            Sold out
          </span>
        )}
      </div>

      <p className="mt-2 line-clamp-2 text-sm font-medium text-ink">
        {product.name}
      </p>
      <p className="mt-0.5 text-sm text-ink" data-numeric>
        {formatGhsCompact(product.price)}
        {shipping > 0 && (
          <span className="text-ink-subtle">
            {" "}
            + {formatGhsCompact(shipping)} shipping
          </span>
        )}
      </p>
    </Link>
  );
}
