/** Case-fold and collapse whitespace for search matching. */
export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Every whitespace-separated token in `query` must appear somewhere in the
 * joined haystack. Empty query matches everything.
 */
export function matchesQuery(
  haystack: string | Array<string | null | undefined>,
  query: string,
): boolean {
  const normalized = normalizeQuery(query);
  if (!normalized) return true;

  const text = (
    Array.isArray(haystack) ? haystack.filter(Boolean).join(" ") : haystack
  ).toLowerCase();

  return normalized.split(" ").every((token) => text.includes(token));
}
