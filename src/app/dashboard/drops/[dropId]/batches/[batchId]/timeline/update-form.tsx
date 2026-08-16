"use client";

import { Send } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/field";
import { postBatchUpdate, type ActionState } from "../../actions";

export function UpdateForm({
  batchId,
  dropId,
}: {
  batchId: string;
  dropId: string;
}) {
  const [state, submit, pending] = useActionState<ActionState, FormData>(
    postBatchUpdate,
    {},
  );

  return (
    <Card>
      <CardHeader
        title="Post an update"
        description="Everyone in this batch sees it on their order page. It is the cheapest way to stop the 'has it shipped?' messages."
      />
      <CardBody>
        <form action={submit} className="space-y-4">
          <input type="hidden" name="batchId" value={batchId} />
          <input type="hidden" name="dropId" value={dropId} />

          <Field label="Update" htmlFor="message" error={state.error}>
            <Textarea
              id="message"
              name="message"
              rows={3}
              placeholder="Goods have left Guangzhou. Expected in Accra in about four weeks."
            />
          </Field>

          <div className="flex items-center gap-3">
            <Button type="submit" loading={pending}>
              <Send className="size-4" aria-hidden />
              Post update
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
  );
}
