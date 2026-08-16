"use client";

import { Plus, X } from "lucide-react";
import Image from "next/image";

import { Input, Label } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { BUCKETS, publicUrl } from "@/lib/storage";

export type VariantDraft = {
  id?: string;
  name: string;
  value: string;
  priceDelta: number;
  weightGrams: number | null;
  volumeCm3: number | null;
  stockLimit: number | null;
  /** Product photo storage path shown when this option is picked. */
  imagePath: string | null;
};

export type CombinationStockDraft = {
  /** One value per group name currently on the product. */
  values: Record<string, string>;
  stockLimit: number;
};

export type VariantGroupDraft = {
  name: string;
  options: VariantDraft[];
};

export type VariantImageOption = {
  path: string;
  width: number;
  height: number;
};

const COMMON_GROUPS = ["Size", "Colour", "Length", "Style"] as const;

function emptyOption(name: string): VariantDraft {
  return {
    name,
    value: "",
    priceDelta: 0,
    weightGrams: null,
    volumeCm3: null,
    stockLimit: null,
    imagePath: null,
  };
}

/**
 * One or more option groups (Size, Colour, …). Vendors pick the types they
 * need from the list, then fill values. Photos already uploaded on the product
 * can be pinned to a value so the storefront swaps when that option is chosen.
 */
export function VariantBuilder({
  groups = [],
  onChange,
  combinations = [],
  onCombinationsChange,
  images = [],
}: {
  groups?: VariantGroupDraft[];
  onChange: (groups: VariantGroupDraft[]) => void;
  combinations?: CombinationStockDraft[];
  onCombinationsChange: (combinations: CombinationStockDraft[]) => void;
  images?: VariantImageOption[];
}) {
  const safeGroups = groups ?? [];
  const safeCombinations = combinations ?? [];
  const usedNames = new Set(
    safeGroups.map((group) => group.name.trim().toLowerCase()).filter(Boolean),
  );

  function renameGroup(index: number, nextName: string) {
    const previous = safeGroups[index].name;
    onChange(
      safeGroups.map((group, i) =>
        i === index
          ? {
              ...group,
              name: nextName,
              options: group.options.map((option) => ({
                ...option,
                name: nextName,
              })),
            }
          : group,
      ),
    );
    if (previous === nextName) return;
    onCombinationsChange(
      safeCombinations.map((row) => {
        const values = { ...row.values };
        if (previous in values) {
          values[nextName] = values[previous];
          delete values[previous];
        }
        return { ...row, values };
      }),
    );
  }

  function updateOption(
    groupIndex: number,
    optionIndex: number,
    patch: Partial<VariantDraft>,
  ) {
    onChange(
      safeGroups.map((group, i) => {
        if (i !== groupIndex) return group;
        return {
          ...group,
          options: group.options.map((option, j) =>
            j === optionIndex ? { ...option, ...patch } : option,
          ),
        };
      }),
    );
  }

  function addOption(groupIndex: number) {
    onChange(
      safeGroups.map((entry, i) =>
        i === groupIndex
          ? {
              ...entry,
              options: [...entry.options, emptyOption(entry.name || "Option")],
            }
          : entry,
      ),
    );
  }

  function removeOption(groupIndex: number, optionIndex: number) {
    const group = safeGroups[groupIndex];
    const removed = group.options[optionIndex]?.value;
    onChange(
      safeGroups.map((entry, i) =>
        i === groupIndex
          ? {
              ...entry,
              options: entry.options.filter((_, j) => j !== optionIndex),
            }
          : entry,
      ),
    );
    if (!removed) return;
    onCombinationsChange(
      safeCombinations.filter((row) => row.values[group.name] !== removed),
    );
  }

  function removeGroup(groupIndex: number) {
    const removed = safeGroups[groupIndex].name;
    onChange(safeGroups.filter((_, i) => i !== groupIndex));
    onCombinationsChange(
      safeCombinations
        .map((row) => {
          const values = { ...row.values };
          delete values[removed];
          return { ...row, values };
        })
        .filter((row) => Object.keys(row.values).length >= 2),
    );
  }

  function addGroup(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (usedNames.has(trimmed.toLowerCase())) return;
    onChange([
      ...safeGroups,
      {
        name: trimmed,
        options: [emptyOption(trimmed), emptyOption(trimmed)],
      },
    ]);
  }

  const namedGroups = safeGroups.filter((group) => group.name.trim());
  const canCap =
    namedGroups.length >= 2 &&
    namedGroups.every((group) =>
      group.options.some((option) => option.value.trim()),
    );
  const availableTypes = COMMON_GROUPS.filter(
    (name) => !usedNames.has(name.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-ink">What can customers choose?</p>
        <p className="text-xs text-ink-muted">
          Pick the option types this product needs, then fill in the values.
        </p>
        <div className="flex flex-wrap gap-2">
          {availableTypes.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => addGroup(name)}
              className="rounded-full border border-border bg-surface px-3.5 py-2 text-sm text-ink transition-colors hover:border-brand-400 hover:text-brand-700"
            >
              <span className="inline-flex items-center gap-1.5">
                <Plus className="size-3.5" aria-hidden />
                {name}
              </span>
            </button>
          ))}
          {availableTypes.length === 0 && safeGroups.length > 0 && (
            <p className="text-xs text-ink-muted">
              All common types are added. Rename a group below for something
              custom.
            </p>
          )}
        </div>
        {safeGroups.length === 0 && (
          <p className="text-xs text-ink-subtle">
            Optional — skip this if the product has no size or colour choices.
          </p>
        )}
      </div>

      {safeGroups.map((group, groupIndex) => (
        <div
          key={`${group.name}-${groupIndex}`}
          className="space-y-3 rounded-card border border-border bg-surface p-4"
        >
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor={`variant-group-${groupIndex}`}>Option type</Label>
              <Input
                id={`variant-group-${groupIndex}`}
                value={group.name}
                onChange={(event) =>
                  renameGroup(groupIndex, event.target.value)
                }
                placeholder="Size"
              />
            </div>
            <button
              type="button"
              onClick={() => removeGroup(groupIndex)}
              aria-label={`Remove ${group.name || "group"}`}
              className="mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-control border border-border text-ink-muted transition-colors hover:border-danger hover:text-danger"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          {group.options.length > 0 && (
            <ul className="space-y-3">
              {group.options.map((option, optionIndex) => (
                <li
                  key={option.id ?? `${groupIndex}-${optionIndex}`}
                  className="space-y-2 rounded-control border border-border/70 p-3"
                >
                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label
                        htmlFor={`variant-value-${groupIndex}-${optionIndex}`}
                        className="text-xs text-ink-muted"
                      >
                        {group.name || "Option"}
                      </Label>
                      <Input
                        id={`variant-value-${groupIndex}-${optionIndex}`}
                        value={option.value}
                        onChange={(event) =>
                          updateOption(groupIndex, optionIndex, {
                            value: event.target.value,
                          })
                        }
                        placeholder={
                          group.name === "Colour"
                            ? "Black"
                            : group.name === "Size"
                              ? "39"
                              : "Value"
                        }
                        className="h-12"
                      />
                    </div>

                    <div className="w-28 space-y-1">
                      <Label
                        htmlFor={`variant-delta-${groupIndex}-${optionIndex}`}
                        className="text-xs text-ink-muted"
                      >
                        Price +/-
                      </Label>
                      <Input
                        id={`variant-delta-${groupIndex}-${optionIndex}`}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={option.priceDelta / 100}
                        onChange={(event) =>
                          updateOption(groupIndex, optionIndex, {
                            priceDelta: Math.round(
                              Number(event.target.value || 0) * 100,
                            ),
                          })
                        }
                        className="h-12"
                        data-numeric
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeOption(groupIndex, optionIndex)}
                      aria-label={`Remove ${option.value || "option"}`}
                      className="mb-1 flex size-11 shrink-0 items-center justify-center rounded-control border border-border text-ink-muted transition-colors hover:border-danger hover:text-danger"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>

                  {images.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-ink-muted">
                        Photo for this {group.name.toLowerCase() || "option"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateOption(groupIndex, optionIndex, {
                              imagePath: null,
                            })
                          }
                          className={cn(
                            "flex size-14 shrink-0 items-center justify-center rounded-lg border text-[10px] font-medium transition-colors",
                            option.imagePath === null
                              ? "border-brand-700 bg-brand-50 text-brand-800"
                              : "border-border text-ink-muted hover:border-brand-400",
                          )}
                        >
                          None
                        </button>
                        {images.map((image) => {
                          const selected = option.imagePath === image.path;
                          return (
                            <button
                              key={image.path}
                              type="button"
                              onClick={() =>
                                updateOption(groupIndex, optionIndex, {
                                  imagePath: image.path,
                                })
                              }
                              aria-label="Assign this photo"
                              aria-pressed={selected}
                              className={cn(
                                "relative size-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                                selected
                                  ? "border-brand-700"
                                  : "border-transparent hover:border-brand-300",
                              )}
                            >
                              <Image
                                src={publicUrl(BUCKETS.productImages, image.path)}
                                alt=""
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => addOption(groupIndex)}
            className="flex items-center gap-1.5 text-sm font-medium text-brand-700 transition-colors hover:text-brand-800"
          >
            <Plus className="size-4" aria-hidden />
            Add {group.name ? group.name.toLowerCase() : "an option"}
          </button>
        </div>
      ))}

      {canCap && (
        <CombinationCaps
          groups={namedGroups}
          combinations={safeCombinations}
          onChange={onCombinationsChange}
        />
      )}
    </div>
  );
}

function CombinationCaps({
  groups,
  combinations,
  onChange,
}: {
  groups: VariantGroupDraft[];
  combinations: CombinationStockDraft[];
  onChange: (combinations: CombinationStockDraft[]) => void;
}) {
  function emptyRow(): CombinationStockDraft {
    const values: Record<string, string> = {};
    for (const group of groups) {
      values[group.name] =
        group.options.find((option) => option.value.trim())?.value ?? "";
    }
    return { values, stockLimit: 0 };
  }

  function update(index: number, patch: Partial<CombinationStockDraft>) {
    onChange(
      combinations.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  return (
    <div className="space-y-3 rounded-card border border-dashed border-border p-4">
      <div>
        <h3 className="text-sm font-medium text-ink">Limit specific pairs</h3>
        <p className="mt-1 text-xs text-ink-muted">
          Optional. Leave blank to sell every combination. Add a row only when
          a particular mix is scarce — for example, five of size 39 in black.
        </p>
      </div>

      {combinations.length > 0 && (
        <ul className="space-y-2">
          {combinations.map((row, index) => (
            <li key={index} className="flex flex-wrap items-end gap-2">
              {groups.map((group) => (
                <div key={group.name} className="min-w-[6.5rem] flex-1 space-y-1">
                  <Label
                    htmlFor={`combo-${index}-${group.name}`}
                    className="text-xs text-ink-muted"
                  >
                    {group.name}
                  </Label>
                  <select
                    id={`combo-${index}-${group.name}`}
                    value={row.values[group.name] ?? ""}
                    onChange={(event) =>
                      update(index, {
                        values: {
                          ...row.values,
                          [group.name]: event.target.value,
                        },
                      })
                    }
                    className="h-12 w-full rounded-control border border-border bg-surface px-3 text-sm text-ink"
                  >
                    {group.options
                      .filter((option) => option.value.trim())
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.value}
                        </option>
                      ))}
                  </select>
                </div>
              ))}

              <div className="w-24 space-y-1">
                <Label
                  htmlFor={`combo-stock-${index}`}
                  className="text-xs text-ink-muted"
                >
                  Cap
                </Label>
                <Input
                  id={`combo-stock-${index}`}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={row.stockLimit}
                  onChange={(event) =>
                    update(index, {
                      stockLimit: Math.max(0, Number(event.target.value || 0)),
                    })
                  }
                  className="h-12"
                  data-numeric
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  onChange(combinations.filter((_, i) => i !== index))
                }
                aria-label="Remove combination limit"
                className="mb-1 flex size-11 shrink-0 items-center justify-center rounded-control border border-border text-ink-muted transition-colors hover:border-danger hover:text-danger"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => onChange([...combinations, emptyRow()])}
        className="flex items-center gap-1.5 text-sm font-medium text-brand-700 transition-colors hover:text-brand-800"
      >
        <Plus className="size-4" aria-hidden />
        Limit a combination
      </button>
    </div>
  );
}

/** Collapse a flat variant list into the group drafts the builder edits. */
export function groupsFromVariants(variants: VariantDraft[]): VariantGroupDraft[] {
  if (variants.length === 0) return [];

  const groups = new Map<string, VariantDraft[]>();
  for (const variant of variants) {
    const existing = groups.get(variant.name);
    if (existing) existing.push(variant);
    else groups.set(variant.name, [variant]);
  }

  return [...groups.entries()].map(([name, options]) => ({ name, options }));
}

/** Flatten group drafts back into the rows the server saves. */
export function variantsFromGroups(groups: VariantGroupDraft[]): VariantDraft[] {
  return groups.flatMap((group) =>
    group.options
      .filter((option) => option.value.trim())
      .map((option) => ({
        ...option,
        name: group.name.trim() || option.name,
        imagePath: option.imagePath ?? null,
      })),
  );
}
