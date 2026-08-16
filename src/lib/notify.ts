import "server-only";

import { sendEmail } from "@/lib/email";
import { formatGhs } from "@/lib/money";
import { absoluteUrl, customerPortalPath, orderPath } from "@/lib/site";
import {
  BATCH_STATUS,
  orderStatusLabel,
  type BatchStatus,
} from "@/lib/status";
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
  // Always the clean tracking URL — never Paystack callback query params.
  const orderUrl = absoluteUrl(orderPath(ctx.orderToken));
  const portalUrl = absoluteUrl(customerPortalPath(ctx.portalToken));
  return { orderUrl, portalUrl };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function orderEmailHtml(params: {
  greeting: string;
  headline: string;
  bodyHtml: string;
  orderCode: string;
  statusLabel: string;
  orderUrl: string;
  portalUrl: string;
  vendorName: string;
  ctaLabel: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:#f7f3ee;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;color:#1a1614;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f3ee;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #e8e1db;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:20px 24px;background:#5a2a4e;color:#fdfbf8;">
            <p style="margin:0;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.85;">Preorders</p>
            <p style="margin:6px 0 0;font-size:18px;font-weight:700;">${escapeHtml(params.vendorName)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 8px;font-size:15px;color:#6b615c;">${escapeHtml(params.greeting)}</p>
            <p style="margin:0 0 12px;font-size:20px;font-weight:700;line-height:1.3;">${escapeHtml(params.headline)}</p>
            <div style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#1a1614;">${params.bodyHtml}</div>
            <p style="margin:0 0 4px;font-size:13px;color:#6b615c;">Order ${escapeHtml(params.orderCode)} · ${escapeHtml(params.statusLabel)}</p>
            <p style="margin:0 0 20px;">
              <a href="${escapeHtml(params.orderUrl)}" style="display:inline-block;background:#5a2a4e;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 18px;border-radius:10px;">${escapeHtml(params.ctaLabel)}</a>
            </p>
            <p style="margin:0;font-size:13px;line-height:1.5;color:#6b615c;word-break:break-all;">
              Or save this link:<br />
              <a href="${escapeHtml(params.orderUrl)}" style="color:#5a2a4e;">${escapeHtml(params.orderUrl)}</a>
            </p>
            <p style="margin:16px 0 0;font-size:13px;color:#6b615c;">
              All your orders with ${escapeHtml(params.vendorName)}:
              <a href="${escapeHtml(params.portalUrl)}" style="color:#5a2a4e;">${escapeHtml(params.portalUrl)}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function emailOrderUpdate(
  ctx: OrderMailContext,
  params: {
    subject: string;
    headline: string;
    body: string;
    ctaLabel?: string;
  },
): Promise<void> {
  const { orderUrl, portalUrl } = links(ctx);
  const statusLabel = orderStatusLabel(ctx.status, ctx.fulfilment, "public");
  const firstName = ctx.customerName.split(/\s+/)[0] || "there";
  const ctaLabel = params.ctaLabel ?? "Open your order";

  const text = [
    `Hi ${firstName},`,
    "",
    params.headline,
    "",
    params.body,
    "",
    `Order ${ctx.orderCode} · ${statusLabel}`,
    "",
    `${ctaLabel}: ${orderUrl}`,
    `All your orders with ${ctx.vendorName}: ${portalUrl}`,
    "",
    "— Preorders",
  ].join("\n");

  const bodyHtml = escapeHtml(params.body).replace(/\n/g, "<br/>");

  await sendEmail({
    to: ctx.email,
    subject: params.subject,
    text,
    html: orderEmailHtml({
      greeting: `Hi ${firstName},`,
      headline: params.headline,
      bodyHtml,
      orderCode: ctx.orderCode,
      statusLabel,
      orderUrl,
      portalUrl,
      vendorName: ctx.vendorName,
      ctaLabel,
    }),
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

/** Fresh checkout — order held pending payment (includes tracking link). */
export async function notifyOrderPlaced(orderId: string): Promise<void> {
  const ctx = await loadOrderMailContext(orderId);
  if (!ctx) return;

  await emailOrderUpdate(ctx, {
    subject: `${ctx.vendorName}: your order ${ctx.orderCode}`,
    headline: "Your order link is ready.",
    body: `Goods total: ${formatGhs(ctx.goodsTotal ?? 0)}.\nComplete payment if you have not already, then use this link anytime to track ${ctx.orderCode}.`,
    ctaLabel: "Track your order",
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
      body: `Goods total: ${formatGhs(ctx.goodsTotal ?? 0)}.\nSave the button below. We will email you again when the seller posts updates.`,
      ctaLabel: "Open your order",
    });
    return;
  }

  await emailOrderUpdate(ctx, {
    subject: `${ctx.vendorName}: shipping paid for ${ctx.orderCode}`,
    headline: "Shipping payment received.",
    body:
      ctx.fulfilment === "delivery"
        ? "Your order is ready to be delivered. We will email you when it is marked delivered."
        : "Your order is ready for pickup. We will email you when it is marked picked up.",
    ctaLabel: "Open your order",
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
      body: `Amount due: ${formatGhs(ctx.freightAmount ?? 0)}.\nOpen your order to pay. Freight has no platform fee.`,
      ctaLabel: "Pay shipping",
    });
  }
}

/**
 * Vendor posted a timeline update or moved batch status.
 * Emails every paid customer on the batch with the update + their order link.
 */
export async function notifyBatchCustomers(
  batchId: string,
  message: string,
  statusOrLabel?: string,
): Promise<void> {
  const admin = createAdminClient();
  const { data: orders } = await admin
    .from("orders")
    .select("id")
    .eq("batch_id", batchId)
    .neq("status", "cancelled")
    .neq("status", "pending_payment");

  const label =
    statusOrLabel && statusOrLabel in BATCH_STATUS
      ? BATCH_STATUS[statusOrLabel as BatchStatus].publicLabel
      : statusOrLabel;

  for (const order of orders ?? []) {
    const ctx = await loadOrderMailContext(order.id);
    if (!ctx) continue;
    await emailOrderUpdate(ctx, {
      subject: `${ctx.vendorName}: update on ${ctx.orderCode}${
        label ? ` — ${label}` : ""
      }`,
      headline: "New update on your order.",
      body: message,
      ctaLabel: "See update on your order",
    });
  }
}

export async function notifyOrderReceived(orderId: string): Promise<void> {
  const ctx = await loadOrderMailContext(orderId);
  if (!ctx) return;

  const { orderUrl } = links(ctx);
  // Point CTA at the feedback anchor on the order page.
  const feedbackUrl = `${orderUrl}#feedback`;

  const firstName = ctx.customerName.split(/\s+/)[0] || "there";
  const statusLabel = orderStatusLabel(ctx.status, ctx.fulfilment, "public");
  const headline =
    ctx.fulfilment === "delivery"
      ? "Your order was marked delivered."
      : "Your order was marked picked up.";
  const subject = `${ctx.vendorName}: ${
    ctx.fulfilment === "delivery" ? "delivered" : "picked up"
  } — ${ctx.orderCode}`;
  const body =
    "Please leave a quick rating on your order page when you can.";
  const portalUrl = absoluteUrl(customerPortalPath(ctx.portalToken));

  const text = [
    `Hi ${firstName},`,
    "",
    headline,
    "",
    body,
    "",
    `Order ${ctx.orderCode} · ${statusLabel}`,
    "",
    `Rate your order: ${feedbackUrl}`,
    `All your orders with ${ctx.vendorName}: ${portalUrl}`,
    "",
    "— Preorders",
  ].join("\n");

  await sendEmail({
    to: ctx.email,
    subject,
    text,
    html: orderEmailHtml({
      greeting: `Hi ${firstName},`,
      headline,
      bodyHtml: escapeHtml(body),
      orderCode: ctx.orderCode,
      statusLabel,
      orderUrl: feedbackUrl,
      portalUrl,
      vendorName: ctx.vendorName,
      ctaLabel: "Rate your order",
    }),
  });
}
