"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type WaitlistState = { joined?: boolean; error?: string | null };

const waitlistSchema = z.object({
  dropId: z.uuid(),
  email: z.email("Enter a valid email address"),
});

export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const parsed = waitlistSchema.safeParse({
    dropId: formData.get("dropId"),
    email: formData.get("email"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("drop_waitlist")
    .insert({ drop_id: parsed.data.dropId, email: parsed.data.email });

  // Already on the list is a success from the visitor's point of view.
  if (error && !error.message.includes("duplicate")) {
    return { error: "Could not save your email. Try again." };
  }

  return { joined: true };
}
