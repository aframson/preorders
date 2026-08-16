"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireVendor } from "@/lib/auth";
import {
  PaymentUnavailableError,
  startFreightPayment,
  startGoodsPayment,
} from "@/lib/payments";
import { getOrderByToken } from "@/lib/queries/order";
import { absoluteUrl, orderPath, vendorPath } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

export type PayState = { error?: string | null };

export type FulfilmentActionState = {
  error?: string | null;
  ok?: boolean;
  /** WhatsApp deep link for the vendor to nudge the customer to rate. */
  notifyHref?: string | null;
};

async function resume(
  token: string,
  start: (orderId: string) => Promise<string | null>,
): Promise<PayState> {
  const order = await getOrderByToken(token);
  if (!order) return { error: "Order not found." };

  try {
    const url = await start(order.id);
    if (!url) {
      return {
        error:
          "Payment is not available right now. Message the vendor and they will send you a new link.",
      };
    }
    redirect(url);
  } catch (error) {
    if (error instanceof PaymentUnavailableError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function resumeGoodsPayment(
  _prev: PayState,
  formData: FormData,
): Promise<PayState> {
  return resume(String(formData.get("token") ?? ""), startGoodsPayment);
}

export async function resumeFreightPayment(
  _prev: PayState,
  formData: FormData,
): Promise<PayState> {
  return resume(String(formData.get("token") ?? ""), startFreightPayment);
}

function firstName(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part || "Customer";
}

function feedbackUrl(token: string): string {
  return `${absoluteUrl(orderPath(token))}#feedback`;
}

function customerFeedbackWhatsApp(phone: string, orderCode: string, token: string) {
  const digits = phone.replace(/\D/g, "");
  const text = `Hi! Your order ${orderCode} is marked received. Please rate your experience here: ${feedbackUrl(token)}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

async function loadOrderForFulfilment(token: string) {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      "id, code, public_token, status, fulfilment, customers(name, phone), batches(id, drops(slug, vendors(id, slug)))",
    )
    .eq("public_token", token)
    .maybeSingle();

  if (!order?.batches?.drops?.vendors || !order.customers) return null;

  return {
    id: order.id,
    code: order.code,
    publicToken: order.public_token,
    status: order.status,
    fulfilment: order.fulfilment as "pickup" | "delivery",
    customer: {
      name: order.customers.name,
      phone: order.customers.phone,
    },
    vendorId: order.batches.drops.vendors.id,
    vendorSlug: order.batches.drops.vendors.slug,
    dropSlug: order.batches.drops.slug,
  };
}

/**
 * Either the customer (order token) or the owning vendor can mark received.
 * Idempotent once status is already `collected`.
 */
export async function markOrderReceived(
  _prev: FulfilmentActionState,
  formData: FormData,
): Promise<FulfilmentActionState> {
  const token = String(formData.get("token") ?? "").trim();
  const actorRaw = String(formData.get("actor") ?? "customer");
  const actor = actorRaw === "vendor" ? "vendor" : "customer";

  if (!token) return { error: "Order not found." };

  const order = await loadOrderForFulfilment(token);
  if (!order) return { error: "Order not found." };

  if (actor === "vendor") {
    const vendor = await requireVendor();
    if (vendor.id !== order.vendorId) {
      return { error: "You do not own this order." };
    }
  }

  if (order.status === "collected") {
    return {
      ok: true,
      notifyHref:
        actor === "vendor"
          ? customerFeedbackWhatsApp(
              order.customer.phone,
              order.code,
              order.publicToken,
            )
          : null,
    };
  }

  if (order.status !== "freight_paid") {
    return {
      error:
        "This order is not ready to mark as received yet. Shipping must be settled first.",
    };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("orders")
    .update({
      status: "collected",
      collected_at: new Date().toISOString(),
      collected_by: actor,
    })
    .eq("id", order.id)
    .eq("status", "freight_paid");

  if (error) {
    return { error: "Could not update the order. Try again." };
  }

  const { notifyOrderReceived } = await import("@/lib/notify");
  void notifyOrderReceived(order.id).catch((err) =>
    console.error("[notify] order received", err),
  );

  revalidatePath(orderPath(order.publicToken));
  revalidatePath(vendorPath(order.vendorSlug));
  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/drops`);

  return {
    ok: true,
    notifyHref:
      actor === "vendor"
        ? customerFeedbackWhatsApp(
            order.customer.phone,
            order.code,
            order.publicToken,
          )
        : null,
  };
}

const reviewSchema = z.object({
  token: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export async function submitOrderReview(
  _prev: FulfilmentActionState,
  formData: FormData,
): Promise<FulfilmentActionState> {
  const parsed = reviewSchema.safeParse({
    token: formData.get("token"),
    rating: formData.get("rating"),
    comment: formData.get("comment") ?? "",
  });

  if (!parsed.success) {
    return { error: "Pick a rating from 1 to 5 stars." };
  }

  const { token, rating, comment } = parsed.data;
  const order = await loadOrderForFulfilment(token);
  if (!order) return { error: "Order not found." };

  if (order.status !== "collected") {
    return {
      error: "Mark the order as received before leaving a review.",
    };
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("order_reviews")
    .select("id")
    .eq("order_id", order.id)
    .maybeSingle();

  if (existing) {
    return { error: "You already left a review for this order." };
  }

  const { error } = await admin.from("order_reviews").insert({
    order_id: order.id,
    vendor_id: order.vendorId,
    rating,
    comment,
    customer_display_name: firstName(order.customer.name),
  });

  if (error) {
    return { error: "Could not save your review. Try again." };
  }

  revalidatePath(orderPath(order.publicToken));
  revalidatePath(vendorPath(order.vendorSlug));

  return { ok: true };
}
