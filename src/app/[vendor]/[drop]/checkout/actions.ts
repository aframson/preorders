"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { isGoogleMapsUrl } from "@/lib/maps-link";
import { CheckoutError, createOrder } from "@/lib/orders";
import {
  PaymentUnavailableError,
  startGoodsPayment,
} from "@/lib/payments";
import { isPaystackConfigured } from "@/lib/paystack";
import { getPublicDrop } from "@/lib/queries/public-drop";
import { orderPath } from "@/lib/site";

export type CheckoutField = "name" | "phone" | "email" | "deliveryNote";

export type CheckoutState = {
  error?: string | null;
  fieldErrors?: Partial<Record<CheckoutField, string>>;
};

const lineSchema = z.object({
  productId: z.uuid(),
  variantIds: z.array(z.uuid()).default([]),
  qty: z.number().int().min(1).max(999),
  imagePath: z.string().min(1).nullable().optional(),
});

const checkoutSchema = z
  .object({
    vendorSlug: z.string().min(1),
    dropSlug: z.string().min(1),
    batchId: z.uuid(),
    name: z.string().trim().min(2, "Enter your name"),
    phone: z
      .string()
      .trim()
      .regex(/^[\d\s()+-]{9,17}$/, "Enter a valid phone number"),
    email: z.email("Enter a valid email address"),
    fulfilment: z.enum(["pickup", "delivery"]),
    deliveryNote: z.string().trim().max(2000).nullable(),
    lines: z.array(lineSchema).min(1, "Your order is empty"),
  })
  .superRefine((data, ctx) => {
    if (data.fulfilment !== "delivery") return;

    if (!data.deliveryNote) {
      ctx.addIssue({
        code: "custom",
        path: ["deliveryNote"],
        message: "Paste a Google Maps link for where it should go",
      });
      return;
    }

    if (!isGoogleMapsUrl(data.deliveryNote)) {
      ctx.addIssue({
        code: "custom",
        path: ["deliveryNote"],
        message: "Use a Google Maps link (Share → Copy link)",
      });
    }
  });

export async function placeOrder(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  let lines: unknown;
  try {
    lines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    return { error: "Your order could not be read. Try again." };
  }

  const note = String(formData.get("deliveryNote") ?? "").trim();

  const parsed = checkoutSchema.safeParse({
    vendorSlug: formData.get("vendorSlug"),
    dropSlug: formData.get("dropSlug"),
    batchId: formData.get("batchId"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    fulfilment: formData.get("fulfilment"),
    deliveryNote: note.length > 0 ? note : null,
    lines,
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<CheckoutState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (
        (key === "name" ||
          key === "phone" ||
          key === "email" ||
          key === "deliveryNote") &&
        !fieldErrors[key]
      ) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      error: parsed.error.issues[0].message,
      fieldErrors,
    };
  }

  const input = parsed.data;
  const data = await getPublicDrop(input.vendorSlug, input.dropSlug);

  if (!data?.openBatch || data.openBatch.id !== input.batchId) {
    return {
      error:
        "This batch closed while you were ordering. Nothing has been charged.",
    };
  }

  if (input.fulfilment === "pickup" && !data.vendor.pickupMapsUrl) {
    return {
      error:
        "This seller is not offering pickup right now. Choose delivery instead.",
    };
  }

  let destination: string;

  try {
    const order = await createOrder({
      batchId: data.openBatch.id,
      vendorId: data.vendor.id,
      dropId: data.drop.id,
      freightMode: data.openBatch.freightMode,
      freightRateEstimate: data.openBatch.freightRateEstimate,
      customer: { name: input.name, phone: input.phone, email: input.email },
      fulfilment: input.fulfilment,
      deliveryNote: input.deliveryNote,
      lines: input.lines,
    });

    const { notifyOrderPlaced } = await import("@/lib/notify");
    void notifyOrderPlaced(order.id).catch((error) =>
      console.error("[notify] order placed", error),
    );

    const paymentUrl = await startGoodsPayment(order.id);
    if (paymentUrl) {
      destination = paymentUrl;
    } else if (isPaystackConfigured()) {
      return {
        error:
          "Payment could not be started. Your order is held — open it from your confirmation link and try Pay again.",
      };
    } else {
      // Local / no keys: land on the order page so the rest of the flow is
      // still walkable without a Paystack account.
      destination = orderPath(order.publicToken);
    }
  } catch (error) {
    if (error instanceof CheckoutError) return { error: error.message };
    if (error instanceof PaymentUnavailableError) {
      return { error: error.message };
    }
    throw error;
  }

  // Outside the try: redirect signals by throwing, and swallowing it here
  // would strand the customer on the form with a created order.
  redirect(destination);
}
