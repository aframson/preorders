import { describe, expect, it } from "vitest";

import {
  extractMapsCoords,
  isGoogleMapsUrl,
  mapsEmbedSrc,
} from "./maps-link";

describe("isGoogleMapsUrl", () => {
  it("accepts common share hosts", () => {
    expect(
      isGoogleMapsUrl("https://maps.app.goo.gl/AbCdEf"),
    ).toBe(true);
    expect(
      isGoogleMapsUrl(
        "https://www.google.com/maps/place/Accra/@5.6037,-0.1870,12z",
      ),
    ).toBe(true);
    expect(isGoogleMapsUrl("https://example.com/maps")).toBe(false);
  });
});

describe("extractMapsCoords", () => {
  it("reads @lat,lng", () => {
    expect(
      extractMapsCoords(
        "https://www.google.com/maps/place/Foo/@5.6037,-0.1870,17z",
      ),
    ).toEqual({ lat: 5.6037, lng: -0.187 });
  });

  it("reads q=lat,lng", () => {
    expect(
      extractMapsCoords("https://maps.google.com/?q=5.55,-0.2"),
    ).toEqual({ lat: 5.55, lng: -0.2 });
  });
});

describe("mapsEmbedSrc", () => {
  it("builds an embed URL from coordinates", () => {
    const src = mapsEmbedSrc(
      "https://www.google.com/maps/@5.6,-0.2,16z",
    );
    expect(src).toContain("output=embed");
    expect(src).toContain("5.6,-0.2");
  });
});
