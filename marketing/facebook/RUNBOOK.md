# Ivyward on Facebook and LinkedIn: the daily runbook

**From 21 Nov 2026 the runs are split between the cloud and Samson's laptop.** Read "Who does what" first; it
overrides the older sections below wherever they differ. Each run starts fresh, so
everything it needs is here or in the review page.

- **Review page (the source of truth):** https://claude.ai/artifact/7cxMZ7UyB8BwXAguNYhqba ("Ivyward Social Desk").
  Read and write it with the `ArtifactData` tool (collections below).
- **Facebook page:** https://www.facebook.com/tryivyward. **LinkedIn page:** https://www.linkedin.com/company/ivyward/
  (organization id 147011114). Everything goes out *as Ivyward*, never as Samson's profile.
- **Times are Lagos time (Africa/Lagos, UTC+1).**

## Who does what (from 21 Nov 2026)

Samson: whatever can run in the cloud runs there; whatever needs a browser signed in on his laptop runs on the laptop
(those runs only work while the laptop is on and the Claude app is open, and fire late otherwise).

| Run (scheduled task) | Where | When (Lagos) | Does |
|---|---|---|---|
| Ivyward social: daily drafts (cloud) | cloud | 06:17 | drafts 2 LinkedIn posts (10:00, 16:00) and 2 Facebook Page posts (12:00, 18:00), text with a guide link, as `draft` items |
| Ivyward social: posting (cloud) | cloud | 10:09, 12:09, 16:09, 18:09 | posts today's **approved** `linkedin_post` items, and `page_post` items **without a video**, through the API |
| Ivyward social: laptop drafts (groups, replies, videos) | laptop | 06:33 | joins groups; drafts group posts, replies and videos ("Morning run, step by step"). Page posts already drafted by the cloud run count toward the day's 2 |
| Ivyward social: laptop posting (groups, replies, video posts) | laptop | every 2 hours, 08:05–20:05 | posts approved `group_post`, `comment` and `reply` items, and `page_post` items **with a video**, in Chrome |

**The split rule, so nothing is posted twice:**
- The **laptop** runs never post `linkedin_post` items, and never post a `page_post` that has no video. Those are the
  cloud's. Leave them exactly as they are.
- The **cloud** run never posts `group_post`, `comment` or `reply` items, or a `page_post` that has a video (Facebook's API
  can't post in groups, and the videos aren't at a public address the API can fetch). It leaves those `approved` for
  the laptop run.

### How the cloud run posts

- **Through the Composio connector**, using Samson's own LinkedIn and Facebook connections (he connects them once; if
  one is missing or expired, the run posts nothing on that network, writes a `runs` entry and messages him once).
  LinkedIn: `LINKEDIN_CREATE_LINKED_IN_POST` with `author: "urn:li:organization:147011114"`. Facebook:
  `FACEBOOK_CREATE_POST` with `page_id: "338109873010273"` (the Ivyward Page; the same connection also manages
  Samson's other Pages, such as Flolyt and Skhooly: never post to them), `message` and,
  when the post is about a guide, `link` (Facebook shows the guide's share card). Neither tool is idempotent: never
  retry a post that may have gone out; check the page's recent posts first (`FACEBOOK_GET_PAGE_POSTS`,
  `LINKEDIN_GET_POST_CONTENT`).
- Approval is unchanged: nothing goes out unless Samson set it to `approved` on the review page.

---

The sections below describe the laptop runs. The brand and honesty rules, the stop signals, the data format and
"Writing LinkedIn posts" apply to every run.

## What each run does

| Run | Does | Never does |
|---|---|---|
| Morning (7am) | joins ≥10 new groups/pages; drafts the day's posts, videos, comments and replies into the review page | posts, comments or replies anything |
| Every 2 hours, 8am–8pm | posts the items Samson **approved** whose slot has come (this slot and any earlier one today still waiting); records links | posts anything still a draft, skipped, or edited after approval without saving |

Approval is the rule that matters. Every post, comment and reply is written by Claude and goes out publicly as Ivyward,
so it goes out only after Samson approves it on the review page (`status: "approved"`). Joining a group or following a
page needs no approval (he asked for ≥10 a day).

## Daily volume (Samson, 12 Nov: at least 5 groups or pages every 2 hours)

- **Slots:** `08:00`, `10:00`, `12:00`, `14:00`, `16:00`, `18:00`, `20:00`.
- **Group posts:** at least 5 per slot (35 a day), each to a different group, each with a video. One group gets at most
  one post every 3 days, and each post is written for that group (its country, scholarship or audience), never the same
  text twice. When fewer than 5 groups are eligible for a slot, draft what's eligible and say so in the run log: never
  break the 3-day rule to reach the number (repeat posting is what gets Pages restricted).
- **Page posts:** 2 a day on the Ivyward Page (slots `12:00` and `18:00`), each with a video.
- **Videos:** a post's video can be shared with other posts on the same topic (the text is what's written per group).
  Make 5–8 new videos a day across topics; reuse them across groups.
- **Comments and replies:** 15–20 a day, spread over the slots. Text only.
- **Joins:** at least 20 new groups or pages a day, about a minute apart (35 posts a day at one post per group every
  3 days needs well over 100 groups).

## Brand and honesty rules (apply to every word)

1. Facts about Ivyward come only from `src/lib/site.ts` (`FACTS`). Don't invent features, numbers, users or results.
   **Never mention price in any post, comment, reply or video**: no amounts, no currencies, no plans or packs.
   "Start for free at tryivyward.com" is fine. If someone asks what it costs, point them to tryivyward.com.
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

- **Chrome (the Claude in Chrome extension)** is signed in to Facebook as the Ivyward Page and is the browser for posting.
  Load the `chrome-browser` skill first. Open your own tab; close it at the end.
- **Attaching videos** (tested 15 Nov 2026): Chrome's `file_upload` only accepts files under `/mnt/user-data/uploads/` in
  the run's own container. Paths on the Mac (the connected folder) and `/mnt/user-data/outputs/` are refused with "only
  files this session is allowed to read can be uploaded". So, before each video post:
  1. Put the mp4 under `/mnt/user-data/uploads/ivyward-video/` (create the folder). Either fetch it from the review page
     (`Artifact` read with `url` = the review page and `path` = the item's `video.assetId`, then `cp` the saved file
     there), or, when the Mac is connected, stage it from the connected folder with `device_stage_files`
     (`/Users/sam/Documents/ivyward video/<file>`; it lands in `/mnt/user-data/uploads/ivyward video/<file>`).
  2. Open the composer first (Page: "Photo/video"; group: "Write something…", then "Photo/video"), so the "Create post"
     dialog is open. Find the file input *inside that dialog* and give it to `file_upload` with the `/mnt/user-data/uploads/…`
     path. Never use the "Attach a photo or video" inputs under existing posts: those are comment boxes.
  3. Wait until the dialog shows the video preview, then add the text and post.
  4. If `file_upload` still refuses the file, leave the item `approved` with `result.note: "Waiting: video attach"`,
     post the text-only items, and tell the user once. Never post a video item without its video.
  The GitHub workflow "Post video to Facebook Page" (`facebook-video.yml`) is the fallback for Page posts only, when a
  `FB_PAGE_TOKEN` secret exists; it isn't needed for normal runs.
- The built-in browser pane is also signed in to Facebook; use it for reading, searching and joining if Chrome isn't connected.
- Check who you are acting as before the first action (top-right avatar should be the Ivyward mark). If it's Samson's
  profile, switch to Ivyward (avatar menu → Ivyward) before doing anything.

## The review page's data (ArtifactData collections)

`items/<id>`: one post, comment or reply. id = `<day>-<kind>-<n>`, e.g. `2026-11-12-group_post-3`.

```json
{
  "day": "2026-11-12",            // Lagos date it posts
  "slot": "12:00",                // "08:00" "10:00" "12:00" "14:00" "16:00" "18:00" or "20:00"
  "order": 1,
  "kind": "page_post",            // page_post | group_post | comment | reply | linkedin_post
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
   Items for today may already exist (drafted the evening before): count them and draft only what's missing to reach
   today's targets. Never redo or overwrite an item that exists.
2. **Join ≥20** groups or pages as the Ivyward Page, a minute apart (`sleep 60` with Bash in the background between joins,
   or `computer` waits). Search Facebook groups for: scholarships (fully funded, country-specific: UK, Canada, USA,
   Germany, Netherlands, Australia, Ireland), named scholarships (Chevening, Commonwealth, DAAD, Erasmus Mundus, Fulbright,
   MasterCard Foundation, Gates Cambridge, Rhodes, Stipendium Hungaricum, MEXT, CSC), study abroad, master's/MBA/PhD
   admissions and funding, GRE/IELTS prep, and African/Nigerian/Ghanaian/Kenyan students abroad. Prefer public groups with
   10K+ members and 10+ posts a day. Skip groups that ask for a phone number, email or personal details. For groups with
   join questions, answer: "Ivyward helps students apply to universities and find scholarships and fee waivers. We'll share
   useful admissions and funding information and follow the group rules." and agree to the rules. Record each in `groups`.
3. **Check rules** of the groups you'll post in today (group → About/Rules). Record `rules`. Skip "No posts from Pages".
4. **Pick today's targets:** for each of the 7 slots, 5 groups with no post in the last 3 days (35 in all, no group
   twice in a day), largest and most active first, mixing scholarship types and countries. Plus the 2 Page posts.
   Fewer eligible groups than that: plan what's eligible and say so.
5. **Research** each angle on official sources (WebSearch/WebFetch). Good angles: an open scholarship with its real
   deadline and eligibility; how to get application fees waived; what a portal asks for; a document checklist; how
   funding offers and reconsideration work; GRE-optional or IELTS-waiver lists, each from official pages. Keep the source URLs.
6. **Write** each post for its audience: a hook line, 3–6 short useful lines, the source, then one line on Ivyward. 120–220 words.
7. **Make 5–8 videos for the day's topics** and give each post the one that fits (see "Videos"). Upload each to the review page as an asset, and copy it to the connected folder.
8. **Find 15–20 threads to answer:** recent questions (last 24h) in joined groups that you can answer accurately. Draft a reply
   for each (40–120 words), with the excerpt and post URL in `context`.
9. Write all items as `draft` with a batch write, then a `runs` entry ("Joined 11 groups; drafted 2 Page posts, 5 group
   posts with videos and 18 replies for review."). Send the user one short message: how many are waiting and the review link.

## Posting runs, step by step (every 2 hours, 8am–8pm)

1. This run's slot is the even hour it runs in (a run at 10:05 is the `10:00` slot). Read `items` for today with
   `status: "approved"` and a slot at or before this one, not yet posted (earlier slots' items approved late go now).
   Nothing approved: write a short `runs` entry and stop.
   **Skip `linkedin_post` items and `page_post` items without a video: the cloud run posts those** (see "Who does what").
2. In Chrome as the Ivyward Page, for each item in `order`:
   - **page_post:** facebook.com/tryivyward → "Photo/video" → attach the mp4 as in "Attaching videos" → paste the text
     (`edited` if set, else `text`) → Post.
   - **group_post:** open the group → "Write something…" → attach the video as in "Attaching videos" → text → Post. If the
     group holds posts for admin approval, record `result.note: "Waiting for group admin approval"` and still mark `posted`.
   - **comment / reply:** open `context.url` → reply to that comment/post → text → submit.
   - Wait 60–120 seconds between actions.
3. After each, read back the post's URL (open it from the Page's or group's feed) and update the item: `status: "posted"`,
   `result: {url, at}`. Update the group's `lastPost`. On any failure: `status: "failed"`, `result.note` saying what happened.
4. Write a `runs` entry with counts and any failures. Message the user only if something failed or a stop signal appeared.

## Videos

**The standard (Samson approved it, Nov 2026): every Ivyward video looks and sounds like the ads in
`marketing/video/ads/` and the social videos from `marketing/video/raea/`.** Hold every new video to it:
- Look: light paper ground, the campus ink drawing at the foot, oxblood (#9b2c4e) accents and logo tile, Frank Ruhl
  Libre headlines over Roboto Flex, the thin progress bar at the top, "Ivyward" top-left, the tryivyward.com tag.
  Calm and editorial: words rise in as they're spoken, cards slide in, a slow push-in. Never dark, busy or chaotic.
- Voice: Kokoro `af_heart` (the default) at speed 1.0. Never another voice, never sped up.
- Sound: raea's Tone.js score (soft pad, plucked arpeggio, round bass; a light beat is fine for ads), ducked under the
  voice, small effects in key (ticks, chimes), mastered to -14 LUFS by raea. Never the numpy-synth music or harsh
  effects (buzzes, noise bursts).
- Ads and anything with product screens: `node marketing/video/ads/make-ad.mjs ad.json out.mp4 --size WxH` (an HTML
  page per ad, sound from `ads/sound.tsx`). Social posts: the raea renderer below.

**Renderer: raea** (Samson's choice). Once per run: `bash marketing/video/raea/install.sh && export PATH=$HOME/.local/bin:$PATH`
(installs raea from its GitHub release, checksum-verified), and `pip install --break-system-packages kokoro-onnx soundfile scipy`
if `python3 -c "import kokoro_onnx"` fails. Then per video:

    node marketing/video/raea/make.mjs spec.json out.mp4 --stills dir

1080×1350, Kokoro voiceover, original Tone.js music ducked under the voice, mastered to -14 LUFS, AAC sound; about
1–2 minutes per 35s video. Then `raea check out.mp4 --shape 4:5` and fix every error and warn (a "frozen" warn means a
scene holds too long with nothing moving: shorten its text or split it). Look at the stills before using a video.
Specs are JSON scene lists; scene kinds are in the header of `marketing/video/render.mjs`. If raea won't install or
render, fall back to `node marketing/video/render.mjs spec.json out.mp4 --stills dir` (same specs, also with sound)
and say so in the run log.

- **Animated explainer** (default for group posts): `hook` → 2–4 `point`/`list`/`stat` scenes → `cta`. 25–40s.
- **Animated tip cards** (good for checklists): `hook` → 3–6 `card` scenes with `step: "Tip 2 of 5"` → `cta`.
- **Ivyward screen recording**: real product walkthroughs need a demo account with sample data; until Samson provides one,
  use explainers and tip cards. Never record a real applicant's data.
- **Every video has sound: a voiceover and background music.** Give every scene a `say` line (what the voice says over
  it, 1–3 short sentences, written how it should sound: "M I T", "U K", "C V", "twenty twenty-seven"). The renderer
  stretches scenes to fit the voice and adds original music made for each video (`audio.py`); never post a silent video.
  The voice model downloads once from GitHub on first use (~350 MB, into ~/.cache/ivyward-tts).
- On screen, each scene repeats the key point in a few words, so the video also works with the sound off.
- `stat` scenes only show real, sourced numbers. A `step` label only when the scenes really are a sequence.
- Name files `<item id>.mp4`. Keep each under 10 MB (Chrome's upload limit); the renderer's output is ~1–3 MB.

## LinkedIn (company page)

Samson asked for **2 posts a day on the Ivyward LinkedIn page** (21 Nov 2026). They go through the same review page
and the same approval rule: a LinkedIn post goes out only when its item is `approved`.

- **Page:** https://www.linkedin.com/company/ivyward/ (admin view: https://www.linkedin.com/company/147011114/admin/).
  Every post is made from the admin view, so it posts *as Ivyward*. Never post, comment, react or message from Samson's
  personal profile, and never send connection requests or DMs.
- **Items:** `kind: "linkedin_post"`, ids `<day>-linkedin_post-1` and `-2`, slots `10:00` and `16:00`,
  `target: { "name": "Ivyward on LinkedIn", "url": "https://www.linkedin.com/company/ivyward/" }`, `video: null`.
- **Runs:** see "Who does what" at the top. The laptop runs leave `linkedin_post` items alone.

### Writing LinkedIn posts

The brand and honesty rules above apply word for word (no Ivyward prices, sourced facts only, no testimonials, never
promise admission, don't name the founder). On top of them:

1. **Audience:** graduates and professionals planning a master's, MBA or PhD abroad, and people who advise them. Plain,
   professional, specific. No emoji, at most 3 hashtags at the end, no "🚀" hype or engagement bait ("Comment YES").
2. **Shape:** a first line that states the useful fact (it's all that shows before "…see more"); 3–8 short lines or
   bullets; the official source by name and domain; a link to the matching guide on tryivyward.com when one exists
   (`src/content/guides/`); then one line on Ivyward ending "Start free at tryivyward.com". 120–250 words.
3. **Topics:** open deadlines in the next 4–8 weeks (check the guides and the scholarship deadline data), how a scheme
   actually selects, what work experience a scheme asks for, application timelines after submitting, fee waivers,
   intakes, document checklists. Two different topics a day; don't repeat a topic within 7 days (read the last 7 days
   of `linkedin_post` items first).
4. **Facts:** every date, amount and rule is checked that morning on the official page (WebFetch), and the URL goes in
   `sources`. If you can't verify it, leave it out.
5. **Video:** none needed. Text posts only, unless Samson adds a video to an item.

### Drafts (now part of "daily drafts (cloud)", 06:17 Lagos)

1. Read the last 7 days of `linkedin_post` items. If today's two items already exist, stop (write nothing).
2. Draft the missing ones as above with `status: "draft"`, `why` (one line: why this topic today) and `sources`.
3. Write a `runs` entry (`kind: "draft"`, "LinkedIn: drafted 2 posts for 10:00 and 16:00 …") and send Samson one short
   message: the two first lines and the review page link.

### Posting run in Chrome (laptop, paused since 21 Nov; the cloud run posts through the API)

1. Read today's `linkedin_post` items with `status: "approved"` and a slot at or before this run's slot (10:00 or
   16:00), not yet posted. None: write a short `runs` entry and stop.
2. In Chrome (load the `chrome-browser` skill first; open your own tab): go to the admin view above, check the page
   name at the top is Ivyward, click "Create" / "Start a post", paste the text (`edited` if set, else `text`) exactly,
   and click "Post". One item at a time, 60–120 seconds apart.
3. Open the page's Posts tab (https://www.linkedin.com/company/ivyward/posts/), open the new post and record its URL:
   `status: "posted"`, `result: { url, at }`. On any failure: `status: "failed"`, `result.note` saying what happened.
4. **Stop signals:** a security check or CAPTCHA, "You've reached the weekly/daily limit", a restriction notice, or the
   composer posting as Samson instead of Ivyward. Stop at once, don't work around it, write a `runs` entry saying exactly
   what appeared, and message Samson.
5. Write a `runs` entry (`kind: "post"`, "LinkedIn 10:00: posted 1, failed 0"). Message Samson only on a failure or a
   stop signal.
