/** localStorage key for the last customer portal token on a vendor shop. */
export function portalStorageKey(vendorSlug: string): string {
  return `preorders:portal:${vendorSlug}`;
}
