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
    <div className="flex min-h-dvh flex-col bg-surface-muted/40 lg:flex-row">
      <aside className="border-b border-border bg-surface lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-5 py-4 lg:block lg:space-y-8 lg:px-4 lg:py-6">
          <div className="flex items-center gap-3 lg:px-2">
            <Logo />
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-brand-800 uppercase">
              Admin
            </span>
          </div>

          <nav aria-label="Admin" className="hidden lg:block">
            <Link
              href="/admin/vendors"
              className="flex items-center gap-3 rounded-control bg-brand-50 px-3 py-2.5 text-sm font-medium text-brand-700"
            >
              <Store className="size-4" aria-hidden />
              Vendors
            </Link>
          </nav>

          <Link
            href="/admin/vendors"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 lg:hidden"
          >
            <Store className="size-4" aria-hidden />
            Vendors
          </Link>
        </div>

        <div className="hidden border-t border-border p-4 lg:absolute lg:right-0 lg:bottom-0 lg:left-0 lg:block">
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

      <main className="min-w-0 flex-1 px-5 py-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
