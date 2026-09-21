"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

export function Tabs({
  items,
}: {
  items: { href: string; label: string; exact?: boolean }[];
}) {
  const pathname = usePathname();

  return (
    <div className="mb-6 overflow-x-auto scrollbar-none">
      <nav
        className="inline-flex min-w-max gap-1 rounded-control bg-surface-sunken p-1"
        aria-label="Sections"
      >
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-surface font-medium text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
