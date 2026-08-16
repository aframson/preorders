import { describe, expect, it } from "vitest";

import {
  allocateFreight,
  estimateFreight,
  formatBillableUnits,
  freightUnits,
  toBillableUnits,
} from "./freight";

const sneakers = { qty: 2, weightGrams: 900, volumeCm3: 12_000 };
const trousers = { qty: 1, weightGrams: 400, volumeCm3: 4_000 };

describe("freightUnits", () => {
  it("sums weight for air", () => {
    expect(freightUnits("air_kg", [sneakers, trousers])).toBe(2200);
  });

  it("sums volume for sea", () => {
    expect(freightUnits("sea_cbm", [sneakers, trousers])).toBe(28_000);
  });

  it("treats missing measurements as zero rather than throwing", () => {
    expect(
      freightUnits("air_kg", [{ qty: 3, weightGrams: 0, volumeCm3: 0 }]),
    ).toBe(0);
  });
});

describe("toBillableUnits", () => {
  it("converts grams to kilograms", () => {
    expect(toBillableUnits("air_kg", 2200)).toBeCloseTo(2.2);
  });

  it("converts cubic centimetres to CBM", () => {
    expect(toBillableUnits("sea_cbm", 28_000)).toBeCloseTo(0.028);
  });
});

describe("formatBillableUnits", () => {
  it("labels the unit the vendor's forwarder quotes in", () => {
    expect(formatBillableUnits("air_kg", 2200)).toBe("2.20 kg");
    expect(formatBillableUnits("sea_cbm", 28_000)).toBe("0.028 CBM");
  });

  it("keeps a single small item legible instead of rounding it to zero", () => {
    // One pair of sneakers: 9,000 cm3.
    expect(formatBillableUnits("sea_cbm", 9_000)).toBe("0.009 CBM");
  });

  it("drops decimals once the number is large enough not to need them", () => {
    expect(formatBillableUnits("air_kg", 145_000)).toBe("145 kg");
    expect(formatBillableUnits("air_kg", 12_400)).toBe("12.4 kg");
  });
});

describe("estimateFreight", () => {
  it("prices air by the kilo", () => {
    // 2.2kg at GHS 45/kg
    expect(estimateFreight("air_kg", 2200, 4500)).toBe(9900);
  });

  it("prices sea by the cubic metre", () => {
    // 0.028 CBM at GHS 2,200/CBM
    expect(estimateFreight("sea_cbm", 28_000, 220_000)).toBe(6160);
  });
});

describe("allocateFreight", () => {
  it("charges a heavier order more than a lighter one", () => {
    const [heavy, light] = allocateFreight(30_000, [
      { id: "heavy", units: 3000 },
      { id: "light", units: 1000 },
    ]);

    expect(heavy.amount).toBe(22_500);
    expect(light.amount).toBe(7500);
  });

  it("always adds back up to the bill the vendor actually owes", () => {
    const orders = [
      { id: "a", units: 900 },
      { id: "b", units: 1250 },
      { id: "c", units: 75 },
      { id: "d", units: 3000 },
      { id: "e", units: 412 },
      { id: "f", units: 1 },
    ];

    for (const total of [58_733, 1, 99_999, 250_001, 7]) {
      const allocation = allocateFreight(total, orders);
      const sum = allocation.reduce((acc, row) => acc + row.amount, 0);
      expect(sum).toBe(total);
    }
  });

  it("preserves order identity and units", () => {
    const allocation = allocateFreight(10_000, [
      { id: "order-1", units: 500 },
      { id: "order-2", units: 500 },
    ]);

    expect(allocation.map((row) => row.orderId)).toEqual([
      "order-1",
      "order-2",
    ]);
    expect(allocation.map((row) => row.units)).toEqual([500, 500]);
  });

  it("is stable when a batch is recomputed after a correction", () => {
    const orders = [
      { id: "a", units: 900 },
      { id: "b", units: 1250 },
      { id: "c", units: 75 },
    ];

    expect(allocateFreight(41_337, orders)).toEqual(
      allocateFreight(41_337, orders),
    );
  });

  it("handles an empty batch", () => {
    expect(allocateFreight(10_000, [])).toEqual([]);
  });
});
