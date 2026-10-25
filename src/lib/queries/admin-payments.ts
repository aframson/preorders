import "server-only";

import { requireAdmin } from "@/lib/admin-auth";
import type { Pesewas } from "@/lib/money";
import type { PaymentStatus, PaymentType } from "@/lib/payment-status";
import type { OrderStatus } from "@/lib/status";
import { createAdminClient } from "@/lib/supabase/admin";

export const ADMIN_PAYMENTS_LIMIT = 300;

export type AdminPaymentRow = {
  id: string;
  amount: Pesewas;
  type: PaymentType;
  status: PaymentStatus;
  reference: string;
  createdAt: string;
  paidAt: string | null;
  order: { id: string; code: string; status: OrderStatus };
  customer: { name: string; phone: string };
  vendor: { id: string; name: string };
  batchNumber: number;
  dropTitle: string;
};

const PAYMENT_SELECT =
  "id, amount, type, status, provider_ref, created_at, paid_at, orders!inner(id, code, status, customers(name, phone), batches!inner(number, drops!inner(title, vendor_id, vendors!inner(id, business_name))))";

export async function getAdminPayments(filters: {
  status?: PaymentStatus;
  type?: PaymentType;
  vendorId?: string;
  limit?: number;
}): Promise<AdminPaymentRow[]> {
  await requireAdmin();
  const admin = createAdminClient();

  let query = admin
    .from("payments")
    .select(PAYMENT_SELECT)
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? ADMIN_PAYMENTS_LIMIT);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.vendorId) {
    query = query.eq("orders.batches.drops.vendor_id", filters.vendorId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Could not load payments: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    amount: row.amount,
    type: row.type,
    status: row.status,
    reference: row.provider_ref,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    order: { id: row.orders.id, code: row.orders.code, status: row.orders.status },
    customer: {
      name: row.orders.customers?.name ?? "Unknown",
      phone: row.orders.customers?.phone ?? "",
    },
    vendor: {
      id: row.orders.batches.drops.vendors.id,
      name: row.orders.batches.drops.vendors.business_name,
    },
    batchNumber: row.orders.batches.number,
    dropTitle: row.orders.batches.drops.title,
  }));
}
