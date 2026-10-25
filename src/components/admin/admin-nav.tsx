"use client";

import {
  CreditCard,
  HeartPulse,
  LayoutDashboard,
  Landmark,
  Receipt,
  Store,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

const ITEMS: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/health", label: "Health", icon: HeartPulse },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/orders", label: "Orders", icon: Receipt },
  { href: "/admin/finance", label: "Finance", icon: Landmark },
  { href: "/admin/vendors", label: "Vendors", icon: Store },
];

/** `sidebar` stacks vertically for desktop; `bar` scrolls sideways for phones. */
export function AdminNav({ variant }: { variant: "sidebar" | "bar" }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin"
      className={
        variant === "sidebar"
          ? "space-y-1"
          : "scrollbar-none -mx-5 flex gap-1 overflow-x-auto px-5 pb-3"
      }
    >
      {ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "items-center rounded-control font-medium transition-colors",
              variant === "sidebar"
                ? "flex gap-3 px-3 py-2 text-sm"
                : "inline-flex shrink-0 gap-1.5 px-3 py-1.5 text-sm",
              active
                ? "bg-surface text-ink shadow-sm"
                : "text-ink-muted hover:bg-surface-muted hover:text-ink",
            )}
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
