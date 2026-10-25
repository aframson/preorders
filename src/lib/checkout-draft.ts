export type CheckoutDraft = {
  name: string;
  phone: string;
  email: string;
  fulfilment: "pickup" | "delivery";
  deliveryNote: string;
};

function draftKey(batchId: string): string {
  return `preorders:checkout-draft:${batchId}`;
}

/**
 * Remembers what a customer has typed into checkout so far. The old delivery
 * flow forced a trip out to the Maps app and back, and on a slow phone or
 * inside WhatsApp's in-app browser that round trip could evict the page —
 * wiping name, phone and email with it, which read as "there's no session."
 * This is a cheap backstop against that (and any other accidental reload)
 * for the fields that aren't already their own persisted thing like the cart.
 * Session-scoped on purpose: it's a mid-purchase convenience, not something
 * that should linger on a shared device after the tab closes.
 */
export function readCheckoutDraft(batchId: string): Partial<CheckoutDraft> {
  try {
    const raw = window.sessionStorage.getItem(draftKey(batchId));
    return raw ? (JSON.parse(raw) as Partial<CheckoutDraft>) : {};
  } catch {
    return {};
  }
}

export function writeCheckoutDraft(
  batchId: string,
  patch: Partial<CheckoutDraft>,
): void {
  try {
    const current = readCheckoutDraft(batchId);
    window.sessionStorage.setItem(
      draftKey(batchId),
      JSON.stringify({ ...current, ...patch }),
    );
  } catch {
    // Storage can be full or blocked; the customer can still just retype.
  }
}
