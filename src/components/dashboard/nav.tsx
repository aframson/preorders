"use client";

import {
  Home,
  Layers,
  MoreHorizontal,
  Receipt,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: LucideIcon };

const ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/drops", label: "Drops", icon: Layers },
  { href: "/dashboard/orders", label: "Orders", icon: Receipt },
  { href: "/dashboard/money", label: "Money", icon: Wallet },
  { href: "/dashboard/more", label: "More", icon: MoreHorizontal },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(`${href}/`);
}

/** Thumb-zone navigation. Hidden once there is room for the sidebar. */
export function BottomTabs() {
  const isActive = useIsActive();

  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-30 border-t border-border bg-surface shadow-bar pb-safe lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] transition-colors",
                  active ? "text-brand-700" : "text-ink-muted",
                )}
              >
                <item.icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Sidebar({ businessName }: { businessName: string }) {
  const isActive = useIsActive();

  return (
    <nav
      aria-label="Main"
      className="hidden w-60 shrink-0 border-r border-border lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-y-auto lg:px-3 lg:py-6"
    >
      <p className="truncate px-3 pb-4 font-display text-sm font-semibold text-ink">
        {businessName}
      </p>
      <ul className="space-y-1">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-control px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-950/50 dark:text-brand-200"
                    : "text-ink-muted hover:bg-surface-muted hover:text-ink",
                )}
              >
                <item.icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
