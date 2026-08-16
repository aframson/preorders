/**
 * Parse and validate Google Maps share links for delivery pins.
 *
 * Customers paste a Share → Copy link from Maps. We accept the common hosts
 * (including short maps.app.goo.gl links) and build an embeddable preview when
 * coordinates can be read from the URL.
 */

const MAPS_HOSTS = new Set([
  "maps.google.com",
  "google.com",
  "goo.gl",
  "maps.app.goo.gl",
]);

export type MapsCoords = { lat: number; lng: number };

export function isGoogleMapsUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (MAPS_HOSTS.has(host)) {
      if (host === "google.com") return url.pathname.startsWith("/maps");
      if (host === "goo.gl") return url.pathname.startsWith("/maps");
      return true;
    }
    // Regional hosts e.g. google.com.gh/maps
    if (host.startsWith("google.") && url.pathname.startsWith("/maps")) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function isShortMapsUrl(raw: string): boolean {
  try {
    const host = new URL(raw.trim()).hostname.replace(/^www\./, "").toLowerCase();
    return host === "maps.app.goo.gl" || host === "goo.gl";
  } catch {
    return false;
  }
}

/**
 * Pull lat/lng out of the usual Share-link shapes Google emits.
 */
export function extractMapsCoords(raw: string): MapsCoords | null {
  const text = raw.trim();

  const at = text.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (at) return clampCoords(Number(at[1]), Number(at[2]));

  const query = text.match(/[?&](?:q|query)=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/i);
  if (query) return clampCoords(Number(query[1]), Number(query[2]));

  const bang = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (bang) return clampCoords(Number(bang[1]), Number(bang[2]));

  const place = text.match(
    /\/place\/[^/]+\/(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
  );
  if (place) return clampCoords(Number(place[1]), Number(place[2]));

  const ll = text.match(/[?&]ll=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/i);
  if (ll) return clampCoords(Number(ll[1]), Number(ll[2]));

  return null;
}

function clampCoords(lat: number, lng: number): MapsCoords | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** iframe src that shows the pin without a Maps API key. */
export function mapsEmbedSrc(raw: string): string | null {
  const trimmed = raw.trim();
  if (!isGoogleMapsUrl(trimmed)) return null;

  const coords = extractMapsCoords(trimmed);
  if (coords) {
    return `https://www.google.com/maps?q=${coords.lat},${coords.lng}&z=16&output=embed`;
  }

  return `https://www.google.com/maps?q=${encodeURIComponent(trimmed)}&output=embed`;
}

export const MAPS_LINK_HINT =
  "Open Google Maps, drop a pin, then Share → Copy link and paste it here";
