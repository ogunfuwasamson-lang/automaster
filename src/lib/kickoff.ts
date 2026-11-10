import "server-only";
import { admin } from "@/lib/supabase/admin";
import { enqueue } from "@/lib/queue";
import { logEvent } from "@/lib/events";
import { getProfile } from "@/lib/profile-store";
import { profileGaps } from "@/lib/profile";
import { PORTAL_DETAIL_FIELDS, type PortalDetails } from "@/lib/portal-fields";
import { notify, resolve } from "@/lib/notify";
import { checkLimit } from "@/lib/limits";
import { canReadMail } from "@/lib/gmail";

// after setup (the interview wraps up, the form details are saved, or the applicant leaves setup), the agents start
// on their own: the shortlist begins if it hasn't, and anything the agents still need from the applicant becomes a
// notification instead of a silent blank. safe to call any number of times.
export async function kickoff(userId: string, source: string): Promise<{ shortlist: boolean; missing: string[] }> {
  const db = admin();
  const [profile, { data: row }, { data: docs }, { count: apps }, { count: runs }] = await Promise.all([
    getProfile(userId),
    db.from("profiles").select("portal_details").eq("id", userId).single(),
    db.from("documents").select("kind").eq("user_id", userId),
    db.from("applications").select("id", { count: "exact", head: true }).eq("user_id", userId),
    db.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("agent", "recon").eq("task", "discover").in("status", ["queued", "running", "done"]),
  ]);

  const missing: string[] = [];
  const kinds = new Set((docs ?? []).map((d) => d.kind as string));
  const regions = profile.preferences.regions ?? [];

  // what the agents can't work without
  if (!profile.goals.study_level || !regions.length) {
    missing.push("goals");
    await notify({ userId, key: "setup:goals", kind: "setup", urgent: true, title: "Tell the agents what and where to study", body: "Pick your degree level and the regions to search. The shortlist can't start without them.", href: "/onboarding?step=1", actionLabel: "Finish setup" });
  } else await resolve(userId, "setup:goals");

  if (!kinds.has("cv")) {
    missing.push("cv");
    await notify({ userId, key: "setup:cv", kind: "setup", title: "Add your CV", body: "Agents build most of your profile and your forms from it.", href: "/documents", actionLabel: "Upload CV" });
  } else await resolve(userId, "setup:cv");

  if (!kinds.has("transcript")) {
    missing.push("transcript");
    await notify({ userId, key: "setup:transcript", kind: "setup", title: "Add your transcript", body: "Almost every application asks for it, and agents read your grades and courses from it.", href: "/documents", actionLabel: "Upload transcript" });
  } else await resolve(userId, "setup:transcript");

  const details = (row?.portal_details ?? {}) as PortalDetails;
  const blank = PORTAL_DETAIL_FIELDS.filter((f) => f.required && !details[f.key]);
  if (blank.length) {
    missing.push("details");
    await notify({ userId, key: "setup:details", kind: "setup", urgent: true, title: "Fill in your form details", body: `Every portal asks for these: ${blank.map((f) => f.label).join(", ")}.`, href: "/profile?tab=details&setup=1", actionLabel: "Fill in details" });
  } else await resolve(userId, "setup:details");

  // without gmail the agents can't read school replies or act on them: say how to fix it, and the fallback
  const { data: mail } = await db.from("mail_accounts").select("status").eq("user_id", userId).maybeSingle();
  if (mail?.status !== "active") {
    missing.push("gmail");
    await notify({ userId, key: "setup:gmail", kind: "setup", title: "Connect Gmail so the agents can act on school emails", body: "They register you for webinars that unlock fee waivers, claim waivers, read verification codes and tell you when a school replies. No Gmail? Paste a school's email in Messages and they'll do the same.", href: "/settings", actionLabel: "Connect Gmail" });
  } else await resolve(userId, "setup:gmail");

  const gaps = profileGaps(profile).length;
  if (gaps) {
    missing.push("interview");
    await notify({ userId, key: "setup:interview", kind: "setup", title: `${gaps} question${gaps === 1 ? "" : "s"} left for Ivyward AI`, body: "A few answers your documents didn't cover. It takes a couple of minutes.", href: "/dashboard?chat=open", actionLabel: "Answer them" });
  } else await resolve(userId, "setup:interview");

  // the shortlist: once, as soon as the agents know what and where
  let shortlist = false;
  if (profile.goals.study_level && regions.length && !apps && !runs) {
    await enqueue({ userId, agent: "recon", task: "discover", idempotencyKey: `kickoff-discover:${userId}` });
    await logEvent({ userId, actor: "system", action: "recon.requested", context: { source } });
    shortlist = true;
  }
  await logEvent({ userId, actor: "system", action: "setup.kickoff", context: { source, missing, shortlist } });
  return { shortlist, missing };
}

// called after each recon job: when the last one finishes, the shortlist is ready
export async function shortlistFinished(userId: string): Promise<void> {
  const db = admin();
  const { count: left } = await db.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("agent", "recon").neq("task", "scholarships").in("status", ["queued", "running"]);
  if (left) return;
  const { data: run } = await db.from("jobs").select("id").eq("user_id", userId).eq("agent", "recon").eq("task", "discover").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!run) return;
  const { count } = await db.from("applications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "shortlisted");
  // don't wait for the applicant to pick: start preparing the nearest deadlines (up to 3 in progress at once, within
  // their plan). they can drop any of them; the rest stay on the shortlist
  const started = await autoPrepare(userId).catch(() => 0);
  await notify({
    userId,
    key: `shortlist-ready:${run.id}`,
    kind: "shortlist",
    title: count ? `Your shortlist is ready: ${count} program${count === 1 ? "" : "s"}` : "Your shortlist run finished",
    body: count
      ? `Agents checked each program's official pages against your profile.${started ? ` They've started preparing the ${started} with the nearest deadlines; drop any you don't want.` : " Pick the ones you want and the agents start preparing them."}`
      : "No programs passed the checks this time. Open the shortlist to see why and widen your search.",
    href: "/shortlist",
    actionLabel: "Open shortlist",
    email: true,
  });
}

// the shortlist's nearest deadlines go straight into preparation, so nobody waits on a click to start. at most 3 in
// progress at once (preparing or approved), and never past the plan's application limit
export async function autoPrepare(userId: string): Promise<number> {
  const db = admin();
  const { count: active } = await db.from("applications").select("id", { count: "exact", head: true }).eq("user_id", userId).in("status", ["preparing", "ready_for_review", "packet_approved"]);
  const room = 3 - (active ?? 0);
  if (room <= 0) return 0;
  const { data: picks } = await db
    .from("applications")
    .select("id, program_id")
    .eq("user_id", userId)
    .eq("status", "shortlisted")
    .order("target_deadline", { ascending: true, nullsFirst: false })
    .limit(room);
  let n = 0;
  for (const a of picks ?? []) {
    if (await checkLimit(userId, "application")) break;
    const { error } = await db.from("applications").update({ status: "preparing" }).eq("id", a.id).eq("status", "shortlisted");
    if (error) continue;
    await enqueue({ userId, agent: "strategist", task: "plan", payload: { applicationId: a.id }, idempotencyKey: `auto-prepare:${a.id}` });
    await logEvent({ userId, actor: "system", action: "application.prepare_requested", applicationId: a.id, programId: a.program_id, context: { auto: true } });
    n++;
  }
  // every portal emails a code or a link on the way: without gmail, each one waits for the applicant
  if (n && !(await canReadMail(userId).catch(() => true))) {
    await notify({ userId, key: "connect-gmail", kind: "setup", urgent: true, title: "Connect Gmail so applications don't wait on you", body: "School portals email a code or a link while the agents create your accounts. With Gmail connected the agents read them and carry on; without it, each one waits for you.", href: "/settings", actionLabel: "Connect Gmail" }).catch(() => {});
  }
  return n;
}

// the shortlist as early as the agents can search well: a level, at least one region, and either fields the
// applicant named or a document the agents have read. it used to wait for the last step of setup, and most people
// who told us what and where to study left before that and never saw a single program.
// once per applicant; returns true when it started.
export async function startShortlist(userId: string, source: string): Promise<boolean> {
  const db = admin();
  const profile = await getProfile(userId);
  if (!profile.goals.study_level || !(profile.preferences.regions ?? []).length) return false;
  if (!(profile.goals.fields ?? []).length) {
    const { count: read } = await db.from("documents").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "extracted");
    if (!read) return false;
  }
  const [{ count: apps }, { count: runs }] = await Promise.all([
    db.from("applications").select("id", { count: "exact", head: true }).eq("user_id", userId),
    db.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("agent", "recon").eq("task", "discover").in("status", ["queued", "running", "done"]),
  ]);
  if (apps || runs) return false;
  await enqueue({ userId, agent: "recon", task: "discover", idempotencyKey: `kickoff-discover:${userId}` });
  await logEvent({ userId, actor: "system", action: "recon.requested", context: { source, early: true } });
  return true;
}
