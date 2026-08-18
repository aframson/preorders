import { cn } from "@/lib/cn";
import {
  PRODUCT_AVAILABILITY,
  type ProductAvailability,
} from "@/lib/product-availability";

/**
 * Compact corner tag on product imagery. Kept small so it does not compete
 * with the photo or the price.
 */
export function AvailabilityTag({
  availability,
  className,
}: {
  availability: ProductAvailability;
  className?: string;
}) {
  const meta = PRODUCT_AVAILABILITY[availability];

  return (
    <span
      className={cn(
        "absolute top-2 left-2 z-10 rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white shadow-sm",
        meta.badgeClass,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
