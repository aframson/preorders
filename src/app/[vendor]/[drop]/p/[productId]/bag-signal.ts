"use server";

import { z } from "zod";

import { notifyVendorBagAdd } from "@/lib/vendor-notify";

const schema = z.object({
  vendorId: z.string().uuid(),
  productName: z.string().trim().min(1).max(120),
  qty: z.number().int().min(1).max(99),
  dropTitle: z.string().trim().max(120).optional(),
});

/**
 * Fire-and-forget signal when a shopper adds to bag. No auth — rate-limited
 * by Trigger idempotency keys on the vendor notify path.
 */
export async function signalBagAdd(
  input: z.infer<typeof schema>,
): Promise<void> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return;

  void notifyVendorBagAdd(parsed.data).catch((error) =>
    console.error("[notify] bag add", error),
  );
}
