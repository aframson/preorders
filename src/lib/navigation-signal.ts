/** Fired so the top progress bar can start for button-driven navigations. */
export const NAVIGATE_START_EVENT = "preorders:navigate-start";

export function signalNavigationStart() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NAVIGATE_START_EVENT));
}
