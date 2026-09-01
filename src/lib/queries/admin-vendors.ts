import "server-only";

import { requireAdmin } from "@/lib/admin-auth";
import type { Database } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

type ApprovalStatus = Database["public"]["Enums"]["vendor_approval_status"];

export type AdminVendorListItem = {
  id: string;
  slug: string;
  businessName: string;
  supportEmail: string | null;
  whatsappNumber: string | null;
  createdAt: string;
  payoutConnected: boolean;
  payoutAccountName: string | null;
  approvalStatus: ApprovalStatus;
};

export async function getAdminVendors(): Promise<AdminVendorListItem[]> {
  await requireAdmin();
  const admin = createAdminClient();
  const [{ data: vendors, error }, { data: approvals }] = await Promise.all([
    admin
      .from("vendors")
      .select(
        "id, slug, business_name, support_email, whatsapp_number, created_at, paystack_subaccount_code, payout_account_name",
      )
      .order("created_at", { ascending: false }),
    admin.from("vendor_approvals").select("vendor_id, status"),
  ]);

  if (error) throw new Error("Could not load vendors");

  const statusByVendor = new Map(
    (approvals ?? []).map((approval) => [approval.vendor_id, approval.status]),
  );

  return (vendors ?? [])
    .map((vendor) => ({
      id: vendor.id,
      slug: vendor.slug,
      businessName: vendor.business_name,
      supportEmail: vendor.support_email,
      whatsappNumber: vendor.whatsapp_number,
      createdAt: vendor.created_at,
      payoutConnected: Boolean(vendor.paystack_subaccount_code),
      payoutAccountName: vendor.payout_account_name,
      approvalStatus: statusByVendor.get(vendor.id) ?? "pending",
    }))
    .sort((a, b) => {
      const rank: Record<ApprovalStatus, number> = {
        pending: 0,
        rejected: 1,
        approved: 2,
      };
      return (
        rank[a.approvalStatus] - rank[b.approvalStatus] ||
        b.createdAt.localeCompare(a.createdAt)
      );
    });
}

export type AdminVendorDetail = {
  id: string;
  slug: string;
  businessName: string;
  logoPath: string | null;
  supportEmail: string | null;
  whatsappNumber: string | null;
  pickupMapsUrl: string | null;
  createdAt: string;
  updatedAt: string;
  paystackSubaccountCode: string | null;
  payoutVerifiedAt: string | null;
  payoutChannel: string | null;
  payoutBankCode: string | null;
  payoutAccountNumber: string | null;
  payoutAccountName: string | null;
  approval: {
    status: ApprovalStatus;
    note: string | null;
    reviewedAt: string | null;
    reviewedBy: string | null;
  };
  metrics: {
    drops: number;
    products: number;
    customers: number;
    orders: number;
    paidOrderValue: number;
  };
};

export async function getAdminVendor(
  vendorId: string,
): Promise<AdminVendorDetail | null> {
  await requireAdmin();
  const admin = createAdminClient();
  const [{ data: vendor }, { data: approval }] = await Promise.all([
    admin.from("vendors").select("*").eq("id", vendorId).maybeSingle(),
    admin
      .from("vendor_approvals")
      .select("status, note, reviewed_at, reviewed_by")
      .eq("vendor_id", vendorId)
      .maybeSingle(),
  ]);

  if (!vendor) return null;

  const [{ data: drops }, customerCount] = await Promise.all([
    admin.from("drops").select("id").eq("vendor_id", vendorId),
    admin
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("vendor_id", vendorId),
  ]);

  const dropIds = (drops ?? []).map((drop) => drop.id);
  let productCount = 0;
  let orders: { status: string; goods_total: number }[] = [];

  if (dropIds.length > 0) {
    const [{ count }, { data: batches }] = await Promise.all([
      admin
        .from("products")
        .select("*", { count: "exact", head: true })
        .in("drop_id", dropIds),
      admin.from("batches").select("id").in("drop_id", dropIds),
    ]);
    productCount = count ?? 0;

    const batchIds = (batches ?? []).map((batch) => batch.id);
    if (batchIds.length > 0) {
      const { data } = await admin
        .from("orders")
        .select("status, goods_total")
        .in("batch_id", batchIds);
      orders = data ?? [];
    }
  }

  const paidOrders = orders.filter(
    (order) =>
      order.status !== "pending_payment" && order.status !== "cancelled",
  );

  return {
    id: vendor.id,
    slug: vendor.slug,
    businessName: vendor.business_name,
    logoPath: vendor.logo_path,
    supportEmail: vendor.support_email,
    whatsappNumber: vendor.whatsapp_number,
    pickupMapsUrl: vendor.pickup_maps_url,
    createdAt: vendor.created_at,
    updatedAt: vendor.updated_at,
    paystackSubaccountCode: vendor.paystack_subaccount_code,
    payoutVerifiedAt: vendor.payout_verified_at,
    payoutChannel: vendor.payout_channel,
    payoutBankCode: vendor.payout_bank_code,
    payoutAccountNumber: vendor.payout_account_number,
    payoutAccountName: vendor.payout_account_name,
    approval: {
      status: approval?.status ?? "pending",
      note: approval?.note ?? null,
      reviewedAt: approval?.reviewed_at ?? null,
      reviewedBy: approval?.reviewed_by ?? null,
    },
    metrics: {
      drops: dropIds.length,
      products: productCount,
      customers: customerCount.count ?? 0,
      orders: paidOrders.length,
      paidOrderValue: paidOrders.reduce(
        (total, order) => total + order.goods_total,
        0,
      ),
    },
  };
}

export function maskAccountNumber(value: string | null): string {
  if (!value) return "Not connected";
  if (value.length <= 4) return value;
  return `${"•".repeat(Math.min(6, value.length - 4))}${value.slice(-4)}`;
}
