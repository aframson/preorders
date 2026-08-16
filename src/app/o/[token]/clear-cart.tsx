"use client";

import { useEffect } from "react";

/**
 * Order tracking sits outside the drop layout (no CartProvider). After a
 * successful checkout the browser cart would otherwise still show the paid
 * items if the customer goes back to the drop.
 */
export function ClearCartOnConfirm({ batchId }: { batchId: string }) {
  useEffect(() => {
    try {
      window.localStorage.removeItem(`preorders:cart:${batchId}`);
    } catch {
      // Private browsing may block storage; nothing else to do.
    }
  }, [batchId]);

  return null;
}
