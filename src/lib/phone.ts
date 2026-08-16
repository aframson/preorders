/**
 * Ghanaian numbers get typed as 024..., +233 24..., and 233 24.... Customers
 * are keyed on phone per vendor, so all three have to collapse to one value or
 * the same person becomes three customers.
 */
export function normalisePhone(input: string): string {
  const digits = input.replace(/\D/g, "");

  if (digits.startsWith("233")) return `+${digits}`;
  if (digits.startsWith("0")) return `+233${digits.slice(1)}`;
  if (digits.length === 9) return `+233${digits}`;

  return `+${digits}`;
}

/**
 * Paystack MoMo APIs want a local 10-digit number (`0551234987`), not E.164
 * and not spaces.
 */
export function normaliseMomoAccountNumber(input: string): string {
  const digits = input.replace(/\D/g, "");

  if (digits.startsWith("233") && digits.length >= 12) {
    return `0${digits.slice(3, 12)}`;
  }
  if (digits.length === 9) return `0${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return digits;

  return digits;
}

/** `+233241234567` reads as `024 123 4567` to someone in Accra. */
export function formatLocalPhone(e164: string): string {
  const local = e164.startsWith("+233") ? `0${e164.slice(4)}` : e164;
  const digits = local.replace(/\D/g, "");

  if (digits.length !== 10) return local;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

/**
 * Best-effort Ghana MoMo network from the local prefix. Prefixes move between
 * telcos, so this is only a default for forms — the vendor can still change it.
 */
export function guessMomoNetwork(
  input: string,
): "MTN" | "VOD" | "ATL" | null {
  const local = normaliseMomoAccountNumber(input);
  if (local.length < 3) return null;

  const prefix = local.slice(0, 3);
  if (["024", "054", "055", "059", "025"].includes(prefix)) return "MTN";
  if (["020", "050"].includes(prefix)) return "VOD";
  if (["027", "057", "026", "056"].includes(prefix)) return "ATL";
  return null;
}


