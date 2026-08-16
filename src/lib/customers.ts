import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type UpsertedCustomer = {
  id: string;
  portalToken: string;
};

/**
 * Resolve the buyer by email first (stable hub link), then by phone.
 * Same email at a vendor always maps to one portal, even across phones.
 */
export async function upsertCustomer(input: {
  vendorId: string;
  name: string;
  phone: string;
  email: string;
}): Promise<UpsertedCustomer> {
  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const phone = input.phone;

  const { data: byEmail } = await admin
    .from("customers")
    .select("id, portal_token, phone")
    .eq("vendor_id", input.vendorId)
    .eq("email", email)
    .maybeSingle();

  if (byEmail) {
    const patch: { name: string; phone?: string } = { name };
    if (byEmail.phone !== phone) {
      const { data: phoneOwner } = await admin
        .from("customers")
        .select("id")
        .eq("vendor_id", input.vendorId)
        .eq("phone", phone)
        .neq("id", byEmail.id)
        .maybeSingle();
      if (!phoneOwner) patch.phone = phone;
    }

    await admin.from("customers").update(patch).eq("id", byEmail.id);
    return { id: byEmail.id, portalToken: byEmail.portal_token };
  }

  const { data: byPhone } = await admin
    .from("customers")
    .select("id, portal_token")
    .eq("vendor_id", input.vendorId)
    .eq("phone", phone)
    .maybeSingle();

  if (byPhone) {
    await admin
      .from("customers")
      .update({ name, email })
      .eq("id", byPhone.id);
    return { id: byPhone.id, portalToken: byPhone.portal_token };
  }

  const { data: created, error } = await admin
    .from("customers")
    .insert({
      vendor_id: input.vendorId,
      name,
      phone,
      email,
    })
    .select("id, portal_token")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Could not save customer");
  }

  return { id: created.id, portalToken: created.portal_token };
}
