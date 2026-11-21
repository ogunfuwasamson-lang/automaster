import { NextResponse, type NextRequest } from "next/server";
import { setOptOut, validUnsubscribe } from "@/lib/broadcast";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

// the "stop these emails" link in Ivyward's news emails. no sign-in: the link carries a signature for that account.
// GET (a click) shows a short page; POST is the one-click unsubscribe mail apps send.
async function off(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(u) || !validUnsubscribe(u, t)) return false;
  await setOptOut(u, true);
  await logEvent({ userId: u, actor: "user", action: "email.news_off" }).catch(() => {});
  return true;
}

const page = (ok: boolean) =>
  new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ivyward emails</title><meta name="robots" content="noindex"></head><body style="margin:0;background:#fafafa;font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b"><main style="max-width:520px;margin:12vh auto;padding:0 20px"><h1 style="font:400 28px Georgia,serif;margin:0 0 12px">${ok ? "You won't get Ivyward news emails anymore" : "That link didn't work"}</h1><p style="color:#52525b;margin:0 0 20px">${ok ? "Emails about your own applications (a question from a school form, a deadline, a payment) still come, because the agents need you for those. You can change this any time in Settings." : "It may have been cut short by your mail app. Sign in and turn news emails off in Settings."}</p><a href="https://tryivyward.com/settings" style="color:#9b2c4e">Open Settings</a></main></body></html>`,
    { status: ok ? 200 : 400, headers: { "content-type": "text/html; charset=utf-8" } },
  );

export async function GET(req: NextRequest) {
  return page(await off(req));
}

export async function POST(req: NextRequest) {
  return (await off(req)) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "invalid link" }, { status: 400 });
}
