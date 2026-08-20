import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { customerPortalPath, orderPath } from "@/lib/site";

/**
 * Resolve a shopper's portal or single order for a vendor.
 * Uses the service role — customers/orders are locked down by RLS for anon.
 */
export async function findVendorCustomerAccess(input: {
  vendorId: string;
  email?: string | null;
  orderCode?: string | null;
}): Promise<{ href: string } | { error: string }> {
  const email = input.email?.trim().toLowerCase() || null;
  const orderCode = input.orderCode?.trim().toUpperCase() || null;

  if (!email && !orderCode) {
    return {
      error: "Enter the email you used at checkout, or your order code.",
    };
  }

  const admin = createAdminClient();

  if (orderCode) {
    const { data: order } = await admin
      .from("orders")
      .select("public_token, customers(email, vendor_id)")
      .eq("code", orderCode)
      .maybeSingle();

    const customer = order?.customers;
    if (!order || !customer || customer.vendor_id !== input.vendorId) {
      return {
        error:
          "No order with that code for this seller. Check the confirmation email.",
      };
    }

    if (email && customer.email?.toLowerCase() !== email) {
      return { error: "That order code does not match this email." };
    }

    return { href: orderPath(order.public_token) };
  }

  const { data: customer } = await admin
    .from("customers")
    .select("portal_token")
    .eq("vendor_id", input.vendorId)
    .eq("email", email!)
    .maybeSingle();

  if (!customer) {
    return {
      error:
        "No orders found for that email with this seller. Use the link in your confirmation email.",
    };
  }

  return { href: customerPortalPath(customer.portal_token) };
}
