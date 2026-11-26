import "server-only";
import * as z from "zod/v4";
import { admin } from "@/lib/supabase/admin";
import { runStructured } from "@/lib/llm";
import { WirePatch, fromWire, WIRE_GUIDE, profileGaps, completeness, profileBrief } from "@/lib/profile";
import { applyPatch, getProfile } from "@/lib/profile-store";
import { US_SUSPENSION_CHECKED, usSuspension, usSuspensionNote } from "@/lib/us-visa-suspension";
import { logEvent } from "@/lib/events";
import { answerQuestion, openQuestions } from "@/lib/portal-questions";
import { kickoff } from "@/lib/kickoff";
import { research } from "@/lib/research";
import { runActions, seasonOverview } from "@/lib/assistant";
import { toAsk, type Ask } from "@/lib/ask";
import { detailsBrief, type PortalDetails } from "@/lib/portal-fields";
import { CHAPTERS, chapterStates, detailAsk, fieldFor, formReadiness, type Level } from "@/lib/profile-chapters";
import { saveDetail } from "@/lib/detail-answers";
import { lightTurn } from "@/lib/chat-routing";

export const ACTIONS = ["find_programs", "prepare_application", "start_portal", "remind", "calendar", "follow_link", "add_region"] as const;

export const TurnOut = z.object({
  reply: z.string(), // shown, and spoken aloud when voice is on
  patch: WirePatch, // only facts the user just stated
  mode: z.enum(["gaps", "stories", "answer", "wrap_up"]),
  // answers to the portal questions listed in the prompt, by id. skip = they said it doesn't apply / won't answer
  portal_answers: z.array(z.object({ id: z.string(), answer: z.string(), skip: z.boolean() })),
  // the question this reply asks, so it can be answered with a tap: a portal question's id (its own options are
  // used, exactly as the form words them), or "" with up to 8 short choices of your own for a question with clear
  // options. "" and [] when the reply asks nothing or the answer is open-ended.
  asks_portal_question: z.string(),
  choices: z.array(z.string()),
  // a web lookup to do before answering (current facts: deadlines, fees, requirements, rankings). "" when not needed
  lookup: z.string(),
  // things to set in motion for them, by handing work to the other agents
  actions: z.array(
    z.object({
      type: z.enum(ACTIONS),
      application_id: z.string(), // from the applications list, when the action is about one
      title: z.string(), // reminder or event title
      at: z.string(), // ISO date-time (UTC) for a reminder or event start, else ""
      minutes: z.number(), // event length
      url: z.string(), // for follow_link (from their messages or what they pasted) or an event page
      note: z.string(),
    }),
  ),
});

const SYSTEM = `you are Ivyward AI, the applicant's admissions assistant on Ivyward, a platform where agents run their whole university application season (bachelor's, master's, MBA or PhD; any field, any country). you talk with them by voice or text, any time.

what you do, in order of priority:
0. questions with a fixed form are answered on cards in the app, not in this conversation: a school's waiting portal questions, the facts that shape their matches (funding, budget, english, tests, grades, timing) and the quick form chapters. don't ask those one by one. if they're open and it matters, say so once in a short line ("a school's form is waiting on two answers: they're on the cards above") and move on. if they answer one in conversation anyway, record it in portal_answers with its exact id, in the wording a form expects: an option's exact text when there are options, dates as YYYY-MM-DD, yes/no as "Yes"/"No". don't also put these in the patch.
1. answer what they ask. admissions, schools, programs, requirements, deadlines, tests, visas, funding, scholarships, fee waivers, essays, interviews, careers after a degree, how ivyward works, where their applications stand. use their applications, messages and notices below; that is what the other agents know. for current facts you aren't sure of (a deadline, a fee, a requirement, a ranking) set lookup to a precise web search query instead of guessing; you'll get the results and answer then. mode "answer".
2. act for them when they ask, or when it's plainly the next step. actions hand work to the other agents:
   - find_programs: search for more programs (the shortlist agent).
   - prepare_application: start strategy and essays for one application_id that is shortlisted.
   - start_portal: send one application_id with a signed packet to the portal agents.
   - remind: a reminder at a UTC time (title, at). they get a notice and an email.
   - calendar: put an event in their calendar (title, at UTC start, minutes, url). use it for webinars, interviews, deadlines they want blocked out.
   - follow_link: open a link from a school (url) and complete it for them: register for an event, request a fee waiver, fill a form, book a slot.
   - add_region: add a destination to their search and look for programmes there (note = the region key: us, uk, canada, europe, asia, australia_nz, middle_east, africa, latin_america). only when they agree to it.
   where to apply: the destination check below compares their picks with other places on Ivyward's checked list. when it shows somewhere clearly better for their field and funding need, say so plainly with its numbers (once, when it fits the conversation) and offer to add it; act with add_region only on their yes.
   say in the reply what you set in motion. never claim something is done that you didn't put in actions.
3. be proactive in a sentence when it matters: a deadline close by, a webinar that unlocks a fee waiver, something that needs them.
4. when nothing else is going on, the profile work only a conversation can do: the open gaps below that need their own words (goals, why this degree and why now, past degrees, recommenders), then the story chapter in progress (the questions essays are written from) and essay and funding material (mode "stories"): concrete stories with numbers, a setback and what they learned, why this field, why now. and every hook that wins scholarships and fee waivers beyond nationality: sport, arts, music, hobbies pursued seriously, competitions and olympiads, awards, top grades, leadership, volunteering, community or faith work, a business or project they built, languages, being first in their family at university, other family or life circumstances they choose to share, a career milestone. be a curious interviewer: one question at a time, one follow-up for a concrete detail or number, then move on; react briefly and specifically (not "great!"). record story-chapter answers in portal_answers with the question's id ("d:<key>"); skip = true when they'd rather not say.
5. wrap up when they want to stop.

how you sound:
- like a sharp friend who's been through admissions abroad and knows the system. relaxed, direct, never stiff, no filler.
- reply is plain text, no lists, no urls, no brackets. questions and small talk: under 40 words, one question at most. answers to a real question: as long as it needs, up to about 120 words.
- don't parrot their answer back. never say "noted" or "great question".

hard rules:
- when your own question has a few clear answers (an intake, a degree level, yes or no, which of their programs), put them in choices (2 to 8, short) so they can tap one; leave choices empty for open questions.
- never ask the same thing twice. if the transcript shows you asked it and they answered anything, it's closed. unclear answers ("depends", "any") go in notes, and the gap key in skipped_gaps.
- when they name recommenders, set recommenders.count_lined_up and put names and roles in recommenders.notes.
- never ask what the profile, the profile details or the documents already answer, in any wording: before every question, check all three. if something conflicts, confirm it once.
- never ask for passport numbers, ID numbers, bank details, or passwords.
- action ids and urls come only from the lists below or from what they pasted. times in UTC; convert from the time zone they or the school state.

the patch:
- only facts the user stated or confirmed in their latest message. never infer or pad.
- a correction overwrites.
- career changes go in work[] (company, role, start, end "" if current, location if said), using the names exactly as in the profile so the entry updates.
- a story is one concrete episode: title as a short handle, metrics exactly as they said them.
- funding hooks (sport, awards, family circumstances they shared, competitions...) go in notes as short facts, or as a story when there's an episode.

${WIRE_GUIDE}`;

export interface Turn {
  role: "agent" | "user";
  content: string;
}

export async function interviewTurn(userId: string, sessionId: string, userText: string | null, viaVoice: boolean) {
  const db = admin();

  if (userText) {
    await db.from("interview_turns").insert({ user_id: userId, session_id: sessionId, role: "user", content: userText, via_voice: viaVoice });
  }

  const [profile, { data: history }, { data: docs }, { data: row }, questions, overview, advice] = await Promise.all([
    getProfile(userId),
    db.from("interview_turns").select("role, content").eq("user_id", userId).order("created_at", { ascending: false }).limit(16),
    db.from("documents").select("filename, extracted").eq("user_id", userId).eq("status", "extracted"),
    db.from("profiles").select("target_term, portal_details").eq("id", userId).single(),
    openQuestions(userId),
    seasonOverview(userId),
    import("@/lib/advice-server").then((m) => m.destinationAdvice(userId)).catch(() => null),
  ]);
  const transcript = (history ?? []).reverse() as Turn[];
  const us = usSuspension(profile.identity.citizenship ?? ((row?.portal_details as PortalDetails | null)?.passport_country as string | undefined));
  const usNote = us ? usSuspensionNote(us) : null;
  // the application-profile chapter in progress: the one they asked for, else the one the last question came from
  const details = (row?.portal_details as PortalDetails | null) ?? {};
  const level = (profile.goals.study_level as Level | null) ?? null;
  const asked = userText ? CHAPTERS.find((c) => userText.toLowerCase().includes(`chapter: ${c.title.toLowerCase()}`)) : undefined;
  const { data: lastAgent } = await db.from("interview_turns").select("meta").eq("user_id", userId).eq("role", "agent").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const lastMeta = lastAgent?.meta as { ask?: { id?: string }; chapter?: string | null } | null;
  const lastKey = (lastMeta?.ask?.id ?? "").replace(/^d:/, "");
  const focus = asked?.id ?? lastMeta?.chapter ?? CHAPTERS.find((c) => c.keys.includes(lastKey))?.id ?? null;
  // the form chapters are cards now (lib/cards): only the story chapters are worked through here
  const stories = chapterStates(details, level).filter((x) => x.chapter.style === "story");
  const storyPick = (focus ? stories.find((x) => x.chapter.id === focus && x.next.length) : undefined) ?? stories.find((x) => x.next.length) ?? null;
  const chapterNow = { chapter: storyPick, questions: storyPick ? storyPick.next.slice(0, 4) : [] };
  const gaps = profileGaps(profile, details);
  // they asked for a chapter by name (the buttons in setup and on the profile do): that comes before the gaps
  const wantsChapter = !!asked && chapterNow.chapter?.chapter.id === asked.id;

  const prompt = `profile:
${profileBrief(profile, row?.target_term)}

profile details already on file (never ask these again):
${detailsBrief(row?.portal_details as PortalDetails | null, "all") || "(none yet)"}

documents on file: ${(docs ?? []).map((d) => (d.extracted as { kind?: string } | null)?.kind ?? d.filename).join(", ") || "none"}

portal questions the agents are waiting on (on the cards in the app; record an answer only if they give one here):
${questions.map((q) => `- [${q.id}] ${q.school ?? "a school"} asks: "${q.question}"${q.options.length ? ` (options: ${q.options.slice(0, 25).join(" / ")})` : ""}${q.field_type === "date" ? " (a date)" : ""}`).join("\n") || "(none)"}

${overview}

destination check (Ivyward's checked list, their field, level, funding need and tests): ${advice ? `${advice.text} (region keys: ${advice.add.map((o) => o.region).join(", ")})` : "their picks are as good as anywhere on the list, or there's too little to compare"}
${usNote ? `US student visas: ${usNote} (US State Department, checked ${US_SUSPENSION_CHECKED}). if they want US schools anyway, say this once, plainly, ask whether they hold another passport, and add the US only on their yes.\n` : ""}
today (UTC): ${new Date().toISOString().slice(0, 16).replace("T", " ")}

application profile (${formReadiness(details, level)}% ready for forms; the quick chapters are on cards). story chapter in progress: ${chapterNow.chapter ? `"${chapterNow.chapter.chapter.title}" (${chapterNow.chapter.done} of ${chapterNow.chapter.total} done)` : "(all done)"}
${chapterNow.questions.map((f) => `- [d:${f.key}] ${f.ask ?? f.label}${f.options?.length ? ` (options: ${f.options.join(" / ")})` : ""}${f.kind === "date" ? " (a date)" : ""}${f.hint ? ` (hint: ${f.hint})` : ""}`).join("\n") || "(nothing open)"}

${wantsChapter ? `they asked to do the chapter "${chapterNow.chapter!.chapter.title}" now: ask its questions above, in order, starting with the first. leave the gaps below for after the chapter.\n\n` : asked ? `they asked for the chapter "${asked.title}": its questions are quick cards in the app (they'll see them above the reply box). say so in one line and offer the story questions or anything else.\n\n` : ""}gaps, highest priority first:
${gaps.map((g, i) => `${i + 1}. [${g.key}] ${g.ask}`).join("\n") || "(none: move to stories, or wrap up)"}

conversation so far (oldest first):
${transcript.map((t) => `${t.role === "agent" ? "you" : "them"}: ${t.content}`).join("\n") || "(nothing yet)"}

${userText ? `they just said: ${userText}` : transcript.length ? "they came back. pick up naturally: something that needs them, or the next story question." : "they just opened Ask Ivyward for the first time. one short line on what you can do (answer anything about admissions, act for them, and get to know them for their essays and funding), then your first question."}`;

  // a short reply to the AI's own question goes to the smaller model; questions, requests, stories and anything long
  // go to the larger one (nov 2026: $0.013 a turn on the larger model for every reply, most of them a few words)
  const lastMode = (lastAgent?.meta as { mode?: string } | null)?.mode ?? null;
  const light = lightTurn(userText, transcript, lastMode);
  let { output, runId } = await runStructured({
    userId,
    agent: "interviewer",
    tier: light ? "cheap" : "chat",
    promptVersion: light ? "assistant-v2-light" : "assistant-v2",
    system: SYSTEM,
    prompt,
    schema: TurnOut,
    maxTokens: 2500,
  });
  // a question that needs current facts: look them up, then answer with the results in hand
  if (output.lookup.trim()) {
    const found = await research({
      userId,
      agent: "interviewer",
      system: "you look up current, official facts for a university applicant: admissions requirements, deadlines, fees, fee waivers, scholarships, visas, rankings, programs. prefer official university and government pages. report exact figures and dates with their source urls. say plainly when something isn't published.",
      prompt: output.lookup.slice(0, 400),
      maxSearches: 3,
      maxFetches: 2,
    }).catch(() => null);
    if (found) {
      ({ output, runId } = await runStructured({
        userId,
        agent: "interviewer",
        tier: "chat",
        promptVersion: "assistant-v2-answer",
        system: SYSTEM,
        prompt: `${prompt}\n\nyou looked this up ("${output.lookup.slice(0, 200)}"). results:\n${found.text.slice(0, 6000)}\n\nanswer them now from these results (say where a figure comes from in plain words, e.g. "the school's admissions page"); lookup must be "".`,
        schema: TurnOut,
        maxTokens: 2500,
      }));
    }
  }
  const done = await runActions(userId, output.actions ?? []);

  // answers to portal questions go into the profile (and restart the stopped applications); chapter answers
  // ("d:<key>") go into the application profile
  const valid = new Set(questions.map((q) => q.id));
  let answered = 0;
  let chapterAnswers = 0;
  for (const a of output.portal_answers ?? []) {
    if (a.id.startsWith("d:") && fieldFor(a.id.slice(2))) {
      if ((await saveDetail(userId, a.id.slice(2), a.skip ? null : a.answer).catch(() => ({ ok: false }))).ok) chapterAnswers++;
      continue;
    }
    if (!valid.has(a.id)) continue;
    if (await answerQuestion(userId, a.id, a.skip ? null : a.answer).catch(() => false)) answered++;
  }

  let updated = answered ? await getProfile(userId) : profile;
  const patch = fromWire(output.patch);
  const patchKeys = Object.keys(patch);
  if (patchKeys.length) {
    updated = await applyPatch(userId, patch, { actor: "agent:interviewer", label: "interview", agentRunId: runId });
  }

  // what the reply asks, with the control that fits it
  const stillOpen = questions.filter((q) => !(output.portal_answers ?? []).some((a) => a.id === q.id));
  const portalQ = stillOpen.find((q) => q.id === output.asks_portal_question);
  const own = (output.choices ?? []).map((c) => c.trim()).filter(Boolean).slice(0, 8);
  const detailQ = output.asks_portal_question.startsWith("d:") && !(output.portal_answers ?? []).some((a) => a.id === output.asks_portal_question) ? fieldFor(output.asks_portal_question.slice(2)) : undefined;
  const detailAskable = detailQ && detailQ.kind !== "long" ? detailQ : undefined;
  const ask: Ask | null = portalQ ? toAsk(portalQ) : detailAskable ? detailAsk(detailAskable) : own.length >= 2 ? { id: null, school: null, question: "", kind: "choice", options: own } : null;

  const failed = done.filter((d) => !d.ok);
  const reply = failed.length ? `${output.reply} (${failed.map((d) => d.note).join("; ")})` : output.reply;
  const turn = { user_id: userId, session_id: sessionId, role: "agent", content: reply };
  const { error: turnErr } = await db.from("interview_turns").insert({ ...turn, meta: { ...(ask ? { ask } : {}), chapter: chapterNow.chapter?.chapter.id ?? null, mode: output.mode } });
  if (turnErr) await db.from("interview_turns").insert(turn); // before the meta column exists
  await logEvent({
    userId,
    actor: "agent:interviewer",
    action: "interview.turn",
    agentRunId: runId,
    channel: viaVoice ? "voice" : "text",
    context: { sessionId, patched: patchKeys, mode: output.mode, light, portalAnswers: answered, chapterAnswers, lookup: output.lookup || null, actions: done },
  });

  // the conversation is done: the agents start now, and whatever they still need becomes a notification
  let next: string | null = null;
  if (output.mode === "wrap_up") {
    const k = await kickoff(userId, "interview").catch(() => null);
    if (k?.missing.includes("details")) next = "/profile?tab=details&setup=1";
  }

  return {
    reply,
    actions: done,
    wrapUp: output.mode === "wrap_up",
    next,
    completeness: completeness(updated),
    gapsLeft: profileGaps(updated, details).length,
    questionsLeft: questions.length - answered,
    ask,
  };
}

