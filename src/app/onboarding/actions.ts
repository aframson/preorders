"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getVendor, requireUser, requireVendor } from "@/lib/auth";
import { PLATFORM_FEE_PERCENT } from "@/lib/fees";
import {
  createSubaccount,
  isPaystackConfigured,
  PaystackError,
  paystackMode,
  resolveAccount,
} from "@/lib/paystack";
import { normaliseMomoAccountNumber } from "@/lib/phone";
import { isReservedSlug, slugify } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fromAccraInputValue } from "@/lib/time";

export type ActionState = { error?: string | null; message?: string | null };

// Step 2 - business ----------------------------------------------------------

const businessSchema = z.object({
  businessName: z.string().trim().min(2, "Give your business a name"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/,
      "Use 3-40 letters, numbers or hyphens",
    ),
  whatsappNumber: z
    .string()
    .trim()
    .regex(/^[\d\s+()-]{9,20}$/, "Enter a valid WhatsApp number"),
});

export async function saveBusiness(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = businessSchema.safeParse({
    businessName: formData.get("businessName"),
    slug: formData.get("slug"),
    whatsappNumber: formData.get("whatsappNumber"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { businessName, slug, whatsappNumber } = parsed.data;

  if (isReservedSlug(slug)) {
    return { error: `"${slug}" is reserved. Try another link name.` };
  }

  const existing = await getVendor();
  const supabase = await createClient();

  if (existing) {
    const { error } = await supabase
      .from("vendors")
      .update({
        business_name: businessName,
        slug,
        whatsapp_number: whatsappNumber,
      })
      .eq("id", existing.id);

    if (error) {
      return { error: describeSlugError(error.message, slug) };
    }

    redirect("/onboarding/payout");
  }

  // The vendor row and its first membership row have to land together, so this
  // runs under the service role rather than as two client-visible writes.
  const admin = createAdminClient();

  const { data: vendor, error: vendorError } = await admin
    .from("vendors")
    .insert({
      business_name: businessName,
      slug,
      whatsapp_number: whatsappNumber,
      support_email: user.email ?? null,
    })
    .select("id")
    .single();

  if (vendorError || !vendor) {
    return { error: describeSlugError(vendorError?.message ?? "", slug) };
  }

  const { error: memberError } = await admin
    .from("vendor_members")
    .insert({ vendor_id: vendor.id, user_id: user.id, role: "owner" });

  if (memberError) {
    await admin.from("vendors").delete().eq("id", vendor.id);
    return { error: "Could not finish setting up your account. Try again." };
  }

  redirect("/onboarding/payout");
}

function describeSlugError(message: string, slug: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("vendors_slug_key") || lower.includes("duplicate")) {
    return `"${slug}" is already taken. Try another link name.`;
  }

  if (lower.includes("permission denied") || lower.includes("row-level security")) {
    return "We couldn't save your business details right now. Please try again in a moment.";
  }

  if (!message.trim()) {
    return "Could not save your business details. Try again.";
  }

  // Never surface raw database wording to vendors.
  return "Could not save your business details. Check your details and try again.";
}

/** Suggest a slug, avoiding ones already in use. */
export async function suggestSlug(businessName: string): Promise<string> {
  const base = slugify(businessName) || "shop";
  const admin = createAdminClient();

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    if (isReservedSlug(candidate)) continue;

    const { data } = await admin
      .from("vendors")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!data) return candidate;
  }

  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

// Step 3 - payout ------------------------------------------------------------

export type ResolveState = {
  accountName?: string | null;
  accountNumber?: string | null;
  bankCode?: string | null;
  error?: string | null;
};

export async function resolvePayoutAccount(
  _prev: ResolveState,
  formData: FormData,
): Promise<ResolveState> {
  await requireVendor();

  const rawNumber = String(formData.get("accountNumber") ?? "").trim();
  const bankCode = String(formData.get("bankCode") ?? "").trim();
  const accountNumber = normaliseMomoAccountNumber(rawNumber);

  if (!accountNumber || !bankCode) {
    return { error: "Choose your network and enter your number." };
  }

  if (accountNumber.length !== 10 || !accountNumber.startsWith("0")) {
    return { error: "Enter a Ghana MoMo number like 024 123 4567." };
  }

  if (!isPaystackConfigured()) {
    return {
      error:
        "Payouts are not connected yet on this environment. You can skip this step and add it later.",
    };
  }

  // Resolve is built for bank accounts. Real MoMo numbers usually fail on
  // test keys ("Could not resolve account name"). In test we confirm the
  // number shape and let create-subaccount be the real check; live still
  // prefers a successful resolve when Paystack can provide one.
  try {
    const resolved = await resolveAccount(accountNumber, bankCode);
    return {
      accountName: resolved.accountName,
      accountNumber: resolved.accountNumber,
      bankCode,
    };
  } catch (error) {
    if (paystackMode() === "test") {
      return {
        accountName: `Unverified · check ${bankCode} matches this number`,
        accountNumber,
        bankCode,
      };
    }

    return {
      error:
        error instanceof PaystackError
          ? error.message
          : "Could not check that number. Confirm it and try again.",
    };
  }
}

export async function savePayout(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const vendor = await requireVendor();

  const accountNumber = normaliseMomoAccountNumber(
    String(formData.get("accountNumber") ?? ""),
  );
  const bankCode = String(formData.get("bankCode") ?? "").trim();

  if (!accountNumber || !bankCode) {
    return { error: "Confirm your payout number first." };
  }

  try {
    const subaccount = await createSubaccount({
      businessName: vendor.businessName,
      settlementBank: bankCode,
      accountNumber,
      percentageCharge: PLATFORM_FEE_PERCENT.goods,
      primaryContactPhone: vendor.whatsappNumber
        ? normaliseMomoAccountNumber(vendor.whatsappNumber)
        : undefined,
    });

    const supabase = await createClient();
    const { error } = await supabase
      .from("vendors")
      .update({
        paystack_subaccount_code: subaccount.subaccountCode,
        payout_verified_at: new Date().toISOString(),
      })
      .eq("id", vendor.id);

    if (error) return { error: error.message };
  } catch (error) {
    if (
      error instanceof PaystackError &&
      /account details are invalid/i.test(error.message)
    ) {
      return {
        error:
          paystackMode() === "test"
            ? `That number does not match ${bankCode}. Pick the right network, or use Paystack’s test pair: MTN + 055 123 4987.`
            : `That number does not match ${bankCode}. Confirm the network and try again.`,
      };
    }

    return {
      error:
        error instanceof PaystackError
          ? error.message
          : "Could not connect your payout account. Try again.",
    };
  }

  redirect("/onboarding/drop");
}

// Step 4 - first drop --------------------------------------------------------

const dropSchema = z.object({
  title: z.string().trim().min(2, "Give this drop a name"),
  freightMode: z.enum(["air_kg", "sea_cbm"]),
  closesAt: z.string().min(1, "Choose when orders close"),
});

export async function createFirstDrop(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const vendor = await requireVendor();

  const parsed = dropSchema.safeParse({
    title: formData.get("title"),
    freightMode: formData.get("freightMode"),
    closesAt: formData.get("closesAt"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // The picker shows Accra time, so the value has to be read back as Accra
  // time rather than as whatever zone the server happens to run in.
  const closesAt = fromAccraInputValue(parsed.data.closesAt);
  if (Number.isNaN(closesAt.getTime())) {
    return { error: "Choose when orders close" };
  }
  if (closesAt.getTime() <= Date.now()) {
    return { error: "The cutoff has to be in the future" };
  }

  const supabase = await createClient();

  // Refreshing or double-submitting after a partial success must not invent a
  // second drop. Continue with the one they already have.
  const { data: existingDrop } = await supabase
    .from("drops")
    .select("id, slug")
    .eq("vendor_id", vendor.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingDrop) {
    await ensureFirstBatch(supabase, existingDrop.id, {
      closesAt,
      freightMode: parsed.data.freightMode,
    });
    redirect(`/onboarding/done?drop=${existingDrop.slug}`);
  }

  const baseSlug = slugify(parsed.data.title) || "batch";
  let drop: { id: string; slug: string } | null = null;

  for (let attempt = 0; attempt < 8; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const { data, error } = await supabase
      .from("drops")
      .insert({
        vendor_id: vendor.id,
        slug,
        title: parsed.data.title,
        default_freight_mode: parsed.data.freightMode,
        published: true,
      })
      .select("id, slug")
      .single();

    if (!error && data) {
      drop = data;
      break;
    }

    if (!isUniqueViolation(error?.message ?? "")) {
      return {
        error: friendlyDropError(error?.message ?? "Could not create your drop."),
      };
    }
  }

  if (!drop) {
    return { error: "Could not create your drop. Try a different name." };
  }

  const batchError = await ensureFirstBatch(supabase, drop.id, {
    closesAt,
    freightMode: parsed.data.freightMode,
  });
  if (batchError) return { error: batchError };

  redirect(`/onboarding/done?drop=${drop.slug}`);
}

async function ensureFirstBatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dropId: string,
  params: { closesAt: Date; freightMode: "air_kg" | "sea_cbm" },
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("batches")
    .select("id")
    .eq("drop_id", dropId)
    .eq("number", 1)
    .maybeSingle();

  if (existing) return null;

  // Scheduled rather than open: the batch cannot accept orders until there are
  // products in it, and opening it now would trip the freight-readiness check.
  const { error } = await supabase.from("batches").insert({
    drop_id: dropId,
    number: 1,
    status: "scheduled",
    closes_at: params.closesAt.toISOString(),
    freight_mode: params.freightMode,
  });

  return error ? friendlyDropError(error.message) : null;
}

function isUniqueViolation(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("duplicate key") ||
    lower.includes("unique constraint") ||
    lower.includes("drops_vendor_id_slug_key")
  );
}

function friendlyDropError(message: string): string {
  if (isUniqueViolation(message)) {
    return "You already have a drop with that link. Open your dashboard to continue.";
  }
  return message.trim() || "Could not create your drop. Try again.";
}
