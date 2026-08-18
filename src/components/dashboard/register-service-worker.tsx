"use client";

import { useEffect } from "react";

/** Registers the PWA service worker on dashboard routes (push + install). */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Unsupported / insecure context — push UI will explain.
    });
  }, []);

  return null;
}
