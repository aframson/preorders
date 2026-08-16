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
  batchNumber: number;
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

export async function getCustomerPortal(
  portalToken: string,
): Promise<CustomerPortal | null> {
  const admin = createAdminClient();

  const { data: customer } = await admin
    .from("customers")
    .select(
      "id, name, email, portal_token, vendors(slug, business_name, logo_path), orders(id, code, public_token, status, fulfilment, goods_total, freight_amount, created_at, batches(number, drops(title)))",
    )
    .eq("portal_token", portalToken)
    .maybeSingle();

  if (!customer?.vendors) return null;

  const orders: PortalOrder[] = (customer.orders ?? [])
    .map((order) => ({
      id: order.id,
      code: order.code,
      publicToken: order.public_token,
      status: order.status as OrderStatus,
      fulfilment: order.fulfilment as "pickup" | "delivery",
      goodsTotal: order.goods_total,
      freightAmount: order.freight_amount,
      createdAt: order.created_at,
      dropTitle: order.batches?.drops?.title ?? "Drop",
      batchNumber: order.batches?.number ?? 0,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    portalToken: customer.portal_token,
    customerName: customer.name,
    email: customer.email,
    vendor: {
      slug: customer.vendors.slug,
      businessName: customer.vendors.business_name,
      logoPath: customer.vendors.logo_path,
    },
    orders,
  };
}
