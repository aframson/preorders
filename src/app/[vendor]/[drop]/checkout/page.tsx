import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getCustomerSession } from "@/lib/customer-auth";
import { getPublicDrop } from "@/lib/queries/public-drop";
import { dropPath } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { CheckoutForm } from "./checkout-form";
import { ClosedNotice } from "./closed-notice";

/**
 * A signed-in customer proved their email, not their name or phone — those
 * only exist once they've ordered from *this* vendor before, since customers
 * are still per-vendor records. Nothing is asked of them beyond the session;
 * a stranger email with no history here just prefills the email and nothing
 * else. `limit(1)` rather than `maybeSingle()` because email isn't unique
 * per vendor (only phone is) — a signed-in email could in principle match
 * more than one row here, and any one of them is a reasonable prefill.
 */
async function sessionCustomerDetails(
  vendorId: string,
): Promise<{ name: string; phone: string; email: string } | null> {
  const session = await getCustomerSession();
  if (!session) return null;

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("customers")
    .select("name, phone")
    .eq("vendor_id", vendorId)
    .eq("email", session.email)
    .order("updated_at", { ascending: false })
    .limit(1);

  const customer = rows?.[0];
  return {
    name: customer?.name ?? "",
    phone: customer?.phone ?? "",
    email: session.email,
  };
}

export const metadata = { title: "Review your order" };

export default async function CheckoutPage({
  params,
}: PageProps<"/[vendor]/[drop]/checkout">) {
  const { vendor: vendorSlug, drop: dropSlug } = await params;

  const data = await getPublicDrop(vendorSlug, dropSlug);
  if (!data) notFound();

  const base = dropPath(vendorSlug, dropSlug);

  if (!data.openBatch) {
    return <ClosedNotice base={base} businessName={data.vendor.businessName} />;
  }

  const sessionCustomer = await sessionCustomerDetails(data.vendor.id);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 px-5 py-3 backdrop-blur">
        <Link
          href={base}
          className="inline-flex items-center gap-1 text-sm text-ink-muted"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Keep shopping
        </Link>
      </header>

      <CheckoutForm
        vendorSlug={vendorSlug}
        dropSlug={dropSlug}
        batch={data.openBatch}
        businessName={data.vendor.businessName}
        pickupMapsUrl={data.vendor.pickupMapsUrl}
        sessionCustomer={sessionCustomer}
      />
    </div>
  );
}
