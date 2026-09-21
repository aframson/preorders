import { ArrowLeft, LogOut, Store } from "lucide-react";
import Link from "next/link";

import { signOut } from "@/app/(auth)/login/actions";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-dvh flex-col bg-canvas lg:flex-row">
      <aside className="border-b border-border bg-canvas lg:sticky lg:top-0 lg:h-dvh lg:w-56 lg:border-0">
        <div className="flex items-center justify-between px-5 py-4 lg:block lg:space-y-7 lg:px-3">
          <div className="flex items-center gap-3 lg:px-2">
            <Logo />
            <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold tracking-wide text-ink-muted uppercase">
              Admin
            </span>
          </div>

          <nav aria-label="Admin" className="hidden lg:block">
            <Link
              href="/admin/vendors"
              className="flex items-center gap-3 rounded-control bg-surface px-3 py-2 text-sm font-medium text-ink shadow-sm"
            >
              <Store className="size-4" aria-hidden />
              Vendors
            </Link>
          </nav>

          <Link
            href="/admin/vendors"
            className="inline-flex items-center gap-2 text-sm font-medium text-ink lg:hidden"
          >
            <Store className="size-4" aria-hidden />
            Vendors
          </Link>
        </div>

        <div className="hidden border-t border-border p-3 lg:absolute lg:right-3 lg:bottom-3 lg:left-3 lg:block">
          <p className="truncate px-2 text-xs text-ink-muted">{admin.email}</p>
          <div className="mt-3 flex items-center gap-1">
            <Link
              href="/"
              className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-control text-sm text-ink-muted hover:bg-surface-muted hover:text-ink"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Site
            </Link>
            <form action={signOut} className="flex-1">
              <Button type="submit" variant="ghost" size="sm" block>
                <LogOut className="size-4" aria-hidden />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-surface px-5 py-6 lg:m-2 lg:ml-0 lg:min-h-[calc(100dvh-1rem)] lg:rounded-card lg:border lg:border-border lg:px-8 lg:py-7 lg:shadow-sm">
        {children}
      </main>
    </div>
  );
}
