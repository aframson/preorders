import { describe, expect, it } from "vitest";

import {
  createSessionToken,
  generateSignInCode,
  hashesMatch,
  hashSignInCode,
  readSessionToken,
  sendCodeWaitMs,
  SESSION_TTL_MS,
} from "./customer-auth-core";

const secret = Buffer.from("test-secret-test-secret-test-secret");
const email = "ama@example.com";
const now = Date.UTC(2026, 9, 20, 12);

describe("sign-in codes", () => {
  it("are always six digits", () => {
    for (let i = 0; i < 200; i += 1) expect(generateSignInCode()).toMatch(/^\d{6}$/);
  });

  it("only match for the email they were sent to", () => {
    const hash = hashSignInCode(secret, email, "123456");
    expect(hashesMatch(hash, hashSignInCode(secret, email, "123456"))).toBe(true);
    expect(hashesMatch(hash, hashSignInCode(secret, email, "123457"))).toBe(false);
    expect(hashesMatch(hash, hashSignInCode(secret, "other@example.com", "123456"))).toBe(false);
  });
});

describe("send limits", () => {
  it("allows the first few sends", () => {
    expect(sendCodeWaitMs({ now, emailSends: [now - 60_000], ipSends: [] })).toBe(0);
  });

  it("makes an email wait once it has had three codes in ten minutes", () => {
    const sends = [now - 9 * 60_000, now - 5 * 60_000, now - 60_000];
    expect(sendCodeWaitMs({ now, emailSends: sends, ipSends: [] })).toBe(60_000);
  });

  it("limits one device requesting codes for many different emails", () => {
    const sends = Array.from({ length: 10 }, (_, i) => now - (i + 1) * 60_000);
    expect(sendCodeWaitMs({ now, emailSends: [], ipSends: sends })).toBeGreaterThan(0);
  });
});

describe("session tokens", () => {
  it("round-trip the email address", () => {
    const token = createSessionToken(secret, email, now);
    expect(readSessionToken(secret, token, now)).toEqual({ email });
  });

  it("reject anything edited or signed with another secret", () => {
    const token = createSessionToken(secret, email, now);
    const [, signature] = token.split(".");
    const forged = `${Buffer.from(JSON.stringify({ e: "evil@example.com", exp: now + 1e9 })).toString("base64url")}.${signature}`;
    expect(readSessionToken(secret, forged, now)).toBeNull();
    expect(readSessionToken(Buffer.from("other-secret"), token, now)).toBeNull();
    expect(readSessionToken(secret, "garbage", now)).toBeNull();
  });

  it("expire", () => {
    const token = createSessionToken(secret, email, now);
    expect(readSessionToken(secret, token, now + SESSION_TTL_MS + 1)).toBeNull();
  });
});
