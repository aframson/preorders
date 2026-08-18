"use client";

import { ImageOff, Info } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CartBar, useCart } from "@/components/public/cart";
import { AvailabilityTag } from "@/components/product-availability-tag";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { cn } from "@/lib/cn";
import { estimateFreight, freightUnits } from "@/lib/freight";
import { formatGhs } from "@/lib/money";
import type { PublicBatch, PublicProduct } from "@/lib/queries/public-drop";
import { BUCKETS, publicUrl } from "@/lib/storage";
import {
  combinationKey,
  formatVariantLabel,
  groupVariants,
  resolveMeasurement,
  sumPriceDelta,
} from "@/lib/variants";

function initialSelection(product: PublicProduct): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const group of groupVariants(product.variants)) {
    const first =
      group.options.find((option) => option.stockLimit !== 0) ??
      group.options[0];
    if (first) initial[group.name] = first.id;
  }
  return initial;
}

/** Gallery index for the first selected option that has a pinned photo. */
function imageIndexForSelection(
  product: PublicProduct,
  selection: Record<string, string>,
): number {
  for (const group of groupVariants(product.variants)) {
    const optionId = selection[group.name];
    const option = group.options.find((entry) => entry.id === optionId);
    if (!option?.imagePath) continue;
    const index = product.images.findIndex(
      (photo) => photo.path === option.imagePath,
    );
    if (index >= 0) return index;
  }
  return 0;
}

export function ProductDetail({
  product,
  batch,
  checkoutHref,
  shopHref,
}: {
  product: PublicProduct;
  batch: PublicBatch | null;
  checkoutHref: string;
  /** Drop catalog — return here after add so the buyer can keep shopping. */
  shopHref: string;
}) {
  const router = useRouter();
  const { add, lines: cartLines, count } = useCart();

  const groups = useMemo(
    () => groupVariants(product.variants),
    [product.variants],
  );

  const [selection, setSelection] = useState(() => initialSelection(product));
  const [qty, setQty] = useState(product.moq);
  // Driven by the last option the shopper tapped that has a photo — Size and
  // Colour are equal; whichever they clicked most recently wins.
  const [imageIndex, setImageIndex] = useState(() =>
    imageIndexForSelection(product, initialSelection(product)),
  );

  const selected = groups
    .map((group) =>
      group.options.find((option) => option.id === selection[group.name]),
    )
    .filter((option): option is NonNullable<typeof option> => Boolean(option));

  const unitPrice = product.price + sumPriceDelta(selected);
  const stock =
    selected.reduce<number | null>((limit, option) => {
      if (option.stockLimit === null) return limit;
      return limit === null
        ? option.stockLimit
        : Math.min(limit, option.stockLimit);
    }, product.stockLimit) ?? product.stockLimit;
  const soldOut = stock === 0;
  const belowMoq = stock !== null && stock < product.moq;
  const needsVariant = groups.length > 0 && selected.length < groups.length;
  const canAdd = Boolean(batch) && !soldOut && !belowMoq && !needsVariant;

  const image = product.images[imageIndex] ?? product.images[0];

  const measurement = resolveMeasurement(
    { weightGrams: product.weightGrams, volumeCm3: product.volumeCm3 },
    selected,
  );

  const shippingEstimate = batch
    ? estimateFreight(
        batch.freightMode,
        freightUnits(batch.freightMode, [
          {
            qty,
            weightGrams: measurement.weightGrams,
            volumeCm3: measurement.volumeCm3,
          },
        ]),
        batch.freightRateEstimate,
      )
    : 0;

  function pickOption(groupName: string, optionId: string) {
    setSelection((current) => ({ ...current, [groupName]: optionId }));
    const option = product.variants.find((entry) => entry.id === optionId);
    if (!option?.imagePath) return;
    const index = product.images.findIndex(
      (photo) => photo.path === option.imagePath,
    );
    if (index >= 0) setImageIndex(index);
  }

  function addToOrder() {
    if (!canAdd) {
      toast.error(
        soldOut
          ? "This option is sold out"
          : belowMoq
            ? `Only ${stock} left, below the minimum of ${product.moq}`
            : "Choose an option first",
      );
      return;
    }

    const variantIds = selected.map((option) => option.id);
    const already = cartLines.find(
      (line) =>
        line.productId === product.id &&
        combinationKey(line.variantIds) === combinationKey(variantIds),
    );
    const nextQty = (already?.qty ?? 0) + qty;

    add({
      productId: product.id,
      variantIds,
      qty,
      name: product.name,
      variantLabel: formatVariantLabel(selected),
      unitPrice,
      imagePath: image?.path ?? product.images[0]?.path ?? null,
      weightGrams: measurement.weightGrams,
      volumeCm3: measurement.volumeCm3,
    });

    toast.success(
      already
        ? `${product.name} · ${nextQty} in your bag`
        : `${product.name} added to your bag`,
      {
        description: "Add more products, then review when you are ready.",
        action: {
          label: "Review",
          onClick: () => router.push(checkoutHref),
        },
      },
    );
    router.push(shopHref);
  }

  return (
    <>
      <main className="mx-auto w-full max-w-3xl flex-1 pb-6">
        <div className="relative aspect-4/5 w-full overflow-hidden bg-surface-muted sm:aspect-video">
          {image ? (
            <Image
              src={publicUrl(BUCKETS.productImages, image.path)}
              alt={product.name}
              fill
              priority
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-ink-subtle">
              <ImageOff className="size-8" aria-hidden />
            </div>
          )}
          <AvailabilityTag availability={product.availability} />
        </div>

        {product.images.length > 1 && (
          <div
            className="flex gap-2 overflow-x-auto px-5 py-3 scrollbar-none"
            role="group"
            aria-label="Product photos"
          >
            {product.images.map((photo, index) => (
              <button
                key={photo.path}
                type="button"
                onClick={() => setImageIndex(index)}
                aria-label={`Photo ${index + 1}`}
                aria-current={index === imageIndex ? "true" : undefined}
                className={cn(
                  "size-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                  index === imageIndex
                    ? "border-brand-700"
                    : "border-transparent",
                )}
              >
                <Image
                  src={publicUrl(BUCKETS.productImages, photo.path)}
                  alt=""
                  width={56}
                  height={56}
                  className="size-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        <div className="space-y-6 px-5 pt-4">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-ink">
              {product.name}
            </h1>
            <p
              className="mt-1 font-display text-2xl font-bold text-ink"
              data-numeric
            >
              {formatGhs(unitPrice)}
            </p>
          </div>

          {product.description && (
            <p className="text-sm leading-relaxed text-ink-muted">
              {product.description}
            </p>
          )}

          {groups.map((group) => (
            <fieldset key={group.name}>
              <legend className="mb-2 text-sm font-medium text-ink">
                {group.name}
              </legend>
              <div className="flex flex-wrap gap-2">
                {group.options.map((option) => (
                  <label
                    key={option.id}
                    className={cn(
                      "min-h-11 cursor-pointer rounded-control border px-4 py-2.5 text-sm transition-colors",
                      option.stockLimit === 0 && "cursor-not-allowed opacity-40",
                      selection[group.name] === option.id
                        ? "border-brand-700 bg-brand-50 font-medium text-brand-800 dark:bg-brand-950/50 dark:text-brand-200"
                        : "border-border bg-surface text-ink",
                    )}
                  >
                    <input
                      type="radio"
                      name={`variant-${group.name}`}
                      value={option.id}
                      checked={selection[group.name] === option.id}
                      onChange={() => pickOption(group.name, option.id)}
                      disabled={option.stockLimit === 0}
                      className="sr-only"
                    />
                    {option.value}
                    {option.stockLimit === 0 ? " · sold out" : ""}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-ink">Quantity</span>
            <QuantityStepper
              value={qty}
              onChange={setQty}
              min={product.moq}
              max={stock ?? undefined}
            />
          </div>

          {product.moq > 1 && !soldOut && (
            <p className="text-xs text-ink-muted">
              Minimum order is {product.moq}.
            </p>
          )}

          {soldOut && (
            <p role="status" className="text-sm text-danger">
              This option is sold out.
            </p>
          )}
          {belowMoq && !soldOut && (
            <p role="status" className="text-sm text-danger">
              Only {stock} left, which is below the minimum of {product.moq}.
            </p>
          )}

          {batch && shippingEstimate > 0 && (
            <div className="flex items-start gap-2.5 rounded-card border border-dashed border-border px-4 py-3">
              <Info
                className="mt-0.5 size-4 shrink-0 text-ink-subtle"
                aria-hidden
              />
              <p className="text-sm text-ink-muted">
                Estimated shipping share{" "}
                <span className="font-medium text-ink" data-numeric>
                  {formatGhs(shippingEstimate)}
                </span>
                . Charged when your goods arrive, not now.
              </p>
            </div>
          )}
        </div>
      </main>

      {batch ? (
        <StickyActionBar>
          <Button size="lg" block onClick={addToOrder} disabled={!canAdd}>
            {soldOut
              ? "Sold out"
              : belowMoq
                ? "Not enough left"
                : (
                    <>
                      Add to bag &middot;{" "}
                      <span data-numeric>{formatGhs(unitPrice * qty)}</span>
                      {count > 0 ? (
                        <span className="font-normal text-white/75">
                          {" "}
                          ({count} in bag)
                        </span>
                      ) : null}
                    </>
                  )}
          </Button>
        </StickyActionBar>
      ) : (
        <StickyActionBar>
          <p className="pb-3 text-center text-sm text-ink-muted">
            Orders are closed right now.
          </p>
        </StickyActionBar>
      )}

      {batch && <CartBar checkoutHref={checkoutHref} />}
    </>
  );
}
