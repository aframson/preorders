"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { sendSignInCode, signOutCustomer, verifySignInCode } from "@/lib/customer-auth";
import { DEVICE_ORDERS_COOKIE } from "@/lib/device-orders";
import { myOrdersPath } from "@/lib/site";

const emailSchema = z.email();

export type SignInState = {
  step: "email" | "code";
  /** Carried from the email step to the code step. */
  email?: string;
  error?: string | null;
  notice?: string | null;
  /** Refills the field after an error, since React resets the form on submit. */
  typed?: string;
};

async function requesterIp(): Promise<string | null> {
  const list = await headers();
  return list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || null;
}

function waitMessage(waitMs: number): string {
  const minutes = Math.max(1, Math.ceil(waitMs / 60_000));
  return `Too many codes for now. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

export async function signInAction(prev: SignInState, formData: FormData): Promise<SignInState> {
  const intent = String(formData.get("intent") ?? "send");

  if (intent === "change") return { step: "email" };

  if (intent === "send" || intent === "resend") {
    const raw = intent === "resend" ? (prev.email ?? "") : String(formData.get("email") ?? "");
    const parsed = emailSchema.safeParse(raw.trim().toLowerCase());
    if (!parsed.success) {
      return {
        step: "email",
        error: "Enter a valid email address.",
        typed: raw,
      };
    }
    const email = parsed.data;
    const result = await sendSignInCode(email, await requesterIp());
    const failedStep = intent === "resend" ? "code" : "email";

    if (result.status === "wait") {
      return { step: failedStep, email, error: waitMessage(result.waitMs), typed: raw };
    }
    if (result.status === "send_failed") {
      return {
        step: failedStep,
        email,
        error: "We couldn't send an email just now. Try again in a minute.",
        typed: raw,
      };
    }
    return {
      step: "code",
      email,
      notice: intent === "resend" ? `New code sent to ${email}.` : null,
    };
  }

  // intent === "verify"
  const email = prev.email;
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (!email) return { step: "email" };
  if (code.length !== 6) {
    return { step: "code", email, error: "Enter the 6-digit code from the email." };
  }

  const result = await verifySignInCode(email, code);
  if (result.status === "wrong_code") {
    return {
      step: "code",
      email,
      error: `That code isn't right. ${result.attemptsLeft} ${result.attemptsLeft === 1 ? "try" : "tries"} left.`,
    };
  }
  if (result.status === "expired") {
    return { step: "code", email, error: "That code has expired. Send a new one." };
  }

  redirect(myOrdersPath());
}

/** Signs out and forgets this device's orders too — for a shared or borrowed device. */
export async function signOutAction(): Promise<void> {
  await signOutCustomer();
  (await cookies()).delete(DEVICE_ORDERS_COOKIE);
  redirect(myOrdersPath());
}
