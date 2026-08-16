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

// Ghanaian MoMo networks, used when Paystack keys are not present so the step
// is still walkable in development.
const FALLBACK_BANKS = [
  { name: "MTN Mobile Money", code: "MTN", type: "mobile_money" },
  { name: "Telecel Cash", code: "VOD", type: "mobile_money" },
  { name: "AirtelTigo Money", code: "ATL", type: "mobile_money" },
];

export default async function PayoutStep() {
  const vendor = await requireVendor();

  const configured = isPaystackConfigured();
  const mode = paystackMode();
  let banks = FALLBACK_BANKS;

  if (configured) {
    try {
      banks = await listSettlementBanks("mobile_money");
    } catch {
      banks = FALLBACK_BANKS;
    }
  }

  const whatsapp = vendor.whatsappNumber?.trim() ?? "";
  const defaultAccountNumber = whatsapp
    ? formatLocalPhone(normalisePhone(whatsapp))
    : "";
  const guessed = whatsapp ? guessMomoNetwork(whatsapp) : null;
  const defaultBankCode =
    (guessed && banks.some((bank) => bank.code === guessed)
      ? guessed
      : null) ??
    banks.find((bank) => bank.code === "MTN")?.code ??
    banks[0]?.code ??
    "MTN";

  return (
    <PayoutForm
      banks={banks}
      configured={configured}
      mode={mode}
      defaultAccountNumber={defaultAccountNumber}
      defaultBankCode={defaultBankCode}
    />
  );
}
