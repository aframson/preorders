"use client";

import { AlertTriangle, PackagePlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AvailabilityTag } from "@/components/product-availability-tag";
import { ListSearch } from "@/components/ui/list-search";
import { FREIGHT_MODES, type FreightMode } from "@/lib/freight";
import { formatGhsCompact } from "@/lib/money";
import type { ProductAvailability } from "@/lib/product-availability";
import { matchesQuery } from "@/lib/search";
import { BUCKETS, publicUrl } from "@/lib/storage";

export type DashboardProductCard = {
  id: string;
  name: string;
  price: number;
  published: boolean;
  weightGrams: number | null;
  volumeCm3: number | null;
  availability: ProductAvailability;
  coverPath: string | null;
};

export function SearchableProductGrid({
  dropId,
  mode,
  products,
}: {
  dropId: string;
  mode: FreightMode;
  products: DashboardProductCard[];
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => products.filter((product) => matchesQuery(product.name, query)),
    [products, query],
  );

  return (
    <div className="space-y-4">
      <ListSearch
        value={query}
        onChange={setQuery}
        placeholder="Search products…"
        label="Search products"
      />

      {filtered.length === 0 ? (
        <p className="rounded-card border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted">
          {query.trim() ? "No products match that search." : "No products yet."}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => {
            const measurement =
              mode === "air_kg" ? product.weightGrams : product.volumeCm3;
            const measurementLabel =
              measurement === null
                ? null
                : mode === "air_kg"
                  ? `${(measurement / 1000).toFixed(2)} kg`
                  : `${(measurement / 1_000_000).toFixed(3)} ${FREIGHT_MODES.sea_cbm.unitLabel}`;

            return (
              <li key={product.id}>
                <Link
                  href={`/dashboard/drops/${dropId}/products/${product.id}`}
                  className="group block"
                >
                  <div className="relative aspect-4/5 overflow-hidden rounded-card border border-border bg-surface-muted">
                    {product.coverPath ? (
                      <Image
                        src={publicUrl(BUCKETS.productImages, product.coverPath)}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                        className="object-cover transition-opacity group-hover:opacity-90"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-ink-subtle">
                        <PackagePlus className="size-6" aria-hidden />
                      </div>
                    )}

                    <AvailabilityTag availability={product.availability} />

                    {measurementLabel === null && (
                      <span className="absolute top-9 left-2 flex items-center gap-1 rounded-full bg-closing px-2 py-0.5 text-[10px] font-medium text-white">
                        <AlertTriangle className="size-3" aria-hidden />
                        No {mode === "air_kg" ? "weight" : "volume"}
                      </span>
                    )}

                    {!product.published && (
                      <span className="absolute top-2 right-2 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-medium text-white">
                        Hidden
                      </span>
                    )}
                  </div>

                  <p className="mt-2 truncate text-sm font-medium text-ink">
                    {product.name}
                  </p>
                  <p className="text-sm text-ink-muted" data-numeric>
                    {formatGhsCompact(product.price)}
                    {measurementLabel && (
                      <span className="text-ink-subtle">
                        {" "}
                        &middot; {measurementLabel}
                      </span>
                    )}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
