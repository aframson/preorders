export type ProductAvailability = "preorder" | "in_stock";

export const PRODUCT_AVAILABILITY: Record<
  ProductAvailability,
  { label: string; hint: string; badgeClass: string }
> = {
  preorder: {
    label: "Preorder",
    hint: "Ships with the batch when it arrives.",
    badgeClass: "bg-transit/95",
  },
  in_stock: {
    label: "In stock",
    hint: "Ready now from local stock.",
    badgeClass: "bg-open/95",
  },
};

export function isProductAvailability(
  value: string,
): value is ProductAvailability {
  return value === "preorder" || value === "in_stock";
}
