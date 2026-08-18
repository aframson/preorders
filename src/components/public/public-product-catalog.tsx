"use client";

import { PackageOpen } from "lucide-react";
import { useMemo, useState } from "react";

import { ProductCard } from "@/components/public/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSearch } from "@/components/ui/list-search";
import type { FreightMode } from "@/lib/freight";
import type { PublicProduct } from "@/lib/queries/public-drop";
import { matchesQuery } from "@/lib/search";

export function PublicProductCatalog({
  products,
  base,
  freightMode,
  freightRateEstimate,
  categoryNames,
  emptyTitle,
  emptyDescription,
}: {
  products: PublicProduct[];
  base: string;
  freightMode: FreightMode;
  freightRateEstimate: number;
  /** Map categoryId → name for search. */
  categoryNames: Record<string, string>;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      products.filter((product) =>
        matchesQuery(
          [
            product.name,
            product.description,
            product.categoryId
              ? categoryNames[product.categoryId]
              : null,
          ],
          query,
        ),
      ),
    [products, query, categoryNames],
  );

  if (products.length === 0) {
    return (
      <div className="px-5 py-10">
        <EmptyState
          icon={PackageOpen}
          title={emptyTitle}
          description={emptyDescription}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 px-5 py-5">
      <ListSearch
        value={query}
        onChange={setQuery}
        placeholder="Search products…"
        label="Search products"
      />
      {filtered.length === 0 ? (
        <p className="rounded-card border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted">
          No products match that search.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3">
          {filtered.map((product) => (
            <li key={product.id}>
              <ProductCard
                product={product}
                href={`${base}/p/${product.id}`}
                freightMode={freightMode}
                freightRateEstimate={freightRateEstimate}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
