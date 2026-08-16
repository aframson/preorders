import "server-only";

import { sendEmail } from "@/lib/email";
import { formatGhs } from "@/lib/money";
import { absoluteUrl, customerPortalPath, orderPath } from "@/lib/site";
import { orderStatusLabel } from "@/lib/status";
import { createAdminClient } from "@/lib/supabase/admin";

type OrderMailContext = {
  email: string;
  customerName: string;
  orderCode: string;
  orderToken: string;
  portalToken: string;
  vendorName: string;
  fulfilment: "pickup" | "delivery";
  status: Parameters<typeof orderStatusLabel>[0];
  goodsTotal?: number;
  freightAmount?: number | null;
};

function links(ctx: Pick<OrderMailContext, "orderToken" | "portalToken">) {
  const orderUrl = absoluteUrl(orderPath(ctx.orderToken));
  const portalUrl = absoluteUrl(customerPortalPath(ctx.portalToken));
  return { orderUrl, portalUrl };
}

export async function emailOrderUpdate(
  ctx: OrderMailContext,
  params: { subject: string; headline: string; body: string },
): Promise<void> {
  const { orderUrl, portalUrl } = links(ctx);
  const statusLabel = orderStatusLabel(ctx.status, ctx.fulfilment, "public");

  const text = [
    `Hi ${ctx.customerName.split(/\s+/)[0] || "there"},`,
    "",
    params.headline,
    "",
    params.body,
    "",
    `Order ${ctx.orderCode} · ${statusLabel}`,
    `Track this order: ${orderUrl}`,
    `All your orders with ${ctx.vendorName}: ${portalUrl}`,
    "",
    "— Preorders",
  ].join("\n");

  await sendEmail({
    to: ctx.email,
    subject: params.subject,
    text,
  });
}

async function loadOrderMailContext(
  orderId: string,
): Promise<OrderMailContext | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("orders")
    .select(
      "code, public_token, status, fulfilment, goods_total, freight_amount, customers(name, email, portal_token), batches(drops(vendors(business_name)))",
    )
    .eq("id", orderId)
    .maybeSingle();

  const customer = data?.customers;
  const vendorName = data?.batches?.drops?.vendors?.business_name;
  if (!data || !customer?.email || !customer.portal_token || !vendorName) {
    return null;
  }

  return {
    email: customer.email,
    customerName: customer.name,
    orderCode: data.code,
    orderToken: data.public_token,
    portalToken: customer.portal_token,
    vendorName,
    fulfilment: data.fulfilment,
    status: data.status,
    goodsTotal: data.goods_total,
    freightAmount: data.freight_amount,
  };
}

/** Fresh checkout — order held pending payment. */
export async function notifyOrderPlaced(orderId: string): Promise<void> {
  const ctx = await loadOrderMailContext(orderId);
  if (!ctx) return;

  await emailOrderUpdate(ctx, {
    subject: `${ctx.vendorName}: order ${ctx.orderCode} saved`,
    headline: "Your order is saved. Complete payment to confirm it.",
    body: `Goods total: ${formatGhs(ctx.goodsTotal ?? 0)}.\nUse your orders link anytime to see every order with this seller.`,
  });
}

/** After goods or freight payment settles. */
export async function notifyOrderPaid(
  orderId: string,
  stage: "goods" | "freight",
): Promise<void> {
  const ctx = await loadOrderMailContext(orderId);
  if (!ctx) return;

  if (stage === "goods") {
    await emailOrderUpdate(ctx, {
      subject: `${ctx.vendorName}: order ${ctx.orderCode} confirmed`,
      headline: "Payment received — your order is confirmed.",
      body: `Goods total: ${formatGhs(ctx.goodsTotal ?? 0)}.\nKeep your orders link so you can follow every order with ${ctx.vendorName} in one place.`,
    });
    return;
  }

  await emailOrderUpdate(ctx, {
    subject: `${ctx.vendorName}: shipping paid for ${ctx.orderCode}`,
    headline: "Shipping payment received.",
    body:
      ctx.fulfilment === "delivery"
        ? "Your order is ready to be delivered. You will get another email when it is marked delivered."
        : "Your order is ready for pickup. You will get another email when it is marked picked up.",
  });
}

/** Freight invoices just went out for a batch. */
export async function notifyFreightDue(batchId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: orders } = await admin
    .from("orders")
    .select("id")
    .eq("batch_id", batchId)
    .eq("status", "awaiting_freight");

  for (const order of orders ?? []) {
    const ctx = await loadOrderMailContext(order.id);
    if (!ctx) continue;
    await emailOrderUpdate(ctx, {
      subject: `${ctx.vendorName}: shipping fee due for ${ctx.orderCode}`,
      headline: "Your shipping share is ready to pay.",
      body: `Amount due: ${formatGhs(ctx.freightAmount ?? 0)}.\nOpen your order link to pay. Freight has no platform fee.`,
    });
  }
}

/** Vendor posted a timeline update or moved batch status. */
export async function notifyBatchCustomers(
  batchId: string,
  message: string,
  subjectSuffix?: string,
): Promise<void> {
  const admin = createAdminClient();
  const { data: orders } = await admin
    .from("orders")
    .select("id")
    .eq("batch_id", batchId)
    .neq("status", "cancelled")
    .neq("status", "pending_payment");

  for (const order of orders ?? []) {
    const ctx = await loadOrderMailContext(order.id);
    if (!ctx) continue;
    await emailOrderUpdate(ctx, {
      subject: `${ctx.vendorName}: update on ${ctx.orderCode}${
        subjectSuffix ? ` — ${subjectSuffix}` : ""
      }`,
      headline: "New update on your order.",
      body: message,
    });
  }
}

export async function notifyOrderReceived(orderId: string): Promise<void> {
  const ctx = await loadOrderMailContext(orderId);
  if (!ctx) return;

  const { portalUrl, orderUrl } = links(ctx);
  await emailOrderUpdate(ctx, {
    subject: `${ctx.vendorName}: ${
      ctx.fulfilment === "delivery" ? "delivered" : "picked up"
    } — ${ctx.orderCode}`,
    headline:
      ctx.fulfilment === "delivery"
        ? "Your order was marked delivered."
        : "Your order was marked picked up.",
    body: `Please leave a quick rating: ${orderUrl}#feedback\n\nAll your orders: ${portalUrl}`,
  });
}
