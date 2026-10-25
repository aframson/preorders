import { describe, expect, it } from "vitest";

import { summarisePaystackRaw } from "./paystack-raw";

describe("summarisePaystackRaw", () => {
  it("reads a webhook event, where the transaction sits under `data`", () => {
    expect(
      summarisePaystackRaw({
        event: "charge.success",
        data: { fees: 195, channel: "mobile_money", gateway_response: "Approved" },
      }),
    ).toEqual({ fees: 195, channel: "mobile_money", gatewayResponse: "Approved" });
  });

  it("reads a bare verify response", () => {
    expect(
      summarisePaystackRaw({ fees: 98, channel: "card", gateway_response: "Successful" }),
    ).toEqual({ fees: 98, channel: "card", gatewayResponse: "Successful" });
  });

  it("returns nulls for anything missing or malformed", () => {
    expect(summarisePaystackRaw(null)).toEqual({
      fees: null,
      channel: null,
      gatewayResponse: null,
    });
    expect(summarisePaystackRaw({ data: { fees: "195" } }).fees).toBeNull();
  });
});
