import { CalendarClock } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * A batch can close while a customer is filling in their details. Nothing has
 * been charged at that point, so this says so explicitly rather than leaving
 * them wondering whether money moved.
 */
export function ClosedNotice({
  base,
  businessName,
}: {
  base: string;
  businessName: string;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <EmptyState
        icon={CalendarClock}
        title="This batch has closed"
        description={`${businessName} is no longer taking orders for this batch. Nothing has been charged. Leave your email on the link and you will hear when the next one opens.`}
        action={<ButtonLink href={base}>Back to the link</ButtonLink>}
      />
    </div>
  );
}
