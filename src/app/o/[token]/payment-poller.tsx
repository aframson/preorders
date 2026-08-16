"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * MoMo confirmation is asynchronous and can take 30-90 seconds. This polls
 * the tracking page so the customer sees "confirmed" without refreshing, and
 * so they still have their order code if they close the tab mid-wait.
 */
export function PaymentPoller({
  pending,
}: {
  pending: boolean;
}) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!pending) return;

    const started = Date.now();
    const tick = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
      router.refresh();
    }, 2500);

    return () => window.clearInterval(tick);
  }, [pending, router]);

  if (!pending) return null;

  return (
    <p className="flex items-center gap-2 text-sm text-ink-muted">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      Confirming your payment
      {elapsed > 8 ? " — this can take a minute on mobile money" : "…"}
    </p>
  );
}
