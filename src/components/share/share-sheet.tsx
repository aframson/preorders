"use client";

import { ImageDown, MessageCircle, QrCode } from "lucide-react";
import { useEffect, useState } from "react";

import { CopyButton } from "@/components/share/copy-button";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { whatsappShareLink } from "@/lib/site";

export function ShareSheet({
  url,
  businessName,
  dropTitle,
  batchNumber,
  statusImageHref,
}: {
  url: string;
  businessName: string;
  dropTitle: string;
  batchNumber?: number | null;
  /** 9:16 PNG for WhatsApp Status. */
  statusImageHref?: string;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const message = batchNumber
    ? `${businessName} — ${dropTitle}. Batch ${batchNumber} is open. Order here: ${url}`
    : `${businessName} — ${dropTitle}. Order here: ${url}`;

  useEffect(() => {
    let cancelled = false;
    import("qrcode").then((mod) =>
      mod
        .toDataURL(url, { width: 280, margin: 1, color: { dark: "#1A1614" } })
        .then((data) => {
          if (!cancelled) setQr(data);
        }),
    );
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <Card>
      <CardHeader
        title="Share this batch"
        description="Paste the link in WhatsApp. The preview card updates when a new batch opens."
      />
      <CardBody className="space-y-4">
        <p className="break-all rounded-control bg-surface-muted px-3 py-2 text-sm text-ink-muted">
          {url}
        </p>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={url} size="sm" />
          <ButtonLink
            href={whatsappShareLink(message)}
            target="_blank"
            rel="noreferrer"
            variant="secondary"
            size="sm"
          >
            <MessageCircle className="size-4" aria-hidden />
            Share to WhatsApp
          </ButtonLink>
          {statusImageHref && (
            <ButtonLink
              href={statusImageHref}
              variant="secondary"
              size="sm"
              download
            >
              <ImageDown className="size-4" aria-hidden />
              Status card
            </ButtonLink>
          )}
        </div>
        {qr && (
          <div className="flex items-center gap-3 pt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="" width={96} height={96} className="rounded-lg border border-border" />
            <p className="flex items-start gap-2 text-xs text-ink-muted">
              <QrCode className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              For posters, packaging, or a shop counter.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
