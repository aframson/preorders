import type { ZodError } from "zod";

/**
 * Map each Zod issue to the form field it belongs to, keeping the first
 * message per field so a later issue on an already-flagged field never
 * overwrites a more specific one.
 *
 * `keys` is the set of fields the form actually renders, so an issue on a
 * field the UI doesn't show (or a nested path like `variants.2.name`) still
 * lands somewhere sane — on the first matching top-level segment — instead of
 * being silently dropped.
 */
export function fieldErrorsFromZod<K extends string>(
  error: ZodError,
  keys: readonly K[],
): Partial<Record<K, string>> {
  const fieldErrors: Partial<Record<K, string>> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (
      typeof key === "string" &&
      (keys as readonly string[]).includes(key) &&
      !fieldErrors[key as K]
    ) {
      fieldErrors[key as K] = issue.message;
    }
  }

  return fieldErrors;
}
