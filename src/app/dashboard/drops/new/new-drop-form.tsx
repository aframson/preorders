"use client";

import { useActionState } from "react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { createDrop, type ActionState } from "../actions";

export function NewDropForm() {
  const [state, submit, pending] = useActionState<ActionState, FormData>(
    createDrop,
    {},
  );

  return (
    <div className="max-w-lg">
      <PageHeader
        title="New drop"
        description="A drop is a permanent link. Batches run inside it, one at a time."
      />

      <form action={submit} className="space-y-6">
        <Field label="Drop name" htmlFor="title" error={state.error}>
          <Input
            id="title"
            name="title"
            required
            autoFocus
            placeholder="September China run"
          />
        </Field>

        <Field
          label="Description"
          htmlFor="description"
          hint="Optional. Shown under your business name on the link."
        >
          <Textarea
            id="description"
            name="description"
            rows={3}
            placeholder="Shoes, bags and hair. Closing every two weeks."
          />
        </Field>

        <Field
          label="How do you usually ship?"
          htmlFor="defaultFreightMode"
          hint="You can change this per batch."
        >
          <Select id="defaultFreightMode" name="defaultFreightMode" defaultValue="sea_cbm">
            <option value="sea_cbm">Sea &mdash; cheaper, 30 to 60 days</option>
            <option value="air_kg">Air &mdash; faster, costs more</option>
          </Select>
        </Field>

        <Button type="submit" size="lg" block loading={pending}>
          Create drop
        </Button>
      </form>
    </div>
  );
}
