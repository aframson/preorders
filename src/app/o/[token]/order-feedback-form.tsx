"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  submitOrderReview,
  type FulfilmentActionState,
} from "@/app/o/[token]/actions";
import { Button } from "@/components/ui/button";
import { StarRow } from "@/components/ui/star-row";
import { cn } from "@/lib/cn";

const initial: FulfilmentActionState = {};

export function OrderFeedbackForm({
  token,
  existing,
}: {
  token: string;
  existing: { rating: number; comment: string | null } | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [state, action, pending] = useActionState(submitOrderReview, initial);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.ok) {
      toast.success("Thanks for the feedback");
      router.refresh();
    }
  }, [state, router]);

  if (existing || state.ok) {
    const stars = existing?.rating ?? rating;
    return (
      <section
        id="feedback"
        className="scroll-mt-24 space-y-2 rounded-card border border-border bg-surface p-4"
      >
        <h2 className="font-display text-base font-semibold text-ink">
          Your feedback
        </h2>
        <StarRow value={stars} />
        {(existing?.comment || null) && (
          <p className="text-sm text-ink-muted">{existing?.comment}</p>
        )}
      </section>
    );
  }

  return (
    <section
      id="feedback"
      className="scroll-mt-24 space-y-4 rounded-card border border-border bg-surface p-4"
    >
      <div>
        <h2 className="font-display text-base font-semibold text-ink">
          How was it?
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          A quick rating helps the next buyer trust this seller.
        </p>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="rating" value={rating || ""} />

        <div className="flex gap-1" role="group" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className="rounded-control p-1.5 text-ink-subtle transition-colors hover:text-closing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              aria-pressed={rating === value}
            >
              <Star
                className={cn(
                  "size-8",
                  rating >= value
                    ? "fill-closing text-closing"
                    : "fill-transparent",
                )}
                aria-hidden
              />
            </button>
          ))}
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink">
            Comment{" "}
            <span className="font-normal text-ink-muted">(optional)</span>
          </span>
          <textarea
            name="comment"
            rows={3}
            maxLength={500}
            placeholder="What went well?"
            className="w-full resize-y rounded-control border border-border bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          />
        </label>

        <Button type="submit" block loading={pending} disabled={rating < 1}>
          Submit feedback
        </Button>
      </form>
    </section>
  );
}
