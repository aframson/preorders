"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";

import { Field, Input } from "@/components/ui/field";
import { isGoogleMapsUrl, MAPS_LINK_HINT, mapsEmbedSrc } from "@/lib/maps-link";
import { previewMapsLink } from "@/lib/maps-link.server";

/**
 * Paste a Google Maps share link and confirm the pin on an embedded map.
 * Used for customer delivery addresses and the vendor's pickup spot.
 */
export function MapsLinkField({
  id = "mapsLink",
  name = "mapsLink",
  label,
  hint = MAPS_LINK_HINT,
  defaultValue = "",
  required = false,
  error,
  confirmLabel = "Does this pin look right?",
  previewTitle = "Location preview",
}: {
  id?: string;
  name?: string;
  label: string;
  hint?: string;
  defaultValue?: string;
  required?: boolean;
  error?: string | null;
  confirmLabel?: string;
  previewTitle?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [embedSrc, setEmbedSrc] = useState<string | null>(() =>
    defaultValue ? mapsEmbedSrc(defaultValue) : null,
  );
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const requestId = useRef(0);

  const refreshPreview = useEffectEvent((raw: string) => {
    const trimmed = raw.trim();
    requestId.current += 1;
    const id = requestId.current;

    if (!trimmed) {
      setEmbedSrc(null);
      setPreviewError(null);
      return;
    }

    if (!isGoogleMapsUrl(trimmed)) {
      setEmbedSrc(null);
      setPreviewError("Paste a full Google Maps link");
      return;
    }

    const local = mapsEmbedSrc(trimmed);
    if (local && !trimmed.includes("goo.gl")) {
      setEmbedSrc(local);
      setPreviewError(null);
    }

    startTransition(async () => {
      const preview = await previewMapsLink(trimmed);
      if (id !== requestId.current) return;
      if (!preview.ok) {
        setPreviewError(preview.error);
        if (!local) setEmbedSrc(null);
        return;
      }
      setEmbedSrc(preview.embedSrc);
      setPreviewError(null);
    });
  });

  useEffect(() => {
    const handle = window.setTimeout(() => refreshPreview(value), 400);
    return () => window.clearTimeout(handle);
  }, [value, refreshPreview]);

  // First paint for an existing saved pin.
  useEffect(() => {
    if (defaultValue) refreshPreview(defaultValue);
  }, [defaultValue, refreshPreview]);

  const showError = error ?? previewError;

  return (
    <div className="space-y-3">
      <Field label={label} htmlFor={id} hint={hint} error={showError}>
        <Input
          id={id}
          name={name}
          type="url"
          inputMode="url"
          autoComplete="off"
          required={required}
          placeholder="https://maps.app.goo.gl/…"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={Boolean(showError)}
        />
      </Field>

      {embedSrc && (
        <div className="overflow-hidden rounded-card border border-border bg-surface-muted">
          <div className="relative aspect-video w-full">
            <iframe
              title={previewTitle}
              src={embedSrc}
              className="absolute inset-0 size-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
          <p className="border-t border-border px-3 py-2 text-center text-xs text-ink-muted">
            {pending ? "Updating map…" : confirmLabel}
          </p>
        </div>
      )}
    </div>
  );
}

/** Read-only map confirmation for a saved Google Maps link. */
export function MapsPreview({
  link,
  title = "Location",
  caption,
}: {
  link: string;
  title?: string;
  caption?: string;
}) {
  const embedSrc = mapsEmbedSrc(link);
  if (!embedSrc) return null;

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface-muted">
      <div className="relative aspect-video w-full">
        <iframe
          title={title}
          src={embedSrc}
          className="absolute inset-0 size-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
      {caption && (
        <p className="border-t border-border px-3 py-2 text-center text-xs text-ink-muted">
          {caption}
        </p>
      )}
    </div>
  );
}
