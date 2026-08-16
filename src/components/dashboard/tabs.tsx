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
    <div className="-mx-5 mb-6 overflow-x-auto border-b border-border px-5 scrollbar-none lg:-mx-8 lg:px-8">
      <nav className="flex gap-1" aria-label="Sections">
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
                "shrink-0 border-b-2 px-3 py-3 text-sm transition-colors",
                active
                  ? "border-brand-700 font-medium text-brand-700 dark:text-brand-300"
                  : "border-transparent text-ink-muted hover:text-ink",
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
