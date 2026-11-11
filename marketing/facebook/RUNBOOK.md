# Ivyward on Facebook: the daily runbook

Three scheduled runs follow this file. Each starts fresh, so everything a run needs is here or in the review page.

- **Review page (the source of truth):** https://claude.ai/artifact/7cxMZ7UyB8BwXAguNYhqba ("Ivyward Social Desk").
  Read and write it with the `ArtifactData` tool (collections below) and upload videos to it with the `Artifact` tool
  (`url` = that link, `asset: true`, `file_path` = the mp4).
- **Facebook page:** https://www.facebook.com/tryivyward. Every action is taken *as the Ivyward Page*, never as Samson's profile.
- **Times are Lagos time (Africa/Lagos, UTC+1).** Morning run 7am, posting runs 12pm and 6pm.

## What each run does

| Run | Does | Never does |
|---|---|---|
| Morning (7am) | joins ≥10 new groups/pages; drafts the day's posts, videos, comments and replies into the review page | posts, comments or replies anything |
| Noon (12pm) and evening (6pm) | posts the items Samson **approved** whose slot has come; records links | posts anything still a draft, skipped, or edited after approval without saving |

Approval is the rule that matters. Every post, comment and reply is written by Claude and goes out publicly as Ivyward,
so it goes out only after Samson approves it on the review page (`status: "approved"`). Joining a group or following a
page needs no approval (he asked for ≥10 a day).

## Daily volume

- **Page posts:** 2 a day on the Ivyward Page, slots `12:00` and `18:00`. Each has a video.
- **Group posts:** 5 a day, slots `12:00` (3) and `18:00` (2). Each has a video. One group gets at most one post every
  7 days, and each post is written for that group (its country, scholarship or audience), never the same text twice.
- **Comments and replies:** 15–20 a day, half per slot. Text only.
- **Joins:** at least 10 new groups or pages a day, about a minute apart.

## Brand and honesty rules (apply to every word)

1. Facts about Ivyward come only from `src/lib/site.ts` (`FACTS`, `PLAN_OFFERS`). Prices: preparing is free; in Africa ₦10,000
   for 5 submissions; elsewhere the first 3 are free and Pro is $20/month. Don't invent features, numbers, users or results.
2. Facts about scholarships, deadlines, fees and visas are checked the same day against the official source (the
   scholarship's or university's own site). If a post states a deadline or amount, it names the source. If you can't verify
   it, leave it out.
3. No testimonials, success stories or "I got in" voices unless a real user sent them and agreed. No made-up students.
4. Never promise admission, a scholarship or a visa. Say what the agents do; the applicant reviews and signs everything.
5. Don't name the founder and don't say where Ivyward is built.
6. Speak to the group: its scholarship, country, level and the questions people there actually ask. Plain, warm, specific,
   no hype, no emoji walls, at most 3 hashtags (often none). British/Nigerian English spelling is fine.
7. Most posts teach something useful on their own. Mention Ivyward in one line at the end (what it does + tryivyward.com).
   In groups whose rules ban promotion, either post pure help with no link, or don't post there.
8. Comments and replies answer the person's actual question first, correctly and briefly. Mention Ivyward in at most
   1 reply in 3, and only where it genuinely helps that person. Never reply to the same thread twice in a day.
9. Never send private messages, tag strangers, ask for personal details, or comment on posts about minors.
10. Don't copy other people's content. A quote is one short line with credit.

## Stop signals

If Facebook shows any of these, stop all actions at once, write a `runs` entry saying exactly what appeared, and send the
user a message: "temporarily blocked", "You can't use this feature", "We limit how often", a checkpoint or identity
check, a CAPTCHA, a post removed for going against standards, or the Page/profile switched unexpectedly.
Never work around a block, CAPTCHA or checkpoint.

## Browsers and files

- **Chrome (the Claude in Chrome extension)** is signed in to Facebook as the Ivyward Page and is the browser for posting,
  because its `file_upload` tool can attach videos. Load the `chrome-browser` skill first. Open your own tab; close it at the end.
- **Videos must sit in a folder Samson connected to the session** (Chrome can only attach files from there). Copy each video
  to `<connected folder>/Ivyward videos/` with `device_commit_files` (stagedPath under `/mnt/user-data/outputs/`). If no
  folder is connected (`get_device_info` → `connectedFolders` empty), post nothing that needs a video: mark those items
  `failed` with note "No connected folder for videos", and say so in the run log.
- The built-in browser pane is also signed in to Facebook; use it for reading, searching and joining if Chrome isn't connected.
- Check who you are acting as before the first action (top-right avatar should be the Ivyward mark). If it's Samson's
  profile, switch to Ivyward (avatar menu → Ivyward) before doing anything.

## The review page's data (ArtifactData collections)

`items/<id>`: one post, comment or reply. id = `<day>-<kind>-<n>`, e.g. `2026-11-12-group_post-3`.

```json
{
  "day": "2026-11-12",            // Lagos date it posts
  "slot": "12:00",                // "12:00" or "18:00"
  "order": 1,
  "kind": "page_post",            // page_post | group_post | comment | reply
  "target": { "name": "Chevening Applicants 2027-2028", "url": "https://www.facebook.com/groups/…", "members": 215000 },
  "context": { "url": "https://www.facebook.com/groups/…/posts/…", "excerpt": "Their question, ≤200 chars" },  // comments/replies only
  "why": "One line: why this group and this angle",
  "text": "The draft",
  "edited": null,                 // Samson's edit, if any (post this instead of text)
  "video": { "assetId": "…", "url": "…", "title": "…", "file": "2026-11-12-group_post-3.mp4", "format": "explainer" },
  "sources": ["https://www.chevening.org/…"],
  "status": "draft",              // draft | approved | skipped | posted | failed
  "result": { "url": "…", "at": "ISO time", "note": "…" }
}
```

`groups/<group id or slug, lowercase>`: `{ name, url, members, kind: "group"|"page", joined, rules, lastPost, notes }`.
`rules` is one of "Promotion allowed", "Help only, no links", "No posts from Pages", "Not checked".

`runs/<ISO time>-<kind>`: `{ at, kind: "draft"|"post"|"setup", summary }` — 2–4 plain sentences with counts.

Always read before you write and pass `if_version` (the tool explains). Never overwrite Samson's `status` or `edited`.

## Morning run, step by step (7am)

1. Read `groups`, the last 7 days of `items` and the last few `runs`. Note which groups had a post in the last 7 days.
2. **Join ≥10** groups or pages as the Ivyward Page, a minute apart (`sleep 60` with Bash in the background between joins,
   or `computer` waits). Search Facebook groups for: scholarships (fully funded, country-specific: UK, Canada, USA,
   Germany, Netherlands, Australia, Ireland), named scholarships (Chevening, Commonwealth, DAAD, Erasmus Mundus, Fulbright,
   MasterCard Foundation, Gates Cambridge, Rhodes, Stipendium Hungaricum, MEXT, CSC), study abroad, master's/MBA/PhD
   admissions and funding, GRE/IELTS prep, and African/Nigerian/Ghanaian/Kenyan students abroad. Prefer public groups with
   10K+ members and 10+ posts a day. Skip groups that ask for a phone number, email or personal details. For groups with
   join questions, answer: "Ivyward helps students apply to universities and find scholarships and fee waivers. We'll share
   useful admissions and funding information and follow the group rules." and agree to the rules. Record each in `groups`.
3. **Check rules** of the groups you'll post in today (group → About/Rules). Record `rules`. Skip "No posts from Pages".
4. **Pick today's targets:** 5 groups with no post in 7 days, largest and most active first, mixing scholarship types and
   countries. Plus the 2 Page posts.
5. **Research** each angle on official sources (WebSearch/WebFetch). Good angles: an open scholarship with its real
   deadline and eligibility; how to get application fees waived; what a portal asks for; a document checklist; how
   funding offers and reconsideration work; GRE-optional or IELTS-waiver lists, each from official pages. Keep the source URLs.
6. **Write** each post for its audience: a hook line, 3–6 short useful lines, the source, then one line on Ivyward. 120–220 words.
7. **Make a video for each post** (see "Videos"). Upload each to the review page as an asset, and copy it to the connected folder.
8. **Find 15–20 threads to answer:** recent questions (last 24h) in joined groups that you can answer accurately. Draft a reply
   for each (40–120 words), with the excerpt and post URL in `context`.
9. Write all items as `draft` with a batch write, then a `runs` entry ("Joined 11 groups; drafted 2 Page posts, 5 group
   posts with videos and 18 replies for review."). Send the user one short message: how many are waiting and the review link.

## Posting runs, step by step (12pm, 6pm)

1. Read `items` for today (and yesterday, for anything approved late) with `status: "approved"` and `slot` ≤ now.
   Nothing approved: write a short `runs` entry and stop.
2. In Chrome as the Ivyward Page, for each item in `order`:
   - **page_post:** facebook.com/tryivyward → "Photo/video" → `file_upload` the mp4 → paste the text (`edited` if set,
     else `text`) → Post.
   - **group_post:** open the group → "Write something…" → attach the video with `file_upload` → text → Post. If the group
     holds posts for admin approval, record `result.note: "Waiting for group admin approval"` and still mark `posted`.
   - **comment / reply:** open `context.url` → reply to that comment/post → text → submit.
   - Wait 60–120 seconds between actions.
3. After each, read back the post's URL (open it from the Page's or group's feed) and update the item: `status: "posted"`,
   `result: {url, at}`. Update the group's `lastPost`. On any failure: `status: "failed"`, `result.note` saying what happened.
4. Write a `runs` entry with counts and any failures. Message the user only if something failed or a stop signal appeared.

## Videos

Renderer: `node marketing/video/render.mjs spec.json out.mp4 --stills dir` (1080×1350, about 2 minutes to render 35s).
Look at the stills before using a video. Specs are JSON scene lists; see the header of `render.mjs` for scene kinds.

- **Animated explainer** (default for group posts): `hook` → 2–4 `point`/`list`/`stat` scenes → `cta`. 25–40s.
- **Animated tip cards** (good for checklists): `hook` → 3–6 `card` scenes with `step: "Tip 2 of 5"` → `cta`.
- **Ivyward screen recording**: real product walkthroughs need a demo account with sample data; until Samson provides one,
  use explainers and tip cards. Never record a real applicant's data.
- The video repeats the post's key point in a few words per scene; it must stand alone with the sound off.
- `stat` scenes only show real, sourced numbers. A `step` label only when the scenes really are a sequence.
- Name files `<item id>.mp4`. Keep each under 10 MB (Chrome's upload limit); the renderer's output is ~1–3 MB.
