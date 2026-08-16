"use client";

import { Info, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";

import { useCart, type CartLine } from "@/components/public/cart";
import {
  MapsLinkField,
  MapsPreview,
} from "@/components/public/maps-link-field";
import { ButtonLink, Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { MoneyRow } from "@/components/ui/money-row";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { cn } from "@/lib/cn";
import { estimateFreight, freightUnits } from "@/lib/freight";
import { formatGhs } from "@/lib/money";
import type { PublicBatch } from "@/lib/queries/public-drop";
import { dropPath } from "@/lib/site";
import { BUCKETS, publicUrl } from "@/lib/storage";
import { formatDeliveryWindow } from "@/lib/time";
import { placeOrder, type CheckoutState } from "./actions";

export function CheckoutForm({
  vendorSlug,
  dropSlug,
  batch,
  businessName,
  pickupMapsUrl,
}: {
  vendorSlug: string;
  dropSlug: string;
  batch: PublicBatch;
  businessName: string;
  pickupMapsUrl: string | null;
}) {
  const { lines, setQty, remove, subtotal, ready } = useCart();
  const pickupAvailable = Boolean(pickupMapsUrl);
  const [fulfilment, setFulfilment] = useState<"pickup" | "delivery">(
    pickupAvailable ? "pickup" : "delivery",
  );
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(
    placeOrder,
    {},
  );
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!state.error && !state.fieldErrors) return;
    const firstField = state.fieldErrors
      ? Object.keys(state.fieldErrors)[0]
      : null;
    const field = firstField ? document.getElementById(firstField) : null;
    (field ?? errorRef.current)?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
    field?.focus();
  }, [state]);

  const base = dropPath(vendorSlug, dropSlug);
  const freightEstimate = estimateFor(lines, batch);
  const fulfilmentOptions = (
    pickupAvailable
      ? (["pickup", "delivery"] as const)
      : (["delivery"] as const)
  );

  // Nothing renders until the cart has been read from storage, otherwise the
  // empty state flashes on every load.
  if (!ready) return null;

  if (lines.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-5">
        <EmptyState
          icon={ShoppingBag}
          title="Your order is empty"
          description="Add something from the link and it will show up here."
          action={<ButtonLink href={base}>Browse the batch</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-1 flex-col">
      <input type="hidden" name="vendorSlug" value={vendorSlug} />
      <input type="hidden" name="dropSlug" value={dropSlug} />
      <input type="hidden" name="batchId" value={batch.id} />
      <input type="hidden" name="lines" value={JSON.stringify(serialise(lines))} />

      <div className="mx-auto w-full max-w-lg space-y-8 px-5 py-6">
        <section className="space-y-3">
          <h1 className="font-display text-xl font-bold text-ink">
            Review your order
          </h1>

          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {lines.map((line) => (
              <li
                key={`${line.productId}:${line.variantIds.join(",")}`}
                className="flex gap-3 p-3"
              >
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                  {line.imagePath && (
                    <Image
                      src={publicUrl(BUCKETS.productImages, line.imagePath)}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {line.name}
                  </p>
                  {line.variantLabel && (
                    <p className="text-xs text-ink-muted">{line.variantLabel}</p>
                  )}
                  <p className="mt-0.5 text-sm text-ink-muted" data-numeric>
                    {formatGhs(line.unitPrice)}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <QuantityStepper
                      value={line.qty}
                      onChange={(next) =>
                        setQty(line.productId, line.variantIds, next)
                      }
                      label={`quantity for ${line.name}`}
                    />
                    <button
                      type="button"
                      onClick={() => remove(line.productId, line.variantIds)}
                      aria-label={`Remove ${line.name}`}
                      className="flex size-11 items-center justify-center rounded-control text-ink-subtle transition-colors hover:bg-surface-muted hover:text-danger"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-base font-semibold text-ink">
            Your details
          </h2>

          <Field
            label="Full name"
            htmlFor="name"
            hint="So the vendor knows whose parcel is whose"
            error={state.fieldErrors?.name}
          >
            <Input
              id="name"
              name="name"
              autoComplete="name"
              required
              placeholder="Ama Mensah"
              aria-invalid={Boolean(state.fieldErrors?.name)}
            />
          </Field>

          <Field
            label="WhatsApp number"
            htmlFor="phone"
            hint="Updates come here"
            error={state.fieldErrors?.phone}
          >
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder="024 123 4567"
              aria-invalid={Boolean(state.fieldErrors?.phone)}
            />
          </Field>

          <Field
            label="Email"
            htmlFor="email"
            hint="For your receipt"
            error={state.fieldErrors?.email}
          >
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="ama@example.com"
              aria-invalid={Boolean(state.fieldErrors?.email)}
            />
          </Field>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">
              How do you want it?
            </legend>
            <div
              className={cn(
                "grid gap-2",
                fulfilmentOptions.length > 1 ? "grid-cols-2" : "grid-cols-1",
              )}
            >
              {fulfilmentOptions.map((option) => (
                <label
                  key={option}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center justify-center rounded-control border px-3 text-sm font-medium transition-colors",
                    fulfilment === option
                      ? "border-brand-600 bg-brand-50 text-brand-800"
                      : "border-border bg-surface text-ink-muted hover:border-border-strong",
                  )}
                >
                  <input
                    type="radio"
                    name="fulfilment"
                    value={option}
                    checked={fulfilment === option}
                    onChange={() => setFulfilment(option)}
                    className="sr-only"
                  />
                  {option === "pickup" ? "Pick up" : "Deliver to me"}
                </label>
              ))}
            </div>
          </fieldset>

          {fulfilment === "pickup" && pickupMapsUrl && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-ink">Pickup spot</p>
              <p className="text-xs text-ink-muted">
                Collect from {businessName} at this pin.
              </p>
              <MapsPreview
                link={pickupMapsUrl}
                title="Pickup location"
                caption="Confirm you can get here"
              />
              <a
                href={pickupMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
              >
                Open in Google Maps
              </a>
            </div>
          )}

          {fulfilment === "delivery" && (
            <MapsLinkField
              id="deliveryNote"
              name="deliveryNote"
              label="Where should it go?"
              required
              error={state.fieldErrors?.deliveryNote}
              confirmLabel="Does this pin look right?"
              previewTitle="Delivery location preview"
            />
          )}
        </section>

        <section className="space-y-3 rounded-card border border-border bg-surface p-4">
          <MoneyRow label="Goods" amount={subtotal} />
          {freightEstimate > 0 && (
            <MoneyRow
              label="Shipping, later"
              amount={freightEstimate}
              muted
              hint={
                <span className="ml-1 text-ink-subtle">estimate</span>
              }
            />
          )}

          <div className="border-t border-border pt-3">
            <MoneyRow label="Pay now" amount={subtotal} strong />
          </div>

          <p className="flex gap-2 rounded-lg bg-surface-muted p-3 text-xs leading-relaxed text-ink-muted">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              You are paying for your goods only. Shipping is charged separately
              once everything lands in Accra
              {batch.expectedDeliveryAt
                ? `, expected ${formatDeliveryWindow(batch.expectedDeliveryAt)}`
                : ""}
              . {businessName} splits the real freight bill across the batch by{" "}
              {batch.freightMode === "air_kg" ? "weight" : "size"}, so the final
              figure can move a little either way.
            </span>
          </p>
        </section>
      </div>

      <div className="flex-1" />

      <StickyActionBar>
        {state.error && (
          <p
            ref={errorRef}
            role="alert"
            className="mb-2 rounded-control border border-danger/30 bg-danger-tint px-3 py-2 text-sm text-danger"
          >
            {state.error}
          </p>
        )}
        <Button type="submit" size="lg" block loading={pending}>
          Pay {formatGhs(subtotal)}
        </Button>
        <p className="py-2 text-center text-xs text-ink-subtle">
          Mobile money or card &middot; secured by Paystack
        </p>
      </StickyActionBar>
    </form>
  );
}

function serialise(lines: readonly CartLine[]) {
  return lines.map((line) => ({
    productId: line.productId,
    variantIds: line.variantIds,
    qty: line.qty,
    imagePath: line.imagePath,
  }));
}

/**
 * Shown for expectation-setting only. The server recomputes this from the
 * database when the order is created, and the real figure is only known once
 * the forwarder issues the bill for the whole batch.
 */
function estimateFor(lines: readonly CartLine[], batch: PublicBatch): number {
  return estimateFreight(
    batch.freightMode,
    freightUnits(batch.freightMode, lines),
    batch.freightRateEstimate,
  );
}
