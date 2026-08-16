"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireVendor } from "@/lib/auth";
import { cedisToPesewas } from "@/lib/money";
import { SettlementError } from "@/lib/settlement";
import { finaliseFreight } from "@/lib/settlement.server";

export type FreightState = { error?: string | null; message?: string | null };

const schema = z.object({
  batchId: z.uuid(),
  dropId: z.uuid(),
  charge: z.coerce.number().positive("Enter the amount you are charging"),
  cost: z.coerce.number().min(0).optional(),
});

export async function sendFreightInvoices(
  _prev: FreightState,
  formData: FormData,
): Promise<FreightState> {
  await requireVendor();

  const parsed = schema.safeParse({
    batchId: formData.get("batchId"),
    dropId: formData.get("dropId"),
    charge: formData.get("charge"),
    cost: formData.get("cost") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const preview = await finaliseFreight({
      batchId: parsed.data.batchId,
      charge: cedisToPesewas(parsed.data.charge),
      cost:
        parsed.data.cost === undefined
          ? null
          : cedisToPesewas(parsed.data.cost),
    });

    revalidatePath(
      `/dashboard/drops/${parsed.data.dropId}/batches/${parsed.data.batchId}`,
    );
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/money");

    return {
      message: `Sent ${preview.rows.length} shipping invoice${preview.rows.length === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    return {
      error:
        error instanceof SettlementError
          ? error.message
          : "Could not send invoices. Try again.",
    };
  }
}
