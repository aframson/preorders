/**
 * Helpers for multi-group product options (Size + Colour, etc.).
 *
 * A product's variants are flat rows of (name, value). A "group" is every row
 * that shares a name. Customers pick one value from each group; the cart and
 * order store the chosen variant ids as a set.
 */

export type VariantOption = {
  id: string;
  name: string;
  value: string;
  priceDelta: number;
  weightGrams: number | null;
  volumeCm3: number | null;
  stockLimit: number | null;
  imagePath?: string | null;
};

export type VariantGroup = {
  name: string;
  options: VariantOption[];
};

export type CombinationStock = {
  /** Sorted variant ids — one per group. */
  variantIds: string[];
  stockLimit: number;
};

/** Stable key for a set of chosen variant ids, independent of pick order. */
export function combinationKey(variantIds: readonly string[]): string {
  return [...variantIds].sort().join(",");
}

export function groupVariants(variants: readonly VariantOption[]): VariantGroup[] {
  const groups = new Map<string, VariantOption[]>();

  for (const variant of variants) {
    const existing = groups.get(variant.name);
    if (existing) existing.push(variant);
    else groups.set(variant.name, [variant]);
  }

  return [...groups.entries()].map(([name, options]) => ({ name, options }));
}

/**
 * Human-readable label for a selection, e.g. "Size 39 · Colour Black".
 * Group order follows the catalogue so the same pick always reads the same.
 */
export function formatVariantLabel(
  variants: readonly Pick<VariantOption, "name" | "value">[],
): string | null {
  if (variants.length === 0) return null;
  return variants.map((variant) => `${variant.name} ${variant.value}`).join(" · ");
}

/**
 * Effective stock for a full selection. Combination caps win when present;
 * otherwise the tightest per-option cap applies, then the product's own.
 */
export function resolveStockLimit(params: {
  productStock: number | null;
  selected: readonly Pick<VariantOption, "id" | "stockLimit">[];
  combinations: readonly CombinationStock[];
}): number | null {
  const { productStock, selected, combinations } = params;

  if (selected.length >= 2) {
    const key = combinationKey(selected.map((option) => option.id));
    const match = combinations.find(
      (row) => combinationKey(row.variantIds) === key,
    );
    if (match) return match.stockLimit;
  }

  let limit: number | null = productStock;
  for (const option of selected) {
    if (option.stockLimit === null) continue;
    limit = limit === null ? option.stockLimit : Math.min(limit, option.stockLimit);
  }
  return limit;
}

export function sumPriceDelta(
  selected: readonly Pick<VariantOption, "priceDelta">[],
): number {
  return selected.reduce((sum, option) => sum + option.priceDelta, 0);
}

/**
 * Weight / volume for a line. Variant overrides win when set; otherwise the
 * product's measurement is used. Taking the first non-null across the
 * selection keeps a "Size 42 is heavier" override without forcing every colour
 * to restate the same weight.
 */
export function resolveMeasurement(
  product: { weightGrams: number | null; volumeCm3: number | null },
  selected: readonly Pick<VariantOption, "weightGrams" | "volumeCm3">[],
): { weightGrams: number; volumeCm3: number } {
  const weight =
    selected.find((option) => option.weightGrams !== null)?.weightGrams ??
    product.weightGrams ??
    0;
  const volume =
    selected.find((option) => option.volumeCm3 !== null)?.volumeCm3 ??
    product.volumeCm3 ??
    0;
  return { weightGrams: weight, volumeCm3: volume };
}
