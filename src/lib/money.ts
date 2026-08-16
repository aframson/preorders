/**
 * All money in this codebase is an integer number of pesewas. Floats are never
 * used for currency, and no value crosses a boundary as a decimal string.
 */
export type Pesewas = number;

const decimal = new Intl.NumberFormat("en-GH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const whole = new Intl.NumberFormat("en-GH", {
  maximumFractionDigits: 0,
});

/** `48000` -> `"GHS 480.00"` */
export function formatGhs(pesewas: Pesewas): string {
  return `GHS ${decimal.format(pesewas / 100)}`;
}

/** `48000` -> `"GH\u20b5480"`. For dense surfaces like product cards. */
export function formatGhsCompact(pesewas: Pesewas): string {
  const cedis = pesewas / 100;
  return `GH\u20b5${Number.isInteger(cedis) ? whole.format(cedis) : decimal.format(cedis)}`;
}

export function cedisToPesewas(cedis: number): Pesewas {
  return Math.round(cedis * 100);
}

/**
 * Split `total` across recipients in proportion to `weights`, using the
 * largest-remainder method.
 *
 * Rounding each share independently loses pesewas, so the shares would not add
 * back up to the freight bill the vendor actually owes. Here every share is
 * floored first and the leftover pesewas are handed to the largest fractional
 * remainders, which guarantees `sum(result) === total` exactly.
 *
 * Ties break toward the lower index so the same inputs always produce the same
 * allocation, which matters because a batch's freight is recomputed from
 * scratch whenever the vendor corrects a figure.
 */
export function allocateByWeight(
  total: Pesewas,
  weights: readonly number[],
): Pesewas[] {
  if (weights.length === 0) return [];
  if (total <= 0) return weights.map(() => 0);

  const totalWeight = weights.reduce((sum, w) => sum + Math.max(0, w), 0);

  // Nothing to apportion against (every item weightless, or data missing).
  // An even split is the only defensible fallback.
  if (totalWeight <= 0) {
    const even = Math.floor(total / weights.length);
    const shares = weights.map(() => even);
    for (let i = 0; i < total - even * weights.length; i++) shares[i] += 1;
    return shares;
  }

  const exact = weights.map((w) => (total * Math.max(0, w)) / totalWeight);
  const shares = exact.map((value) => Math.floor(value));
  const distributed = shares.reduce((sum, value) => sum + value, 0);

  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  for (let i = 0; i < total - distributed; i++) {
    shares[order[i].index] += 1;
  }

  return shares;
}

/** Percentage of an amount, rounded to the nearest pesewa. */
export function percentOf(amount: Pesewas, percent: number): Pesewas {
  return Math.round((amount * percent) / 100);
}
