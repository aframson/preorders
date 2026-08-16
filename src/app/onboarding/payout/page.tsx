import { requireVendor } from "@/lib/auth";
import {
  isPaystackConfigured,
  listSettlementBanks,
  paystackMode,
} from "@/lib/paystack";
import {
  formatLocalPhone,
  guessMomoNetwork,
  normalisePhone,
} from "@/lib/phone";
import { PayoutForm } from "./payout-form";

export const metadata = { title: "Get paid" };

const FALLBACK_MOMO = [
  { name: "MTN Mobile Money", code: "MTN", type: "mobile_money" },
  { name: "Telecel Cash", code: "VOD", type: "mobile_money" },
  { name: "AirtelTigo Money", code: "ATL", type: "mobile_money" },
];

const FALLBACK_BANKS = [
  { name: "GCB Bank", code: "040", type: "ghipss" },
  { name: "Ecobank Ghana", code: "130", type: "ghipss" },
  { name: "Absa Bank Ghana", code: "030", type: "ghipss" },
];

export default async function PayoutStep({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const returnTo = from === "more" ? "more" : "onboarding";
  const vendor = await requireVendor();

  const configured = isPaystackConfigured();
  const mode = paystackMode();
  let momoBanks = FALLBACK_MOMO;
  let bankBanks = FALLBACK_BANKS;

  if (configured) {
    const [momo, banks] = await Promise.all([
      listSettlementBanks("mobile_money").catch(() => FALLBACK_MOMO),
      listSettlementBanks("ghipss").catch(() => FALLBACK_BANKS),
    ]);
    momoBanks = momo.length ? momo : FALLBACK_MOMO;
    bankBanks = banks.length ? banks : FALLBACK_BANKS;
  }

  const defaultChannel =
    vendor.payoutChannel === "bank" ? "bank" : "mobile_money";
  const banksForDefault =
    defaultChannel === "bank" ? bankBanks : momoBanks;

  const whatsapp = vendor.whatsappNumber?.trim() ?? "";
  const whatsappLocal = whatsapp
    ? formatLocalPhone(normalisePhone(whatsapp))
    : "";

  let defaultAccountNumber = "";
  if (vendor.payoutAccountNumber) {
    defaultAccountNumber = vendor.payoutAccountNumber;
  } else if (defaultChannel === "mobile_money") {
    defaultAccountNumber = whatsappLocal;
  }

  const guessed = whatsapp ? guessMomoNetwork(whatsapp) : null;
  const defaultBankCode =
    vendor.payoutBankCode ??
    (defaultChannel === "mobile_money" &&
    guessed &&
    banksForDefault.some((bank) => bank.code === guessed)
      ? guessed
      : undefined) ??
    banksForDefault.find((bank) => bank.code === "MTN")?.code ??
    banksForDefault[0]?.code;

  return (
    <PayoutForm
      momoBanks={momoBanks}
      bankBanks={bankBanks}
      configured={configured}
      mode={mode}
      defaultChannel={defaultChannel}
      defaultAccountNumber={defaultAccountNumber}
      momoPrefill={whatsappLocal}
      defaultBankCode={defaultBankCode}
      returnTo={returnTo}
      title={returnTo === "more" ? "Change payout method" : "Get paid"}
      description={
        returnTo === "more"
          ? "Switch between mobile money and bank. We show the registered name before anything is saved."
          : "Choose mobile money or a bank account. We show the registered name before you connect it."
      }
    />
  );
}
