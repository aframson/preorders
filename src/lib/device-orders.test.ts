import { describe, expect, it } from "vitest";

import {
  parseDeviceOrderTokens,
  rememberDeviceOrderToken,
  serializeDeviceOrderTokens,
} from "./device-orders";

const A = "wNM6iGWQDGVOAnN0lzwUVAI";
const B = "19-4twwXzzDF0RXUgHVXM2U";

describe("device order tokens", () => {
  it("round-trips through the cookie value", () => {
    expect(parseDeviceOrderTokens(serializeDeviceOrderTokens([A, B]))).toEqual([A, B]);
  });

  it("puts the newest order first and never duplicates", () => {
    expect(rememberDeviceOrderToken([A, B], B)).toEqual([B, A]);
  });

  it("drops anything that isn't a token shape", () => {
    expect(parseDeviceOrderTokens(`${A}.<script>.${B}.`)).toEqual([A, B]);
    expect(rememberDeviceOrderToken([A], "not a token!")).toEqual([A]);
    expect(parseDeviceOrderTokens(undefined)).toEqual([]);
  });

  it("caps how many it keeps", () => {
    let tokens: string[] = [];
    for (let i = 0; i < 40; i += 1) {
      tokens = rememberDeviceOrderToken(tokens, `token${String(i).padStart(10, "0")}`);
    }
    expect(tokens).toHaveLength(30);
    expect(tokens[0]).toBe("token0000000039");
  });
});
