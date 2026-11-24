"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, LoaderCircle, LogOut, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { BANKS, TERMS, naira } from "@/lib/creator-terms";

// the creator studio's interactive parts (app/creator): the tabs, copying links, and the forms

const TABS = [
  ["/creator", "Overview"],
  ["/creator/signups", "Sign-ups"],
  ["/creator/videos", "Videos"],
  ["/creator/payouts", "Payouts"],
] as const;

export function CreatorNav({ mobile = false }: { mobile?: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="Creator studio" className={mobile ? "overflow-x-auto px-2" : "hidden h-full md:flex"}>
      <ul className={`flex ${mobile ? "gap-1" : "h-full gap-1"}`}>
        {TABS.map(([href, label]) => {
          const on = href === "/creator" ? path === href : path.startsWith(href);
          return (
            <li key={href} className={mobile ? "" : "h-full"}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={`relative flex items-center whitespace-nowrap px-3 text-sm transition-colors ${mobile ? "py-2.5" : "h-full"} ${on ? "font-medium text-foreground" : "text-muted hover:text-foreground"}`}
              >
                {label}
                {on ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-foreground" aria-hidden /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SignOut() {
  return (
    <button
      type="button"
      onClick={() => {
        fetch("/auth/signout", { method: "POST", redirect: "manual" }).finally(() => window.location.assign("/"));
      }}
      className="grid size-9 place-items-center rounded-lg text-muted hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800"
      aria-label="Sign out"
      title="Sign out"
    >
      <LogOut className="size-[17px]" aria-hidden />
    </button>
  );
}

async function send(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const j = (await r.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>;
  if (!r.ok) throw new Error(j.error ?? "Something went wrong. Try again.");
  return j;
}

export function CopyButton({ text, label = "Copy", variant = "secondary", size = "md" }: { text: string; label?: string; variant?: "primary" | "secondary"; size?: "sm" | "md" }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={async () => {
        await navigator.clipboard.writeText(text).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
    >
      {done ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {done ? "Copied" : label}
    </Button>
  );
}

// a link for a caption: what the guide asks creators to say, short enough for TikTok
const caption = (url: string) => `I'm using Ivyward to find universities and scholarships abroad that fit my profile. Try it with my link: ${url} #studyabroad #ad`;

export function MainLink({ url }: { url: string }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 basis-full break-all rounded-xl border border-line bg-background px-3.5 py-2.5 font-sans text-[15px] font-medium sm:basis-0">{url.replace(/^https:\/\//, "")}</code>
        <CopyButton text={url} label="Copy link" variant="primary" />
      </div>
      <div className="flex flex-wrap gap-2 text-[13px]">
        <CopyButton text={caption(url)} label="Copy a caption" size="sm" />
        <a href={`https://wa.me/?text=${encodeURIComponent(caption(url))}`} target="_blank" rel="noopener" className="inline-flex h-8 items-center rounded-md border border-line px-3 hover:border-foreground/30">
          Share on WhatsApp
        </a>
      </div>
    </div>
  );
}

// make another link: one per platform or campaign shows which one brings sign-ups
export function NewLink({ count }: { count: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  if (count >= TERMS.maxLinks) return <p className="text-[13px] text-muted">You have the most links you can make ({TERMS.maxLinks}).</p>;
  if (!open)
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden /> {count ? "Make another link" : "Make your link"}
      </Button>
    );
  return (
    <form
      className="grid gap-3 rounded-2xl border border-line bg-background p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const j = await send("/api/creator/links", "POST", { label: label.trim() || undefined, code: code.trim() || undefined });
          toast.success(`Your link is ready: ${String(j.url).replace(/^https:\/\//, "")}`);
          setOpen(false);
          setLabel("");
          setCode("");
          router.refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Couldn't make the link.");
        }
        setBusy(false);
      }}
    >
      <Field label="Name it" hint="Where you'll use it, like TikTok bio or Instagram.">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} placeholder="TikTok bio" />
      </Field>
      <Field label="Custom ending (optional)" hint="Letters, numbers and hyphens.">
        <div className="flex items-center rounded-xl border border-line bg-surface pl-3 text-sm focus-within:border-neutral-400">
          <span className="shrink-0 text-muted">/c/</span>
          <input value={code} onChange={(e) => setCode(e.target.value.toLowerCase())} maxLength={24} placeholder="your-name" className="h-11 min-w-0 flex-1 bg-transparent px-1 outline-none" />
        </div>
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
          Make link
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function ApplyForm({ name }: { name: string }) {
  const router = useRouter();
  const [f, setF] = useState({ name, phone: "", tiktok: "", instagram: "", youtube: "", x: "", other: "", followers: "", audience: "", agree: false });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await send("/api/creator/apply", "POST", f);
          toast.success("Application sent");
          router.refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Couldn't send it.");
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name">
          <Input value={f.name} onChange={set("name")} required maxLength={80} autoComplete="name" />
        </Field>
        <Field label="WhatsApp number" hint="So the team can reach you about payouts.">
          <Input value={f.phone} onChange={set("phone")} required maxLength={30} inputMode="tel" autoComplete="tel" placeholder="+234" />
        </Field>
      </div>
      <fieldset className="space-y-3">
        <legend className="text-[13px] font-medium">Where you post <span className="font-normal text-muted">(at least one)</span></legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["tiktok", "TikTok"],
              ["instagram", "Instagram"],
              ["youtube", "YouTube"],
              ["x", "X"],
            ] as const
          ).map(([k, label]) => (
            <Field key={k} label={label}>
              <Input value={f[k]} onChange={set(k)} maxLength={80} placeholder="@handle" />
            </Field>
          ))}
        </div>
        <Field label="Anywhere else">
          <Input value={f.other} onChange={set("other")} maxLength={80} placeholder="A link or handle" />
        </Field>
      </fieldset>
      <Field label="Followers, roughly" hint="Across your main platforms. Small accounts are welcome.">
        <Input value={f.followers} onChange={set("followers")} required maxLength={60} placeholder="12,000 on TikTok" />
      </Field>
      <Field label="What you make, and who watches" hint="A line or two is enough.">
        <Textarea value={f.audience} onChange={set("audience")} required minLength={10} maxLength={800} rows={3} placeholder="Study-abroad tips for Nigerian students, mostly final-year undergraduates." />
      </Field>
      <label className="flex items-start gap-3 rounded-2xl border border-line bg-background p-4 text-[14px] leading-relaxed">
        <input type="checkbox" checked={f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} className="mt-1 size-4 shrink-0 accent-current" required />
        <span>
          I&apos;ll share only what&apos;s true about my experience, say clearly that this is a paid partnership, and never promise admission, scholarships or visas.
        </span>
      </label>
      <Button type="submit" size="lg" disabled={busy || !f.agree}>
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
        Send application
      </Button>
    </form>
  );
}

export function VideoForm({ today }: { today: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(today);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_10rem_auto] md:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const j = await send("/api/creator/posts", "POST", { url: url.trim(), title: title.trim() || undefined, posted_on: day });
          toast.success(`${j.platform} video added`);
          setUrl("");
          setTitle("");
          router.refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Couldn't add it.");
        }
        setBusy(false);
      }}
    >
      <Field label="Link to the video">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} required type="url" inputMode="url" placeholder="https://www.tiktok.com/@you/video/…" maxLength={500} />
      </Field>
      <Field label="What it's about (optional)">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="My first week with Ivyward" />
      </Field>
      <Field label="Posted on">
        <Input value={day} onChange={(e) => setDay(e.target.value)} required type="date" max={today} />
      </Field>
      <Button type="submit" disabled={busy || !url} className="md:mb-0">
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
        Add video
      </Button>
    </form>
  );
}

export function RemoveVideo({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      aria-label="Remove this video"
      title="Remove"
      className="grid size-8 place-items-center rounded-lg text-muted hover:bg-neutral-100 hover:text-stop disabled:opacity-50 dark:hover:bg-neutral-800"
      onClick={async () => {
        setBusy(true);
        try {
          await send(`/api/creator/posts?id=${id}`, "DELETE");
          router.refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Couldn't remove it.");
          setBusy(false);
        }
      }}
    >
      <Trash2 className="size-4" aria-hidden />
    </button>
  );
}

export function BankForm({ bank }: { bank: { bank_name: string; account_name: string; account_last4: string } | null }) {
  const router = useRouter();
  const [edit, setEdit] = useState(!bank);
  const [f, setF] = useState({ bank_name: bank?.bank_name ?? "", account_number: "", account_name: bank?.account_name ?? "" });
  const [busy, setBusy] = useState(false);
  if (!edit && bank)
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{bank.bank_name}</p>
          <p className="text-sm text-muted">
            {bank.account_name} · ending {bank.account_last4}
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => setEdit(true)}>
          Change
        </Button>
      </div>
    );
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await send("/api/creator/bank", "PUT", { ...f, account_number: f.account_number.replace(/\s/g, "") });
          toast.success("Bank details saved");
          setEdit(false);
          setF({ ...f, account_number: "" });
          router.refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Couldn't save them.");
        }
        setBusy(false);
      }}
    >
      <Field label="Bank">
        <Input value={f.bank_name} onChange={(e) => setF({ ...f, bank_name: e.target.value })} list="creator-banks" required maxLength={80} placeholder="Start typing your bank" />
        <datalist id="creator-banks">
          {BANKS.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Account number" hint="10 digits.">
          <Input value={f.account_number} onChange={(e) => setF({ ...f, account_number: e.target.value.replace(/[^\d]/g, "").slice(0, 10) })} required inputMode="numeric" autoComplete="off" pattern="\d{10}" placeholder="0123456789" />
        </Field>
        <Field label="Name on the account" hint="As your bank shows it.">
          <Input value={f.account_name} onChange={(e) => setF({ ...f, account_name: e.target.value })} required maxLength={120} autoComplete="name" />
        </Field>
      </div>
      <p className="text-xs text-muted">Payouts go only to this account. The account number is stored encrypted, and this page only ever shows its last four digits.</p>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy || f.account_number.length !== 10}>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
          Save bank details
        </Button>
        {bank ? (
          <Button type="button" variant="ghost" onClick={() => setEdit(false)}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function WithdrawForm({ available, hasBank, waiting, active }: { available: number; hasBank: boolean; waiting: boolean; active: boolean }) {
  const router = useRouter();
  const [amount, setAmount] = useState(available >= TERMS.minWithdrawal ? String(available) : "");
  const [busy, setBusy] = useState(false);
  const n = Number(amount.replace(/[^\d]/g, ""));
  const why = !active
    ? "Payouts are paused on your account."
    : waiting
      ? "Your last request is on its way. You can ask again once it's paid."
      : !hasBank
        ? "Add your bank details below first."
        : available < TERMS.minWithdrawal
          ? `You can withdraw once you have ${naira(TERMS.minWithdrawal)} or more.`
          : null;
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await send("/api/creator/withdrawals", "POST", { amount: n });
          toast.success(`Requested ${naira(n)}. It'll be in your account within ${TERMS.payoutHours} hours.`);
          router.refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Couldn't send the request.");
        }
        setBusy(false);
      }}
    >
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Amount" className="min-w-0 flex-1">
          <div className="flex items-center rounded-xl border border-line bg-surface pl-3.5 text-sm focus-within:border-neutral-400">
            <span className="text-muted">₦</span>
            <input value={amount ? Number(amount).toLocaleString("en-NG") : ""} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, "").slice(0, 9))} inputMode="numeric" disabled={!!why} className="h-11 min-w-0 flex-1 bg-transparent px-1.5 tabular-nums outline-none disabled:opacity-50" aria-describedby="withdraw-note" />
            <button type="button" disabled={!!why} onClick={() => setAmount(String(available))} className="mr-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-muted hover:bg-neutral-100 hover:text-foreground disabled:opacity-40 dark:hover:bg-neutral-800">
              Max
            </button>
          </div>
        </Field>
        <Button type="submit" disabled={busy || !!why || n < TERMS.minWithdrawal || n > available}>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
          Request payout
        </Button>
      </div>
      <p id="withdraw-note" className={`text-[13px] ${why ? "text-signal" : "text-muted"}`}>
        {why ?? `Sent by bank transfer within ${TERMS.payoutHours} hours. The smallest payout is ${naira(TERMS.minWithdrawal)}.`}
      </p>
    </form>
  );
}

// one measure a day over the last 30 days: thin bars on one axis, the day and value on hover or focus, and a table
// for anyone who'd rather read the numbers
export function DailyBars({ title, days, tone, unit }: { title: string; days: { day: string; n: number }[]; tone: "ink" | "brand"; unit: [string, string] }) {
  const [at, setAt] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.n));
  const total = days.reduce((a, d) => a + d.n, 0);
  const label = (d: { day: string; n: number }) => `${new Date(`${d.day}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}: ${d.n.toLocaleString()} ${d.n === 1 ? unit[0] : unit[1]}`;
  const cur = at === null ? null : days[at];
  return (
    <figure className="min-w-0">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium">{title}</span>
        <span className="text-[13px] tabular-nums text-muted">{cur ? label(cur) : `${total.toLocaleString()} in 30 days`}</span>
      </figcaption>
      <div className="relative mt-3">
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-line" aria-hidden />
        <span className="pointer-events-none absolute -top-2.5 right-0 bg-surface pl-1 text-[11px] tabular-nums text-muted" aria-hidden>
          {max}
        </span>
        <div className="flex h-28 items-end gap-[2px] border-b border-line" onMouseLeave={() => setAt(null)}>
          {days.map((d, i) => (
            <button
              key={d.day}
              type="button"
              tabIndex={0}
              aria-label={label(d)}
              onMouseEnter={() => setAt(i)}
              onFocus={() => setAt(i)}
              onBlur={() => setAt(null)}
              className="group flex h-full min-w-0 flex-1 items-end outline-none"
            >
              <span
                className={`block w-full rounded-t-[4px] transition-opacity ${tone === "brand" ? "bg-brand" : "bg-foreground/70"} ${at !== null && at !== i ? "opacity-40" : ""} group-focus-visible:ring-2 group-focus-visible:ring-focus`}
                style={{ height: d.n ? `${Math.max(3, (d.n / max) * 100)}%` : "1px", opacity: d.n ? undefined : 0.25 }}
              />
            </button>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-muted" aria-hidden>
          <span>{days[0] ? new Date(`${days[0].day}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }) : ""}</span>
          <span>Today</span>
        </div>
      </div>
      <details className="mt-2 text-[12.5px] text-muted">
        <summary className="cursor-pointer select-none hover:text-foreground">See as a table</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead>
            <tr>
              <th className="py-1 font-medium">Day</th>
              <th className="py-1 text-right font-medium">{unit[1][0].toUpperCase() + unit[1].slice(1)}</th>
            </tr>
          </thead>
          <tbody>
            {[...days].reverse().map((d) => (
              <tr key={d.day} className="border-t border-line">
                <td className="py-1">{d.day}</td>
                <td className="py-1 text-right">{d.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
