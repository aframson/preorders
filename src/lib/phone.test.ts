import { describe, expect, it } from "vitest";

import {
  formatLocalPhone,
  guessMomoNetwork,
  isPlausibleGhanaPhone,
  normaliseMomoAccountNumber,
  normalisePhone,
  sanitisePhoneInput,
} from "./phone";

describe("sanitisePhoneInput", () => {
  it("strips invisible characters pasted from WhatsApp", () => {
    // U+202C POP DIRECTIONAL FORMATTING often trails copied Ghana numbers.
    expect(sanitisePhoneInput("054 038 9039\u202C")).toBe("054 038 9039");
    expect(sanitisePhoneInput("054\u00A0038\u00A09039")).toBe("054 038 9039");
  });
});

describe("isPlausibleGhanaPhone", () => {
  it("accepts common Ghana mobile shapes including paste junk", () => {
    expect(isPlausibleGhanaPhone("054 038 9039")).toBe(true);
    expect(isPlausibleGhanaPhone("054 038 9039\u202C")).toBe(true);
    expect(isPlausibleGhanaPhone("+233540389039")).toBe(true);
    expect(isPlausibleGhanaPhone("not a phone")).toBe(false);
  });
});

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
