"use client";

import { MessageCircle } from "lucide-react";

import { CartBar, useCart } from "@/components/public/cart";
import { cn } from "@/lib/cn";

/**
 * Fixed shop chrome (bag CTA + WhatsApp). An in-flow spacer matches its
 * height so product prices can scroll clear of the bar.
 */
export function DropShopFooter({
  checkoutHref,
  questionsHref,
  vendorFirstName,
  freightModeLabel,
  showCart,
}: {
  checkoutHref: string;
  questionsHref: string | null;
  vendorFirstName: string;
  freightModeLabel: string;
  showCart: boolean;
}) {
  const { count, ready } = useCart();
  const cartVisible = showCart && ready && count > 0;

  if (!questionsHref && !showCart) return null;

  // Approximate chrome height so the last product row isn't trapped under it.
  const spacerClass = questionsHref
    ? cartVisible
      ? "h-[12.5rem]"
      : "h-[7.25rem]"
    : cartVisible
      ? "h-[5.25rem]"
      : "h-0";

  return (
    <>
      <div className={cn("shrink-0", spacerClass)} aria-hidden />

      {questionsHref ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-safe">
          <div className="mx-auto w-full max-w-3xl space-y-1.5 px-4 py-2">
            {showCart ? (
              <CartBar
                checkoutHref={checkoutHref}
                embedded
                className="border-0 bg-transparent p-0 shadow-none"
              />
            ) : null}
            <a
              href={questionsHref}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-1.5 rounded-control border border-border/70 bg-surface px-3 py-2 text-center text-xs font-medium text-ink"
            >
              <MessageCircle
                className="size-3.5 shrink-0 text-open"
                aria-hidden
              />
              Questions? Chat with {vendorFirstName}
            </a>
            <p className="text-center text-[11px] leading-snug text-ink-subtle">
              Goods now · shipping later by {freightModeLabel}
            </p>
          </div>
        </div>
      ) : showCart ? (
        <CartBar checkoutHref={checkoutHref} />
      ) : null}
    </>
  );
}
