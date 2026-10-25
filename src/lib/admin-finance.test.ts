import { describe, expect, it } from "vitest";

import { summariseFinance, type FinancePayment } from "./admin-finance";

function payment(partial: Partial<FinancePayment>): FinancePayment {
  return {
    amount: 10_000,
    type: "goods",
    status: "success",
    vendorId: "v1",
    vendorName: "Ama",
    paystackFees: 195,
    ...partial,
  };
}

describe("summariseFinance", () => {
  it("takes 2% of goods and nothing from shipping", () => {
    const { totals } = summariseFinance([
      payment({ amount: 10_000, type: "goods" }),
      payment({ amount: 5_000, type: "freight", paystackFees: 98 }),
    ]);

    expect(totals.goodsCollected).toBe(10_000);
    expect(totals.freightCollected).toBe(5_000);
    expect(totals.platformFee).toBe(200);
    expect(totals.vendorPayout).toBe(14_800);
  });

  it("nets Paystack's fees out of the platform's share, since the platform bears them", () => {
    const { totals } = summariseFinance([
      payment({ amount: 10_000, type: "goods", paystackFees: 195 }),
      payment({ amount: 5_000, type: "freight", paystackFees: 98 }),
    ]);

    expect(totals.paystackFees).toBe(293);
    expect(totals.netToPlatform).toBe(200 - 293);
  });

  it("only counts successful payments as collected", () => {
    const { totals } = summariseFinance([
      payment({ status: "pending" }),
      payment({ status: "failed" }),
      payment({ status: "abandoned" }),
    ]);

    expect(totals.goodsCollected).toBe(0);
    expect(totals.successCount).toBe(0);
  });

  it("reports refunds separately instead of netting them", () => {
    const { totals } = summariseFinance([
      payment({ amount: 10_000 }),
      payment({ amount: 4_000, status: "refunded" }),
    ]);

    expect(totals.goodsCollected).toBe(10_000);
    expect(totals.refunded).toBe(4_000);
  });

  it("flags payments whose Paystack fee wasn't recorded", () => {
    const { totals } = summariseFinance([
      payment({ paystackFees: null }),
      payment({ paystackFees: 195 }),
    ]);

    expect(totals.unknownFeeCount).toBe(1);
    expect(totals.paystackFees).toBe(195);
  });

  it("splits per vendor and includes vendors who only have shipping outstanding", () => {
    const { vendors } = summariseFinance(
      [
        payment({ vendorId: "v1", vendorName: "Ama", amount: 20_000 }),
        payment({ vendorId: "v2", vendorName: "Kofi", amount: 5_000 }),
      ],
      [{ vendorId: "v3", vendorName: "Yaa", amount: 3_000 }],
    );

    expect(vendors.map((row) => row.vendorId)).toEqual(["v1", "v2", "v3"]);
    expect(vendors[2].freightOutstanding).toBe(3_000);
    expect(vendors[2].goodsCollected).toBe(0);
  });
});
