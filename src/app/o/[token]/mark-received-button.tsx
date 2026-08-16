"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import {
  markOrderReceived,
  type FulfilmentActionState,
} from "@/app/o/[token]/actions";
import { Button } from "@/components/ui/button";
import { customerReceivedLabel } from "@/lib/status";

const initial: FulfilmentActionState = {};

export function MarkReceivedButton({
  token,
  fulfilment,
  actor = "customer",
  className,
}: {
  token: string;
  fulfilment: "pickup" | "delivery";
  actor?: "customer" | "vendor";
  className?: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(markOrderReceived, initial);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.ok) {
      toast.success(
        fulfilment === "delivery" ? "Marked as delivered" : "Marked as picked up",
      );
      if (state.notifyHref && actor === "vendor") {
        toast.message("Ask them to rate", {
          description: "Open WhatsApp to send the feedback link.",
          action: {
            label: "Message",
            onClick: () => {
              window.open(state.notifyHref!, "_blank", "noopener,noreferrer");
            },
          },
          duration: 12_000,
        });
      }
      router.refresh();
    }
  }, [state, fulfilment, actor, router]);

  return (
    <form action={action} className={className}>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="actor" value={actor} />
      <Button type="submit" block loading={pending}>
        {actor === "vendor"
          ? fulfilment === "delivery"
            ? "Mark delivered"
            : "Mark picked up"
          : customerReceivedLabel(fulfilment)}
      </Button>
    </form>
  );
}
