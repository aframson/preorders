"use client";

import { Bell, BellOff, Loader2, Smartphone } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  removePushSubscription,
  savePushSubscription,
} from "@/app/dashboard/more/push-actions";

type PermissionState = NotificationPermission | "unsupported";

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

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOs =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOs;
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return media || iosStandalone;
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready.then(() => reg);
}

export function PushEnableCard({
  vapidPublicKey,
}: {
  vapidPublicKey: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<PermissionState>("default");
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [ready, setReady] = useState(false);
  const apiReady = Boolean(vapidPublicKey);
  const browserReady = pushSupported();
  const supported = browserReady && apiReady;

  useEffect(() => {
    setIos(isIos());
    setStandalone(isStandaloneDisplay());

    if (!browserReady || !apiReady) {
      setPermission(browserReady ? Notification.permission : "unsupported");
      setReady(true);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        setPermission(Notification.permission);
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
  }, [browserReady, apiReady]);

  const needsInstall = ios && !standalone;

  function enable() {
    if (!vapidPublicKey) return;
    if (needsInstall) {
      toast.error("Install Preorders to your Home Screen first");
      return;
    }

    startTransition(async () => {
      try {
        const nextPermission = await Notification.requestPermission();
        setPermission(nextPermission);
        if (nextPermission !== "granted") {
          toast.error(
            nextPermission === "denied"
              ? "Notifications are blocked for this site. Enable them in browser settings, then try again."
              : "Notification permission was not granted",
          );
          return;
        }

        const reg = await ensureServiceWorker();
        if (!reg) {
          toast.error("This browser cannot install push");
          return;
        }

        await navigator.serviceWorker.ready;

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

  if (!apiReady) {
    return (
      <p className="text-sm text-ink-muted">
        Push is not configured on this deployment yet (missing VAPID keys).
      </p>
    );
  }

  if (!browserReady) {
    return (
      <p className="text-sm text-ink-muted">
        This browser does not support web push. Use Chrome, Edge, or Safari on
        a supported device.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">
        Get a ping when someone pays for an order or adds a product to their
        bag.
      </p>

      {needsInstall ? (
        <div className="rounded-xl border border-border bg-canvas px-3 py-3 text-sm text-ink">
          <p className="flex items-start gap-2 font-medium">
            <Smartphone className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
            Install the app first (required on iPhone)
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-muted">
            <li>Tap Share in Safari</li>
            <li>Choose Add to Home Screen</li>
            <li>Open Preorders from the home screen icon</li>
            <li>Come back here and enable push</li>
          </ol>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">
          {standalone
            ? "Running as the installed app — you can enable alerts on this device."
            : "Works in Chrome/Edge here. On iPhone you must open the installed Home Screen app."}
        </p>
      )}

      {permission === "denied" ? (
        <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-ink">
          Notifications are blocked for this site. In your browser settings,
          allow notifications for Preorders, then tap enable again.
        </p>
      ) : null}

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
        <Button
          type="button"
          onClick={enable}
          loading={pending}
          disabled={needsInstall || permission === "denied"}
        >
          <Bell className="size-4" aria-hidden />
          {permission === "denied"
            ? "Notifications blocked"
            : needsInstall
              ? "Install app to enable"
              : "Enable push alerts"}
        </Button>
      )}
    </div>
  );
}
