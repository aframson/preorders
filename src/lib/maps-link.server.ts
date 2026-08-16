"use server";

import {
  extractMapsCoords,
  isGoogleMapsUrl,
  isShortMapsUrl,
  mapsEmbedSrc,
} from "@/lib/maps-link";

export type MapsPreview =
  | {
      ok: true;
      url: string;
      embedSrc: string;
      hasCoords: boolean;
    }
  | { ok: false; error: string };

/**
 * Follows short Maps links so the checkout preview can show a real pin.
 * Long links are parsed in place without a network hop.
 */
export async function previewMapsLink(raw: string): Promise<MapsPreview> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Paste a Google Maps link" };
  }
  if (!isGoogleMapsUrl(trimmed)) {
    return {
      ok: false,
      error: "Use a Google Maps link (maps.google.com or maps.app.goo.gl)",
    };
  }

  let resolved = trimmed;

  if (isShortMapsUrl(trimmed)) {
    try {
      const response = await fetch(trimmed, {
        method: "GET",
        redirect: "follow",
        headers: {
          // Some short-link endpoints 403 a bare fetch without a UA.
          "User-Agent":
            "Mozilla/5.0 (compatible; PreordersBot/1.0; +https://localhost)",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(6000),
      });
      if (response.url) resolved = response.url;
    } catch {
      // Keep the short link — embed fallback still uses it as the query.
    }
  }

  const embedSrc = mapsEmbedSrc(resolved);
  if (!embedSrc) {
    return { ok: false, error: "That Maps link could not be previewed" };
  }

  return {
    ok: true,
    url: resolved,
    embedSrc,
    hasCoords: Boolean(extractMapsCoords(resolved)),
  };
}
