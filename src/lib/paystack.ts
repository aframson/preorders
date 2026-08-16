import "server-only";

import { paystackCredentials } from "@/lib/env.server";
import type { Pesewas } from "@/lib/money";

const BASE = "https://api.paystack.co";

export class PaystackNotConfiguredError extends Error {
  constructor() {
    super(
      "Paystack is not configured. Set PAYSTACK_TEST_SECRET_KEY or PAYSTACK_LIVE_SECRET_KEY for the active PAYSTACK_MODE.",
    );
    this.name = "PaystackNotConfiguredError";
  }
}

export class PaystackError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PaystackError";
  }
}

export function isPaystackConfigured(): boolean {
  return Boolean(paystackCredentials().secretKey);
}

export function paystackMode(): "test" | "live" {
  return paystackCredentials().mode;
}

export function isPaystackTestSecret(): boolean {
  return Boolean(paystackCredentials().secretKey?.startsWith("sk_test_"));
}

type PaystackResponse<T> = { status: boolean; message: string; data: T };

async function call<T>(
  path: string,
  init?: RequestInit & { query?: Record<string, string> },
): Promise<T> {
  const { secretKey } = paystackCredentials();
  if (!secretKey) throw new PaystackNotConfiguredError();

  const url = new URL(`${BASE}${path}`);
  for (const [key, value] of Object.entries(init?.query ?? {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as
    | PaystackResponse<T>
    | null;

  if (!response.ok || !body?.status) {
    throw new PaystackError(
      body?.message ?? `Paystack request failed (${response.status})`,
      response.status,
    );
  }

  return body.data;
}

// Banks and account resolution ----------------------------------------------

export type SettlementBank = {
  name: string;
  code: string;
  type: string;
};

/**
 * Ghanaian vendors overwhelmingly want to settle to MoMo rather than a bank
 * account, so mobile money is the default channel here.
 *
 * MTN is listed first when present — it is the most common network and
 * Paystack's documented test number (`0551234987`) only works with `MTN`.
 */
export async function listSettlementBanks(
  type: "mobile_money" | "ghipss" = "mobile_money",
): Promise<SettlementBank[]> {
  const banks = await call<SettlementBank[]>("/bank", {
    query: { currency: "GHS", country: "ghana", type },
  });

  const mapped = banks.map((bank) => ({
    name: bank.name,
    code: bank.code,
    type: bank.type,
  }));

  return mapped.sort((a, b) => {
    if (a.code === "MTN") return -1;
    if (b.code === "MTN") return 1;
    return a.name.localeCompare(b.name);
  });
}

export type ResolvedAccount = {
  accountNumber: string;
  accountName: string;
};

/**
 * Showing a vendor their own name back is the single biggest trust moment in
 * onboarding, and it catches typos before money is ever routed.
 */
export async function resolveAccount(
  accountNumber: string,
  bankCode: string,
): Promise<ResolvedAccount> {
  const data = await call<{ account_number: string; account_name: string }>(
    "/bank/resolve",
    { query: { account_number: accountNumber, bank_code: bankCode } },
  );

  return {
    accountNumber: data.account_number,
    accountName: data.account_name,
  };
}

// Subaccounts ----------------------------------------------------------------

export type Subaccount = {
  subaccountCode: string;
  accountName: string;
  isVerified: boolean;
};

/**
 * `percentage_charge` is the share retained by the platform's main account;
 * the remainder settles to the vendor. Paystack's own documentation is
 * inconsistent about the direction, so confirm with a real split in test mode
 * before switching to live keys.
 */
export async function createSubaccount(params: {
  businessName: string;
  settlementBank: string;
  accountNumber: string;
  percentageCharge: number;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
}): Promise<Subaccount> {
  const data = await call<{
    subaccount_code: string;
    account_name: string;
    is_verified: boolean;
  }>("/subaccount", {
    method: "POST",
    body: JSON.stringify({
      business_name: params.businessName,
      settlement_bank: params.settlementBank,
      account_number: params.accountNumber,
      percentage_charge: params.percentageCharge,
      primary_contact_email: params.primaryContactEmail,
      primary_contact_phone: params.primaryContactPhone,
      currency: "GHS",
    }),
  });

  return {
    subaccountCode: data.subaccount_code,
    accountName: data.account_name,
    isVerified: Boolean(data.is_verified),
  };
}

/** Fetch a subaccount — used to sync Paystack dashboard verification. */
export async function fetchSubaccount(code: string): Promise<Subaccount> {
  const data = await call<{
    subaccount_code: string;
    account_name: string;
    is_verified: boolean;
  }>(`/subaccount/${encodeURIComponent(code)}`);

  return {
    subaccountCode: data.subaccount_code,
    accountName: data.account_name,
    isVerified: Boolean(data.is_verified),
  };
}

// Transactions ---------------------------------------------------------------

export type InitialisedTransaction = {
  authorizationUrl: string;
  reference: string;
  accessCode: string;
};

/**
 * Always a redirect, never the inline modal: the WhatsApp in-app browser
 * handles a full page navigation far more reliably than a popup.
 */
export async function initialiseTransaction(params: {
  email: string;
  amount: Pesewas;
  reference: string;
  callbackUrl: string;
  subaccount?: string | null;
  /**
   * Flat pesewas kept by the platform. Overrides the subaccount's percentage
   * for this charge only. Pass `0` to take nothing — omitting the field
   * falls back to the percentage set when the subaccount was created.
   */
  platformCharge?: Pesewas;
  metadata?: Record<string, unknown>;
}): Promise<InitialisedTransaction> {
  const data = await call<{
    authorization_url: string;
    reference: string;
    access_code: string;
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: params.amount,
      currency: "GHS",
      reference: params.reference,
      callback_url: params.callbackUrl,
      channels: ["mobile_money", "card", "bank_transfer"],
      ...(params.subaccount
        ? {
            subaccount: params.subaccount,
            bearer: "account",
            ...(params.platformCharge !== undefined
              ? { transaction_charge: params.platformCharge }
              : {}),
          }
        : {}),
      metadata: params.metadata,
    }),
  });

  return {
    authorizationUrl: data.authorization_url,
    reference: data.reference,
    accessCode: data.access_code,
  };
}

export type VerifiedTransaction = {
  reference: string;
  status: string;
  amount: Pesewas;
  paidAt: string | null;
  raw: unknown;
};

export async function verifyTransaction(
  reference: string,
): Promise<VerifiedTransaction> {
  const data = await call<{
    reference: string;
    status: string;
    amount: number;
    paid_at: string | null;
  }>(`/transaction/verify/${encodeURIComponent(reference)}`);

  return {
    reference: data.reference,
    status: data.status,
    amount: data.amount,
    paidAt: data.paid_at,
    raw: data,
  };
}
