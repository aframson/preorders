import { describe, expect, it } from "vitest";

import { allocateByWeight, cedisToPesewas, formatGhs, percentOf } from "./money";

describe("formatGhs", () => {
  it("always shows two decimal places", () => {
    expect(formatGhs(48000)).toBe("GHS 480.00");
    expect(formatGhs(6200)).toBe("GHS 62.00");
    expect(formatGhs(5)).toBe("GHS 0.05");
    expect(formatGhs(0)).toBe("GHS 0.00");
  });

  it("groups thousands", () => {
    expect(formatGhs(1234567)).toBe("GHS 12,345.67");
  });
});

describe("cedisToPesewas", () => {
  it("survives the classic floating point cases", () => {
    expect(cedisToPesewas(0.1 + 0.2)).toBe(30);
    expect(cedisToPesewas(19.99)).toBe(1999);
  });
});

describe("allocateByWeight", () => {
  it("splits evenly when weights are equal", () => {
    expect(allocateByWeight(30000, [1, 1, 1])).toEqual([10000, 10000, 10000]);
  });

  it("splits in proportion to weight", () => {
    expect(allocateByWeight(10000, [3, 1])).toEqual([7500, 2500]);
  });

  it("never loses a pesewa to rounding", () => {
    // 100 pesewas across 3 orders cannot divide evenly. Flooring each share
    // would hand out 99 and leave the vendor a pesewa short.
    const shares = allocateByWeight(100, [1, 1, 1]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(100);
    expect(shares).toEqual([34, 33, 33]);
  });

  it("keeps the total exact across many awkward splits", () => {
    for (let total = 1; total <= 400; total++) {
      for (let parts = 1; parts <= 9; parts++) {
        const weights = Array.from({ length: parts }, (_, i) => i + 1);
        const shares = allocateByWeight(total, weights);
        expect(shares.reduce((a, b) => a + b, 0)).toBe(total);
        expect(shares.every((share) => share >= 0)).toBe(true);
      }
    }
  });

  it("is deterministic, so recomputing a batch is stable", () => {
    const weights = [900, 400, 1250, 75, 3000];
    const first = allocateByWeight(58_733, weights);
    const second = allocateByWeight(58_733, weights);
    expect(first).toEqual(second);
  });

  it("gives leftover pesewas to the largest remainders", () => {
    // Exact shares are 33.33, 33.33, 33.33 -> the extra pesewa goes to the
    // first index once remainders tie.
    expect(allocateByWeight(100, [2, 1, 1])).toEqual([50, 25, 25]);
    expect(allocateByWeight(101, [2, 1, 1])).toEqual([51, 25, 25]);
  });

  it("falls back to an even split when nothing has been measured", () => {
    const shares = allocateByWeight(1000, [0, 0, 0]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it("handles a single order taking the whole bill", () => {
    expect(allocateByWeight(58_733, [1200])).toEqual([58_733]);
  });

  it("returns zeros for a free batch", () => {
    expect(allocateByWeight(0, [5, 3])).toEqual([0, 0]);
  });

  it("ignores negative weights rather than inverting a share", () => {
    const shares = allocateByWeight(1000, [1, -5, 1]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(shares[1]).toBe(0);
  });
});

describe("percentOf", () => {
  it("rounds to the nearest pesewa", () => {
    expect(percentOf(48000, 2)).toBe(960);
    expect(percentOf(333, 2)).toBe(7);
  });
});
