import "server-only";

import { estimateFreight, freightUnits, type FreightMode } from "@/lib/freight";
import { upsertCustomer } from "@/lib/customers";
import { isPastCutoff, scheduleHoldExpiry } from "@/lib/jobs";
import type { Pesewas } from "@/lib/money";
import { normalisePhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  combinationKey,
  formatVariantLabel,
  resolveMeasurement,
  sumPriceDelta,
} from "@/lib/variants";

/** How long an unpaid order holds its place before the slot is released. */
export const HOLD_HOURS = 24;

export type CartLineInput = {
  productId: string;
  /** Chosen option ids across every group (Size + Colour, …). */
  variantIds: string[];
  qty: number;
  /**
   * Photo the customer was looking at when they added the line. Only used if
   * it belongs to this product; otherwise we fall back to a variant pin or
   * the cover image.
   */
  imagePath?: string | null;
};

/**
 * Same product + same options → one line with summed qty. Callers may send
 * duplicates (or we fold a new checkout into an unpaid order); pricing and
 * inserts must never create two rows for the same SKU.
 */
export function mergeCartLines(
  input: readonly CartLineInput[],
): CartLineInput[] {
  const merged = new Map<string, CartLineInput>();

  for (const line of input) {
    if (line.qty <= 0) continue;
    const key = `${line.productId}:${combinationKey(line.variantIds)}`;
    const existing = merged.get(key);
    if (existing) {
      merged.set(key, {
        ...existing,
        qty: existing.qty + line.qty,
        imagePath: line.imagePath ?? existing.imagePath,
      });
    } else {
      merged.set(key, {
        productId: line.productId,
        variantIds: [...line.variantIds],
        qty: line.qty,
        imagePath: line.imagePath,
      });
    }
  }

  return [...merged.values()];
}

export type PricedLine = {
  productId: string;
  variantIds: string[];
  qty: number;
  unitPrice: Pesewas;
  weightGrams: number;
  volumeCm3: number;
  lineTotal: Pesewas;
  snapshot: {
    productName: string;
    variantLabel?: string;
    variantName?: string;
    variantValue?: string;
    imagePath?: string;
  };
};

export type PricedCart = {
  lines: PricedLine[];
  goodsTotal: Pesewas;
  freightUnits: number;
  freightEstimate: Pesewas;
};

export class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutError";
  }
}

/**
 * Re-derive every price and dimension from the database.
 *
 * Nothing the browser sends about money is trusted: the client supplies only
 * ids and quantities. This is also where the price and freight-unit snapshot
 * comes from, because both change between batches and the order has to stay
 * readable years later.
 */
export async function priceCart(
  dropId: string,
  freightMode: FreightMode,
  freightRateEstimate: Pesewas,
  rawInput: readonly CartLineInput[],
): Promise<PricedCart> {
  const input = mergeCartLines(rawInput);
  if (input.length === 0) throw new CheckoutError("Your order is empty.");

  const admin = createAdminClient();
  const productIds = [...new Set(input.map((line) => line.productId))];

  const { data: products } = await admin
    .from("products")
    .select(
      "id, name, price, weight_grams, volume_cm3, stock_limit, moq, published, drop_id, product_variants(id, name, value, price_delta, weight_grams, volume_cm3, stock_limit, image_path), product_images(storage_path, position)",
    )
    .in("id", productIds)
    .eq("drop_id", dropId);

  const byId = new Map((products ?? []).map((product) => [product.id, product]));
  const lines: PricedLine[] = [];

  for (const line of input) {
    const product = byId.get(line.productId);

    if (!product || !product.published) {
      throw new CheckoutError(
        "One of the items is no longer available. Remove it and try again.",
      );
    }

    if (line.qty < product.moq) {
      throw new CheckoutError(
        `${product.name} has a minimum order of ${product.moq}.`,
      );
    }

    const catalogue = product.product_variants ?? [];
    const groups = new Set(catalogue.map((option) => option.name));

    if (groups.size > 0 && line.variantIds.length === 0) {
      throw new CheckoutError(
        `Choose options for ${product.name} before checking out.`,
      );
    }

    const selected = line.variantIds.map((id) => {
      const option = catalogue.find((entry) => entry.id === id);
      if (!option) {
        throw new CheckoutError(
          `The option you picked for ${product.name} is no longer available.`,
        );
      }
      return option;
    });

    // One pick per group — e.g. not two Colours — and every group covered.
    const groupNames = new Set(selected.map((option) => option.name));
    if (
      groupNames.size !== selected.length ||
      (groups.size > 0 && selected.length !== groups.size)
    ) {
      throw new CheckoutError(
        `The options you picked for ${product.name} are not valid together.`,
      );
    }

    let stockLimit: number | null = product.stock_limit;
    for (const option of selected) {
      if (option.stock_limit === null || option.stock_limit === undefined) {
        continue;
      }
      stockLimit =
        stockLimit === null
          ? option.stock_limit
          : Math.min(stockLimit, option.stock_limit);
    }
    if (stockLimit !== null && line.qty > stockLimit) {
      throw new CheckoutError(
        `Only ${stockLimit} of ${product.name} are left.`,
      );
    }

    const mapped = selected.map((option) => ({
      name: option.name,
      value: option.value,
      priceDelta: option.price_delta,
      weightGrams: option.weight_grams,
      volumeCm3: option.volume_cm3,
    }));
    const unitPrice = product.price + sumPriceDelta(mapped);
    const measurement = resolveMeasurement(
      {
        weightGrams: product.weight_grams,
        volumeCm3: product.volume_cm3,
      },
      mapped,
    );
    const cover = [...(product.product_images ?? [])].sort(
      (a, b) => a.position - b.position,
    )[0];
    const optionImage = selected.find((option) => option.image_path)?.image_path;
    const preferredImage =
      line.imagePath &&
      (product.product_images ?? []).some(
        (image) => image.storage_path === line.imagePath,
      )
        ? line.imagePath
        : null;
    const imagePath = optionImage ?? preferredImage ?? cover?.storage_path;
    const variantLabel = formatVariantLabel(mapped) ?? undefined;
    const sole = selected.length === 1 ? selected[0] : undefined;

    lines.push({
      productId: product.id,
      variantIds: selected.map((option) => option.id),
      qty: line.qty,
      unitPrice,
      weightGrams: measurement.weightGrams,
      volumeCm3: measurement.volumeCm3,
      lineTotal: unitPrice * line.qty,
      snapshot: {
        productName: product.name,
        ...(variantLabel && { variantLabel }),
        ...(sole && { variantName: sole.name, variantValue: sole.value }),
        ...(imagePath && { imagePath }),
      },
    });
  }

  const units = freightUnits(
    freightMode,
    lines.map((line) => ({
      qty: line.qty,
      weightGrams: line.weightGrams,
      volumeCm3: line.volumeCm3,
    })),
  );

  return {
    lines,
    goodsTotal: lines.reduce((sum, line) => sum + line.lineTotal, 0),
    freightUnits: units,
    freightEstimate: estimateFreight(freightMode, units, freightRateEstimate),
  };
}

export type CreateOrderInput = {
  batchId: string;
  vendorId: string;
  dropId: string;
  freightMode: FreightMode;
  freightRateEstimate: Pesewas;
  customer: { name: string; phone: string; email: string };
  fulfilment: "pickup" | "delivery";
  deliveryNote: string | null;
  lines: readonly CartLineInput[];
};

export type CreatedOrder = {
  id: string;
  code: string;
  publicToken: string;
  portalToken: string;
  goodsTotal: Pesewas;
  freightEstimate: Pesewas;
};

/**
 * Creates a `pending_payment` order that holds its place for a day.
 *
 * Same customer (phone) checking out again on the same open batch merges into
 * their unpaid order: matching product + options increase qty instead of
 * creating another order code.
 *
 * The order does not count toward batch totals or the supplier manifest until
 * the payment webhook confirms it, so an abandoned checkout never inflates
 * what the vendor buys.
 */
export async function createOrder(
  input: CreateOrderInput,
): Promise<CreatedOrder> {
  const admin = createAdminClient();

  const { data: batch } = await admin
    .from("batches")
    .select("id, status, closes_at, drop_id")
    .eq("id", input.batchId)
    .maybeSingle();

  if (!batch || batch.drop_id !== input.dropId) {
    throw new CheckoutError("This batch is no longer available.");
  }

  // Checked here as well as at render time: a customer can sit on the checkout
  // page for an hour, and the cutoff is the promise the vendor made to
  // everyone else in the batch.
  if (batch.status !== "open" || isPastCutoff(batch.closes_at)) {
    throw new CheckoutError(
      "This batch closed while you were ordering. Nothing has been charged.",
    );
  }

  const { data: vendorRow } = await admin
    .from("vendors")
    .select("pickup_maps_url")
    .eq("id", input.vendorId)
    .maybeSingle();

  let deliveryNote = input.deliveryNote;

  if (input.fulfilment === "pickup") {
    if (!vendorRow?.pickup_maps_url) {
      throw new CheckoutError(
        "This seller is not offering pickup right now. Choose delivery instead.",
      );
    }
    // Snapshot the pin on the order so later vendor edits do not rewrite history.
    deliveryNote = vendorRow.pickup_maps_url;
  }

  const phone = normalisePhone(input.customer.phone);

  let customer: { id: string; portalToken: string };
  try {
    customer = await upsertCustomer({
      vendorId: input.vendorId,
      name: input.customer.name,
      phone,
      email: input.customer.email,
    });
  } catch {
    throw new CheckoutError("Could not save your details. Try again.");
  }

  // Same phone + same open batch + still unpaid → grow that order's counts
  // instead of minting AFR-…-0002 for another pair of the same shoes.
  const { data: pendingRows } = await admin
    .from("orders")
    .select(
      "id, code, public_token, hold_expires_at, order_items(id, product_id, variant_ids, qty, snapshot)",
    )
    .eq("batch_id", input.batchId)
    .eq("customer_id", customer.id)
    .eq("status", "pending_payment")
    .order("created_at", { ascending: false })
    .limit(1);

  const pending = pendingRows?.[0] ?? null;
  const holdStillValid =
    pending?.hold_expires_at != null &&
    new Date(pending.hold_expires_at).getTime() > Date.now();

  const existingLines: CartLineInput[] =
    pending && holdStillValid
      ? (pending.order_items ?? [])
          .filter(
            (item): item is typeof item & { product_id: string } =>
              typeof item.product_id === "string",
          )
          .map((item) => {
            const snapshot = item.snapshot as { imagePath?: string } | null;
            return {
              productId: item.product_id,
              variantIds: item.variant_ids ?? [],
              qty: item.qty,
              imagePath: snapshot?.imagePath ?? null,
            };
          })
      : [];

  const priced = await priceCart(
    input.dropId,
    input.freightMode,
    input.freightRateEstimate,
    [...existingLines, ...input.lines],
  );

  const holdExpiresAt = new Date(Date.now() + HOLD_HOURS * 60 * 60 * 1000);
  const itemRows = priced.lines.map((line) => ({
    product_id: line.productId,
    variant_ids: line.variantIds,
    qty: line.qty,
    unit_price: line.unitPrice,
    weight_grams: line.weightGrams,
    volume_cm3: line.volumeCm3,
    snapshot: line.snapshot,
  }));

  if (pending && holdStillValid) {
    const { error: updateError } = await admin
      .from("orders")
      .update({
        goods_total: priced.goodsTotal,
        freight_units: priced.freightUnits,
        freight_estimate: priced.freightEstimate,
        fulfilment: input.fulfilment,
        delivery_note: deliveryNote,
        hold_expires_at: holdExpiresAt.toISOString(),
      })
      .eq("id", pending.id);

    if (updateError) {
      throw new CheckoutError("Could not update your order. Try again.");
    }

    const { error: clearError } = await admin
      .from("order_items")
      .delete()
      .eq("order_id", pending.id);

    if (clearError) {
      throw new CheckoutError("Could not update your order. Try again.");
    }

    const { error: itemsError } = await admin.from("order_items").insert(
      itemRows.map((row) => ({ ...row, order_id: pending.id })),
    );

    if (itemsError) {
      throw new CheckoutError("Could not update your order. Try again.");
    }

    await scheduleHoldExpiry(pending.id, holdExpiresAt);

    return {
      id: pending.id,
      code: pending.code,
      publicToken: pending.public_token,
      portalToken: customer.portalToken,
      goodsTotal: priced.goodsTotal,
      freightEstimate: priced.freightEstimate,
    };
  }

  const { data: code, error: codeError } = await admin.rpc("next_order_code", {
    p_batch_id: input.batchId,
  });

  if (codeError || !code) {
    throw new CheckoutError("Could not create your order. Try again.");
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      batch_id: input.batchId,
      customer_id: customer.id,
      code,
      status: "pending_payment",
      goods_total: priced.goodsTotal,
      freight_units: priced.freightUnits,
      freight_estimate: priced.freightEstimate,
      fulfilment: input.fulfilment,
      delivery_note: deliveryNote,
      hold_expires_at: holdExpiresAt.toISOString(),
    })
    .select("id, code, public_token")
    .single();

  if (orderError || !order) {
    throw new CheckoutError("Could not create your order. Try again.");
  }

  const { error: itemsError } = await admin.from("order_items").insert(
    itemRows.map((row) => ({ ...row, order_id: order.id })),
  );

  if (itemsError) {
    await admin.from("orders").delete().eq("id", order.id);
    throw new CheckoutError("Could not create your order. Try again.");
  }

  await scheduleHoldExpiry(order.id, holdExpiresAt);

  return {
    id: order.id,
    code: order.code,
    publicToken: order.public_token,
    portalToken: customer.portalToken,
    goodsTotal: priced.goodsTotal,
    freightEstimate: priced.freightEstimate,
  };
}
