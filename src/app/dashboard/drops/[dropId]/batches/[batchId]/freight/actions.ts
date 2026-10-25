"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireVendor } from "@/lib/auth";
import { cedisToPesewas, type Pesewas } from "@/lib/money";
import { SettlementError } from "@/lib/settlement";
import { finaliseFreight, finaliseIndividualFreight } from "@/lib/settlement.server";

export type FreightState = { error?: string | null; message?: string | null };

const schema = z.object({
  batchId: z.uuid(),
  dropId: z.uuid(),
  charge: z.coerce.number().positive("Enter the amount you are charging"),
  cost: z.coerce.number().min(0).optional(),
});

const individualSchema = z.object({
  batchId: z.uuid(),
  dropId: z.uuid(),
  cost: z.coerce.number().min(0).optional(),
});

const AMOUNT_FIELD_PREFIX = "amount_";

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
      message: preview.alreadyFinalised
        ? `Updated ${preview.rows.length} shipping invoice${preview.rows.length === 1 ? "" : "s"}. Customers are notified of the new amount.`
        : `Sent ${preview.rows.length} shipping invoice${preview.rows.length === 1 ? "" : "s"}.`,
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

export async function sendIndividualFreightInvoices(
  _prev: FreightState,
  formData: FormData,
): Promise<FreightState> {
  await requireVendor();

  const parsed = individualSchema.safeParse({
    batchId: formData.get("batchId"),
    dropId: formData.get("dropId"),
    cost: formData.get("cost") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const amounts: Record<string, Pesewas> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith(AMOUNT_FIELD_PREFIX) || typeof value !== "string") continue;
    const orderId = key.slice(AMOUNT_FIELD_PREFIX.length);
    const cedis = Number(value);
    amounts[orderId] = Number.isFinite(cedis)
      ? cedisToPesewas(Math.max(0, cedis))
      : 0;
  }

  try {
    const preview = await finaliseIndividualFreight({
      batchId: parsed.data.batchId,
      amounts,
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
      message: preview.alreadyFinalised
        ? `Updated ${preview.rows.length} shipping invoice${preview.rows.length === 1 ? "" : "s"}. Customers are notified of the new amount.`
        : `Sent ${preview.rows.length} shipping invoice${preview.rows.length === 1 ? "" : "s"}.`,
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
