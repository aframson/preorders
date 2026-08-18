import "server-only";

import { formatGhs } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Queue a vendor device push via Trigger when configured; otherwise send
 * inline so local/dev still works without the job runner.
 */
export async function notifyVendorPush(params: {
  vendorId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  idempotencyKey?: string;
}): Promise<void> {
  const { isJobRunnerConfigured, triggerVendorPush } = await import(
    "@/lib/jobs"
  );

  if (isJobRunnerConfigured()) {
    await triggerVendorPush(params);
    return;
  }

  const { sendVendorPush } = await import("@/lib/push");
  await sendVendorPush(params.vendorId, {
    title: params.title,
    body: params.body,
    url: params.url,
    tag: params.tag,
  });
}

/** Buyer paid for goods — the money event vendors care about most. */
export async function notifyVendorOrderPaid(orderId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      "code, goods_total, public_token, customers(name), batches(number, drops(title, vendors(id, business_name)))",
    )
    .eq("id", orderId)
    .maybeSingle();

  const vendorId = order?.batches?.drops?.vendors?.id;
  if (!order || !vendorId) return;

  const customerName = order.customers?.name?.split(/\s+/)[0] ?? "A buyer";
  const dropTitle = order.batches?.drops?.title ?? "Drop";
  const batchNumber = order.batches?.number ?? "?";

  await notifyVendorPush({
    vendorId,
    title: `Paid · ${order.code}`,
    body: `${customerName} paid ${formatGhs(order.goods_total)} · ${dropTitle} · Batch ${batchNumber}`,
    url: `/dashboard/orders`,
    tag: `order-paid-${orderId}`,
    idempotencyKey: `vendor-push-paid-${orderId}`,
  });
}

/** Someone added a product to their bag on the public shop. */
export async function notifyVendorBagAdd(params: {
  vendorId: string;
  productName: string;
  qty: number;
  dropTitle?: string;
}): Promise<void> {
  const label =
    params.qty > 1
      ? `${params.qty}× ${params.productName}`
      : params.productName;

  await notifyVendorPush({
    vendorId: params.vendorId,
    title: "Added to bag",
    body: params.dropTitle ? `${label} · ${params.dropTitle}` : label,
    url: `/dashboard`,
    tag: `bag-${params.vendorId}-${params.productName.slice(0, 40)}`,
    idempotencyKey: `vendor-push-bag-${params.vendorId}-${params.productName}-${Math.floor(Date.now() / 120_000)}`,
  });
}
