import "server-only";

import { z } from "zod";

/**
 * Server-only configuration. The `server-only` import makes it a build error
 * for any client component to reach these values, which matters most for the
 * service role key: it bypasses row level security entirely.
 *
 * Paystack accepts both test and live key pairs. `PAYSTACK_MODE` picks which
 * pair is active. Legacy `PAYSTACK_SECRET_KEY` still works as a fallback for
 * whichever mode is selected.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PAYSTACK_MODE: z.enum(["test", "live"]).default("test"),
  PAYSTACK_TEST_SECRET_KEY: z.string().optional(),
  PAYSTACK_TEST_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_TEST_WEBHOOK_SECRET: z.string().optional(),
  PAYSTACK_LIVE_SECRET_KEY: z.string().optional(),
  PAYSTACK_LIVE_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_LIVE_WEBHOOK_SECRET: z.string().optional(),
  /** @deprecated Prefer PAYSTACK_TEST_SECRET_KEY / PAYSTACK_LIVE_SECRET_KEY */
  PAYSTACK_SECRET_KEY: z.string().optional(),
  /** @deprecated Prefer mode-specific webhook secrets */
  PAYSTACK_WEBHOOK_SECRET: z.string().optional(),
});

const parsed = serverEnvSchema.safeParse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  PAYSTACK_MODE: process.env.PAYSTACK_MODE ?? "test",
  PAYSTACK_TEST_SECRET_KEY: process.env.PAYSTACK_TEST_SECRET_KEY,
  PAYSTACK_TEST_PUBLIC_KEY: process.env.PAYSTACK_TEST_PUBLIC_KEY,
  PAYSTACK_TEST_WEBHOOK_SECRET: process.env.PAYSTACK_TEST_WEBHOOK_SECRET,
  PAYSTACK_LIVE_SECRET_KEY: process.env.PAYSTACK_LIVE_SECRET_KEY,
  PAYSTACK_LIVE_PUBLIC_KEY: process.env.PAYSTACK_LIVE_PUBLIC_KEY,
  PAYSTACK_LIVE_WEBHOOK_SECRET: process.env.PAYSTACK_LIVE_WEBHOOK_SECRET,
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
  PAYSTACK_WEBHOOK_SECRET: process.env.PAYSTACK_WEBHOOK_SECRET,
});

if (!parsed.success) {
  throw new Error(
    `Invalid server environment configuration:\n${z.prettifyError(parsed.error)}`,
  );
}

export const serverEnv = parsed.data;

export type PaystackMode = "test" | "live";

export type PaystackCredentials = {
  mode: PaystackMode;
  secretKey: string | null;
  publicKey: string | null;
  /** HMAC secret for webhook signatures (defaults to the secret key). */
  webhookSecret: string | null;
};

/** Active Paystack credentials for the configured mode. */
export function paystackCredentials(): PaystackCredentials {
  const mode = serverEnv.PAYSTACK_MODE;

  if (mode === "live") {
    const secretKey =
      emptyToNull(serverEnv.PAYSTACK_LIVE_SECRET_KEY) ??
      emptyToNull(serverEnv.PAYSTACK_SECRET_KEY);
    return {
      mode,
      secretKey,
      publicKey: emptyToNull(serverEnv.PAYSTACK_LIVE_PUBLIC_KEY),
      webhookSecret:
        emptyToNull(serverEnv.PAYSTACK_LIVE_WEBHOOK_SECRET) ??
        emptyToNull(serverEnv.PAYSTACK_WEBHOOK_SECRET) ??
        secretKey,
    };
  }

  const secretKey =
    emptyToNull(serverEnv.PAYSTACK_TEST_SECRET_KEY) ??
    emptyToNull(serverEnv.PAYSTACK_SECRET_KEY);

  return {
    mode: "test",
    secretKey,
    publicKey: emptyToNull(serverEnv.PAYSTACK_TEST_PUBLIC_KEY),
    webhookSecret:
      emptyToNull(serverEnv.PAYSTACK_TEST_WEBHOOK_SECRET) ??
      emptyToNull(serverEnv.PAYSTACK_WEBHOOK_SECRET) ??
      secretKey,
  };
}

function emptyToNull(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
