"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { uploadDocument } from "@/lib/upload-client";
import { GOOGLE_CLIENT_ID } from "@/components/google-button";

// pick files straight from Google Drive (a transcript or certificate that lives there, often on a phone where the
// file itself isn't). google's own picker, with the narrowest access: only the files picked, read once, in this
// browser. shown only when the site has a picker key (GOOGLE_PICKER_KEY, read on the server at request time).
const APP = GOOGLE_CLIENT_ID.split("-")[0]; // the cloud project's number
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg", "text/plain", "application/vnd.google-apps.document"];

type G = {
  load(n: string, cb: () => void): void;
};
type Gsi = { accounts: { oauth2: { initTokenClient(o: Record<string, unknown>): { requestAccessToken(o?: Record<string, unknown>): void } } } };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Picker = any;

function script(src: string) {
  return new Promise<void>((ok, bad) => {
    if (document.querySelector(`script[src="${src}"]`)) return ok();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => bad(new Error("blocked"));
    document.head.appendChild(s);
  });
}

// what went wrong, in words the applicant can act on (google's own codes otherwise)
function why(e: unknown): string | null {
  const m = String((e as { type?: string; message?: string })?.type ?? (e as Error)?.message ?? e);
  if (/popup_closed|closed/i.test(m)) return null; // they closed it: nothing to say
  if (/popup_failed_to_open|popup.*blocked/i.test(m)) return "Your browser blocked the Google window. Allow pop-ups for this site, then try again.";
  if (/access_denied/i.test(m)) return "Google didn't give access to the file. Try again and allow access, or upload it from this device.";
  if (/blocked|load/i.test(m)) return "Google Drive couldn't load here (an ad blocker or a network filter can stop it). Upload the file from this device instead.";
  return "Google Drive didn't open. Upload the file from this device instead.";
}

export function DriveImport({ userId, kind, onDone, pickerKey }: { userId: string; kind: string; onDone: () => void; pickerKey: string }) {
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const cached = useRef<{ token: string; until: number } | null>(null);
  // google's scripts load as soon as the button shows: a click must open google's window straight away, or the
  // browser treats it as a pop-up nobody asked for and blocks it (the old version loaded them after the click)
  useEffect(() => {
    if (!pickerKey) return;
    let live = true;
    Promise.all([script("https://apis.google.com/js/api.js"), script("https://accounts.google.com/gsi/client")])
      .then(() => new Promise<void>((ok) => (window as unknown as { gapi: G }).gapi.load("picker", ok)))
      .then(() => live && setReady(true))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [pickerKey]);
  if (!pickerKey) return null;
  const KEY = pickerKey;

  // called synchronously from the click: google opens its consent window inside the click's own moment
  const token = () =>
    new Promise<string>((ok, bad) => {
      if (cached.current && cached.current.until > Date.now()) return ok(cached.current.token);
      const g = (window as unknown as { google?: Gsi }).google;
      if (!g?.accounts?.oauth2) return bad(new Error("load"));
      g.accounts.oauth2
        .initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPE,
          callback: (r: { access_token?: string; error?: string; expires_in?: number }) => {
            if (!r.access_token) return bad(new Error(r.error ?? "access_denied"));
            cached.current = { token: r.access_token, until: Date.now() + Math.max(60, (r.expires_in ?? 3600) - 120) * 1000 };
            ok(r.access_token);
          },
          error_callback: (err: { type?: string }) => bad(new Error(err?.type ?? "closed")),
        })
        .requestAccessToken({ prompt: "" });
    });

  const fetchFile = async (t: string, d: { id: string; name: string; mimeType: string }) => {
    const gdoc = d.mimeType === "application/vnd.google-apps.document";
    const url = gdoc ? `https://www.googleapis.com/drive/v3/files/${d.id}/export?mimeType=application/pdf` : `https://www.googleapis.com/drive/v3/files/${d.id}?alt=media`;
    const r = await fetch(url, { headers: { authorization: `Bearer ${t}` } });
    if (!r.ok) throw new Error(`${d.name}: Drive wouldn't send it`);
    const blob = await r.blob();
    return new File([blob], gdoc ? `${d.name}.pdf` : d.name, { type: gdoc ? "application/pdf" : d.mimeType });
  };

  const open = async () => {
    if (failed) {
      toast.error(why(new Error("load")) ?? "");
      return;
    }
    setBusy(true);
    try {
      const t = await token();
      const gp = (window as unknown as { google: { picker: Picker } }).google.picker;
      const view = new gp.DocsView(gp.ViewId.DOCS).setMimeTypes(TYPES.join(",")).setIncludeFolders(true).setSelectFolderEnabled(false);
      await new Promise<void>((done) => {
        new gp.PickerBuilder()
          .enableFeature(gp.Feature.MULTISELECT_ENABLED)
          .setDeveloperKey(KEY)
          .setAppId(APP)
          .setOAuthToken(t)
          .setOrigin(window.location.origin)
          .addView(view)
          .setTitle("Choose documents for Ivyward")
          .setCallback(async (data: Record<string, unknown>) => {
            if (data[gp.Response.ACTION] === gp.Action.CANCEL) return done();
            if (data[gp.Response.ACTION] !== gp.Action.PICKED) return;
            const docs = (data[gp.Response.DOCUMENTS] as Record<string, string>[]).map((x) => ({ id: x[gp.Document.ID], name: x[gp.Document.NAME], mimeType: x[gp.Document.MIME_TYPE] }));
            let ok = 0;
            for (const d of docs) {
              try {
                const err = await uploadDocument(userId, await fetchFile(t, d), kind);
                if (err) toast.error(err);
                else ok++;
              } catch (e) {
                // a token google has since revoked: drop it so the next try asks again
                cached.current = null;
                toast.error(String((e as Error).message));
              }
            }
            if (ok) toast.success(ok === 1 ? "Added from Drive. Reading it now." : `${ok} files added from Drive. Reading them now.`);
            onDone();
            done();
          })
          .build()
          .setVisible(true);
      });
    } catch (e) {
      const msg = why(e);
      if (msg) toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={open} disabled={busy || (!ready && !failed)} title={ready || failed ? undefined : "Loading Google Drive…"} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold disabled:opacity-45">
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path fill="#0066da" d="M2.5 18.6 3.6 20.5c.2.4.5.7.9.9l3.9-6.7H.8c0 .4.1.9.3 1.3z" />
        <path fill="#00ac47" d="M12 8.3 8.1 1.6c-.4.2-.7.5-.9.9L.3 14.4c-.2.4-.3.9-.3 1.3h7.8z" />
        <path fill="#ea4335" d="M19.5 21.4c.4-.2.7-.5.9-.9l.5-.8 2.2-3.9c.2-.4.3-.9.3-1.3h-7.8l1.7 3.3z" />
        <path fill="#00832d" d="M12 8.3 15.9 1.6c-.4-.2-.8-.3-1.3-.3H9.4c-.5 0-.9.1-1.3.3z" />
        <path fill="#2684fc" d="M16.2 15.7H7.8l-3.9 6.7c.4.2.8.3 1.3.3h13.6c.5 0 .9-.1 1.3-.3z" />
        <path fill="#ffba00" d="M20.4 8.8 16.8 2.5c-.2-.4-.5-.7-.9-.9L12 8.3l4.2 7.4H24c0-.4-.1-.9-.3-1.3z" />
      </svg>
      {busy ? "Opening Drive…" : ready || failed ? "From Google Drive" : "Loading Drive…"}
    </button>
  );
}
