import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type UpsertedCustomer = {
  id: string;
};

/**
 * Resolve the buyer for a shop by phone number — the identity customers sign
 * in with (see customer-auth.ts).
 *
 * Nothing typed at checkout is verified, so it never rewrites an existing
 * customer. Moving a customer's phone to whatever was typed would let anyone
 * who knows a victim's email claim their record and then sign in with their
 * own phone to read the victim's orders and address; rewriting the email
 * would redirect the victim's order emails, links included, to a stranger.
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

  const { data: existing } = await admin
    .from("customers")
    .select("id")
    .eq("vendor_id", input.vendorId)
    .eq("phone", phone)
    .maybeSingle();

  if (existing) return { id: existing.id };

  const insert = (withEmail: string | null) =>
    admin
      .from("customers")
      .insert({ vendor_id: input.vendorId, name, phone, email: withEmail })
      .select("id")
      .single();

  let { data: created, error } = await insert(email || null);

  // Until the one-account-per-email index is dropped (customer_sign_in
  // migration), an email already on another customer here can't be reused.
  // The order still goes through; it just won't get emails.
  if (error?.code === "23505" && error.message.includes("customers_vendor_email_uniq")) {
    ({ data: created, error } = await insert(null));
  }

  // Two checkouts racing with the same new number: the other one won.
  if (error?.code === "23505") {
    const { data: raced } = await admin
      .from("customers")
      .select("id")
      .eq("vendor_id", input.vendorId)
      .eq("phone", phone)
      .maybeSingle();
    if (raced) return { id: raced.id };
  }

  if (error || !created) {
    throw new Error(error?.message ?? "Could not save customer");
  }

  return { id: created.id };
}
