// "share this school with a friend": the facts of one programme, the text to send, and the link to the public page
// that carries the sharer's invite code. pure, so the dialog, the page, the cards and the tests agree.
//
// the message is about the programme only: never the sharer's fit, status or profile, never their name, never a
// promise of admission, never Ivyward's own prices. deadlines move, so it points to the page with the official link.
import { targetDeadline, upcomingDeadlines, type DeadlineRow } from "@/lib/fit";

export type ShareProgram = {
  id: string;
  name: string;
  degree: string | null;
  url?: string | null;
  duration_months?: number | null;
  tuition_usd?: number | null;
  app_fee_usd?: number | null;
  test_policy?: string | null;
  ielts_min?: number | string | null;
  toefl_min?: number | null;
  fee_waiver?: string | null;
  deadlines?: Partial<DeadlineRow>[] | null;
  verified_at?: string | null;
  school: { name: string; city?: string | null; state?: string | null; country?: string | null };
};

// what the share dialog gets for one programme
export type ShareProps = { programId: string; school: string; program: string | null; text: string; url: string; cardUrl: string };

export type ShareFacts = {
  title: string; // the school (or the scholarship)
  program: string | null;
  place: string | null;
  length: string | null;
  deadline: { date: string; when: string; note: string | null } | null;
  later: { when: string; round: string }[];
  tuition: string | null;
  fee: string | null;
  english: string | null;
  tests: string | null;
  waiver: string | null;
  checked: string | null;
  scholarship: boolean;
};

export const longDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function lengthOf(months: number | null | undefined): string | null {
  if (!months || months < 1) return null;
  if (months === 12) return "1 year";
  if (months % 12 === 0) return `${months / 12} years`;
  return `${months} months`;
}

// "$25,633" reads as more exact than a converted figure is: round to the nearest hundred
const usd = (n: number) => `$${(n >= 1000 ? Math.round(n / 100) * 100 : n).toLocaleString("en-US")}`;

const UNDERGRAD = /^(b[a-z]{1,4}\b|bachelor|undergrad|foundation)/i;
const TESTS: Record<string, string> = { required: "GRE/GMAT required", not_required: "No GRE/GMAT needed", optional: "GRE/GMAT optional", waivable: "GRE/GMAT can be waived" };
// research notes say "not found" rather than leaving the field empty: those aren't facts to pass on
const NOT_FOUND = /not found|unknown|unclear|no (official )?information|conflicting/i;

export function shareFacts(p: ShareProgram, today: string): ShareFacts {
  const scholarship = p.degree === "Scholarship";
  const rows = (p.deadlines ?? []).filter((d): d is DeadlineRow => typeof d?.date === "string").map((d) => ({ round: d.round ?? "", date: d.date, funding_priority: d.funding_priority ?? "unknown", notes: d.notes ?? "" }) as DeadlineRow);
  const next = targetDeadline(rows, today, { international: true });
  const later = upcomingDeadlines(rows, today)
    .filter((d) => d !== next && d.date !== next?.date)
    .slice(0, 3)
    .map((d) => ({ when: longDay(d.date), round: d.round.split("(")[0].trim().slice(0, 70) }));
  const ielts = p.ielts_min != null && `${p.ielts_min}` !== "" ? `IELTS ${p.ielts_min}` : null;
  const toefl = p.toefl_min ? `TOEFL ${p.toefl_min}` : null;
  const place = [p.school.city, p.school.country].filter(Boolean).join(", ") || null;
  return {
    title: scholarship ? p.name : p.school.name,
    program: scholarship ? null : p.name,
    place: scholarship ? (p.school.country ?? null) : place,
    length: scholarship ? null : lengthOf(p.duration_months),
    deadline: next ? { date: next.date, when: longDay(next.date), note: next.funding_priority === "yes" ? "scholarship round" : null } : null,
    later,
    tuition: !scholarship && p.tuition_usd ? `about ${usd(p.tuition_usd)} a year` : null,
    fee: p.app_fee_usd == null ? null : p.app_fee_usd === 0 ? "none" : usd(p.app_fee_usd),
    english: [ielts, toefl].filter(Boolean).join(" or ") || null,
    tests: scholarship || UNDERGRAD.test(p.degree ?? "") ? null : (TESTS[p.test_policy ?? ""] ?? null),
    waiver: p.fee_waiver && !NOT_FOUND.test(p.fee_waiver) ? p.fee_waiver.replace(/^fee waiver:\s*/i, "").slice(0, 200) : null,
    checked: p.verified_at ? longDay(p.verified_at.slice(0, 10)) : null,
    scholarship,
  };
}

// the link a friend opens: the public page for this programme, with the sharer's invite code. kept short for a chat:
// the /s/ landing page already marks a signup as coming from a share
export function shareUrl(base: string, programId: string, ref: string | null): string {
  return `${base}/s/${programId}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;
}

// the test rule in two words, for a fact table already labelled GRE / GMAT
export const TEST_SHORT: Record<string, string> = { required: "Required", not_required: "Not needed", optional: "Optional", waivable: "Can be waived" };

// the message, ready for whatsapp (*bold* renders there; elsewhere it reads fine)
export function shareText(f: ShareFacts, url: string, opts: { invite: boolean }): string {
  const lines = [
    `🎓 *${f.title}*`,
    f.program,
    [f.place, f.length].filter(Boolean).join(" · ") ? `📍 ${[f.place, f.length].filter(Boolean).join(" · ")}` : null,
    f.deadline ? `🗓 Next deadline: ${f.deadline.when}${f.deadline.note ? ` (${f.deadline.note})` : ""}` : null,
    f.tuition || f.fee ? `💵 ${[f.tuition && `Tuition ${f.tuition}`, f.fee && `Application fee ${f.fee}`].filter(Boolean).join(" · ")}` : null,
    f.english || f.tests ? `📝 ${[f.english, f.tests].filter(Boolean).join(" · ")}` : null,
    "",
    `Full details and the official page: ${url}`,
    "",
    `Ivyward AI can run the whole application for you: the essays, fee-waiver requests and the school's portal, start to finish. You review and sign.${opts.invite ? " Sign up with this link and finish setup, and we both get one application done free." : ""}`,
  ];
  return lines.filter((l) => l !== null).join("\n");
}
