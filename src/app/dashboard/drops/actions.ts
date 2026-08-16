"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireVendor } from "@/lib/auth";
import { requireVerifiedPayout } from "@/lib/payout-verification";
import { slugify } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string | null; message?: string | null };

// Drops ----------------------------------------------------------------------

const dropSchema = z.object({
  title: z.string().trim().min(2, "Give this drop a name"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  defaultFreightMode: z.enum(["air_kg", "sea_cbm"]),
});

export async function createDrop(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const vendor = await requireVendor();

  const parsed = dropSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    defaultFreightMode: formData.get("defaultFreightMode"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const slug = await uniqueDropSlug(vendor.id, parsed.data.title);

  const { data, error } = await supabase
    .from("drops")
    .insert({
      vendor_id: vendor.id,
      slug,
      title: parsed.data.title,
      description: parsed.data.description || null,
      default_freight_mode: parsed.data.defaultFreightMode,
      published: true,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create the drop." };
  }

  revalidatePath("/dashboard/drops");
  redirect(`/dashboard/drops/${data.id}`);
}

async function uniqueDropSlug(vendorId: string, title: string) {
  const supabase = await createClient();
  const base = slugify(title) || "drop";

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data } = await supabase
      .from("drops")
      .select("id")
      .eq("vendor_id", vendorId)
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }

  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

const dropSettingsSchema = dropSchema.extend({
  dropId: z.uuid(),
  published: z.coerce.boolean(),
});

export async function updateDrop(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireVendor();

  const parsed = dropSettingsSchema.safeParse({
    dropId: formData.get("dropId"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    defaultFreightMode: formData.get("defaultFreightMode"),
    published: formData.get("published") === "on",
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("drops")
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      default_freight_mode: parsed.data.defaultFreightMode,
      published: parsed.data.published,
    })
    .eq("id", parsed.data.dropId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/drops/${parsed.data.dropId}`);
  return { message: "Saved" };
}

export async function archiveDrop(dropId: string): Promise<void> {
  await requireVendor();

  const supabase = await createClient();
  await supabase
    .from("drops")
    .update({ archived_at: new Date().toISOString(), published: false })
    .eq("id", dropId);

  revalidatePath("/dashboard/drops");
  redirect("/dashboard/drops");
}

// Categories -----------------------------------------------------------------

export async function createCategory(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireVendor();

  const dropId = String(formData.get("dropId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!name) return { error: "Give the category a name" };

  const supabase = await createClient();
  const { count } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("drop_id", dropId);

  const { error } = await supabase
    .from("categories")
    .insert({ drop_id: dropId, name, position: count ?? 0 });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/drops/${dropId}`);
  return { message: `Added ${name}` };
}

export async function deleteCategory(
  categoryId: string,
  dropId: string,
): Promise<void> {
  await requireVendor();

  const supabase = await createClient();
  await supabase.from("categories").delete().eq("id", categoryId);

  revalidatePath(`/dashboard/drops/${dropId}`);
}

// Products -------------------------------------------------------------------

const variantSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1),
  value: z.string().trim().min(1),
  priceDelta: z.number().int(),
  weightGrams: z.number().int().min(0).nullable(),
  volumeCm3: z.number().int().min(0).nullable(),
  stockLimit: z.number().int().min(0).nullable(),
  imagePath: z.string().min(1).nullable().optional(),
});

const imageSchema = z.object({
  path: z.string().min(1),
  width: z.number().int().min(0),
  height: z.number().int().min(0),
});

const productSchema = z.object({
  id: z.uuid().optional(),
  dropId: z.uuid(),
  name: z.string().trim().min(2, "Give the product a name"),
  description: z.string().trim().max(1000).nullable(),
  price: z.number().int().min(0, "Price cannot be negative"),
  categoryId: z.uuid().nullable(),
  weightGrams: z.number().int().min(0).nullable(),
  volumeCm3: z.number().int().min(0).nullable(),
  stockLimit: z.number().int().min(0).nullable(),
  moq: z.number().int().min(1),
  published: z.boolean(),
  variants: z.array(variantSchema).max(50),
  images: z.array(imageSchema).max(10),
});

export type ProductInput = z.infer<typeof productSchema>;

export async function saveProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const vendor = await requireVendor();
  const payout = await requireVerifiedPayout(vendor);
  if (!payout.ok) return { error: payout.error };

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { error: "Could not read the form. Try again." };
  }

  const parsed = productSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const input = parsed.data;
  const supabase = await createClient();

  const row = {
    drop_id: input.dropId,
    category_id: input.categoryId,
    name: input.name,
    description: input.description,
    price: input.price,
    weight_grams: input.weightGrams,
    volume_cm3: input.volumeCm3,
    stock_limit: input.stockLimit,
    moq: input.moq,
    published: input.published,
  };

  let productId = input.id;

  if (productId) {
    const { error } = await supabase
      .from("products")
      .update(row)
      .eq("id", productId);
    if (error) return { error: error.message };
  } else {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("drop_id", input.dropId);

    const { data, error } = await supabase
      .from("products")
      .insert({ ...row, position: count ?? 0 })
      .select("id")
      .single();

    if (error || !data) {
      return { error: error?.message ?? "Could not save the product." };
    }
    productId = data.id;
  }

  const variantError = await replaceVariants(productId, input.variants);
  if (variantError) return { error: variantError };

  const imageError = await replaceImages(productId, input.images);
  if (imageError) return { error: imageError };

  revalidatePath(`/dashboard/drops/${input.dropId}`);
  redirect(`/dashboard/drops/${input.dropId}`);
}

/**
 * Variants and images are replaced wholesale rather than diffed. Existing rows
 * are matched by id so order items keep pointing at the same variant; anything
 * the vendor removed is deleted.
 */
async function replaceVariants(
  productId: string,
  variants: ProductInput["variants"],
): Promise<string | null> {
  const supabase = await createClient();
  const keptIds = variants.map((variant) => variant.id).filter(Boolean);

  const deletion = supabase
    .from("product_variants")
    .delete()
    .eq("product_id", productId);

  const { error: deleteError } = keptIds.length
    ? await deletion.not("id", "in", `(${keptIds.join(",")})`)
    : await deletion;

  if (deleteError) return deleteError.message;
  if (variants.length === 0) return null;

  const { error } = await supabase.from("product_variants").upsert(
    variants.map((variant, index) => ({
      ...(variant.id ? { id: variant.id } : {}),
      product_id: productId,
      name: variant.name,
      value: variant.value,
      price_delta: variant.priceDelta,
      weight_grams: variant.weightGrams,
      volume_cm3: variant.volumeCm3,
      stock_limit: variant.stockLimit,
      image_path: variant.imagePath ?? null,
      position: index,
    })),
  );

  return error?.message ?? null;
}

async function replaceImages(
  productId: string,
  images: ProductInput["images"],
): Promise<string | null> {
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("product_images")
    .delete()
    .eq("product_id", productId);

  if (deleteError) return deleteError.message;
  if (images.length === 0) return null;

  const { error } = await supabase.from("product_images").insert(
    images.map((image, index) => ({
      product_id: productId,
      storage_path: image.path,
      width: image.width,
      height: image.height,
      position: index,
    })),
  );

  return error?.message ?? null;
}

export async function deleteProduct(
  productId: string,
  dropId: string,
): Promise<void> {
  await requireVendor();

  const supabase = await createClient();
  await supabase.from("products").delete().eq("id", productId);

  revalidatePath(`/dashboard/drops/${dropId}`);
  redirect(`/dashboard/drops/${dropId}`);
}
