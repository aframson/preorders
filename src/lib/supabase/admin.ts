import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * Service role client. Bypasses row level security completely.
 *
 * Reserved for the paths that RLS deliberately locks everyone out of:
 * creating orders, reconciling Paystack webhooks, apportioning freight, and
 * serving the order tracking page by its code. Anything a vendor is simply
 * allowed to read about their own account should use the session client in
 * `server.ts` instead, so RLS stays in force.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
