"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

import { buttonVariants } from "@/components/ui/button";
import { formatGhs } from "@/lib/money";
import { combinationKey } from "@/lib/variants";
import { cn } from "@/lib/cn";

export type CartLine = {
  productId: string;
  /** Every chosen option id (Size + Colour, …). */
  variantIds: string[];
  qty: number;
  /**
   * Display-only copy of the product as it looked when added. Every one of
   * these is re-derived server-side at checkout; nothing here is trusted for
   * pricing.
   */
  name: string;
  variantLabel: string | null;
  unitPrice: number;
  imagePath: string | null;
  weightGrams: number;
  volumeCm3: number;
};

type CartContextValue = {
  lines: CartLine[];
  add: (line: CartLine) => void;
  setQty: (productId: string, variantIds: string[], qty: number) => void;
  remove: (productId: string, variantIds: string[]) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  /** False until the browser store has been read, to avoid an empty flash. */
  ready: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

function sameLine(
  line: CartLine,
  productId: string,
  variantIds: readonly string[],
) {
  return (
    line.productId === productId &&
    combinationKey(line.variantIds) === combinationKey(variantIds)
  );
}

/**
 * Carts are scoped to a batch. When a batch rolls over, prices and
 * availability change, so a cart left open in a background tab must not
 * silently carry into the next cycle.
 */
function storageKey(batchId: string) {
  return `preorders:cart:${batchId}`;
}

// The cart lives in localStorage, which is an external store rather than React
// state. Reading it through useSyncExternalStore keeps the server render and
// the hydrated render honest without an effect that writes state on mount.

const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();

/**
 * `getSnapshot` must return a stable reference while the underlying value is
 * unchanged, or React re-renders forever. Caching against the raw string is
 * what makes that true.
 */
let cache: { key: string; raw: string | null; value: CartLine[] } | null = null;

/** Accepts older carts that only stored a single `variantId`. */
function normaliseLine(raw: unknown): CartLine | null {
  if (!raw || typeof raw !== "object") return null;
  const line = raw as Record<string, unknown>;
  if (typeof line.productId !== "string" || typeof line.qty !== "number") {
    return null;
  }

  const variantIds = Array.isArray(line.variantIds)
    ? line.variantIds.filter((id): id is string => typeof id === "string")
    : typeof line.variantId === "string"
      ? [line.variantId]
      : line.variantId === null
        ? []
        : [];

  return {
    productId: line.productId,
    variantIds,
    qty: line.qty,
    name: typeof line.name === "string" ? line.name : "",
    variantLabel:
      typeof line.variantLabel === "string" ? line.variantLabel : null,
    unitPrice: typeof line.unitPrice === "number" ? line.unitPrice : 0,
    imagePath: typeof line.imagePath === "string" ? line.imagePath : null,
    weightGrams: typeof line.weightGrams === "number" ? line.weightGrams : 0,
    volumeCm3: typeof line.volumeCm3 === "number" ? line.volumeCm3 : 0,
  };
}

function readLines(key: string): CartLine[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    // Private browsing in some webviews throws on read.
    return EMPTY;
  }

  if (cache && cache.key === key && cache.raw === raw) return cache.value;

  let value: CartLine[] = EMPTY;
  try {
    const parsed = raw ? (JSON.parse(raw) as unknown[]) : [];
    value = Array.isArray(parsed)
      ? parsed
          .map(normaliseLine)
          .filter((line): line is CartLine => line !== null)
      : EMPTY;
  } catch {
    value = EMPTY;
  }

  cache = { key, raw, value };
  return value;
}

function writeLines(key: string, lines: CartLine[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(lines));
  } catch {
    // Storage can be full or blocked; the in-memory cache still serves this
    // page view so the customer is not stuck.
  }
  cache = { key, raw: JSON.stringify(lines), value: lines };
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Two tabs of the same drop should not disagree about the cart.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function CartProvider({
  batchId,
  children,
}: {
  batchId: string | null;
  children: React.ReactNode;
}) {
  const key = batchId ? storageKey(batchId) : null;

  const lines = useSyncExternalStore(
    subscribe,
    () => (key ? readLines(key) : EMPTY),
    () => EMPTY,
  );

  // The server cannot know what is in the cart, so the first paint is always
  // the empty one. This flips after hydration and gates the empty state.
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const update = useCallback(
    (next: (current: CartLine[]) => CartLine[]) => {
      if (!key) return;
      writeLines(key, next(readLines(key)));
    },
    [key],
  );

  const add = useCallback(
    (line: CartLine) => {
      update((current) => {
        const index = current.findIndex((existing) =>
          sameLine(existing, line.productId, line.variantIds),
        );
        if (index === -1) return [...current, line];

        const next = [...current];
        next[index] = { ...next[index], qty: next[index].qty + line.qty };
        return next;
      });
    },
    [update],
  );

  const setQty = useCallback(
    (productId: string, variantIds: string[], qty: number) => {
      update((current) =>
        qty <= 0
          ? current.filter((line) => !sameLine(line, productId, variantIds))
          : current.map((line) =>
              sameLine(line, productId, variantIds) ? { ...line, qty } : line,
            ),
      );
    },
    [update],
  );

  const remove = useCallback(
    (productId: string, variantIds: string[]) => {
      update((current) =>
        current.filter((line) => !sameLine(line, productId, variantIds)),
      );
    },
    [update],
  );

  const clear = useCallback(() => update(() => []), [update]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      add,
      setQty,
      remove,
      clear,
      count: lines.reduce((sum, line) => sum + line.qty, 0),
      subtotal: lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0),
      ready,
    }),
    [lines, add, setQty, remove, clear, ready],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside a CartProvider");
  return context;
}

/**
 * Appears only once something is in the cart, so an empty drop page keeps its
 * full height for products.
 */
export function CartBar({
  checkoutHref,
  className,
  /** Nested inside another fixed footer — no outer chrome of its own. */
  embedded = false,
}: {
  checkoutHref: string;
  className?: string;
  embedded?: boolean;
}) {
  const { count, subtotal, ready } = useCart();

  if (!ready || count === 0) return null;

  return (
    <div
      className={cn(
        embedded
          ? null
          : "sticky bottom-0 z-30 border-t border-border bg-surface px-4 pt-2 pb-safe",
        className,
      )}
    >
      <Link
        href={checkoutHref}
        className={buttonVariants({ size: "lg", block: true })}
      >
        <span data-numeric>
          {count} item{count === 1 ? "" : "s"} &middot; {formatGhs(subtotal)}
        </span>
        <span className="text-white/80">&middot;</span>
        Review bag
      </Link>
    </div>
  );
}
