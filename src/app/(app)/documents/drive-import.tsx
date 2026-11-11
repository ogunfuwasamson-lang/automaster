"use client";
import { useState } from "react";
import { toast } from "sonner";
import { uploadDocument } from "@/lib/upload-client";
import { GOOGLE_CLIENT_ID } from "@/components/google-button";

// pick files straight from Google Drive (a transcript or certificate that lives there, often on a phone where the
// file itself isn't). google's own picker, with the narrowest access: only the files picked, read once, in this
// browser. shown only when the picker key is set for the site.
const KEY = process.env.NEXT_PUBLIC_GOOGLE_PICKER_KEY ?? "";
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

export function DriveImport({ userId, kind, onDone }: { userId: string; kind: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  if (!KEY) return null;

  const token = () =>
    new Promise<string>((ok, bad) => {
      const g = (window as unknown as { google: Gsi }).google;
      g.accounts.oauth2
        .initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPE,
          callback: (r: { access_token?: string; error?: string }) => (r.access_token ? ok(r.access_token) : bad(new Error(r.error ?? "no access"))),
          error_callback: () => bad(new Error("closed")),
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
    setBusy(true);
    try {
      await Promise.all([script("https://apis.google.com/js/api.js"), script("https://accounts.google.com/gsi/client")]);
      await new Promise<void>((ok) => (window as unknown as { gapi: G }).gapi.load("picker", ok));
      const t = await token();
      const gp = (window as unknown as { google: { picker: Picker } }).google.picker;
      const view = new gp.DocsView(gp.ViewId.DOCS).setMimeTypes(TYPES.join(",")).setIncludeFolders(true).setSelectFolderEnabled(false);
      await new Promise<void>((done) => {
        new gp.PickerBuilder()
          .enableFeature(gp.Feature.MULTISELECT_ENABLED)
          .setDeveloperKey(KEY)
          .setAppId(APP)
          .setOAuthToken(t)
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
      if (!/closed|popup_closed/i.test(String(e))) toast.error("Google Drive didn't open. Upload the file from this device instead.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={open} disabled={busy} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold disabled:opacity-45">
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path fill="#0066da" d="M2.5 18.6 3.6 20.5c.2.4.5.7.9.9l3.9-6.7H.8c0 .4.1.9.3 1.3z" />
        <path fill="#00ac47" d="M12 8.3 8.1 1.6c-.4.2-.7.5-.9.9L.3 14.4c-.2.4-.3.9-.3 1.3h7.8z" />
        <path fill="#ea4335" d="M19.5 21.4c.4-.2.7-.5.9-.9l.5-.8 2.2-3.9c.2-.4.3-.9.3-1.3h-7.8l1.7 3.3z" />
        <path fill="#00832d" d="M12 8.3 15.9 1.6c-.4-.2-.8-.3-1.3-.3H9.4c-.5 0-.9.1-1.3.3z" />
        <path fill="#2684fc" d="M16.2 15.7H7.8l-3.9 6.7c.4.2.8.3 1.3.3h13.6c.5 0 .9-.1 1.3-.3z" />
        <path fill="#ffba00" d="M20.4 8.8 16.8 2.5c-.2-.4-.5-.7-.9-.9L12 8.3l4.2 7.4H24c0-.4-.1-.9-.3-1.3z" />
      </svg>
      {busy ? "Opening Drive…" : "From Google Drive"}
    </button>
  );
}
