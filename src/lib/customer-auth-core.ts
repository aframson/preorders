import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const CODE_TTL_MS = 10 * 60_000;
export const MAX_VERIFY_ATTEMPTS = 5;
export const SESSION_TTL_MS = 90 * 24 * 60 * 60_000;

/** Caps that keep a stranger from emailing someone dozens of codes. */
export const SEND_LIMITS = {
  perEmail: { max: 3, windowMs: 10 * 60_000 },
  perEmailDaily: { max: 8, windowMs: 24 * 60 * 60_000 },
  perIp: { max: 10, windowMs: 60 * 60_000 },
} as const;

export function generateSignInCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** The code is never stored; only this, bound to the email it was sent to. */
export function hashSignInCode(secret: Buffer, email: string, code: string): string {
  return createHmac("sha256", secret).update(`${email}:${code}`).digest("hex");
}

export function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

/** How long until another code may be sent, or 0 if one can go now. */
export function sendCodeWaitMs(params: {
  now: number;
  emailSends: number[];
  ipSends: number[];
}): number {
  const { now } = params;
  const waits: number[] = [];

  const check = (sends: number[], limit: { max: number; windowMs: number }) => {
    const inWindow = sends.filter((at) => now - at < limit.windowMs).sort((a, b) => a - b);
    if (inWindow.length >= limit.max) {
      // The oldest send in the window has to age out before another is allowed.
      waits.push(inWindow[inWindow.length - limit.max] + limit.windowMs - now);
    }
  };

  check(params.emailSends, SEND_LIMITS.perEmail);
  check(params.emailSends, SEND_LIMITS.perEmailDaily);
  check(params.ipSends, SEND_LIMITS.perIp);

  return waits.length > 0 ? Math.max(...waits) : 0;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/**
 * A signed-in customer is just an email address we've verified, signed so it
 * can't be edited. No session table: signing out deletes the cookie.
 */
export function createSessionToken(secret: Buffer, email: string, now: number): string {
  const payload = base64url(JSON.stringify({ e: email, exp: now + SESSION_TTL_MS }));
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readSessionToken(
  secret: Buffer,
  token: string | undefined,
  now: number,
): { email: string } | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = createHmac("sha256", secret).update(payload).digest();
  const given = Buffer.from(signature, "base64url");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      e?: unknown;
      exp?: unknown;
    };
    if (typeof data.e !== "string" || typeof data.exp !== "number" || data.exp <= now) return null;
    return { email: data.e };
  } catch {
    return null;
  }
}
