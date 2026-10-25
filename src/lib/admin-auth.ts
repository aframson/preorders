import "server-only";

import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { isAdminEmail } from "@/lib/admin-allowlist";
import { getUser } from "@/lib/auth";
import { getServerEnv } from "@/lib/env.server";

/**
 * Platform-admin authorization. The service-role client is only safe after
 * this succeeds; a vendor session by itself never grants platform access.
 *
 * Cached per request: admin pages run several queries that each re-check,
 * and every check is a round trip to Supabase Auth.
 */
export const requireAdmin = cache(
  async (): Promise<{ id: string; email: string }> => {
    const user = await getUser();
    if (!user) redirect("/login?next=/admin");

    if (!user.email || !isAdminEmail(user.email, getServerEnv().ADMIN_EMAILS)) {
      notFound();
    }

    return { id: user.id, email: user.email };
  },
);
