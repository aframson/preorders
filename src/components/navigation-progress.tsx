"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { cn } from "@/lib/cn";
import { NAVIGATE_START_EVENT } from "@/lib/navigation-signal";

/**
 * Thin top progress bar for App Router navigations (category filters, etc.).
 * Starts on same-origin link clicks or `signalNavigationStart()`; clears when
 * the URL settles.
 */
function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentKey = `${pathname}?${searchParams.toString()}`;

  const [active, setActive] = useState(false);
  // Tracks the URL the bar last saw, so a completed navigation can drop it
  // immediately — adjusted during render (React's documented pattern for
  // resetting state when a value changes) rather than from an effect, which
  // would let the stale bar paint for one extra frame first.
  const [trackedKey, setTrackedKey] = useState(currentKey);
  if (currentKey !== trackedKey) {
    setTrackedKey(currentKey);
    setActive(false);
  }

  useEffect(() => {
    const start = () => setActive(true);

    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }
      } catch {
        return;
      }

      start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener(NAVIGATE_START_EVENT, start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(NAVIGATE_START_EVENT, start);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5 overflow-hidden"
      aria-hidden={!active}
      role="presentation"
    >
      <div
        className={cn(
          "h-full origin-left bg-brand-700",
          active ? "animate-nav-progress opacity-100" : "w-0 opacity-0",
        )}
      />
    </div>
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
