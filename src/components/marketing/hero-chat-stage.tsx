"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * Slides the tilted hero chat in when the section is on screen, and again
 * when you scroll back to it. Reduced-motion users get the settled pose.
 */
export function HeroChatStage({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // The observer fires once on observe, so reduced-motion visitors land on
    // the settled pose without the state ever being written from the effect
    // body, which would cascade a second render.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const observer = new IntersectionObserver(
      ([entry]) => setInView(reduced.matches || entry.isIntersecting),
      { threshold: 0.28, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("hero-mock-slide", inView && "is-in", className)}
      aria-hidden
    >
      {children}
    </div>
  );
}
