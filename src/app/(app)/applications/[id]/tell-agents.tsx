"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

type Item = { id: string; text: string; via: string };

// the applicant's instructions for this one application, in their own words. the agents read them on every page
// of the portal and when they choose an answer
export function TellAgents({ id, initial }: { id: string; initial: Item[] }) {
  const [items, setItems] = useState(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const call = async (method: "POST" | "DELETE", body: unknown) => {
    setBusy(true);
    const r = await fetch(`/api/applications/${id}/instructions`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      toast.error(j.error ?? "That didn't save. Try again.");
      return false;
    }
    setItems(j.instructions ?? []);
    return true;
  };
  return (
    <div className="space-y-2">
      <label htmlFor={`tell-${id}`} className="block text-[13px] font-medium leading-snug text-muted">
        Tell the agents <span className="font-normal">(optional: anything about this application, in your words)</span>
      </label>
      {items.length > 0 && (
        <ul className="space-y-1.5" aria-label="What you've told the agents">
          {items.map((i) => (
            <li key={i.id} className="flex items-start gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 break-words">{i.text}</span>
              <button type="button" disabled={busy} onClick={() => call("DELETE", { id: i.id })} aria-label={`Remove: ${i.text}`} className="grid size-6 shrink-0 place-items-center rounded-full text-muted hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800">
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={async (e) => {
          e.preventDefault();
          if (text.trim().length < 3) return;
          if (await call("POST", { text })) {
            setText("");
            toast.success("Got it. The agents will follow it from the next page on.");
          }
        }}
      >
        <Input id={`tell-${id}`} value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder="e.g. Skip the optional diversity section" enterKeyHint="send" />
        <Button type="submit" variant="secondary" disabled={busy || text.trim().length < 3}>
          Tell them
        </Button>
      </form>
    </div>
  );
}
