"use client";

import {
  ExternalLink,
  Home,
  Layers,
  Receipt,
  Settings,
  Store,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: LucideIcon };

const ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/drops", label: "Drops", icon: Layers },
  { href: "/dashboard/orders", label: "Orders", icon: Receipt },
  { href: "/dashboard/money", label: "Money", icon: Wallet },
  { href: "/dashboard/more", label: "Settings", icon: Settings },
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

export function Sidebar({
  businessName,
  vendorSlug,
}: {
  businessName: string;
  vendorSlug: string;
}) {
  const isActive = useIsActive();

  return (
    <nav
      aria-label="Main"
      className="hidden w-56 shrink-0 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-y-auto lg:px-3 lg:py-4"
    >
      <Link href="/" className="mb-6 px-2" aria-label="Preorders home">
        <Logo />
      </Link>

      <ul className="space-y-0.5">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-surface-sunken font-medium text-ink"
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

      <div className="mt-auto space-y-1 border-t border-border pt-3">
        <Link
          href={`/${vendorSlug}`}
          target="_blank"
          className="flex items-center gap-3 rounded-control px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <ExternalLink className="size-4" aria-hidden />
          View storefront
        </Link>
        <div className="flex items-center gap-3 rounded-control px-3 py-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink">
            <Store className="size-4" aria-hidden />
          </span>
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
            {businessName}
          </p>
        </div>
      </div>
    </nav>
  );
}
