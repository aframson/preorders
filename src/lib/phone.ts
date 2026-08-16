/**
 * Ghanaian numbers get typed as 024..., +233 24..., and 233 24.... Customers
 * are keyed on phone per vendor, so all three have to collapse to one value or
 * the same person becomes three customers.
 */

/** Strip zero-width / bidi marks phones pick up when pasted from WhatsApp. */
export function sanitisePhoneInput(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF\u202A-\u202E\u2060\u2066-\u2069]/g, "")
    .replace(/\u00A0/g, " ")
    .trim();
}

export function normalisePhone(input: string): string {
  const digits = sanitisePhoneInput(input).replace(/\D/g, "");

  if (digits.startsWith("233")) return `+${digits}`;
  if (digits.startsWith("0")) return `+233${digits.slice(1)}`;
  if (digits.length === 9) return `+233${digits}`;

  return `+${digits}`;
}

/**
 * True for a Ghana mobile that will work as WhatsApp / MoMo after normalise.
 * Accepts pasted junk; counts digits only.
 */
export function isPlausibleGhanaPhone(input: string): boolean {
  const digits = sanitisePhoneInput(input).replace(/\D/g, "");
  if (digits.startsWith("233")) {
    return digits.length === 12 && /^233[235][0-9]\d{7}$/.test(digits);
  }
  if (digits.startsWith("0")) {
    return digits.length === 10 && /^0[235][0-9]\d{7}$/.test(digits);
  }
  // 9 digits without leading 0 (24… / 54…)
  return digits.length === 9 && /^[235][0-9]\d{7}$/.test(digits);
}

/**
 * Paystack MoMo APIs want a local 10-digit number (`0551234987`), not E.164
 * and not spaces.
 */
export function normaliseMomoAccountNumber(input: string): string {
  const digits = sanitisePhoneInput(input).replace(/\D/g, "");

  if (digits.startsWith("233") && digits.length >= 12) {
    return `0${digits.slice(3, 12)}`;
  }
  if (digits.length === 9) return `0${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return digits;

  return digits;
}

/** Ghana bank account numbers — digits only, typically 10–16 long. */
export function normaliseBankAccountNumber(input: string): string {
  return sanitisePhoneInput(input).replace(/\D/g, "");
}

export function isPlausibleBankAccountNumber(input: string): boolean {
  const digits = normaliseBankAccountNumber(input);
  return digits.length >= 8 && digits.length <= 20;
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


