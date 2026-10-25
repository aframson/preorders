import { toCsv } from "./csv";
import { allocateFreight, freightUnits, type FreightMode } from "./freight";
import type { Pesewas } from "./money";

export type SettlementItem = {
  id: string;
  productId: string | null;
  qty: number;
  weightGrams: number;
  volumeCm3: number;
  snapshot: {
    productName?: string;
    variantLabel?: string;
    variantName?: string;
    variantValue?: string;
  };
};

export type SettlementOrder = {
  id: string;
  code: string;
  status: string;
  freightUnits: number;
  freightEstimate: Pesewas;
  customer: { name: string };
  items: SettlementItem[];
};

export type SettlementBatch = {
  number: number;
  dropTitle: string;
  freightMode: FreightMode;
  freightFinalisedAt: string | null;
  orders: SettlementOrder[];
};

export type FreightPreviewRow = {
  orderId: string;
  code: string;
  customerName: string;
  /** e.g. "2x Sneakers (Size 42), 1x Cap" — so a vendor billing by hand can see what they're pricing. */
  itemsSummary: string;
  units: number;
  estimate: Pesewas;
  amount: Pesewas;
};

export type FreightPreview = {
  batch: SettlementBatch;
  shipping: SettlementOrder[];
  unitsTotal: number;
  charge: Pesewas;
  cost: Pesewas | null;
  margin: Pesewas | null;
  rows: FreightPreviewRow[];
  alreadyFinalised: boolean;
};

/**
 * Same rule as `shippingOrders` in the batch query: unpaid holds and
 * cancellations never carry a freight share and never inflate the buy-list.
 */
function shipping(batch: SettlementBatch): SettlementOrder[] {
  return batch.orders.filter(
    (order) => order.status !== "pending_payment" && order.status !== "cancelled",
  );
}

function unitsFor(batch: SettlementBatch, order: SettlementOrder): number {
  return (
    order.freightUnits ||
    freightUnits(
      batch.freightMode,
      order.items.map((item) => ({
        qty: item.qty,
        weightGrams: item.weightGrams,
        volumeCm3: item.volumeCm3,
      })),
    )
  );
}

/** "2x Sneakers (Size 42), 1x Cap" — lets a vendor pricing an order by hand see what's in it. */
function itemsSummary(order: SettlementOrder): string {
  return order.items
    .map((item) => {
      const name = item.snapshot.productName ?? "Item";
      const variant =
        item.snapshot.variantLabel ??
        (item.snapshot.variantName && item.snapshot.variantValue
          ? `${item.snapshot.variantName} ${item.snapshot.variantValue}`
          : null);
      return `${item.qty}x ${variant ? `${name} (${variant})` : name}`;
    })
    .join(", ");
}

/**
 * What each customer would pay if the vendor charged `charge` for this batch.
 * Pure: nothing is written until `finaliseFreight` runs.
 */
export function previewFreight(
  batch: SettlementBatch,
  charge: Pesewas,
  cost: Pesewas | null = null,
): FreightPreview {
  const included = shipping(batch);
  const withUnits = included.map((order) => ({
    order,
    units: unitsFor(batch, order),
  }));
  const unitsTotal = withUnits.reduce((sum, row) => sum + row.units, 0);
  const allocation = allocateFreight(
    charge,
    withUnits.map((row) => ({ id: row.order.id, units: row.units })),
  );
  const byId = new Map(allocation.map((row) => [row.orderId, row]));

  return {
    batch,
    shipping: included,
    unitsTotal,
    charge,
    cost,
    margin: cost === null ? null : charge - cost,
    alreadyFinalised: Boolean(batch.freightFinalisedAt),
    rows: withUnits.map(({ order, units }) => ({
      orderId: order.id,
      code: order.code,
      customerName: order.customer.name,
      itemsSummary: itemsSummary(order),
      units,
      estimate: order.freightEstimate,
      amount: byId.get(order.id)?.amount ?? 0,
    })),
  };
}

/**
 * The hand-priced alternative to `previewFreight`: the vendor sets each
 * shipping order's amount directly instead of splitting one total by weight
 * or volume. Some forwarders bill per item or per shipment rather than
 * strictly by weight, and no proportional formula matches that — this is
 * for when the vendor already knows what each customer owes.
 *
 * Any order not named in `amounts` is treated as owing nothing, same as
 * typing "0" — there is no implicit default, so a row silently missing from
 * the submitted form can never end up under-charged by accident.
 */
export function previewIndividualFreight(
  batch: SettlementBatch,
  amounts: Readonly<Record<string, Pesewas>>,
  cost: Pesewas | null = null,
): FreightPreview {
  const included = shipping(batch);

  const rows: FreightPreviewRow[] = included.map((order) => {
    const requested = amounts[order.id] ?? 0;
    const amount = Number.isFinite(requested) ? Math.max(0, Math.round(requested)) : 0;
    return {
      orderId: order.id,
      code: order.code,
      customerName: order.customer.name,
      itemsSummary: itemsSummary(order),
      units: unitsFor(batch, order),
      estimate: order.freightEstimate,
      amount,
    };
  });

  const charge = rows.reduce((sum, row) => sum + row.amount, 0);
  const unitsTotal = rows.reduce((sum, row) => sum + row.units, 0);

  return {
    batch,
    shipping: included,
    unitsTotal,
    charge,
    cost,
    margin: cost === null ? null : charge - cost,
    alreadyFinalised: Boolean(batch.freightFinalisedAt),
    rows,
  };
}

/**
 * Whether an order has nothing left to pay on shipping: a real payment, a
 * zero share that was waived (status moves without `freightPaidAt`), or goods
 * already collected.
 */
export function isFreightSettled(order: {
  status: string;
  freightPaidAt: string | null;
}): boolean {
  return (
    Boolean(order.freightPaidAt) ||
    order.status === "freight_paid" ||
    order.status === "collected"
  );
}

export class SettlementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettlementError";
  }
}

/**
 * Aggregated buy-list for the supplier. Paid orders only: an unpaid hold
 * must never inflate what the vendor buys.
 */
export type ManifestLine = {
  productId: string;
  name: string;
  variantLabel: string | null;
  qty: number;
  weightGrams: number;
  volumeCm3: number;
};

export function buildManifest(batch: SettlementBatch): ManifestLine[] {
  const lines = new Map<string, ManifestLine>();

  for (const order of shipping(batch)) {
    for (const item of order.items) {
      const variantLabel =
        item.snapshot.variantLabel ??
        (item.snapshot.variantName && item.snapshot.variantValue
          ? `${item.snapshot.variantName} ${item.snapshot.variantValue}`
          : null);
      const key = `${item.productId ?? item.id}:${variantLabel ?? ""}`;
      const existing = lines.get(key);

      if (existing) {
        existing.qty += item.qty;
        existing.weightGrams += item.weightGrams * item.qty;
        existing.volumeCm3 += item.volumeCm3 * item.qty;
      } else {
        lines.set(key, {
          productId: item.productId ?? item.id,
          name: item.snapshot.productName ?? "Item",
          variantLabel,
          qty: item.qty,
          weightGrams: item.weightGrams * item.qty,
          volumeCm3: item.volumeCm3 * item.qty,
        });
      }
    }
  }

  return [...lines.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Plain text a vendor can paste straight into WeChat. */
export function manifestAsText(
  batch: SettlementBatch,
  lines: ManifestLine[],
): string {
  const header = `Batch ${batch.number} — ${batch.dropTitle}`;
  const body = lines
    .map((line) => {
      const variant = line.variantLabel ? ` (${line.variantLabel})` : "";
      return `${line.qty}x ${line.name}${variant}`;
    })
    .join("\n");

  return `${header}\n${body}`;
}

export function manifestAsCsv(lines: ManifestLine[]): string {
  return toCsv([
    ["qty", "name", "variant", "weight_grams", "volume_cm3"],
    ...lines.map((line) => [
      line.qty,
      line.name,
      line.variantLabel ?? "",
      line.weightGrams,
      line.volumeCm3,
    ]),
  ]);
}
