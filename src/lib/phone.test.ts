import { describe, expect, it } from "vitest";

import {
  formatLocalPhone,
  guessMomoNetwork,
  normaliseMomoAccountNumber,
  normalisePhone,
} from "./phone";

describe("normalisePhone", () => {
  it("collapses every way a Ghanaian number gets typed into one value", () => {
    const expected = "+233241234567";

    expect(normalisePhone("0241234567")).toBe(expected);
    expect(normalisePhone("024 123 4567")).toBe(expected);
    expect(normalisePhone("+233 24 123 4567")).toBe(expected);
    expect(normalisePhone("233241234567")).toBe(expected);
    expect(normalisePhone("241234567")).toBe(expected);
    expect(normalisePhone("(024) 123-4567")).toBe(expected);
  });

  it("leaves an international number alone", () => {
    expect(normalisePhone("+44 7700 900123")).toBe("+447700900123");
  });
});

describe("normaliseMomoAccountNumber", () => {
  it("returns a 10-digit local number for Paystack", () => {
    expect(normaliseMomoAccountNumber("055 123 4987")).toBe("0551234987");
    expect(normaliseMomoAccountNumber("+233551234987")).toBe("0551234987");
    expect(normaliseMomoAccountNumber("551234987")).toBe("0551234987");
  });
});

describe("guessMomoNetwork", () => {
  it("maps common Ghana prefixes", () => {
    expect(guessMomoNetwork("0551234987")).toBe("MTN");
    expect(guessMomoNetwork("024 123 4567")).toBe("MTN");
    expect(guessMomoNetwork("0201234567")).toBe("VOD");
    expect(guessMomoNetwork("0271234567")).toBe("ATL");
  });
});

describe("formatLocalPhone", () => {
  it("shows a Ghanaian number the way a Ghanaian reads it", () => {
    expect(formatLocalPhone("+233241234567")).toBe("024 123 4567");
  });

  it("leaves anything it does not recognise untouched", () => {
    expect(formatLocalPhone("+447700900123")).toBe("+447700900123");
  });
});
