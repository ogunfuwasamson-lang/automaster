import "server-only";
import * as z from "zod/v4";
import { admin } from "@/lib/supabase/admin";
import { runStructured } from "@/lib/llm";
import { WirePatch, fromWire, WIRE_GUIDE, profileGaps, completeness, profileBrief } from "@/lib/profile";
import { applyPatch, getProfile } from "@/lib/profile-store";
import { logEvent } from "@/lib/events";
import { answerQuestion, openQuestions } from "@/lib/portal-questions";
import { kickoff } from "@/lib/kickoff";
import { research } from "@/lib/research";
import { runActions, seasonOverview } from "@/lib/assistant";

export const ACTIONS = ["find_programs", "prepare_application", "start_portal", "remind", "calendar", "follow_link"] as const;

export const TurnOut = z.object({
  reply: z.string(), // shown, and spoken aloud when voice is on
  patch: WirePatch, // only facts the user just stated
  mode: z.enum(["gaps", "stories", "answer", "wrap_up"]),
  // answers to the portal questions listed in the prompt, by id. skip = they said it doesn't apply / won't answer
  portal_answers: z.array(z.object({ id: z.string(), answer: z.string(), skip: z.boolean() })),
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
0. portal questions come first when there are any: a school's application form is stopped until they're answered. ask them one at a time, say which school is asking, and if the question has options, offer the closest few. record each answer in portal_answers with the question's exact id, in the wording a form expects: an option's exact text when there are options, dates as YYYY-MM-DD, yes/no as "Yes"/"No". skip true if it doesn't apply or they won't answer. don't also put these in the patch. when the last one is answered, tell them the agents are carrying on.
1. answer what they ask. admissions, schools, programs, requirements, deadlines, tests, visas, funding, scholarships, fee waivers, essays, interviews, careers after a degree, how ivyward works, where their applications stand. use their applications, messages and notices below; that is what the other agents know. for current facts you aren't sure of (a deadline, a fee, a requirement, a ranking) set lookup to a precise web search query instead of guessing; you'll get the results and answer then. mode "answer".
2. act for them when they ask, or when it's plainly the next step. actions hand work to the other agents:
   - find_programs: search for more programs (the shortlist agent).
   - prepare_application: start strategy and essays for one application_id that is shortlisted.
   - start_portal: send one application_id with a signed packet to the portal agents.
   - remind: a reminder at a UTC time (title, at). they get a notice and an email.
   - calendar: put an event in their calendar (title, at UTC start, minutes, url). use it for webinars, interviews, deadlines they want blocked out.
   - follow_link: open a link from a school (url) and complete it for them: register for an event, request a fee waiver, fill a form, book a slot.
   say in the reply what you set in motion. never claim something is done that you didn't put in actions.
3. be proactive in a sentence when it matters: a deadline close by, a webinar that unlocks a fee waiver, something that needs them.
4. when nothing else is going on, close the profile gaps (list provided, highest priority first), then dig for essay and funding material (mode "stories"): concrete stories with numbers, a setback and what they learned, why this field, why now. and every hook that wins scholarships and fee waivers beyond nationality: sport, arts, music, hobbies pursued seriously, competitions and olympiads, awards, top grades, leadership, volunteering, community or faith work, a business or project they built, languages, being first in their family at university, other family or life circumstances they choose to share, a career milestone. one question at a time.
5. wrap up when they want to stop.

how you sound:
- like a sharp friend who's been through admissions abroad and knows the system. relaxed, direct, never stiff, no filler.
- reply is plain text, no lists, no urls, no brackets. questions and small talk: under 40 words, one question at most. answers to a real question: as long as it needs, up to about 120 words.
- don't parrot their answer back. never say "noted" or "great question".

hard rules:
- never ask the same thing twice. if the transcript shows you asked it and they answered anything, it's closed. unclear answers ("depends", "any") go in notes, and the gap key in skipped_gaps.
- when they name recommenders, set recommenders.count_lined_up and put names and roles in recommenders.notes.
- never ask what the profile or documents already answer. if something conflicts, confirm it once.
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

  const [profile, { data: history }, { data: docs }, { data: row }, questions, overview] = await Promise.all([
    getProfile(userId),
    db.from("interview_turns").select("role, content").eq("user_id", userId).order("created_at", { ascending: false }).limit(24),
    db.from("documents").select("filename, extracted").eq("user_id", userId).eq("status", "extracted"),
    db.from("profiles").select("target_term").eq("id", userId).single(),
    openQuestions(userId),
    seasonOverview(userId),
  ]);
  const transcript = (history ?? []).reverse() as Turn[];
  const gaps = profileGaps(profile);

  const prompt = `profile:
${profileBrief(profile, row?.target_term)}

documents on file: ${(docs ?? []).map((d) => (d.extracted as { kind?: string } | null)?.kind ?? d.filename).join(", ") || "none"}

portal questions the agents are waiting on (ask these first):
${questions.map((q) => `- [${q.id}] ${q.school ?? "a school"} asks: "${q.question}"${q.options.length ? ` (options: ${q.options.slice(0, 25).join(" / ")})` : ""}${q.field_type === "date" ? " (a date)" : ""}`).join("\n") || "(none)"}

${overview}

today (UTC): ${new Date().toISOString().slice(0, 16).replace("T", " ")}

gaps, highest priority first:
${gaps.map((g, i) => `${i + 1}. [${g.key}] ${g.ask}`).join("\n") || "(none: move to stories, or wrap up)"}

conversation so far (oldest first):
${transcript.map((t) => `${t.role === "agent" ? "you" : "them"}: ${t.content}`).join("\n") || "(nothing yet)"}

${userText ? `they just said: ${userText}` : questions.length ? "you opened the chat because a school's form needs answers. one short line saying so, then the first portal question." : transcript.length ? "they came back. pick up naturally: something that needs them, or the next question." : "they just opened Ivyward AI for the first time. one short line on what you can do (answer anything about admissions, act for them, and get to know them for their essays and funding), then your first question."}`;

  let { output, runId } = await runStructured({
    userId,
    agent: "interviewer",
    tier: "chat",
    promptVersion: "assistant-v1",
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
        promptVersion: "assistant-v1-answer",
        system: SYSTEM,
        prompt: `${prompt}\n\nyou looked this up ("${output.lookup.slice(0, 200)}"). results:\n${found.text.slice(0, 6000)}\n\nanswer them now from these results (say where a figure comes from in plain words, e.g. "the school's admissions page"); lookup must be "".`,
        schema: TurnOut,
        maxTokens: 2500,
      }));
    }
  }
  const done = await runActions(userId, output.actions ?? []);

  // answers to portal questions go into the profile (and restart the stopped applications)
  const valid = new Set(questions.map((q) => q.id));
  let answered = 0;
  for (const a of output.portal_answers ?? []) {
    if (!valid.has(a.id)) continue;
    if (await answerQuestion(userId, a.id, a.skip ? null : a.answer).catch(() => false)) answered++;
  }

  let updated = answered ? await getProfile(userId) : profile;
  const patch = fromWire(output.patch);
  const patchKeys = Object.keys(patch);
  if (patchKeys.length) {
    updated = await applyPatch(userId, patch, { actor: "agent:interviewer", label: "interview", agentRunId: runId });
  }

  const failed = done.filter((d) => !d.ok);
  const reply = failed.length ? `${output.reply} (${failed.map((d) => d.note).join("; ")})` : output.reply;
  await db.from("interview_turns").insert({ user_id: userId, session_id: sessionId, role: "agent", content: reply });
  await logEvent({
    userId,
    actor: "agent:interviewer",
    action: "interview.turn",
    agentRunId: runId,
    channel: viaVoice ? "voice" : "text",
    context: { sessionId, patched: patchKeys, mode: output.mode, portalAnswers: answered, lookup: output.lookup || null, actions: done },
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
    gapsLeft: profileGaps(updated).length,
    questionsLeft: questions.length - answered,
  };
}
