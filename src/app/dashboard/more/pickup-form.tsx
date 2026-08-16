"use client";

import { useActionState } from "react";

import { MapsLinkField } from "@/components/public/maps-link-field";
import { Button } from "@/components/ui/button";
import { savePickupLocation, type PickupState } from "./actions";

const INITIAL: PickupState = {};

export function PickupLocationForm({
  defaultMapsUrl,
}: {
  defaultMapsUrl: string | null;
}) {
  const [state, submit, pending] = useActionState(savePickupLocation, INITIAL);

  return (
    <form action={submit} className="space-y-4">
      <MapsLinkField
        id="pickupMapsUrl"
        name="pickupMapsUrl"
        label="Pickup location"
        hint="Open Google Maps, drop a pin at where customers collect, then Share → Copy link. Leave blank to offer delivery only."
        defaultValue={defaultMapsUrl ?? ""}
        error={state.error}
        confirmLabel="Customers will see this pin when they choose Pick up"
        previewTitle="Pickup location preview"
      />

      {state.message && !state.error && (
        <p role="status" className="text-sm text-open">
          {state.message}
        </p>
      )}

      <Button type="submit" size="sm" loading={pending}>
        Save pickup location
      </Button>
    </form>
  );
}
