import { allocateByWeight, type Pesewas } from "./money";

/**
 * Air freight bills by weight, sea freight bills by volume. The vendor picks
 * one per batch because it mirrors how their forwarder invoices them.
 */
export type FreightMode = "air_kg" | "sea_cbm";

export const FREIGHT_MODES: Record<
  FreightMode,
  { label: string; blurb: string; unitLabel: string; rateLabel: string }
> = {
  air_kg: {
    label: "Air",
    blurb: "Faster, costs more. Usually 7 to 14 days.",
    unitLabel: "kg",
    rateLabel: "per kg",
  },
  sea_cbm: {
    label: "Sea",
    blurb: "Cheaper, slower. Usually 30 to 60 days.",
    unitLabel: "CBM",
    rateLabel: "per CBM",
  },
};

const GRAMS_PER_KG = 1_000;
const CM3_PER_CBM = 1_000_000;

export type FreightableItem = {
  qty: number;
  weightGrams: number;
  volumeCm3: number;
};

/**
 * Raw freight units for a set of items: grams for air, cubic centimetres for
 * sea. Kept as integers in the smallest unit so that repeated summing never
 * accumulates floating point drift; conversion to kg or CBM happens only at
 * the point of display or pricing.
 */
export function freightUnits(
  mode: FreightMode,
  items: readonly FreightableItem[],
): number {
  return items.reduce((sum, item) => {
    const per = mode === "air_kg" ? item.weightGrams : item.volumeCm3;
    return sum + item.qty * Math.max(0, per);
  }, 0);
}

/** Convert raw units into the billable unit the vendor quotes in. */
export function toBillableUnits(mode: FreightMode, units: number): number {
  return units / (mode === "air_kg" ? GRAMS_PER_KG : CM3_PER_CBM);
}

/**
 * Precision scales with magnitude. A single product is often a few thousandths
 * of a CBM, so a fixed two decimals would render most of a sea catalogue as
 * "0.01 CBM" or "0.00 CBM" and tell the vendor nothing.
 */
export function formatBillableUnits(mode: FreightMode, units: number): string {
  const billable = toBillableUnits(mode, units);
  const label = FREIGHT_MODES[mode].unitLabel;

  const decimals =
    billable >= 100 ? 0 : billable >= 10 ? 1 : billable >= 1 ? 2 : 3;

  return `${billable.toFixed(decimals)} ${label}`;
}

/**
 * What we show the customer at checkout, before the real freight bill exists.
 * `ratePerUnit` is pesewas per kg or per CBM, set by the vendor per batch.
 */
export function estimateFreight(
  mode: FreightMode,
  units: number,
  ratePerUnit: Pesewas,
): Pesewas {
  return Math.round(toBillableUnits(mode, units) * ratePerUnit);
}

export type FreightAllocation = {
  orderId: string;
  units: number;
  amount: Pesewas;
};

/**
 * Apportion a batch's actual freight bill across the orders that are really
 * shipping. Callers must exclude cancelled, unpaid and expired orders before
 * calling: anything passed in here is treated as being on the boat.
 *
 * Always recompute the whole batch rather than patching individual orders,
 * otherwise a correction to the freight total leaves the allocation no longer
 * summing to what the vendor owes.
 */
export function allocateFreight(
  freightTotal: Pesewas,
  orders: readonly { id: string; units: number }[],
): FreightAllocation[] {
  const amounts = allocateByWeight(
    freightTotal,
    orders.map((order) => order.units),
  );

  return orders.map((order, index) => ({
    orderId: order.id,
    units: order.units,
    amount: amounts[index],
  }));
}
