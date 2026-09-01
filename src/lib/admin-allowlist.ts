export function parseAdminEmails(
  value: string | null | undefined,
): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(
  email: string | null | undefined,
  allowlist: string | null | undefined,
): boolean {
  if (!email) return false;
  return parseAdminEmails(allowlist).has(email.trim().toLowerCase());
}
