import { inSentence } from "@/lib/doc-checklist";

// "today's task": the one small thing that moves an applicant closest to their first submission, and the path
// there as steps. the dashboard leads with it and the morning email names it. pure, so both agree.

export interface TodayInput {
  apps: { id: string; school: string; status: string; deadline: string | null }[];
  hasCv: boolean;
  hasTranscript: boolean;
  basicsMissing: number; // required form details still blank (email, phone, date of birth)
  gmail: boolean;
  story: { open: number } | null; // the "Your story" chapter: questions left
  nextChapter: { id: string; title: string; open: number } | null; // the next quick chapter with questions left
  sharpenOpen?: number; // "sharpen your matches" questions left (lib/sharpen)
  // the application being prepared with the nearest deadline that's still missing documents (lib/doc-checklist)
  appDoc?: { appId: string; school: string; deadline: string | null; label: string; missing: number } | null;
}

export interface Task {
  id: string;
  title: string;
  why: string;
  minutes: number;
  href: string;
  cta: string;
}

export interface Journey {
  steps: { id: string; label: string; done: boolean }[];
  done: number;
  next: string | null;
}

const PREPARING = ["preparing", "ready_for_review", "packet_approved", "submitted", "under_review", "interview", "waitlisted", "admitted", "accepted", "declined", "rejected"];
const READY = PREPARING.slice(1);
const SIGNED = PREPARING.slice(2);
const SENT = PREPARING.slice(3);
const short = (school: string) => school.split(",")[0].replace(/\s*\([^)]*\)/g, "").trim();

export function journey(i: TodayInput): Journey {
  const any = (sts: string[]) => i.apps.some((a) => sts.includes(a.status));
  const steps = [
    { id: "shortlist", label: "Shortlist", done: i.apps.length > 0 },
    { id: "cv", label: "CV", done: i.hasCv },
    { id: "basics", label: "Form basics", done: i.basicsMissing === 0 },
    { id: "transcript", label: "Transcript", done: i.hasTranscript },
    { id: "prepared", label: "First application written", done: any(READY) },
    { id: "signed", label: "Signed", done: any(SIGNED) },
    { id: "submitted", label: "Submitted", done: any(SENT) },
  ];
  return { steps, done: steps.filter((s) => s.done).length, next: steps.find((s) => !s.done)?.label ?? null };
}

const byDeadline = (a: { deadline: string | null }, b: { deadline: string | null }) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999");

export function todaysTask(i: TodayInput): Task | null {
  // an application waiting for their signature beats everything: it's the step before a submission
  const toSign = i.apps.filter((a) => a.status === "ready_for_review").sort(byDeadline)[0];
  if (toSign)
    return { id: `sign:${toSign.id}`, title: `Read and sign your ${short(toSign.school)} application`, why: "It's written and fact-checked. Once you sign, the agents fill in the form and submit it.", minutes: 10, href: `/applications/${toSign.id}`, cta: "Read it" };
  if (!i.hasCv)
    return { id: "cv", title: "Upload your CV", why: "Your agents score your fit on every programme from it, find scholarships you qualify for, and fill most of your forms.", minutes: 1, href: "/documents", cta: "Upload CV" };
  const preparing = i.apps.some((a) => PREPARING.includes(a.status));
  // the facts that decide which programmes and scholarships fit, before anything for the forms
  if (i.sharpenOpen && i.sharpenOpen > 0)
    return { id: "sharpen", title: i.sharpenOpen > 1 ? `Answer ${i.sharpenOpen} quick questions that sharpen your matches` : "One quick question that sharpens your matches", why: "Funding, budget, English and tests decide which programmes and scholarships really fit. Each answer re-ranks your list.", minutes: 1, href: "/dashboard#sharpen", cta: "Answer" };
  // a document a school needs before the agents can submit: named, with the school
  if (i.appDoc) {
    const d = i.appDoc;
    const what = inSentence(d.label);
    return { id: `doc:${d.appId}`, title: `Add your ${what} for ${short(d.school)}`, why: `Your agents can't submit without it${d.missing > 1 ? `, and ${d.missing - 1} more after it` : ""}. A photo from your phone works.`, minutes: 2, href: `/applications/${d.appId}#documents`, cta: "Add it" };
  }
  if (i.basicsMissing > 0)
    return { id: "basics", title: "Add the basics every form asks for", why: "Your phone and date of birth come first on every application form. Saved once, the agents never stop to ask.", minutes: 1, href: "/profile/chapters/basics", cta: "Add them" };
  if (!i.hasTranscript)
    return { id: "transcript", title: "Add your transcript", why: "Almost every application asks for it, and the agents read your grades and courses from it.", minutes: 2, href: "/documents", cta: "Upload transcript" };
  // essays are being written: a real story makes them yours
  if (preparing && i.story && i.story.open > 0)
    return { id: "story", title: "Tell Ivyward AI one story for your essays", why: "One moment you're proud of, in your own words. Your essays are drafted from stories like it.", minutes: 5, href: `/dashboard?chat=open&say=${encodeURIComponent("Let's do my profile chapter: Your story")}`, cta: "Start talking" };
  if (preparing && !i.gmail)
    return { id: "gmail", title: "Connect Gmail", why: "Application forms email a code while the agents create your accounts. Connected, they read it and carry on.", minutes: 1, href: "/settings", cta: "Connect Gmail" };
  if (i.nextChapter && i.nextChapter.open > 0) {
    const n = Math.min(5, i.nextChapter.open);
    return { id: `chapter:${i.nextChapter.id}`, title: `Answer ${n} quick question${n > 1 ? "s" : ""}: ${i.nextChapter.title.toLowerCase()}`, why: "Answered once, used on every form. Taps, mostly.", minutes: Math.max(1, Math.round(n * 0.4)), href: `/profile/chapters/${i.nextChapter.id}`, cta: "Answer them" };
  }
  if (i.story && i.story.open > 0)
    return { id: "story", title: "Tell Ivyward AI one story for your essays", why: "One moment you're proud of, in your own words. Your essays are drafted from stories like it.", minutes: 5, href: `/dashboard?chat=open&say=${encodeURIComponent("Let's do my profile chapter: Your story")}`, cta: "Start talking" };
  return null;
}
