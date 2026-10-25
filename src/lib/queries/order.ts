import "server-only";

import type { FreightMode } from "@/lib/freight";
import type { Pesewas } from "@/lib/money";
import type { BatchStatus, OrderStatus } from "@/lib/status";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type TrackedOrder = {
  id: string;
  code: string;
  publicToken: string;
  status: OrderStatus;
  goodsTotal: Pesewas;
  freightEstimate: Pesewas;
  freightActual: Pesewas | null;
  freightUnits: number;
  fulfilment: "pickup" | "delivery";
  deliveryNote: string | null;
  holdExpiresAt: string | null;
  collectedAt: string | null;
  collectedBy: "vendor" | "customer" | null;
  createdAt: string;
  customer: { name: string; phone: string; email: string | null };
  items: {
    id: string;
    qty: number;
    unitPrice: Pesewas;
    name: string;
    variantLabel: string | null;
    imagePath: string | null;
  }[];
  batch: {
    id: string;
    number: number;
    status: BatchStatus;
    closesAt: string;
    expectedDeliveryAt: string | null;
    freightMode: FreightMode;
  };
  vendor: {
    id: string;
    slug: string;
    businessName: string;
    logoPath: string | null;
    whatsappNumber: string | null;
  };
  drop: { slug: string; title: string };
  timeline: {
    id: string;
    type: string;
    message: string | null;
    createdAt: string;
  }[];
  review: {
    rating: number;
    comment: string | null;
    createdAt: string;
  } | null;
  paidGoods: boolean;
  paidFreight: boolean;
};

type ItemSnapshot = {
  productName?: string;
  variantLabel?: string;
  variantName?: string;
  variantValue?: string;
  imagePath?: string;
};

/**
 * Looked up by the order's public token, with no session.
 *
 * The token is the capability for *this order*: it arrives by WhatsApp and
 * email, and asking a customer to make an account to see their own order is
 * exactly the friction this platform exists to remove. It deliberately does
 * not also resolve the customer's account-wide portal token or other orders —
 * this token was only ever proven to unlock the one order it was issued for,
 * and anyone who places an order using someone else's email (nothing in an
 * anonymous checkout proves otherwise) must not be handed a wider capability
 * than that. The portal link is instead only ever sent to the customer's own
 * inbox (see notify.ts) or re-issued via the email-verified lookup in
 * find-vendor-orders.ts. It runs under the service role and returns a
 * hand-picked shape rather than the row, so nothing beyond what the page
 * renders is reachable.
 */
export async function getOrderByToken(
  token: string,
): Promise<TrackedOrder | null> {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select(
      "id, code, public_token, status, goods_total, freight_estimate, freight_amount, freight_units, fulfilment, delivery_note, hold_expires_at, collected_at, collected_by, created_at, customers(name, phone, email), order_items(id, qty, unit_price, snapshot), payments(type, status), order_reviews(rating, comment, created_at), batches(id, number, status, closes_at, expected_delivery_at, freight_mode, drops(slug, title, vendors(id, slug, business_name, logo_path, whatsapp_number)))",
    )
    .eq("public_token", token)
    .maybeSingle();

  if (!order?.batches?.drops?.vendors || !order.customers) return null;

  const batch = order.batches;
  const drop = batch.drops;
  const vendor = drop.vendors;

  const { data: events } = await admin
    .from("batch_events")
    .select("id, type, message, created_at")
    .eq("batch_id", batch.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  const paid = (type: "goods" | "freight") =>
    (order.payments ?? []).some(
      (payment) => payment.type === type && payment.status === "success",
    );

  const reviewRow = Array.isArray(order.order_reviews)
    ? order.order_reviews[0]
    : order.order_reviews;

  const collectedBy =
    order.collected_by === "vendor" || order.collected_by === "customer"
      ? order.collected_by
      : null;

  return {
    id: order.id,
    code: order.code,
    publicToken: order.public_token,
    status: order.status,
    goodsTotal: order.goods_total,
    freightEstimate: order.freight_estimate,
    freightActual: order.freight_amount,
    freightUnits: order.freight_units,
    fulfilment: order.fulfilment,
    deliveryNote: order.delivery_note,
    holdExpiresAt: order.hold_expires_at,
    collectedAt: order.collected_at,
    collectedBy,
    createdAt: order.created_at,
    customer: {
      name: order.customers.name,
      phone: order.customers.phone,
      email: order.customers.email,
    },
    items: (order.order_items ?? []).map((item) => {
      const snapshot = (item.snapshot ?? {}) as ItemSnapshot;
      return {
        id: item.id,
        qty: item.qty,
        unitPrice: item.unit_price,
        name: snapshot.productName ?? "Item",
        variantLabel:
          snapshot.variantLabel ??
          (snapshot.variantName && snapshot.variantValue
            ? `${snapshot.variantName} ${snapshot.variantValue}`
            : null),
        imagePath: snapshot.imagePath ?? null,
      };
    }),
    batch: {
      id: batch.id,
      number: batch.number,
      status: batch.status,
      closesAt: batch.closes_at,
      expectedDeliveryAt: batch.expected_delivery_at,
      freightMode: batch.freight_mode,
    },
    vendor: {
      id: vendor.id,
      slug: vendor.slug,
      businessName: vendor.business_name,
      logoPath: vendor.logo_path,
      whatsappNumber: vendor.whatsapp_number,
    },
    drop: { slug: drop.slug, title: drop.title },
    timeline: (events ?? []).map((event) => ({
      id: event.id,
      type: event.type,
      message: event.message,
      createdAt: event.created_at,
    })),
    review: reviewRow
      ? {
          rating: reviewRow.rating,
          comment: reviewRow.comment,
          createdAt: reviewRow.created_at,
        }
      : null,
    paidGoods: paid("goods"),
    paidFreight: paid("freight"),
  };
}

/**
 * Looked up by order id under the signed-in vendor's own session, so
 * `orders_member_read` (RLS) is what actually decides whether this vendor
 * owns it — a vendor can never fetch another vendor's order by guessing an
 * id. This is the dashboard counterpart to `getOrderByToken`: same shape,
 * but reached from `/dashboard/orders` instead of the customer's public link,
 * so a vendor managing their own orders never has to land on the
 * customer-facing page to see one.
 */
export async function getVendorOrder(
  orderId: string,
): Promise<TrackedOrder | null> {
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, code, public_token, status, goods_total, freight_estimate, freight_amount, freight_units, fulfilment, delivery_note, hold_expires_at, collected_at, collected_by, created_at, customers(name, phone, email), order_items(id, qty, unit_price, snapshot), payments(type, status), order_reviews(rating, comment, created_at), batches(id, number, status, closes_at, expected_delivery_at, freight_mode, drops(slug, title, vendors(id, slug, business_name, logo_path, whatsapp_number)))",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order?.batches?.drops?.vendors || !order.customers) return null;

  const batch = order.batches;
  const drop = batch.drops;
  const vendor = drop.vendors;

  const { data: events } = await supabase
    .from("batch_events")
    .select("id, type, message, created_at")
    .eq("batch_id", batch.id)
    .order("created_at", { ascending: false });

  const paid = (type: "goods" | "freight") =>
    (order.payments ?? []).some(
      (payment) => payment.type === type && payment.status === "success",
    );

  const reviewRow = Array.isArray(order.order_reviews)
    ? order.order_reviews[0]
    : order.order_reviews;

  const collectedBy =
    order.collected_by === "vendor" || order.collected_by === "customer"
      ? order.collected_by
      : null;

  return {
    id: order.id,
    code: order.code,
    publicToken: order.public_token,
    status: order.status,
    goodsTotal: order.goods_total,
    freightEstimate: order.freight_estimate,
    freightActual: order.freight_amount,
    freightUnits: order.freight_units,
    fulfilment: order.fulfilment,
    deliveryNote: order.delivery_note,
    holdExpiresAt: order.hold_expires_at,
    collectedAt: order.collected_at,
    collectedBy,
    createdAt: order.created_at,
    customer: {
      name: order.customers.name,
      phone: order.customers.phone,
      email: order.customers.email,
    },
    items: (order.order_items ?? []).map((item) => {
      const snapshot = (item.snapshot ?? {}) as ItemSnapshot;
      return {
        id: item.id,
        qty: item.qty,
        unitPrice: item.unit_price,
        name: snapshot.productName ?? "Item",
        variantLabel:
          snapshot.variantLabel ??
          (snapshot.variantName && snapshot.variantValue
            ? `${snapshot.variantName} ${snapshot.variantValue}`
            : null),
        imagePath: snapshot.imagePath ?? null,
      };
    }),
    batch: {
      id: batch.id,
      number: batch.number,
      status: batch.status,
      closesAt: batch.closes_at,
      expectedDeliveryAt: batch.expected_delivery_at,
      freightMode: batch.freight_mode,
    },
    vendor: {
      id: vendor.id,
      slug: vendor.slug,
      businessName: vendor.business_name,
      logoPath: vendor.logo_path,
      whatsappNumber: vendor.whatsapp_number,
    },
    drop: { slug: drop.slug, title: drop.title },
    timeline: (events ?? []).map((event) => ({
      id: event.id,
      type: event.type,
      message: event.message,
      createdAt: event.created_at,
    })),
    review: reviewRow
      ? {
          rating: reviewRow.rating,
          comment: reviewRow.comment,
          createdAt: reviewRow.created_at,
        }
      : null,
    paidGoods: paid("goods"),
    paidFreight: paid("freight"),
  };
}
