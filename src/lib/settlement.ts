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
      units,
      estimate: order.freightEstimate,
      amount: byId.get(order.id)?.amount ?? 0,
    })),
  };
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
  const header = "qty,name,variant,weight_grams,volume_cm3";
  const rows = lines.map((line) =>
    [
      line.qty,
      csvCell(line.name),
      csvCell(line.variantLabel ?? ""),
      line.weightGrams,
      line.volumeCm3,
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
