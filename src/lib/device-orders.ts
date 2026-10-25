/**
 * Order links this phone has opened, so "My orders" on a shop can list them
 * without an email round trip. Each order's public token is already the
 * credential for that order and is already in the URL the customer visited;
 * remembering it adds no access the device didn't have.
 *
 * Kept in a cookie rather than localStorage so the server can render the list
 * on first paint instead of fetching after hydration.
 */
export const DEVICE_ORDERS_COOKIE = "preorders_orders";

const MAX_TOKENS = 30;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{10,64}$/;
const SEPARATOR = ".";

export function parseDeviceOrderTokens(value: string | undefined | null): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  for (const token of value.split(SEPARATOR)) {
    if (TOKEN_PATTERN.test(token)) seen.add(token);
    if (seen.size >= MAX_TOKENS) break;
  }
  return [...seen];
}

/** Newest first, no duplicates, capped so the cookie stays small. */
export function rememberDeviceOrderToken(existing: string[], token: string): string[] {
  if (!TOKEN_PATTERN.test(token)) return existing;
  return [token, ...existing.filter((saved) => saved !== token)].slice(0, MAX_TOKENS);
}

export function serializeDeviceOrderTokens(tokens: string[]): string {
  return tokens.join(SEPARATOR);
}
