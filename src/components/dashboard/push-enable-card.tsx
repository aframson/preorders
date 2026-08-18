"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  removePushSubscription,
  savePushSubscription,
} from "@/app/dashboard/more/push-actions";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  return navigator.serviceWorker.register("/sw.js");
}

export function PushEnableCard({
  vapidPublicKey,
}: {
  vapidPublicKey: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [subscribed, setSubscribed] = useState(false);
  const [ready, setReady] = useState(false);
  const supported = pushSupported() && Boolean(vapidPublicKey);

  useEffect(() => {
    if (!supported || !vapidPublicKey) {
      setReady(true);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const reg = await ensureServiceWorker();
        const sub = await reg?.pushManager.getSubscription();
        if (!cancelled) setSubscribed(Boolean(sub));
      } catch {
        if (!cancelled) setSubscribed(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supported, vapidPublicKey]);

  function enable() {
    if (!vapidPublicKey) return;
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Notifications were blocked");
          return;
        }

        const reg = await ensureServiceWorker();
        if (!reg) {
          toast.error("This browser cannot install push");
          return;
        }

        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              vapidPublicKey,
            ) as BufferSource,
          }));

        const json = sub.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
          toast.error("Could not create a push subscription");
          return;
        }

        const result = await savePushSubscription({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        });

        if (!result.ok) {
          toast.error(result.error);
          return;
        }

        setSubscribed(true);
        toast.success("Push alerts on for this device");
      } catch (error) {
        console.error(error);
        toast.error("Could not enable push alerts");
      }
    });
  }

  function disable() {
    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          await removePushSubscription(sub.endpoint);
          await sub.unsubscribe();
        }
        setSubscribed(false);
        toast.success("Push alerts turned off on this device");
      } catch {
        toast.error("Could not turn off push alerts");
      }
    });
  }

  if (!ready) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Checking this device…
      </p>
    );
  }

  if (!supported) {
    return (
      <p className="text-sm text-ink-muted">
        Push alerts need an installed PWA (or Chrome/Edge/Safari on a supported
        device) and VAPID keys in env.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">
        Get a ping when someone pays for an order or adds a product to their
        bag. Works best after you install Preorders to your home screen.
      </p>
      {subscribed ? (
        <Button
          type="button"
          variant="secondary"
          onClick={disable}
          loading={pending}
        >
          <BellOff className="size-4" aria-hidden />
          Turn off on this device
        </Button>
      ) : (
        <Button type="button" onClick={enable} loading={pending}>
          <Bell className="size-4" aria-hidden />
          Enable push alerts
        </Button>
      )}
    </div>
  );
}
