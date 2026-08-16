"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireVendor } from "@/lib/auth";
import { isGoogleMapsUrl } from "@/lib/maps-link";
import { createClient } from "@/lib/supabase/server";

export type PickupState = {
  error?: string | null;
  message?: string | null;
};

const pickupSchema = z.object({
  pickupMapsUrl: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value.length === 0 ? null : value))
    .refine(
      (value) => value === null || isGoogleMapsUrl(value),
      "Use a Google Maps link (Share → Copy link)",
    ),
});

export async function savePickupLocation(
  _prev: PickupState,
  formData: FormData,
): Promise<PickupState> {
  const vendor = await requireVendor();

  const parsed = pickupSchema.safeParse({
    pickupMapsUrl: formData.get("pickupMapsUrl") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("vendors")
    .update({ pickup_maps_url: parsed.data.pickupMapsUrl })
    .eq("id", vendor.id);

  if (error) {
    return { error: "Could not save your pickup location. Try again." };
  }

  revalidatePath("/dashboard/more");
  revalidatePath(`/${vendor.slug}`);

  return {
    message: parsed.data.pickupMapsUrl
      ? "Pickup location saved. Customers can choose Pick up at checkout."
      : "Pickup removed. Checkout will only offer delivery.",
  };
}
