"use client";

import { useEffect } from "react";

import {
  DEVICE_ORDERS_COOKIE,
  parseDeviceOrderTokens,
  rememberDeviceOrderToken,
  serializeDeviceOrderTokens,
} from "@/lib/device-orders";

/** Saves this order on the phone, so it shows up under "My orders" in the shop. */
export function RememberOrder({ token }: { token: string }) {
  useEffect(() => {
    try {
      const current = document.cookie
        .split("; ")
        .find((entry) => entry.startsWith(`${DEVICE_ORDERS_COOKIE}=`))
        ?.slice(DEVICE_ORDERS_COOKIE.length + 1);

      const next = serializeDeviceOrderTokens(
        rememberDeviceOrderToken(parseDeviceOrderTokens(current), token),
      );
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${DEVICE_ORDERS_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    } catch {
      // Cookies can be blocked; the email link still works.
    }
  }, [token]);

  return null;
}
