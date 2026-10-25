import "server-only";

import type { Pesewas } from "@/lib/money";
import type { OrderStatus } from "@/lib/status";
import { createAdminClient } from "@/lib/supabase/admin";

export type PortalOrder = {
  id: string;
  code: string;
  publicToken: string;
  status: OrderStatus;
  fulfilment: "pickup" | "delivery";
  goodsTotal: Pesewas;
  freightAmount: Pesewas | null;
  createdAt: string;
  dropTitle: string;
  dropSlug: string | null;
  batchNumber: number;
  expectedDeliveryAt: string | null;
  thumbPath: string | null;
  /** What the customer recognises the order by, e.g. "2× Sneakers + 1 more". */
  itemsLabel: string;
  vendor: { name: string; slug: string };
};

export type CustomerPortal = {
  portalToken: string;
  customerName: string;
  email: string | null;
  vendor: {
    slug: string;
    businessName: string;
    logoPath: string | null;
  };
  orders: PortalOrder[];
};

type ItemSnapshot = {
  imagePath?: string;
  productName?: string;
};

const ORDER_FIELDS =
  "id, code, public_token, status, fulfilment, goods_total, freight_amount, created_at, order_items(qty, snapshot), batches(number, expected_delivery_at, drops(title, slug, vendor_id, vendors(business_name, slug)))";

type OrderRow = {
  id: string;
  code: string;
  public_token: string;
  status: string;
  fulfilment: string;
  goods_total: number;
  freight_amount: number | null;
  created_at: string;
  order_items: { qty: number; snapshot: unknown }[] | null;
  batches: {
    number: number;
    expected_delivery_at: string | null;
    drops: {
      title: string;
      slug: string;
      vendor_id: string;
      vendors: { business_name: string; slug: string } | null;
    } | null;
  } | null;
};

function itemsLabel(items: { qty: number; snapshot: ItemSnapshot }[]): string {
  const [first, ...rest] = items;
  if (!first) return "Order";
  const name = first.snapshot.productName ?? "Item";
  const lead = first.qty > 1 ? `${first.qty}× ${name}` : name;
  return rest.length > 0 ? `${lead} + ${rest.length} more` : lead;
}

function toPortalOrder(order: OrderRow): PortalOrder {
  const items = (order.order_items ?? []).map((item) => ({
    qty: item.qty,
    snapshot: (item.snapshot ?? {}) as ItemSnapshot,
  }));

  return {
    id: order.id,
    code: order.code,
    publicToken: order.public_token,
    status: order.status as OrderStatus,
    fulfilment: order.fulfilment as "pickup" | "delivery",
    goodsTotal: order.goods_total,
    freightAmount: order.freight_amount,
    createdAt: order.created_at,
    dropTitle: order.batches?.drops?.title ?? "Drop",
    dropSlug: order.batches?.drops?.slug ?? null,
    batchNumber: order.batches?.number ?? 0,
    expectedDeliveryAt: order.batches?.expected_delivery_at ?? null,
    thumbPath: items[0]?.snapshot.imagePath ?? null,
    itemsLabel: itemsLabel(items),
    vendor: {
      name: order.batches?.drops?.vendors?.business_name ?? "Shop",
      slug: order.batches?.drops?.vendors?.slug ?? "",
    },
  };
}

function newestFirst(a: PortalOrder, b: PortalOrder): number {
  return b.createdAt.localeCompare(a.createdAt);
}

export async function getCustomerPortal(
  portalToken: string,
): Promise<CustomerPortal | null> {
  const admin = createAdminClient();

  const { data: customer } = await admin
    .from("customers")
    .select(
      `id, name, email, portal_token, vendors(slug, business_name, logo_path), orders(${ORDER_FIELDS})`,
    )
    .eq("portal_token", portalToken)
    .maybeSingle();

  if (!customer?.vendors) return null;

  return {
    portalToken: customer.portal_token,
    customerName: customer.name,
    email: customer.email,
    vendor: {
      slug: customer.vendors.slug,
      businessName: customer.vendors.business_name,
      logoPath: customer.vendors.logo_path,
    },
    orders: (customer.orders ?? []).map(toPortalOrder).sort(newestFirst),
  };
}

/**
 * "My orders" across every shop: everything placed with the customer's
 * verified email address, plus any order this device placed or opened
 * (which may be under a different email, e.g. bought for someone else).
 * Device tokens are credentials the browser already holds, so they reveal
 * nothing new.
 */
export async function getAccountOrders(params: {
  email: string | null;
  deviceTokens: string[];
}): Promise<PortalOrder[]> {
  const admin = createAdminClient();

  const [byEmail, byDevice] = await Promise.all([
    params.email
      ? admin
          .from("customers")
          .select(`orders(${ORDER_FIELDS})`)
          .eq("email", params.email)
      : Promise.resolve({ data: [] as { orders: OrderRow[] }[] }),
    params.deviceTokens.length > 0
      ? admin.from("orders").select(ORDER_FIELDS).in("public_token", params.deviceTokens)
      : Promise.resolve({ data: [] as OrderRow[] }),
  ]);

  const unique = new Map<string, OrderRow>();
  for (const customer of byEmail.data ?? []) {
    for (const order of customer.orders ?? []) unique.set(order.id, order);
  }
  for (const order of byDevice.data ?? []) unique.set(order.id, order);

  return [...unique.values()].map(toPortalOrder).sort(newestFirst);
}

/** Customer still owes money — show these first in the hub. */
export function portalNeedsAction(order: PortalOrder): boolean {
  return (
    order.status === "pending_payment" || order.status === "awaiting_freight"
  );
}

export function portalIsDone(order: PortalOrder): boolean {
  return order.status === "collected" || order.status === "cancelled";
}

export function portalActionHint(order: PortalOrder): string | null {
  if (order.status === "pending_payment") return "Pay to confirm";
  if (order.status === "awaiting_freight") return "Pay shipping";
  return null;
}
