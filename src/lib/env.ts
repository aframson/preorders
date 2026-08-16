import { z } from "zod";

/**
 * Public configuration, safe to ship to the browser.
 *
 * Next.js inlines `NEXT_PUBLIC_*` at build time only when it can see the
 * literal property access, so each one is spelled out rather than read from a
 * loop over the schema keys.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_PAYSTACK_MODE: z.enum(["test", "live"]).default("test"),
  NEXT_PUBLIC_PAYSTACK_TEST_PUBLIC_KEY: z.string().optional(),
  NEXT_PUBLIC_PAYSTACK_LIVE_PUBLIC_KEY: z.string().optional(),
});

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_PAYSTACK_MODE: process.env.NEXT_PUBLIC_PAYSTACK_MODE ?? "test",
  NEXT_PUBLIC_PAYSTACK_TEST_PUBLIC_KEY:
    process.env.NEXT_PUBLIC_PAYSTACK_TEST_PUBLIC_KEY,
  NEXT_PUBLIC_PAYSTACK_LIVE_PUBLIC_KEY:
    process.env.NEXT_PUBLIC_PAYSTACK_LIVE_PUBLIC_KEY,
});

if (!parsed.success) {
  throw new Error(
    `Invalid public environment configuration:\n${z.prettifyError(parsed.error)}`,
  );
}

export const env = parsed.data;

/** Public key for the active Paystack mode (Popup / Inline, if used). */
export function paystackPublicKey(): string | null {
  const key =
    env.NEXT_PUBLIC_PAYSTACK_MODE === "live"
      ? env.NEXT_PUBLIC_PAYSTACK_LIVE_PUBLIC_KEY
      : env.NEXT_PUBLIC_PAYSTACK_TEST_PUBLIC_KEY;
  const trimmed = key?.trim();
  return trimmed ? trimmed : null;
}
