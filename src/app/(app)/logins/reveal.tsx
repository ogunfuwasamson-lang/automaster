"use client";
import { useState } from "react";
import { Copy, Eye, EyeOff, Check } from "lucide-react";
import { toast } from "sonner";

// a password field that fetches the secret only when asked, and copies it in one tap
export function Reveal({ id }: { id: string }) {
  const [pw, setPw] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load(): Promise<string | null> {
    if (pw) return pw;
    setBusy(true);
    const res = await fetch(`/api/logins/${id}`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      toast.error("Couldn't load the password");
      return null;
    }
    const j = await res.json();
    setPw(j.password);
    return j.password as string;
  }

  return (
    <span className="flex min-w-0 items-center gap-1 rounded-xl border border-line bg-background py-1 pl-3 pr-1">
      <code className={`min-w-0 flex-1 truncate font-mono text-[13px] ${shown && pw ? "" : "tracking-[0.2em] text-muted"}`}>{shown && pw ? pw : "••••••••••••"}</code>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (shown) return setShown(false);
          if (await load()) setShown(true);
        }}
        className="grid size-8 place-items-center rounded-lg text-muted hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800"
        aria-label={shown ? "Hide password" : "Show password"}
      >
        {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          const p = await load();
          if (!p) return;
          await navigator.clipboard.writeText(p);
          setCopied(true);
          toast.success("Password copied");
          setTimeout(() => setCopied(false), 1500);
        }}
        className="grid size-8 place-items-center rounded-lg text-muted hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800"
        aria-label="Copy password"
      >
        {copied ? <Check className="size-4 text-go" /> : <Copy className="size-4" />}
      </button>
    </span>
  );
}

export function CopyText({ text }: { text: string }) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(text).then(() => toast.success("Copied"))}
      className="grid size-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800"
      aria-label={`Copy ${text}`}
    >
      <Copy className="size-3.5" />
    </button>
  );
}
