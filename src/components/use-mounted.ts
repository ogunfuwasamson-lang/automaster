"use client";
import { useSyncExternalStore } from "react";

// true only in the browser after hydration. use it for text that depends on the viewer's clock, time zone or
// locale, so the server's render and the first client render match (no hydration errors).
const subscribe = () => () => {};
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
