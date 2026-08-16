import { env } from "@/lib/env";

export const BUCKETS = {
  productImages: "product-images",
  vendorAssets: "vendor-assets",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

/**
 * Both buckets are public, so this is a plain URL rather than a signed one.
 * That keeps a forty-image drop page to zero extra round trips.
 *
 * This is always the full-size original. Resizing is `next/image`'s job:
 * Supabase's own transform endpoint is a paid feature that 404s rather than
 * falling back wherever it is not enabled, which is every free project and
 * the local stack.
 */
export function publicUrl(bucket: BucketName, path: string): string {
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

/** Object keys start with the vendor id, which is what storage RLS keys off. */
export function productImagePath(
  vendorId: string,
  productId: string,
  extension: string,
): string {
  const unique = crypto.randomUUID();
  return `${vendorId}/products/${productId}/${unique}.${extension}`;
}

export function vendorAssetPath(
  vendorId: string,
  kind: "logo" | "cover",
  extension: string,
): string {
  return `${vendorId}/${kind}-${crypto.randomUUID()}.${extension}`;
}

export function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/avif":
      return "avif";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}
