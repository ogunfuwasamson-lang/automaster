"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

// save a login the applicant made themselves, so the agents can sign in with it
export function AddLogin({ apps }: { apps: { id: string; school: string; portal: string | null }[] }) {
  const [open, setOpen] = useState(false);
  const [app, setApp] = useState("");
  const [portal, setPortal] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  if (!open)
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden /> Add a login
      </Button>
    );

  return (
    <form
      className="w-full rounded-3xl border border-accent/25 bg-surface p-5 shadow-card sm:p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await fetch("/api/logins", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ application_id: app || null, portal, login, password }) });
        setBusy(false);
        if (!res.ok) return toast.error((await res.json().catch(() => ({}))).error ?? "Couldn't save it");
        toast.success("Saved. The agents sign in with it from now on.");
        setOpen(false);
        setPassword("");
        router.refresh();
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-bold">Add a login you made yourself</h2>
          <p className="text-[13px] text-muted">For a portal where you created the account, or one that only has a sign-in page.</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-xl text-muted hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Application">
          <Select
            value={app}
            onChange={(e) => {
              setApp(e.target.value);
              const a = apps.find((x) => x.id === e.target.value);
              if (a?.portal && !portal) setPortal(a.portal);
            }}
          >
            <option value="">Not tied to one application</option>
            {apps.map((a) => (
              <option key={a.id} value={a.id}>
                {a.school}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Portal link">
          <Input required value={portal} onChange={(e) => setPortal(e.target.value)} placeholder="apply.school.edu" />
        </Field>
        <Field label="Email or user ID">
          <Input required autoComplete="off" value={login} onChange={(e) => setLogin(e.target.value)} />
        </Field>
        <Field label="Password">
          <span className="relative block">
            <Input required type={show ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-11" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-lg text-muted hover:text-foreground" aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </span>
        </Field>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save login"}
        </Button>
        <span className="text-xs text-muted">Stored encrypted. If that application was waiting for it, the agents start again right away.</span>
      </div>
    </form>
  );
}
