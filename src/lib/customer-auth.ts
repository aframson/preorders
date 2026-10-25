import "server-only";

import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";

import {
  CODE_TTL_MS,
  createSessionToken,
  generateSignInCode,
  hashesMatch,
  hashSignInCode,
  MAX_VERIFY_ATTEMPTS,
  readSessionToken,
  SESSION_TTL_MS,
  sendCodeWaitMs,
} from "@/lib/customer-auth-core";
import { sendEmail } from "@/lib/email";
import { getServerEnv } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";

const SESSION_COOKIE = "preorders_customer";

/**
 * Derived from the service-role key so there's no extra secret to configure.
 * Rotating that key signs every customer out, which is the right outcome.
 */
function secret(): Buffer {
  return createHmac("sha256", getServerEnv().SUPABASE_SERVICE_ROLE_KEY)
    .update("customer-sign-in:v1")
    .digest();
}

export type SendCodeResult =
  | { status: "sent" }
  | { status: "wait"; waitMs: number }
  | { status: "send_failed" };

export async function sendSignInCode(email: string, ip: string | null): Promise<SendCodeResult> {
  const admin = createAdminClient();
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 60 * 60_000).toISOString();
  const hourAgo = new Date(now - 60 * 60_000).toISOString();

  const [byEmail, byIp] = await Promise.all([
    admin.from("customer_sign_in_codes").select("created_at").eq("email", email).gte("created_at", dayAgo),
    ip
      ? admin.from("customer_sign_in_codes").select("created_at").eq("requested_ip", ip).gte("created_at", hourAgo)
      : Promise.resolve({ data: [] as { created_at: string }[] }),
  ]);

  const waitMs = sendCodeWaitMs({
    now,
    emailSends: (byEmail.data ?? []).map((row) => Date.parse(row.created_at)),
    ipSends: (byIp.data ?? []).map((row) => Date.parse(row.created_at)),
  });
  if (waitMs > 0) return { status: "wait", waitMs };

  const code = generateSignInCode();
  const { error } = await admin.from("customer_sign_in_codes").insert({
    email,
    code_hash: hashSignInCode(secret(), email, code),
    expires_at: new Date(now + CODE_TTL_MS).toISOString(),
    requested_ip: ip,
  });
  if (error) {
    console.error("[customer-auth] could not store code", error);
    return { status: "send_failed" };
  }

  const sent = await sendEmail({
    to: email,
    subject: "Your Preorders sign-in code",
    text: `${code} is your Preorders code. It expires in 10 minutes. Never share it with anyone.`,
  });
  return sent ? { status: "sent" } : { status: "send_failed" };
}

export type VerifyCodeResult =
  | { status: "ok" }
  | { status: "wrong_code"; attemptsLeft: number }
  | { status: "expired" };

/** Checks the newest live code for this email and, if it matches, signs the customer in. */
export async function verifySignInCode(email: string, code: string): Promise<VerifyCodeResult> {
  const admin = createAdminClient();

  const { data: latest } = await admin
    .from("customer_sign_in_codes")
    .select("id, code_hash, attempts")
    .eq("email", email)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest || latest.attempts >= MAX_VERIFY_ATTEMPTS) return { status: "expired" };

  // Count the attempt before comparing, so guessing can't outrun the limit.
  const attempts = latest.attempts + 1;
  await admin.from("customer_sign_in_codes").update({ attempts }).eq("id", latest.id);

  if (!hashesMatch(latest.code_hash, hashSignInCode(secret(), email, code))) {
    const attemptsLeft = MAX_VERIFY_ATTEMPTS - attempts;
    return attemptsLeft > 0 ? { status: "wrong_code", attemptsLeft } : { status: "expired" };
  }

  // A used code, and any older ones still outstanding, can never be replayed.
  await admin
    .from("customer_sign_in_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("email", email)
    .is("consumed_at", null);

  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(secret(), email, Date.now()), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });

  return { status: "ok" };
}

/** The signed-in customer's verified email address, or null. */
export const getCustomerSession = cache(async (): Promise<{ email: string } | null> => {
  const store = await cookies();
  return readSessionToken(secret(), store.get(SESSION_COOKIE)?.value, Date.now());
});

export async function signOutCustomer(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
