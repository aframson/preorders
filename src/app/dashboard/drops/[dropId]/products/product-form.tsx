"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import {
  ImageUploader,
  type UploadedImage,
} from "@/components/dashboard/image-uploader";
import {
  VariantBuilder,
  groupsFromVariants,
  variantsFromGroups,
  type CombinationStockDraft,
  type VariantDraft,
  type VariantGroupDraft,
} from "@/components/dashboard/variant-builder";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Field,
  FormError,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/field";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { FREIGHT_PRESETS } from "@/lib/freight-presets";
import {
  PRODUCT_AVAILABILITY,
  type ProductAvailability,
} from "@/lib/product-availability";
import { deleteProduct, saveProduct, type ActionState } from "../../actions";

export type ProductFormValues = {
  id?: string;
  name: string;
  description: string;
  /** Pesewas. */
  price: number;
  categoryId: string | null;
  weightGrams: number | null;
  volumeCm3: number | null;
  stockLimit: number | null;
  moq: number;
  availability: ProductAvailability;
  published: boolean;
  variants: VariantDraft[];
  images: UploadedImage[];
};

export function ProductForm({
  vendorId,
  dropId,
  productId,
  categories,
  initial,
}: {
  vendorId: string;
  dropId: string;
  /** Pre-allocated for new products so photos can upload before the first save. */
  productId: string;
  categories: { id: string; name: string }[];
  initial: ProductFormValues;
}) {
  const [state, submit, pending] = useActionState<ActionState, FormData>(
    saveProduct,
    {},
  );
  const { confirm, dialog } = useConfirmDialog();

  const [values, setValues] = useState(initial);
  const [groups, setGroups] = useState<VariantGroupDraft[]>(() =>
    groupsFromVariants(initial.variants),
  );
  const [combinations, setCombinations] = useState<CombinationStockDraft[]>(
    [],
  );

  function set<K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function setGroupsAndSync(next: VariantGroupDraft[]) {
    setGroups(next);
    set("variants", variantsFromGroups(next));
  }

  const payload = {
    ...(values.id ? { id: values.id } : {}),
    dropId,
    name: values.name,
    description: values.description || null,
    price: values.price,
    categoryId: values.categoryId,
    weightGrams: values.weightGrams,
    volumeCm3: values.volumeCm3,
    stockLimit: values.stockLimit,
    moq: values.moq,
    availability: values.availability,
    published: values.published,
    variants: variantsFromGroups(groups),
    images: values.images,
  };

  const fieldErrorCount = Object.keys(state.fieldErrors ?? {}).length;

  return (
    <form action={submit} className="pb-4">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      {dialog}

      {(state.error || fieldErrorCount > 0) && (
        <div className="mb-6 max-w-2xl">
          <FormError
            message={
              state.error ??
              `Check the highlighted field${fieldErrorCount === 1 ? "" : "s"} below.`
            }
          />
        </div>
      )}

      <div className="grid max-w-5xl gap-8 lg:grid-cols-[10rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav
            aria-label="Product sections"
            className="sticky top-8 space-y-1 text-sm"
          >
            {[
              ["#photos", "Photos"],
              ["#basics", "Basics"],
              ["#shipping-size", "Shipping"],
              ["#options", "Options"],
              ["#inventory", "Inventory"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="block rounded-control px-3 py-2 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
              >
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 max-w-2xl space-y-8">
        <section id="photos" className="scroll-mt-8 space-y-2">
          <Label>Photos</Label>
          <ImageUploader
            vendorId={vendorId}
            productId={productId}
            value={values.images}
            onChange={(images) => set("images", images)}
          />
          {state.fieldErrors?.images && (
            <p role="alert" className="text-xs text-danger">
              {state.fieldErrors.images}
            </p>
          )}
        </section>

        <section id="basics" className="scroll-mt-8 space-y-5">
          <Field label="Product name" htmlFor="name" error={state.fieldErrors?.name}>
            <Input
              id="name"
              required
              value={values.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="Chunky sneakers"
            />
          </Field>

          <Field
            label="Price"
            htmlFor="price"
            hint="What the customer pays for the goods. Shipping is charged separately."
            error={state.fieldErrors?.price}
          >
            <div className="flex items-center overflow-hidden rounded-control border border-border bg-surface focus-within:border-brand-500">
              <span className="shrink-0 border-r border-border bg-surface-muted px-3.5 py-4 text-sm text-ink-muted sm:py-3">
                GHS
              </span>
              <input
                id="price"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                value={values.price / 100}
                onChange={(event) =>
                  set("price", Math.round(Number(event.target.value || 0) * 100))
                }
                className="h-14 w-full bg-transparent px-3 text-base text-ink focus:outline-none sm:h-12"
                data-numeric
              />
            </div>
          </Field>

          {categories.length > 0 && (
            <Field
              label="Category"
              htmlFor="categoryId"
              error={state.fieldErrors?.categoryId}
            >
              <Select
                id="categoryId"
                value={values.categoryId ?? ""}
                onChange={(event) =>
                  set("categoryId", event.target.value || null)
                }
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field
            label="Description"
            htmlFor="description"
            error={state.fieldErrors?.description}
          >
            <Textarea
              id="description"
              rows={3}
              value={values.description}
              onChange={(event) => set("description", event.target.value)}
              placeholder="Sizes 38 to 45. Runs small, take one size up."
            />
          </Field>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-ink">Availability</legend>
            <p className="text-sm text-ink-muted">
              Shown as a small tag on the product photo.
            </p>
            {state.fieldErrors?.availability && (
              <p role="alert" className="text-xs text-danger">
                {state.fieldErrors.availability}
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                Object.keys(PRODUCT_AVAILABILITY) as ProductAvailability[]
              ).map((key) => {
                const option = PRODUCT_AVAILABILITY[key];
                const selected = values.availability === key;
                return (
                  <label
                    key={key}
                    className={
                      selected
                        ? "flex cursor-pointer flex-col gap-0.5 rounded-card border border-ink bg-surface-muted px-4 py-3"
                        : "flex cursor-pointer flex-col gap-0.5 rounded-card border border-border bg-surface px-4 py-3"
                    }
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="availability"
                        value={key}
                        checked={selected}
                        onChange={() => set("availability", key)}
                      className="size-4 accent-ink"
                      />
                      <span className="text-sm font-medium text-ink">
                        {option.label}
                      </span>
                    </span>
                    <span className="pl-6 text-xs text-ink-muted">
                      {option.hint}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </section>

        <section
          id="shipping-size"
          className="scroll-mt-8 space-y-4 rounded-card border border-border bg-surface p-5 shadow-sm"
        >
          <div>
            <h2 className="font-display font-semibold text-ink">Shipping size</h2>
            <p className="mt-1 text-sm text-ink-muted">
              This is how each customer&rsquo;s share of the shipping bill is
              worked out. A close guess is fine. Your batch cannot open without
              it.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {FREIGHT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  set("weightGrams", preset.weightGrams);
                  set("volumeCm3", preset.volumeCm3);
                }}
                className="rounded-control border border-border px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-ink hover:text-ink"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Weight"
              htmlFor="weightGrams"
              hint="In grams. Used for air freight."
              error={state.fieldErrors?.weightGrams}
            >
              <Input
                id="weightGrams"
                type="number"
                inputMode="numeric"
                min="0"
                value={values.weightGrams ?? ""}
                onChange={(event) =>
                  set(
                    "weightGrams",
                    event.target.value === "" ? null : Number(event.target.value),
                  )
                }
                placeholder="900"
                data-numeric
              />
            </Field>

            <Field
              label="Volume"
              htmlFor="volumeCm3"
              hint="In cm³ (length × width × height). Used for sea freight."
              error={state.fieldErrors?.volumeCm3}
            >
              <Input
                id="volumeCm3"
                type="number"
                inputMode="numeric"
                min="0"
                value={values.volumeCm3 ?? ""}
                onChange={(event) =>
                  set(
                    "volumeCm3",
                    event.target.value === "" ? null : Number(event.target.value),
                  )
                }
                placeholder="9000"
                data-numeric
              />
            </Field>
          </div>
        </section>

        <section id="options" className="scroll-mt-8 space-y-4">
          <div>
            <h2 className="font-display font-semibold text-ink">Options</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Size, colour and similar choices. Upload photos first if you want
              each colour to show its own picture.
            </p>
            {state.fieldErrors?.variants && (
              <p role="alert" className="mt-1 text-xs text-danger">
                {state.fieldErrors.variants}
              </p>
            )}
          </div>
          <VariantBuilder
            groups={groups}
            onChange={setGroupsAndSync}
            combinations={combinations}
            onCombinationsChange={setCombinations}
            images={values.images}
          />
        </section>

        <section
          id="inventory"
          className="scroll-mt-8 grid gap-4 sm:grid-cols-2"
        >
          <Field
            label="Stock limit"
            htmlFor="stockLimit"
            hint="Leave blank for unlimited."
            error={state.fieldErrors?.stockLimit}
          >
            <Input
              id="stockLimit"
              type="number"
              inputMode="numeric"
              min="0"
              value={values.stockLimit ?? ""}
              onChange={(event) =>
                set(
                  "stockLimit",
                  event.target.value === "" ? null : Number(event.target.value),
                )
              }
              data-numeric
            />
          </Field>

          <Field
            label="Minimum order"
            htmlFor="moq"
            hint="How many a customer must take."
            error={state.fieldErrors?.moq}
          >
            <Input
              id="moq"
              type="number"
              inputMode="numeric"
              min="1"
              value={values.moq}
              onChange={(event) =>
                set("moq", Math.max(1, Number(event.target.value || 1)))
              }
              data-numeric
            />
          </Field>
        </section>

        <label className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3.5">
          <input
            type="checkbox"
            checked={values.published}
            onChange={(event) => set("published", event.target.checked)}
            className="size-5 accent-ink"
          />
          <span className="text-sm">
            <span className="block font-medium text-ink">
              Show on my link
            </span>
            <span className="block text-ink-muted">
              Uncheck to keep it as a draft.
            </span>
          </span>
        </label>

        {values.id && (
          <Button
            type="button"
            variant="ghost"
            className="text-danger hover:bg-danger-tint hover:text-danger"
            onClick={async () => {
              const ok = await confirm({
                title: "Delete this product?",
                description:
                  "Orders that already include it keep their own copy.",
                confirmLabel: "Delete product",
                danger: true,
              });
              if (ok) void deleteProduct(values.id!, dropId);
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Delete product
          </Button>
        )}
        </div>
      </div>

      <StickyActionBar className="-mx-5 mt-8 lg:-mx-8 lg:px-8">
        <Button type="submit" size="lg" block loading={pending}>
          {values.id ? "Save changes" : "Add product"}
        </Button>
      </StickyActionBar>
    </form>
  );
}
