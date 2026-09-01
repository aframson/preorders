export type PayoutIdentity = {
  paystackSubaccountCode: string | null;
  payoutBankCode: string | null;
  payoutAccountNumber: string | null;
  payoutAccountName?: string | null;
};

export type ApprovalSnapshot = {
  status: "pending" | "approved" | "rejected";
  approved_subaccount_code: string | null;
  approved_bank_code: string | null;
  approved_account_number: string | null;
};

export function payoutIsComplete(vendor: PayoutIdentity): boolean {
  return Boolean(
    vendor.paystackSubaccountCode &&
      vendor.payoutBankCode &&
      vendor.payoutAccountNumber &&
      vendor.payoutAccountName,
  );
}

export function approvalMatchesPayout(
  vendor: PayoutIdentity,
  approval: ApprovalSnapshot | null,
): boolean {
  return Boolean(
    approval?.status === "approved" &&
      vendor.paystackSubaccountCode &&
      approval.approved_subaccount_code === vendor.paystackSubaccountCode &&
      approval.approved_bank_code === vendor.payoutBankCode &&
      approval.approved_account_number === vendor.payoutAccountNumber,
  );
}
