import { describe, expect, it } from "vitest";

import {
  buildManifest,
  manifestAsCsv,
  manifestAsText,
  previewFreight,
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
