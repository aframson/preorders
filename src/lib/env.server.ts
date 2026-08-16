import "server-only";

import { z } from "zod";

/**
 * Server-only configuration. Validated lazily so importing this module during
 * `next build` does not crash before env vars are available; callers still
 * fail fast when a required secret is missing at runtime.
 *
 * Paystack accepts both test and live key pairs. `PAYSTACK_MODE` picks which
 * pair is active. Legacy `PAYSTACK_SECRET_KEY` still works as a fallback for
 * whichever mode is selected.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .trim()
    .min(
      1,
      "Set SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API → service_role). Required on Vercel.",
    ),
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

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

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

  cached = parsed.data;
  return cached;
}

/** @deprecated Prefer getServerEnv() — kept for existing imports. */
export const serverEnv = new Proxy({} as ServerEnv, {
  get(_target, prop, receiver) {
    return Reflect.get(getServerEnv(), prop, receiver);
  },
});

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
  const env = getServerEnv();
  const mode = env.PAYSTACK_MODE;

  if (mode === "live") {
    const secretKey =
      emptyToNull(env.PAYSTACK_LIVE_SECRET_KEY) ??
      emptyToNull(env.PAYSTACK_SECRET_KEY);
    return {
      mode,
      secretKey,
      publicKey: emptyToNull(env.PAYSTACK_LIVE_PUBLIC_KEY),
      webhookSecret:
        emptyToNull(env.PAYSTACK_LIVE_WEBHOOK_SECRET) ??
        emptyToNull(env.PAYSTACK_WEBHOOK_SECRET) ??
        secretKey,
    };
  }

  const secretKey =
    emptyToNull(env.PAYSTACK_TEST_SECRET_KEY) ??
    emptyToNull(env.PAYSTACK_SECRET_KEY);

  return {
    mode: "test",
    secretKey,
    publicKey: emptyToNull(env.PAYSTACK_TEST_PUBLIC_KEY),
    webhookSecret:
      emptyToNull(env.PAYSTACK_TEST_WEBHOOK_SECRET) ??
      emptyToNull(env.PAYSTACK_WEBHOOK_SECRET) ??
      secretKey,
  };
}

function emptyToNull(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
