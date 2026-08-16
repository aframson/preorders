"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useActionState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  createCategory,
  deleteCategory,
  deleteDrop,
  updateDrop,
  type ActionState,
} from "../../actions";

export function DropSettingsForm({
  drop,
  categories,
}: {
  drop: {
    id: string;
    title: string;
    description: string;
    defaultFreightMode: string;
    published: boolean;
  };
  categories: { id: string; name: string }[];
}) {
  const [state, submit, pending] = useActionState<ActionState, FormData>(
    updateDrop,
    {},
  );
  const [categoryState, addCategory, addingCategory] = useActionState<
    ActionState,
    FormData
  >(createCategory, {});
  const [deleting, startDelete] = useTransition();

  function onDelete() {
    const ok = confirm(
      `Delete “${drop.title}”?\n\nThe public link is removed and open batches stop taking orders. Past orders stay in your records.`,
    );
    if (!ok) return;

    startDelete(async () => {
      const result = await deleteDrop(drop.id);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader title="Drop details" />
        <CardBody>
          <form action={submit} className="space-y-5">
            <input type="hidden" name="dropId" value={drop.id} />

            <Field label="Drop name" htmlFor="title" error={state.error}>
              <Input id="title" name="title" required defaultValue={drop.title} />
            </Field>

            <Field label="Description" htmlFor="description">
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={drop.description}
              />
            </Field>

            <Field label="Default shipping mode" htmlFor="defaultFreightMode">
              <Select
                id="defaultFreightMode"
                name="defaultFreightMode"
                defaultValue={drop.defaultFreightMode}
              >
                <option value="sea_cbm">Sea &mdash; split by volume</option>
                <option value="air_kg">Air &mdash; split by weight</option>
              </Select>
            </Field>

            <label className="flex items-center gap-3 rounded-card border border-border px-4 py-3.5">
              <input
                type="checkbox"
                name="published"
                defaultChecked={drop.published}
                className="size-5 accent-brand-700"
              />
              <span className="text-sm">
                <span className="block font-medium text-ink">Link is live</span>
                <span className="block text-ink-muted">
                  Turn off to hide the link from customers.
                </span>
              </span>
            </label>

            <div className="flex items-center gap-3">
              <Button type="submit" loading={pending}>
                Save changes
              </Button>
              {state.message && (
                <span role="status" className="text-sm text-open">
                  {state.message}
                </span>
              )}
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Categories"
          description="Customers use these as filters on your link."
        />
        <CardBody className="space-y-4">
          {categories.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <li
                  key={category.id}
                  className="flex items-center gap-1.5 rounded-full bg-surface-muted py-1.5 pr-1.5 pl-3.5 text-sm"
                >
                  {category.name}
                  <button
                    type="button"
                    onClick={() => void deleteCategory(category.id, drop.id)}
                    aria-label={`Delete ${category.name}`}
                    className="flex size-6 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-danger-tint hover:text-danger"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form action={addCategory} className="flex items-end gap-2">
            <input type="hidden" name="dropId" value={drop.id} />
            <Field
              label="Add a category"
              htmlFor="name"
              className="flex-1"
              error={categoryState.error}
            >
              <Input id="name" name="name" placeholder="Shoes" className="h-12" />
            </Field>
            <Button
              type="submit"
              variant="secondary"
              className="mb-0 h-12"
              loading={addingCategory}
            >
              <Plus className="size-4" aria-hidden />
              Add
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card className="border-danger/25">
        <CardHeader
          title="Delete this drop"
          description="Removes it from your dashboard and hides the public link. Open batches stop taking orders. Past orders are kept."
        />
        <CardBody>
          <Button
            type="button"
            variant="danger"
            loading={deleting}
            onClick={onDelete}
          >
            <Trash2 className="size-4" aria-hidden />
            Delete drop
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
