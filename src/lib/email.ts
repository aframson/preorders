import "server-only";

import nodemailer from "nodemailer";

/**
 * Transactional mail. Prefer Resend when RESEND_API_KEY is set; otherwise
 * SMTP — a hosted server such as Gmail (EMAIL_SMTP_HOST/PORT/USER/PASS), or
 * local Mailpit on 54325 when enabled in supabase/config.toml.
 *
 * Missing config is not an error — checkout must never fail because mail is down.
 */

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function fromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    "Preorders <orders@preorders.local>"
  );
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() ||
      process.env.EMAIL_SMTP_HOST?.trim() ||
      process.env.NODE_ENV === "development",
  );
}

async function sendViaResend(input: SendEmailInput): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html ?? input.text.replace(/\n/g, "<br/>"),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[email] Resend failed", response.status, body);
    return false;
  }
  return true;
}

async function sendViaSmtp(input: SendEmailInput): Promise<boolean> {
  const host =
    process.env.EMAIL_SMTP_HOST?.trim() ||
    (process.env.NODE_ENV === "development" ? "127.0.0.1" : "");
  if (!host) return false;

  const port = Number(process.env.EMAIL_SMTP_PORT ?? "54325");
  const user = process.env.EMAIL_SMTP_USER?.trim();
  const pass = process.env.EMAIL_SMTP_PASS?.trim();
  const transporter = nodemailer.createTransport({
    host,
    port,
    // 465 is implicit TLS (Gmail and most hosted providers); other ports
    // upgrade with STARTTLS when the server offers it.
    secure: port === 465,
    // A hosted server (e.g. smtp.gmail.com + an app password) needs a login
    // and a verified certificate; local Mailpit needs neither.
    ...(user && pass
      ? { auth: { user, pass } }
      : { tls: { rejectUnauthorized: false } }),
  });

  try {
    await transporter.sendMail({
      from: fromAddress(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html ?? input.text.replace(/\n/g, "<br/>"),
    });
    return true;
  } catch (error) {
    console.error("[email] SMTP failed", error);
    return false;
  }
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const to = input.to.trim().toLowerCase();
  if (!to.includes("@")) return false;

  try {
    if (await sendViaResend(input)) return true;
    if (await sendViaSmtp(input)) return true;
  } catch (error) {
    console.error("[email] send failed", error);
  }

  if (!process.env.RESEND_API_KEY?.trim() && !process.env.EMAIL_SMTP_HOST?.trim()) {
    console.warn(
      "[email] skipped — set RESEND_API_KEY (and EMAIL_FROM) on Vercel so customers get order links.",
      input.subject,
      "→",
      to,
    );
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[email:dev]", input.subject, "→", to, "\n", input.text);
    // Matches sendSms's dev behavior: logging it locally stands in for
    // actually sending it, so flows that branch on success (sign-in codes)
    // aren't blocked by a missing RESEND_API_KEY in local dev.
    return true;
  }
  return false;
}
