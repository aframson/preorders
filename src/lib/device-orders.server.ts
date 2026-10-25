import "server-only";

import { cookies } from "next/headers";

import {
  DEVICE_ORDERS_COOKIE,
  parseDeviceOrderTokens,
  rememberDeviceOrderToken,
  serializeDeviceOrderTokens,
} from "@/lib/device-orders";

/**
 * Called the moment an order is created, before the customer leaves for
 * Paystack — so the order is on this phone even if they never come back from
 * the payment page. Not httpOnly: the order page's `RememberOrder` merges into
 * the same cookie from the browser.
 */
export async function rememberOrderOnDevice(token: string): Promise<void> {
  const store = await cookies();
  const tokens = rememberDeviceOrderToken(
    parseDeviceOrderTokens(store.get(DEVICE_ORDERS_COOKIE)?.value),
    token,
  );

  store.set(DEVICE_ORDERS_COOKIE, serializeDeviceOrderTokens(tokens), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
