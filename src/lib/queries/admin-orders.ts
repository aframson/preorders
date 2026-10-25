import "server-only";

import { requireAdmin } from "@/lib/admin-auth";
import type { Json } from "@/lib/database.types";
import type { Pesewas } from "@/lib/money";
import type { PaymentStatus, PaymentType } from "@/lib/payment-status";
import type { BatchStatus, FulfilmentMethod, OrderStatus } from "@/lib/status";
import { createAdminClient } from "@/lib/supabase/admin";

export const ADMIN_ORDERS_LIMIT = 100;

export type AdminOrderRow = {
  id: string;
  code: string;
  status: OrderStatus;
  goodsTotal: Pesewas;
  freightAmount: Pesewas | null;
  createdAt: string;
  customer: { name: string; phone: string; email: string | null };
  vendor: { id: string; name: string };
  batchNumber: number;
  dropTitle: string;
};

const ORDER_ROW_SELECT =
  "id, code, status, goods_total, freight_amount, created_at, customers(name, phone, email), batches!inner(number, drops!inner(title, vendor_id, vendors!inner(id, business_name)))";

type OrderRowData = {
  id: string;
  code: string;
  status: OrderStatus;
  goods_total: number;
  freight_amount: number | null;
  created_at: string;
  customers: { name: string; phone: string; email: string | null } | null;
  batches: {
    number: number;
    drops: { title: string; vendors: { id: string; business_name: string } };
  };
};

function toRow(order: OrderRowData): AdminOrderRow {
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    goodsTotal: order.goods_total,
    freightAmount: order.freight_amount,
    createdAt: order.created_at,
    customer: {
      name: order.customers?.name ?? "Unknown",
      phone: order.customers?.phone ?? "",
      email: order.customers?.email ?? null,
    },
    vendor: {
      id: order.batches.drops.vendors.id,
      name: order.batches.drops.vendors.business_name,
    },
    batchNumber: order.batches.number,
    dropTitle: order.batches.drops.title,
  };
}

/**
 * Strips characters that are wildcards or filter syntax to PostgREST, so a
 * pasted value can only ever be matched as text. `_` stays: as a LIKE
 * wildcard it matches itself anyway, and emails need it.
 */
function cleanSearch(value: string): string {
  return value.replace(/[%*\\(),]/g, "").trim().slice(0, 100);
}

/**
 * One box for every way a support request identifies an order: the order
 * code, the Paystack reference from a customer's receipt, or the customer's
 * phone, email or name. Phone matching uses the last nine digits so
 * "024 123 4567", "0241234567" and "+233241234567" all find the same person.
 */
export async function searchAdminOrders(params: {
  q?: string;
  status?: OrderStatus;
  vendorId?: string;
}): Promise<AdminOrderRow[]> {
  await requireAdmin();
  const admin = createAdminClient();
  const q = cleanSearch(params.q ?? "");

  let orderIds: string[] | null = null;

  if (q) {
    const digits = q.replace(/\D/g, "");
    const phoneTail = digits.length >= 6 ? digits.slice(-9) : null;

    const [byCode, byReference, byEmail, byName, byPhone] = await Promise.all([
      admin.from("orders").select("id").ilike("code", `%${q}%`).limit(50),
      admin.from("payments").select("order_id").ilike("provider_ref", `%${q}%`).limit(50),
      admin.from("customers").select("id").ilike("email", `%${q}%`).limit(50),
      admin.from("customers").select("id").ilike("name", `%${q}%`).limit(50),
      phoneTail
        ? admin.from("customers").select("id").ilike("phone", `%${phoneTail}%`).limit(50)
        : Promise.resolve({ data: [] as { id: string }[] }),
    ]);

    const customerIds = [
      ...(byEmail.data ?? []),
      ...(byName.data ?? []),
      ...(byPhone.data ?? []),
    ].map((customer) => customer.id);

    const byCustomer =
      customerIds.length > 0
        ? await admin
            .from("orders")
            .select("id")
            .in("customer_id", [...new Set(customerIds)])
            .limit(ADMIN_ORDERS_LIMIT)
        : { data: [] as { id: string }[] };

    orderIds = [
      ...new Set([
        ...(byCode.data ?? []).map((order) => order.id),
        ...(byReference.data ?? []).map((payment) => payment.order_id),
        ...(byCustomer.data ?? []).map((order) => order.id),
      ]),
    ];

    if (orderIds.length === 0) return [];
  }

  let query = admin
    .from("orders")
    .select(ORDER_ROW_SELECT)
    .order("created_at", { ascending: false })
    .limit(ADMIN_ORDERS_LIMIT);

  if (orderIds) query = query.in("id", orderIds);
  if (params.status) query = query.eq("status", params.status);
  if (params.vendorId) query = query.eq("batches.drops.vendor_id", params.vendorId);

  const { data, error } = await query;
  if (error) throw new Error(`Could not search orders: ${error.message}`);

  return (data ?? []).map(toRow);
}

export type AdminOrderPayment = {
  id: string;
  type: PaymentType;
  status: PaymentStatus;
  amount: Pesewas;
  reference: string;
  createdAt: string;
  paidAt: string | null;
  raw: Json | null;
};

export type AdminOrderDetail = {
  id: string;
  code: string;
  status: OrderStatus;
  publicToken: string;
  goodsTotal: Pesewas;
  goodsPaidAt: string | null;
  freightEstimate: Pesewas;
  freightUnits: number;
  freightAmount: Pesewas | null;
  freightInvoicedAt: string | null;
  freightPaidAt: string | null;
  fulfilment: FulfilmentMethod;
  deliveryNote: string | null;
  holdExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  collectedAt: string | null;
  customer: { id: string; name: string; phone: string; email: string | null } | null;
  batch: {
    id: string;
    number: number;
    status: BatchStatus;
    opensAt: string;
    closesAt: string;
    closedAt: string | null;
    freightFinalisedAt: string | null;
    dropId: string;
    dropTitle: string;
    vendor: { id: string; name: string; slug: string };
  };
  items: {
    id: string;
    qty: number;
    unitPrice: Pesewas;
    name: string;
    variant: string | null;
  }[];
  payments: AdminOrderPayment[];
};

export async function getAdminOrder(
  orderId: string,
): Promise<AdminOrderDetail | null> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select(
      "id, code, status, public_token, goods_total, goods_paid_at, freight_estimate, freight_units, freight_amount, freight_invoiced_at, freight_paid_at, fulfilment, delivery_note, hold_expires_at, created_at, updated_at, cancelled_at, collected_at, customers(id, name, phone, email), batches!inner(id, number, status, opens_at, closes_at, closed_at, freight_finalised_at, drops!inner(id, title, vendors!inner(id, business_name, slug))), order_items(id, qty, unit_price, snapshot), payments(id, type, status, amount, provider_ref, created_at, paid_at, raw)",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return null;

  return {
    id: order.id,
    code: order.code,
    status: order.status,
    publicToken: order.public_token,
    goodsTotal: order.goods_total,
    goodsPaidAt: order.goods_paid_at,
    freightEstimate: order.freight_estimate,
    freightUnits: Number(order.freight_units),
    freightAmount: order.freight_amount,
    freightInvoicedAt: order.freight_invoiced_at,
    freightPaidAt: order.freight_paid_at,
    fulfilment: order.fulfilment,
    deliveryNote: order.delivery_note,
    holdExpiresAt: order.hold_expires_at,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    cancelledAt: order.cancelled_at,
    collectedAt: order.collected_at,
    customer: order.customers,
    batch: {
      id: order.batches.id,
      number: order.batches.number,
      status: order.batches.status,
      opensAt: order.batches.opens_at,
      closesAt: order.batches.closes_at,
      closedAt: order.batches.closed_at,
      freightFinalisedAt: order.batches.freight_finalised_at,
      dropId: order.batches.drops.id,
      dropTitle: order.batches.drops.title,
      vendor: {
        id: order.batches.drops.vendors.id,
        name: order.batches.drops.vendors.business_name,
        slug: order.batches.drops.vendors.slug,
      },
    },
    items: (order.order_items ?? []).map((item) => {
      const snapshot = (item.snapshot ?? {}) as {
        productName?: string;
        variantLabel?: string;
        variantName?: string;
        variantValue?: string;
      };
      return {
        id: item.id,
        qty: item.qty,
        unitPrice: item.unit_price,
        name: snapshot.productName ?? "Item",
        variant:
          snapshot.variantLabel ??
          (snapshot.variantName && snapshot.variantValue
            ? `${snapshot.variantName} ${snapshot.variantValue}`
            : null),
      };
    }),
    payments: (order.payments ?? [])
      .map((payment) => ({
        id: payment.id,
        type: payment.type,
        status: payment.status,
        amount: payment.amount,
        reference: payment.provider_ref,
        createdAt: payment.created_at,
        paidAt: payment.paid_at,
        raw: payment.raw,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}
