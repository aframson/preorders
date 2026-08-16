"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  step: "request" | "verify";
  email: string;
  error?: string | null;
  message?: string | null;
};

const emailSchema = z.email("Enter a valid email address");
const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6 digit code from your email");

/**
 * Vendor sign-in is a one-time code by email.
 *
 * The plan calls for phone-first OTP, which is the right default in Ghana, but
 * Supabase phone auth requires a paid SMS provider that cannot be exercised
 * locally. The WhatsApp number is still collected during onboarding as
 * business data, so switching the factor later is a change of provider rather
 * than a change of model.
 */
export async function requestCode(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = emailSchema.safeParse(formData.get("email"));

  if (!parsed.success) {
    return {
      step: "request",
      email: String(formData.get("email") ?? ""),
      error: parsed.error.issues[0].message,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { shouldCreateUser: true },
  });

  if (error) {
    return {
      step: "request",
      email: parsed.data,
      error: humaniseAuthError(error.message),
    };
  }

  return {
    step: "verify",
    email: parsed.data,
    message: `We sent a 6 digit code to ${parsed.data}`,
  };
}

export async function verifyCode(
  prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? prev.email);
  const parsed = codeSchema.safeParse(formData.get("code"));

  if (!parsed.success) {
    return { step: "verify", email, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: parsed.data,
    type: "email",
  });

  if (error) {
    return { step: "verify", email, error: humaniseAuthError(error.message) };
  }

  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/") ? next : "/dashboard");
}

function humaniseAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("fetch failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("network") ||
    lower.includes("econnrefused")
  ) {
    return "We can't reach the sign-in service right now. Check your connection and try again in a moment.";
  }

  if (lower.includes("invalid") && lower.includes("token")) {
    return "That code is invalid or has expired. Request a new one.";
  }

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many attempts. Wait a minute, then try again.";
  }

  return "Could not sign you in. Try again.";
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
