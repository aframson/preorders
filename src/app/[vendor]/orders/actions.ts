"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { findVendorCustomerAccess } from "@/lib/queries/find-vendor-orders";
import { getPublicVendor } from "@/lib/queries/public-vendor";

export type FindOrdersState = {
  error?: string | null;
};

export async function findOrdersAction(
  _prev: FindOrdersState,
  formData: FormData,
): Promise<FindOrdersState> {
  const vendorSlug = String(formData.get("vendorSlug") ?? "").trim();
  const emailRaw = String(formData.get("email") ?? "").trim();
  const orderCode = String(formData.get("orderCode") ?? "").trim();

  if (!vendorSlug) return { error: "Seller not found" };

  const email = emailRaw.toLowerCase();
  if (email) {
    const emailCheck = z.email().safeParse(email);
    if (!emailCheck.success) {
      return { error: "Enter a valid email address" };
    }
  }

  const data = await getPublicVendor(vendorSlug);
  if (!data) return { error: "Seller not found" };

  const result = await findVendorCustomerAccess({
    vendorId: data.vendor.id,
    email: email || null,
    orderCode: orderCode || null,
  });

  if ("error" in result) return { error: result.error };

  redirect(result.href);
}
