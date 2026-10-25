import { LogOut, ShoppingBag } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { CustomerOrderList } from "@/components/public/customer-order-list";
import { Button } from "@/components/ui/button";
import { getCustomerSession } from "@/lib/customer-auth";
import { DEVICE_ORDERS_COOKIE, parseDeviceOrderTokens } from "@/lib/device-orders";
import { getAccountOrders } from "@/lib/queries/customer-portal";
import { signOutAction } from "./actions";
import { SignInForm } from "./sign-in-form";

export const metadata = {
  title: "My orders",
  robots: { index: false, follow: false },
};

export default async function MyOrdersPage() {
  const session = await getCustomerSession();
  const deviceTokens = parseDeviceOrderTokens((await cookies()).get(DEVICE_ORDERS_COOKIE)?.value);
  const orders = await getAccountOrders({ email: session?.email ?? null, deviceTokens });
  const hasOrders = orders.length > 0;

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-5 py-3">
          <Link href="/" aria-label="Preorders home">
            <Logo />
          </Link>
          {session && (
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="size-4" aria-hidden />
                Sign out
              </Button>
            </form>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-8 px-5 py-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">My orders</h1>
          {session ? (
            <p className="mt-1 text-sm text-ink-muted">
              Signed in as <span className="font-medium text-ink">{session.email}</span>
            </p>
          ) : hasOrders ? (
            <p className="mt-1 text-sm text-ink-muted">Orders placed on this device.</p>
          ) : null}
        </div>

        {hasOrders ? (
          <CustomerOrderList orders={orders} showVendor />
        ) : session ? (
          <div className="rounded-card border border-dashed border-border-strong bg-surface px-5 py-10 text-center">
            <ShoppingBag className="mx-auto size-6 text-ink-subtle" aria-hidden />
            <p className="mt-3 font-display text-base font-semibold text-ink">No orders yet</p>
            <p className="mt-1 text-sm text-ink-muted">
              Orders you place with {session.email} will show up here.
            </p>
          </div>
        ) : null}

        {!session && (
          <section className="space-y-4 rounded-card border border-border bg-surface p-5">
            <div className="space-y-1">
              <h2 className="font-display text-base font-semibold text-ink">
                {hasOrders ? "See all your orders" : "Sign in to see your orders"}
              </h2>
              <p className="text-sm text-ink-muted">
                {hasOrders
                  ? "Sign in with your email to also see orders you placed on other devices."
                  : "Every order you've placed, from every shop, with live status."}
              </p>
            </div>
            <SignInForm />
          </section>
        )}

        {!session && hasOrders && (
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-xs text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Not your device? Remove these orders from it
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
