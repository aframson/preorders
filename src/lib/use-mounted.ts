import { useSyncExternalStore } from "react";

function subscribeNever() {
  return () => {};
}

/**
 * True only after hydration. A handful of components need to defer rendering
 * (portals, anything reading `window`) until the client takes over, since
 * the server can't render them at all. `useSyncExternalStore`'s differing
 * server/client snapshots do that as a single external sync — the official
 * escape hatch for this — rather than a `setState` call inside an effect,
 * which just causes an extra render for the same outcome.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}
