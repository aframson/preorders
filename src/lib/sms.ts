import "server-only";

import { getServerEnv } from "@/lib/env.server";

const ARKESEL_SEND_URL = "https://sms.arkesel.com/api/v2/sms/send";

/**
 * Sends one text through Arkesel. Resolves false rather than throwing, so a
 * provider outage becomes a clear "couldn't send" message, not a crash.
 *
 * Without an API key in development, the message is printed to the server
 * log instead, so sign-in can be tested locally without paying for texts.
 */
export async function sendSms(toE164: string, message: string): Promise<boolean> {
  const { ARKESEL_API_KEY, SMS_SENDER_ID } = getServerEnv();

  if (!ARKESEL_API_KEY) {
    if (process.env.NODE_ENV === "development") {
      console.info(`[sms:dev] to ${toE164}: ${message}`);
      return true;
    }
    console.error("[sms] ARKESEL_API_KEY is not set — no text sent to", toE164);
    return false;
  }

  try {
    const response = await fetch(ARKESEL_SEND_URL, {
      method: "POST",
      headers: { "api-key": ARKESEL_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: SMS_SENDER_ID,
        message,
        // Arkesel wants the country code without the plus: 233241234567.
        recipients: [toE164.replace(/^\+/, "")],
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const body = (await response.json().catch(() => null)) as { status?: string } | null;
    if (!response.ok || (body?.status && body.status !== "success")) {
      console.error("[sms] Arkesel rejected the message", response.status, body);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[sms] Arkesel request failed", error);
    return false;
  }
}
