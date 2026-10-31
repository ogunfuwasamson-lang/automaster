"use client";
import { useEffect, useState } from "react";

// a time in the viewer's own time zone (the server only knows UTC). UTC until the browser takes over.
export function LocalTime({ iso, withDay = true }: { iso: string; withDay?: boolean }) {
  const d = new Date(iso);
  const fmt = (tz?: string) => d.toLocaleString("en-GB", { ...(withDay ? { weekday: "short", day: "numeric", month: "short" } : {}), hour: "2-digit", minute: "2-digit", ...(tz ? { timeZone: tz, timeZoneName: "short" } : {}) });
  const [text, setText] = useState(() => fmt("UTC"));
  useEffect(() => setText(fmt()), [iso]); // eslint-disable-line react-hooks/exhaustive-deps
  return <time dateTime={iso} suppressHydrationWarning>{text}</time>;
}
