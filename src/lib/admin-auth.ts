import "server-only";

import { notFound, redirect } from "next/navigation";

import { isAdminEmail } from "@/lib/admin-allowlist";
import { getUser } from "@/lib/auth";
import { getServerEnv } from "@/lib/env.server";

/**
 * Platform-admin authorization. The service-role client is only safe after
 * this succeeds; a vendor session by itself never grants platform access.
 */
export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const user = await getUser();
  if (!user) redirect("/login?next=/admin");

  if (!user.email || !isAdminEmail(user.email, getServerEnv().ADMIN_EMAILS)) {
    notFound();
  }

  return { id: user.id, email: user.email };
}
