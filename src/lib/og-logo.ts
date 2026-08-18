/**
 * Convert a remote logo into a PNG/JPEG data URL Satori can embed.
 * WebP/AVIF/HEIC/SVG and fetch failures return null so OG cards use initials.
 */

function sniffImageType(bytes: Buffer): "image/png" | "image/jpeg" | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  return null;
}

export async function toOgLogoSrc(
  url: string | null | undefined,
): Promise<string | null> {
  if (!url) return null;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;

    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > 1_500_000) return null;

    const type = sniffImageType(bytes);
    if (!type) return null;

    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}
