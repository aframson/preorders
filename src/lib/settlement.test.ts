import { describe, expect, it } from "vitest";

import {
  buildManifest,
  manifestAsCsv,
  manifestAsText,
  previewFreight,
  previewIndividualFreight,
  type SettlementBatch,
  type SettlementOrder,
} from "./settlement";

function order(
  partial: Partial<SettlementOrder> & { id: string; code: string },
): SettlementOrder {
  return {
    status: "paid",
    freightUnits: 1000,
    freightEstimate: 4500,
    customer: { name: "Ama" },
    items: [
      {
        id: "i1",
        productId: "p1",
        qty: 1,
        weightGrams: 1000,
        volumeCm3: 4000,
        snapshot: { productName: "Sneakers" },
      },
    ],
    ...partial,
  };
}

const batch: SettlementBatch = {
  number: 3,
  dropTitle: "Winter shoes",
  freightMode: "air_kg",
  freightFinalisedAt: null,
  orders: [
    order({
      id: "o1",
      code: "AKO-B3-0001",
      freightUnits: 2000,
      customer: { name: "Ama" },
    }),
    order({
      id: "o2",
      code: "AKO-B3-0002",
      freightUnits: 1000,
      customer: { name: "Kofi" },
    }),
    order({
      id: "o3",
      code: "AKO-B3-0003",
      status: "pending_payment",
      freightUnits: 9000,
    }),
  ],
};

describe("previewFreight", () => {
  it("ignores unpaid holds so they never carry a share", () => {
    const preview = previewFreight(batch, 30_000);
    expect(preview.rows).toHaveLength(2);
    expect(preview.rows.map((row) => row.orderId)).toEqual(["o1", "o2"]);
    expect(preview.rows.reduce((sum, row) => sum + row.amount, 0)).toBe(30_000);
  });

  it("charges the heavier order more", () => {
    const preview = previewFreight(batch, 30_000);
    const ama = preview.rows.find((row) => row.orderId === "o1");
    const kofi = preview.rows.find((row) => row.orderId === "o2");
    expect(ama?.amount).toBe(20_000);
    expect(kofi?.amount).toBe(10_000);
  });

  it("gives a zero-weight order a zero share rather than NaN", () => {
    const zeroWeightBatch: SettlementBatch = {
      ...batch,
      orders: [
        order({ id: "o1", code: "AKO-B3-0001", freightUnits: 2000 }),
        order({
          id: "o4",
          code: "AKO-B3-0004",
          freightUnits: 0,
          // A real zero-weight order has a matching item snapshot — the
          // checkout flow computes both from the same measurement. Only
          // `freightUnits` itself is falsy-zero; the item weight must be
          // too, or `unitsFor`'s `||` fallback would recompute a non-zero
          // total from it instead of trusting the stored zero.
          items: [
            {
              id: "i4",
              productId: "p4",
              qty: 1,
              weightGrams: 0,
              volumeCm3: 0,
              snapshot: { productName: "Sticker" },
            },
          ],
        }),
      ],
    };
    const preview = previewFreight(zeroWeightBatch, 10_000);
    const zeroShare = preview.rows.find((row) => row.orderId === "o4");
    expect(zeroShare?.amount).toBe(0);
    expect(preview.rows.reduce((sum, row) => sum + row.amount, 0)).toBe(10_000);
  });

  it("gives the sole shipping order the full charge", () => {
    const singleOrderBatch: SettlementBatch = {
      ...batch,
      orders: [order({ id: "o1", code: "AKO-B3-0001", freightUnits: 500 })],
    };
    const preview = previewFreight(singleOrderBatch, 7_500);
    expect(preview.rows).toHaveLength(1);
    expect(preview.rows[0].amount).toBe(7_500);
  });
});

describe("previewIndividualFreight", () => {
  it("charges each customer exactly what the vendor typed, ignoring weight", () => {
    const preview = previewIndividualFreight(batch, { o1: 5_000, o2: 12_000 });
    const ama = preview.rows.find((row) => row.orderId === "o1");
    const kofi = preview.rows.find((row) => row.orderId === "o2");
    expect(ama?.amount).toBe(5_000);
    expect(kofi?.amount).toBe(12_000);
    expect(preview.charge).toBe(17_000);
  });

  it("treats an order missing from amounts as owing nothing, not an error", () => {
    const preview = previewIndividualFreight(batch, { o1: 5_000 });
    const kofi = preview.rows.find((row) => row.orderId === "o2");
    expect(kofi?.amount).toBe(0);
  });

  it("never goes negative even if a bad value is passed in", () => {
    const preview = previewIndividualFreight(batch, { o1: -500, o2: Number.NaN });
    expect(preview.rows.find((row) => row.orderId === "o1")?.amount).toBe(0);
    expect(preview.rows.find((row) => row.orderId === "o2")?.amount).toBe(0);
  });

  it("still excludes unpaid holds", () => {
    const preview = previewIndividualFreight(batch, { o1: 1_000, o2: 1_000, o3: 1_000 });
    expect(preview.rows.map((row) => row.orderId)).toEqual(["o1", "o2"]);
  });

  it("includes a human-readable item summary per row", () => {
    const preview = previewIndividualFreight(batch, { o1: 1_000, o2: 1_000 });
    expect(preview.rows[0].itemsSummary).toBe("1x Sneakers");
  });
});

describe("buildManifest", () => {
  it("collapses paid orders and skips unpaid ones", () => {
    const lines = buildManifest(batch);
    expect(lines).toEqual([
      {
        productId: "p1",
        name: "Sneakers",
        variantLabel: null,
        qty: 2,
        weightGrams: 2000,
        volumeCm3: 8000,
      },
    ]);
  });

  it("renders a WeChat-ready block", () => {
    const text = manifestAsText(batch, buildManifest(batch));
    expect(text).toBe("Batch 3 — Winter shoes\n2x Sneakers");
  });

  it("escapes commas in CSV", () => {
    const csv = manifestAsCsv([
      {
        productId: "p",
        name: "Shirt, linen",
        variantLabel: "Size L",
        qty: 3,
        weightGrams: 600,
        volumeCm3: 1200,
      },
    ]);
    expect(csv).toContain('"Shirt, linen"');
  });
});
