import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { paystackCredentials } from "@/lib/env.server";
import { reconcilePayment } from "@/lib/payments";

export const runtime = "nodejs";
// Signature verification needs the exact bytes Paystack signed.
export const dynamic = "force-dynamic";

type PaystackEvent = {
  event: string;
  data: {
    reference: string;
    amount: number;
    status: string;
    paid_at: string | null;
  };
};

function isValidSignature(raw: string, signature: string | null): boolean {
  const secret = paystackCredentials().webhookSecret;
  if (!secret || !signature) return false;

  const expected = createHmac("sha512", secret).update(raw).digest();
  const received = Buffer.from(signature, "hex");

  // Length must match before timingSafeEqual, which throws otherwise.
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

/**
 * The only trusted source of "this order is paid".
 *
 * The browser callback after checkout is a convenience for the customer and is
 * never believed on its own: it can be forged, and it never fires at all when
 * someone closes the tab mid-payment.
 */
export async function POST(request: Request) {
  const raw = await request.text();

  if (!isValidSignature(raw, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(raw) as PaystackEvent;
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  if (event.event !== "charge.success" || event.data?.status !== "success") {
    // Everything else is acknowledged so Paystack stops retrying it.
    return NextResponse.json({ received: true });
  }

  const result = await reconcilePayment({
    reference: event.data.reference,
    amount: event.data.amount,
    paidAt: event.data.paid_at,
    raw: event,
  });

  if (result.outcome === "unknown_reference") {
    // A reference we never issued. Acknowledged, because retrying will not
    // make it recognisable, but worth surfacing.
    console.warn("Paystack charge for unknown reference", event.data.reference);
  }

  if (result.outcome === "amount_mismatch") {
    console.error(
      "Paystack charge amount did not match the payment record",
      event.data.reference,
    );
  }

  return NextResponse.json({ received: true, outcome: result.outcome });
}
