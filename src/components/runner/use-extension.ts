"use client";
import { useCallback, useEffect, useState } from "react";

// talks to the Ivyward runner extension through its bridge script (it runs on Ivyward's own pages)
export type ExtState = { installed: boolean; paired: boolean; version: string | null; running: { id: string; school: string; phase: string } | null };

const post = (type: string, data: Record<string, unknown> = {}) => window.postMessage({ source: "automaster-app", type, ...data }, window.location.origin);

// wait for one reply of `type` from the extension
export function askExtension<T = Record<string, unknown>>(type: string, data: Record<string, unknown> = {}, ms = 4000, reply = type): Promise<T | null> {
  return new Promise((resolve) => {
    const done = (v: T | null) => {
      window.removeEventListener("message", on);
      clearTimeout(t);
      resolve(v);
    };
    const on = (e: MessageEvent) => {
      if (e.source !== window || e.data?.source !== "automaster-ext" || e.data?.type !== reply) return;
      done(e.data as T);
    };
    const t = setTimeout(() => done(null), ms);
    window.addEventListener("message", on);
    post(type, data);
  });
}

export function useExtension(pollMs = 0) {
  const [ext, setExt] = useState<ExtState>({ installed: false, paired: false, version: null, running: null });
  const [checked, setChecked] = useState(false);
  const refresh = useCallback(async () => {
    const r = await askExtension<{ version?: string; paired?: boolean; running?: ExtState["running"] }>("hello", {}, 1500);
    setExt(r ? { installed: true, paired: !!r.paired, version: r.version ?? null, running: r.running ?? null } : { installed: !!document.documentElement.dataset.amRunner, paired: false, version: null, running: null });
    setChecked(true);
  }, []);
  useEffect(() => {
    refresh();
    if (!pollMs) return;
    const t = setInterval(refresh, pollMs);
    return () => clearInterval(t);
  }, [refresh, pollMs]);
  return { ext, checked, refresh };
}
