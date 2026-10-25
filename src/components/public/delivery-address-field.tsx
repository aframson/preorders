"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { mapsEmbedSrc, splitDeliveryNote } from "@/lib/maps-link";

/**
 * A written address is the primary, always-works input — most delivery
 * addresses in Ghana are landmark-based, not formal street addresses, and
 * typing one never requires leaving this page. "Use my location" is an
 * optional, one-tap way to add a precise pin on top of it, without the old
 * flow of opening the Maps app, sharing a link, and pasting it back here —
 * a round trip that cost people their place in the form on slower phones.
 */
export function DeliveryAddressField({
  id = "deliveryNote",
  name = "deliveryNote",
  label = "Where should it go?",
  defaultValue = "",
  error,
  onValueChange,
}: {
  id?: string;
  name?: string;
  label?: string;
  defaultValue?: string;
  error?: string | null;
  /** Fires with the combined address + pin, e.g. to save a draft. */
  onValueChange?: (combined: string) => void;
}) {
  // `defaultValue` may already be a saved draft carrying its own appended
  // pin — split it back apart so restoring a draft re-populates both.
  const initial = splitDeliveryNote(defaultValue);
  const [text, setText] = useState(initial.address);
  const [pinUrl, setPinUrl] = useState<string | null>(initial.mapsUrl);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const combine = (nextText: string, nextPinUrl: string | null) =>
    nextPinUrl ? `${nextText.trim()}\n\nMap pin: ${nextPinUrl}` : nextText;
  const combined = combine(text, pinUrl);
  const embedSrc = pinUrl ? mapsEmbedSrc(pinUrl) : null;

  function updateText(next: string) {
    setText(next);
    onValueChange?.(combine(next, pinUrl));
  }

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocateError(
        "Your browser can't share your location here. Just type your address below.",
      );
      return;
    }

    setLocating(true);
    setLocateError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setPinUrl(url);
        setLocating(false);
        onValueChange?.(combine(text, url));
      },
      () => {
        setLocateError(
          "Could not get your location. You can still type your address below.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="space-y-2">
      <Field
        label={label}
        htmlFor={id}
        hint="House number, street, a nearby landmark — enough for the vendor to find you."
        error={error ?? locateError}
      >
        <Textarea
          id={id}
          rows={3}
          value={text}
          onChange={(event) => updateText(event.target.value)}
          placeholder="House 23, Spintex Road, opposite the GOIL station"
        />
      </Field>

      <input type="hidden" name={name} value={combined} />

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={useMyLocation}
        loading={locating}
      >
        <MapPin className="size-4" aria-hidden />
        {pinUrl ? "Location added — tap to update" : "Add my exact location (optional)"}
      </Button>

      {embedSrc && (
        <div className="overflow-hidden rounded-card border border-border bg-surface-muted">
          <div className="relative aspect-video w-full">
            <iframe
              title="Delivery pin"
              src={embedSrc}
              className="absolute inset-0 size-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
          <p className="border-t border-border px-3 py-2 text-center text-xs text-ink-muted">
            Pin added to your address
          </p>
        </div>
      )}
    </div>
  );
}
