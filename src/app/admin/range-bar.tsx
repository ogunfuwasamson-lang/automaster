import Link from "next/link";
import { PRESETS, keep, type Range } from "./range";

// the period picker: preset chips, or any two dates. a plain GET form, so it works without JavaScript and the
// chosen period stays in the url (shareable, and the back button walks through it)
export function RangeBar({ range, view, everyone, id }: { range: Range; view: string; everyone: boolean; id?: string }) {
  const base = (key: string) => {
    const q = keep({ ...range, key }, everyone);
    if (key !== "30d") q.set("range", key);
    else q.delete("range");
    q.delete("from");
    q.delete("to");
    if (view !== "overview") q.set("view", view);
    if (id) q.set("id", id);
    const s = q.toString();
    return s ? `/admin?${s}` : "/admin";
  };
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div role="group" aria-label="Period" className="flex flex-wrap gap-1">
        {PRESETS.map(([key, label]) => (
          <Link
            key={key}
            href={base(key)}
            aria-current={range.key === key ? "true" : undefined}
            className={`tap rounded-full border px-3 py-1 text-[13px] transition ${range.key === key ? "border-foreground bg-foreground text-background" : "border-line text-muted hover:border-foreground/40 hover:text-foreground"}`}
          >
            {label}
          </Link>
        ))}
      </div>
      <form method="get" action="/admin" className="flex flex-wrap items-center gap-1.5 text-[13px]">
        {view !== "overview" && <input type="hidden" name="view" value={view} />}
        {id && <input type="hidden" name="id" value={id} />}
        {everyone && <input type="hidden" name="all" value="1" />}
        <label className="sr-only" htmlFor="range-from">
          From
        </label>
        <input id="range-from" type="date" name="from" defaultValue={range.key === "custom" ? range.from.slice(0, 10) : ""} className={`rounded-lg border px-2 py-1 text-[13px] ${range.key === "custom" ? "border-foreground" : "border-line"} bg-surface`} />
        <span className="text-muted">to</span>
        <label className="sr-only" htmlFor="range-to">
          To
        </label>
        <input id="range-to" type="date" name="to" defaultValue={range.key === "custom" ? range.to.slice(0, 10) : ""} className={`rounded-lg border px-2 py-1 text-[13px] ${range.key === "custom" ? "border-foreground" : "border-line"} bg-surface`} />
        <button type="submit" className="tap rounded-lg border border-line px-3 py-1 hover:border-foreground/40">
          Show
        </button>
      </form>
    </div>
  );
}
