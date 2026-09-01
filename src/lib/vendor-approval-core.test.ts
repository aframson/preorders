import { describe, expect, it } from "vitest";

import {
  approvalMatchesPayout,
  payoutIsComplete,
  type ApprovalSnapshot,
  type PayoutIdentity,
} from "./vendor-approval-core";

const payout: PayoutIdentity = {
  paystackSubaccountCode: "ACCT_vendor",
  payoutBankCode: "MTN",
  payoutAccountNumber: "0551234987",
  payoutAccountName: "AKOSUA MENSAH",
};

const approval: ApprovalSnapshot = {
  status: "approved",
  approved_subaccount_code: "ACCT_vendor",
  approved_bank_code: "MTN",
  approved_account_number: "0551234987",
};

describe("vendor approval", () => {
  it("requires a complete resolved payout", () => {
    expect(payoutIsComplete(payout)).toBe(true);
    expect(payoutIsComplete({ ...payout, payoutAccountName: null })).toBe(false);
    expect(
      payoutIsComplete({ ...payout, paystackSubaccountCode: null }),
    ).toBe(false);
  });

  it("accepts only an exact approved payout snapshot", () => {
    expect(approvalMatchesPayout(payout, approval)).toBe(true);
    expect(
      approvalMatchesPayout(payout, { ...approval, status: "pending" }),
    ).toBe(false);
    expect(
      approvalMatchesPayout(payout, {
        ...approval,
        approved_account_number: "0240000000",
      }),
    ).toBe(false);
    expect(approvalMatchesPayout(payout, null)).toBe(false);
  });
});
