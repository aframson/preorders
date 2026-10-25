import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Fires a success toast exactly once per `useActionState` result, so a form
 * that stays on the page after saving gives the same kind of feedback as one
 * that redirects or uses `useTransition` directly — instead of some forms
 * showing a green inline message next to the button and others nothing at
 * all. Keyed on the state object's identity (not the message text) because
 * `useActionState` returns a new object on every submission even when the
 * message is the same string twice in a row.
 */
export function useSuccessToast<T extends { message?: string | null }>(
  state: T,
) {
  const seen = useRef<T | null>(null);

  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state.message) toast.success(state.message);
  }, [state]);
}
