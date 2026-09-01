import { describe, expect, it } from "vitest";

import { isAdminEmail, parseAdminEmails } from "./admin-allowlist";

describe("admin email allowlist", () => {
  it("normalizes casing, spaces and duplicate entries", () => {
    expect([
      ...parseAdminEmails(
        " Owner@Example.com, staff@example.com, owner@example.com ",
      ),
    ]).toEqual(["owner@example.com", "staff@example.com"]);
  });

  it("matches only complete normalized addresses", () => {
    const allowlist = "owner@example.com,staff@example.com";

    expect(isAdminEmail(" OWNER@example.com ", allowlist)).toBe(true);
    expect(isAdminEmail("other@example.com", allowlist)).toBe(false);
    expect(isAdminEmail(null, allowlist)).toBe(false);
    expect(isAdminEmail("owner@example.com", "")).toBe(false);
  });
});
