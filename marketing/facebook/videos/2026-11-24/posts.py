import json
V = {
 "esop": ("4e95447a45a155d8bc536729e3bbfbc0", "Explainer: ETH Zurich master's and ESOP close 30 November", "2026-11-24-eth-esop.mp4", "explainer"),
 "clar": ("b2e8ab50ceffff92de162443c5312297", "Explainer: Oxford's Clarendon has no application form", "2026-11-24-oxford-clarendon.mp4", "explainer"),
 "nl": ("8288f085f595ed13a3150011f376fe8f", "Explainer: the NL Scholarship for non-EEA students", "2026-11-24-nl-scholarship.mp4", "explainer"),
 "sh": ("8db0bd1399b2d3941f193a53fcbab2c6", "Explainer: Stipendium Hungaricum's two selection points", "2026-11-24-stipendium-partner.mp4", "explainer"),
 "age": ("763999a1849171c58027d5a71cbade43", "Explainer: scholarship age limits, Chevening vs Türkiye Bursları", "2026-11-24-age-limits.mp4", "explainer"),
 "ref": ("dfe2b4250db92c2bf1bd2aece550638a", "Tip cards: 5 tips for reference letters", "2026-11-24-referees.mp4", "tip cards"),
 "sop": ("d7fe35711003c82d77147040ee992d51", "Tip cards: 4 checks before you submit your statement", "2026-11-24-sop-checks.mp4", "tip cards"),
}
SRC = {
 "esop": ["https://ethz.ch/en/studies/registration-application/master/application/how-to-apply/application-schedule.html"],
 "clar": ["https://www.ox.ac.uk/admissions/graduate/fees-and-funding/funding/clarendon/applicants"],
 "nl": ["https://studyinnl.org/finances/nl-scholarship"],
 "sh": ["https://stipendiumhungaricum.hu/news/application-is-on-for-the-2026-2027-stipendium-hungaricum-scholarship/",
        "https://stipendiumhungaricum.hu/wp-content/uploads/2025/10/BA_MA_OTM_Call_for_Applications_2026_27.pdf"],
 "age": ["https://www.chevening.org/scholarships/who-can-apply/eligibility/", "https://www.chevening.org/faqs/page/14/?field_category=786", "https://turkiyeburslari.gov.tr/bursprogramlari"],
 "ref": [], "sop": [],
}
P = []  # (slot, group_key, name, url, members, topic, why, text, helponly)
def add(slot, key, name, url, members, topic, why, text, help_only=False):
    P.append(dict(slot=slot, key=key, name=name, url=url, members=members, topic=topic, why=why, text=text.strip(), help=help_only))

IVY = [
 "Ivyward's AI agents shortlist programmes that fit you, draft from your own documents and fill in each portal. You review and sign everything. Start for free at tryivyward.com",
 "If you're applying this cycle, Ivyward's AI agents can build your shortlist, fill in each portal and ask for fee waivers first. Nothing is submitted without your signature. Start for free at tryivyward.com",
 "Ivyward's AI agents prepare and submit university applications for you, from shortlist to portal. You read, edit and sign every packet. Start for free at tryivyward.com",
 "Ivyward helps with the paperwork side: its AI agents shortlist realistic programmes, draft from your own profile and fill in the portals, and you sign off on everything. Start for free at tryivyward.com",
]
def ivy(i): return IVY[i % len(IVY)]

# ---------- 08:00
add("08:00","1655496357954044","Scholarship Opportunities","https://www.facebook.com/groups/1655496357954044",995000,"esop",
"Biggest scholarship group (995K); ETH Zurich's only master's window for international applicants closes in 6 days, so this is the most time-sensitive topic today.",
f"""ETH Zurich master's for autumn 2027: if your bachelor's is not from a Swiss university, you have until 30 November.

From ETH Zurich's application schedule (ethz.ch):
• International bachelor's holders apply between 1 and 30 November 2026. There is no second window for you: the April window is only for Swiss bachelor's degrees.
• Want the Excellence Scholarship & Opportunity Programme (ESOP)? You must apply in this same November window.
• Deadline: Monday 30 November 2026, 11:59 AM Central European Time (that's 11:59 in Lagos too).
• Late or incomplete applications can't be processed.

If you're aiming for ETH, today's step is simple: open the programme page, check its documents list, and ask your referees now, not next week.

Source: ethz.ch, master's application dates (Autumn Semester 2027)

{ivy(0)}""")

add("08:00","397982842442961","USA, Canada Scholarships & Fellowships","https://www.facebook.com/groups/397982842442961",757000,"ref",
"757K members applying to US and Canadian programmes, where December deadlines all need recommendation letters; practical tips, no dated facts needed.",
f"""Applying to US or Canadian grad programmes with December or January deadlines? Your referees are now the slowest part of your application.

Five things that save a lot of stress:
1. Ask at least a month before your earliest deadline. Lecturers and managers get many requests at the same time.
2. Pick people who know your work well. A detailed letter usually helps more than a famous name.
3. Send each referee a one-page brief: the programmes, the deadlines, your CV, and two or three things you'd like them to mention.
4. Type their email carefully. Most portals send the upload link straight to the address you enter, and a typo means they never get it.
5. A week before each deadline, check the portal shows the letter as received, and send a kind reminder if not.

One more: some portals let you send the request before you submit the rest of the application. Do that early.

{ivy(1)}""")

add("08:00","studyabroadscholarshipsforafrica","Fully Funded Study Abroad Scholarships for Developing Countries 2026/2027","https://www.facebook.com/groups/StudyAbroadScholarshipsForAfrica",239000,"sh",
"Developing-country audience (239K); Stipendium Hungaricum's Sending Partner nomination is the step African applicants most often miss, and people prepare for the next call now.",
f"""Stipendium Hungaricum (Hungary) has two selection points, and many applicants only prepare for one.

From the official 2026/27 call (the 2027/28 call isn't published yet):
• Step 1: your country's Sending Partner must nominate you. Without that nomination, your application isn't considered.
• Step 2: the Hungarian university runs its own admission, often an entrance exam or an interview.
• You could apply for up to two study programmes, in order of preference.
• Nigeria, Ghana, Kenya, Pakistan and India were all on the 2026/27 partner list.
• It covered tuition, a monthly stipend, a dormitory place or housing support, and medical insurance. The call itself says it doesn't cover all living costs.

So before the new call opens: find out who your country's Sending Partner is and what it asks for, and get your transcripts and passport ready.

Source: stipendiumhungaricum.hu (2026/27 Call for Applications)

{ivy(2)}""")

add("08:00","2992953417400836","Scholarships","https://www.facebook.com/groups/2992953417400836",1200000,"esop",
"1.2M members, ~158 posts a day; rules ban promotion and links, so this is pure help: no Ivyward line, no link, no video.",
"""Reminder for anyone planning a master's at ETH Zurich (Switzerland) for autumn 2027:

If your bachelor's degree is not from a Swiss university, the only application window is 1–30 November 2026. The deadline is Monday 30 November, 11:59 AM Central European Time.

Two things people miss:
• If you want ETH's Excellence Scholarship & Opportunity Programme (ESOP), you must also apply in this November window.
• The April window is only for Swiss bachelor's holders, so there is no second chance this cycle.

ETH also says late or incomplete applications can't be processed, so check your programme's document list today and give your referees time.

Source: ETH Zurich's official master's application dates page (ethz.ch).""", True)

add("08:00","1479015746431203","Fully Funded Scholarship in UK","https://www.facebook.com/groups/1479015746431203",209000,"clar",
"UK scholarship group (209K); Oxford's December and January course deadlines are close, and many people don't know Clarendon needs no separate form.",
f"""Want a fully funded master's or DPhil at Oxford? The Clarendon Scholarship has no application form, so the only thing you can miss is your course deadline.

From Oxford's Clarendon page (ox.ac.uk):
• "There are no separate scholarship application forms." Every applicant to a degree-bearing graduate course is considered.
• You must apply to your course by its December or January funding deadline. Check the exact date on your course page.
• Clarendon covers course fees in full, plus a living grant for full-time scholars.
• There are no restrictions by nationality or country of residence.
• Most offers go out by the end of April. If you haven't heard by mid-June, Oxford says to assume you weren't awarded.

So the useful step today: find your course's funding deadline and plan backwards. References and transcripts take longest.

Source: ox.ac.uk/clarendon, information for applicants

{ivy(3)}""")

# ---------- 10:00
add("10:00","scholarshipscanadauniversities","Scholarships In Canada 2026-2027","https://www.facebook.com/groups/scholarshipscanadauniversities/",327000,"sop",
"327K members preparing Canadian applications due in the coming weeks; a pre-submission checklist for the statement of purpose is useful to everyone.",
f"""Before you hit submit on a Canadian grad application, read your statement of purpose one more time with these four checks.

1. Did you answer this programme's prompt? Many Canadian programmes ask for a specific structure, research interests or a named supervisor. A general essay often misses that.
2. Is the right university named everywhere? Copy-paste mistakes ("I'm excited to join McGill" in a UBC application) are very common.
3. Can you back up every claim? If you say you led a project, your CV or a referee should support it.
4. Are you within the word or page limit? Portals often cut off or reject anything longer.

Bonus: read it aloud. If a sentence makes you stop for breath twice, split it.

These four take ten minutes and catch most of the mistakes admissions readers notice first.

{ivy(0)}""")

add("10:00","695422329114247","Study Abroad - Free information","https://www.facebook.com/groups/695422329114247",234000,"nl",
"General study-abroad audience (234K); the NL Scholarship for 2027-28 is open now and is a realistic top-up many non-EEA students overlook.",
f"""Thinking about the Netherlands for 2027? The NL Scholarship (formerly the Holland Scholarship) is open for the 2027-28 year.

What the official Study in NL page says:
• It's €5,000, paid in your first year. It is not a full-tuition scholarship.
• It's for non-EEA nationals starting a full-time bachelor's or master's at a participating Dutch university.
• You can't already have a degree from a Dutch institution.
• You apply through the university, not through a central form, and each university sets its own deadlines.

So it works best as a top-up alongside other funding. Pick your programme first, then open that university's NL Scholarship page and note its deadline, which is often earlier than the admission deadline.

Source: studyinnl.org, NL Scholarship

{ivy(1)}""")

add("10:00","opcorners","Scholarships in 2026 (Scholarship Network)","https://www.facebook.com/groups/opcorners/",200000,"esop",
"Large general scholarship network (200K); ETH's November-only window for international applicants closes on 30 November.",
f"""Six days left: ETH Zurich's master's applications for autumn 2027 close on Monday 30 November for anyone with a non-Swiss bachelor's.

Why this matters if you're aiming for Switzerland:
• ETH has two master's windows, but the April one is only for Swiss bachelor's holders. International applicants get 1–30 November only.
• The Excellence Scholarship & Opportunity Programme (ESOP) also uses this November window. Miss it and you miss the scholarship too.
• The deadline is 11:59 AM Central European Time, which is 11:59 AM in Lagos as well.
• ETH says late or incomplete applications can't be processed.

If you've started an application, check every required document is uploaded today. If you haven't, look at the programme requirements tonight and decide whether you can finish in time.

Source: ethz.ch, master's application dates

{ivy(2)}""")

add("10:00","freestudyincanada","Study in Canada - International Students - Free Scholarships & Support","https://www.facebook.com/groups/freestudyincanada/",180000,"ref",
"Joined today; 180K members applying to Canada, no group rules listed; reference letters are the bottleneck before December deadlines.",
f"""Applying to Canada for September 2027? Most graduate programmes need two or three reference letters, and they're the part you can't rush at the end.

A simple plan that works:
• Ask your referees now, at least a month before your earliest deadline.
• Choose people who know your work. A lecturer who supervised your project usually writes a stronger letter than a head of department who barely knows you.
• Send them one page: programme names, deadlines, your CV, and a few points you'd like them to mention.
• Double-check their email address in each portal. The upload link goes to whatever you type.
• One week before the deadline, check the portal says "received". If not, send a polite reminder.

Tip: many Canadian portals let you send reference requests before you submit the rest. Start that first.

{ivy(3)}""")

add("10:00","701349733975321","Student Scholarships And Side Hustles.","https://www.facebook.com/groups/701349733975321",361000,"ref",
"Joined today (361K); rules say 'No Promotions or Spam', so this is pure help: no Ivyward line, link or video.",
"""If you're applying for scholarships or a master's this season, here's the thing most people leave too late: reference letters.

Five simple tips:
1. Ask at least a month before the deadline. Lecturers get many requests at once.
2. Choose someone who knows your work well. A detailed letter beats a famous name.
3. Give them a one-page summary: what you're applying for, the deadline, your CV, and what you'd like them to mention.
4. Check their email address carefully in the application portal. The upload link goes to the address you type.
5. A week before the deadline, check the portal shows the letter as received, and send a kind reminder if it doesn't.

And say thank you afterwards, whatever the result. You may need them again next year.""", True)

# ---------- 12:00
add("12:00","152258580184465","Scholarship.Africa","https://www.facebook.com/groups/152258580184465",132900,"age",
"Joined 23 Nov; 133K African applicants, no rules listed; age questions come up constantly and Chevening vs Türkiye Bursları shows how different the rules are.",
f""""Am I too old for a scholarship?" Read the official rules before you give up on one, or before you spend weeks on one you can't get.

Two examples that work very differently:
• Chevening (UK): there is no upper age limit. What it asks for is at least two years (2,800 hours) of work experience. Work that was compulsory for your degree doesn't count.
• Türkiye Bursları (Turkey): bachelor's applicants must be under 21, master's under 30 and PhD under 35.

So a 34-year-old engineer can apply for Chevening, but is too old for a Türkiye Bursları master's.

Unofficial blogs often get these rules wrong, so always open the scheme's own eligibility page before you start.

Sources: chevening.org (eligibility and FAQs), turkiyeburslari.gov.tr

{ivy(0)}""")

add("12:00","872405056446431","CSC Chinese Government Scholarships Latest Updates 2026","https://www.facebook.com/groups/872405056446431/",123000,"sop",
"CSC applicants (123K) are writing study plans and personal statements now; a quick pre-submission check is useful whatever the university.",
f"""Writing your CSC study plan or personal statement? Four checks before you upload it:

1. Does it answer what this university asks for? Some want a research proposal, some a study plan, some both. Read the document list again.
2. Is the right university and supervisor named everywhere? If you're applying to several, copy-paste mistakes are easy to make.
3. Can you back up every claim? If you mention a publication, project or award, your CV and documents should show it.
4. Is it within the length the university gives? Long documents often get skimmed or rejected.

One more for CSC applicants: keep your study plan consistent with what your supervisor's acceptance letter says you'll research. Reviewers notice when they don't match.

{ivy(1)}""")

add("12:00","1525418497792248","Scholarship Updates 2026-2027","https://www.facebook.com/groups/1525418497792248",120100,"clar",
"Joined today (120K, no rules listed); Oxford's course funding deadlines are in December and January.",
f"""Oxford's Clarendon Scholarship is one of the best-known fully funded awards, and there is no application form for it.

From Oxford's official Clarendon page:
• You're considered automatically when you apply to an eligible graduate course by its December or January funding deadline.
• It covers course fees in full, and full-time scholars also get a grant for living costs.
• There are no restrictions by nationality.
• Most offers are sent by the end of April. No news by mid-June usually means no award.

The practical point: the scholarship deadline is your course deadline. Open your course page, find the exact date, and get your references and transcripts moving this week.

Source: ox.ac.uk, Clarendon information for applicants

{ivy(2)}""")

add("12:00","1703452083119114","IELTS Preparation, Tips & Tricks","https://www.facebook.com/groups/1703452083119114",386700,"ref",
"Joined 23 Nov (387K); rules ban promotion, so this is pure help for test-takers who are also applying abroad: no Ivyward line, link or video.",
"""Booking IELTS for a university application? Three checks before you pay for a test date:

1. Check the exact score your programme asks for, overall and per band. Many programmes set a minimum for writing or speaking, not just the overall score.
2. Check which test version your university or scholarship accepts. Don't assume: it's written on the programme's English-language requirements page.
3. Work back from the deadline. Results take time to arrive, and some portals want the score uploaded by the application deadline, not later.

And if you studied in English, ask the university whether it accepts a medium-of-instruction letter or other proof instead. Some do, some don't, so get the answer in writing from the admissions office.

Good luck to everyone testing this week.""", True)

add("12:00","596954190713566","Study Abroad Scholarships for International Students","https://www.facebook.com/groups/596954190713566",108000,"nl",
"International audience (108K); NL Scholarship 2027-28 is open and its university-by-university deadlines are easy to miss.",
f"""If the Netherlands is on your list, check the NL Scholarship now: the 2027-28 application period is open.

The facts from Study in NL (the official site):
• €5,000 in your first year of study. It's a partial award, not full tuition.
• For non-EEA students starting a full-time bachelor's or master's at a participating Dutch institution.
• Not for people who already hold a degree from a Dutch institution.
• Each university runs its own NL Scholarship round and sets its own deadlines.

That last point is where people slip: there's no single deadline. Note the scholarship deadline on your chosen university's page and put it in your calendar today.

Source: studyinnl.org/finances/nl-scholarship

{ivy(3)}""")

# ---------- 14:00
add("14:00","scholarshipsfullyfunded","LATEST FULLY FUNDED SCHOLARSHIPS","https://www.facebook.com/groups/scholarshipsfullyfunded",102000,"esop",
"Fully funded scholarship audience (102K), posts go live without approval; ESOP closes with ETH's 30 November master's window.",
f"""ETH Zurich's Excellence Scholarship & Opportunity Programme (ESOP) isn't a separate deadline you can come back to in January. It rides on the master's application, which closes on 30 November for international applicants.

From ETH Zurich's official application schedule:
• Non-Swiss bachelor's holders apply 1–30 November 2026 for the autumn 2027 intake.
• If you want ESOP, you must apply in this same window.
• Deadline: Monday 30 November 2026, 11:59 AM CET.
• Late or incomplete applications can't be processed, and there's no spring intake.

If ETH is a serious option for you, set aside time this week to finish the application in full rather than rushing on Monday morning.

Source: ethz.ch, master's application dates (Autumn 2027)

{ivy(0)}""")

add("14:00","scholarshipstogermany","Study in Germany 2026-2027","https://www.facebook.com/groups/scholarshipstogermany/",95000,"sop",
"Germany applicants (95K) are writing motivation letters for winter 2027 intakes; generic checklist, no dated facts.",
f"""Writing a motivation letter for a German master's? Four checks before you upload it to uni-assist or the university portal:

1. Did you answer what this programme asks? Some want your research interests, some your career plans, some how your bachelor's modules match. Read the instructions again.
2. Is the right university and programme named? If you're applying to several, check every paragraph.
3. Can you back up every claim with your transcript, CV or references? German committees often compare your letter with your module list.
4. Are you within the length they give? One to two pages is common, but follow the programme's own limit.

Bonus: if a programme gives a structure or questions, use them as your headings. It makes your letter easy to check against their criteria.

{ivy(1)}""")

add("14:00","1205429363520214","Fully funded scholarships for international students","https://www.facebook.com/groups/1205429363520214",92000,"age",
"International audience (92K) where age questions come up often; Chevening and Türkiye Bursları rules checked on their official pages today.",
f"""Before you rule yourself out of a scholarship because of your age, check the official rule. They vary a lot.

Two real examples:
• Chevening (UK government): "There is no upper age limit." It asks for at least two years of work experience (2,800 hours). Work that was a compulsory part of your degree doesn't count.
• Türkiye Bursları (Turkey): strict caps. Under 21 for bachelor's, under 30 for master's, under 35 for PhD.

The lesson: one scheme can be perfect for you at 35, another closed to you at 30. Read each scheme's eligibility page yourself, because reposted flyers and blogs often get these details wrong.

Sources: chevening.org eligibility and FAQs; turkiyeburslari.gov.tr

{ivy(2)}""")

add("14:00","cheveninghelp","Chevening Scholarship Applications 2023/2024","https://www.facebook.com/groups/cheveninghelp/",133900,"age",
"Chevening applicants (134K); rules say no promotion, so this is pure help about the work-experience rule: no Ivyward line, link or video.",
"""For anyone planning a future Chevening application, two eligibility points that cause a lot of confusion:

• There is no upper age limit. Chevening says so in its own FAQs.
• You need at least two years of work experience, which Chevening counts as 2,800 hours. Work that was a compulsory part of your degree (for example, a required placement) doesn't count.

Chevening's eligibility page explains which kinds of work count toward the 2,800 hours, so read it before you add yours up. Then keep a simple record now: employer, dates and hours per week. It makes the application much easier when the next round opens.

Source: chevening.org, eligibility page and FAQs. Always check there before you apply, because rules can change between rounds.""", True)

add("14:00","offeredscholarships","Offered Scholarships","https://www.facebook.com/groups/offeredscholarships/",77000,"clar",
"Scholarship hunters (77K); Clarendon is fully funded and needs no form, only an on-time course application.",
f"""A fully funded Oxford scholarship with no essay, no form and no separate deadline: the Clarendon Scholarship.

How it works, from Oxford's own page:
• Every applicant to an eligible graduate course is considered automatically.
• You just have to apply to your course by its December or January funding deadline.
• It covers course fees in full, plus a living grant for full-time scholars.
• Open to every nationality.
• Most offers go out by the end of April.

The catch: it's very competitive, and what counts is the strength of your course application. So put your effort into the statement, references and transcripts, and submit before the funding deadline, not the final admission date.

Source: ox.ac.uk, Clarendon information for applicants

{ivy(3)}""")

# ---------- 16:00
add("16:00","germanyscholarships","Germany Scholarships 2026-2027","https://www.facebook.com/groups/germanyscholarships/",76000,"ref",
"Germany scholarship group (76K, no rules listed); most German scholarships and master's programmes ask for references.",
f"""Applying for a German master's or a scholarship like DAAD? Most applications ask for one or two references, and some referees take weeks.

Five tips:
1. Ask early, at least a month before your deadline.
2. Choose people who know your work: a project supervisor or a manager who saw your results.
3. Give them a short brief: programme, deadline, your CV, and what you'd like them to highlight.
4. Check whether the letter should be uploaded by them, sent by email, or uploaded by you on letterhead with a signature. Programmes differ, so read the instructions.
5. Check a week before the deadline that everything has arrived.

Clear instructions make it much easier for a busy lecturer to say yes.

{ivy(0)}""")

add("16:00","2035092303565487","Fully Funded Scholarships in USA","https://www.facebook.com/groups/2035092303565487",73000,"sop",
"US-focused group (73K); many US PhD and master's deadlines fall in December, and statements of purpose are being finalised now.",
f"""US grad deadlines are coming up fast. Before you submit your statement of purpose, run these four checks:

1. Did you answer this programme's prompt? Some US programmes ask for a statement of purpose and a separate personal history statement. Don't merge them.
2. Is the right school named everywhere? Search your document for every other university's name before you upload.
3. Can you back up every claim? Your CV, transcript or recommenders should support anything you say you did.
4. Are you within the word or page limit? Many portals cut off the extra.

And for PhD applications: name the faculty you'd like to work with and say why their work fits yours. Check they're still at that university first.

{ivy(1)}""")

add("16:00","212340022855289","Study in Germany","https://www.facebook.com/groups/212340022855289",69000,"sop",
"Joined today (69K); group rules don't ban promotion. Motivation letter checks for winter 2027 applicants.",
f"""For everyone preparing applications for winter semester 2027 in Germany: your motivation letter matters, especially for competitive programmes.

Four quick checks:
1. Answer the programme's own questions. If they ask why this programme, don't just explain why Germany.
2. Name the right university, city and programme. Mistakes from copy-pasting are very common.
3. Back up every claim. Committees compare your letter with your transcript and module descriptions.
4. Keep to their length. If they say one page, it's one page.

Also check the language: if the programme is taught in English, write in English unless they ask otherwise.

{ivy(2)}""")

add("16:00","azeem.uni","Erasmus Mundus Scholarship Guide","https://www.facebook.com/groups/azeem.uni/",64500,"ref",
"Joined 23 Nov (64.5K, no rules listed); Erasmus Mundus programmes are open now and nearly all need recommendation letters.",
f"""Applying to Erasmus Mundus programmes this season? Most ask for two recommendation letters, and several programmes close in December and January.

Five tips for references:
1. Ask now. Your referees may be writing for several students at once.
2. Pick people who know your work: a thesis supervisor or a manager who saw your results.
3. Give them a short brief: which programmes, the deadlines, your CV and two or three strengths to mention.
4. Check how each programme collects letters. Some send the referee a link, some want a signed PDF you upload yourself.
5. Check a week before each deadline that the letters have arrived.

If you apply to more than one Erasmus Mundus programme, keep a small table of deadlines and letter formats. It saves a lot of last-minute panic.

{ivy(3)}""")

add("16:00","fullyfundedscholarships1","G20 Fully Funded Scholarships for International Students","https://www.facebook.com/groups/fullyfundedscholarships1/",68800,"clar",
"Joined today (68.8K); rules ban promotion, so this is pure help about Clarendon: no Ivyward line, link or video.",
"""Many people search for the "Clarendon Scholarship application form". There isn't one.

From the University of Oxford's official Clarendon page:
• All applicants to eligible graduate courses are considered automatically.
• You must apply to your course by its December or January funding deadline (check your course page for the exact date).
• Clarendon covers course fees in full, plus a living grant for full-time scholars.
• There are no restrictions by nationality.
• Most offers are sent by the end of April; if you haven't heard by mid-June, Oxford says to assume you weren't awarded.

So if Oxford is on your list, your course application is your scholarship application. Make sure it goes in before the funding deadline.

Source: ox.ac.uk, Clarendon information for applicants.""", True)

# ---------- 18:00
add("18:00","350373766988508","Stipendium Hungaricum Scholarship Program","https://www.facebook.com/groups/350373766988508/",50000,"sh",
"The Stipendium Hungaricum group itself (50K); the two-stage selection is exactly what members ask about while waiting for the 2027/28 call.",
f"""Waiting for the 2027/28 Stipendium Hungaricum call? Here's what the 2026/27 call said about how selection works, so you can prepare now.

• Two stages: your country's Sending Partner nominates you, and the Hungarian university decides on admission.
• Without the Sending Partner's nomination, the application isn't considered, even if the university wants you.
• Universities often hold an entrance exam or an interview.
• You could choose up to two programmes, in order of preference.
• The 2026/27 call covered tuition, a monthly stipend of HUF 43,700, a dormitory place or HUF 40,000 a month towards housing, and medical insurance. It also said this doesn't cover all living costs.

Last cycle closed on 15 January 2026. The 2027/28 dates aren't published yet, so watch stipendiumhungaricum.hu.

Source: stipendiumhungaricum.hu, 2026/27 Call for Applications

{ivy(0)}""")

add("18:00","2249146475408663","Turkey Scholarships For Global Students","https://www.facebook.com/groups/2249146475408663/",48000,"age",
"Türkiye Bursları group (48K); the age caps are the most common eligibility mistake, and the 2027 round opens in January.",
f"""Planning to apply for Türkiye Bursları in 2027? Check the age limit first, because it's strict.

From turkiyeburslari.gov.tr:
• Bachelor's applicants must be under 21.
• Master's applicants must be under 30.
• PhD applicants must be under 35.
• Graduate applicants also need at least 75% in their previous degree.

If you're above the cap, don't give up on scholarships altogether. Chevening (UK), for example, has no upper age limit, though it asks for at least two years (2,800 hours) of work experience.

Read each scheme's official eligibility page before you spend time on the application.

Sources: turkiyeburslari.gov.tr, chevening.org

{ivy(1)}""")

add("18:00","scholarshipsinusacanadaeurope","Scholarships in USA , Canada & Europe","https://www.facebook.com/groups/scholarshipsinusacanadaeurope/",57700,"esop",
"Joined today (57.7K, no rules listed); Europe-interested audience and ETH's 30 November window is the most urgent deadline.",
f"""Europe option with a deadline this month: ETH Zurich (Switzerland). Master's applications for autumn 2027 close on 30 November for anyone whose bachelor's isn't from a Swiss university.

From ETH's official schedule:
• Window: 1–30 November 2026.
• Deadline: Monday 30 November, 11:59 AM Central European Time.
• Applying for the Excellence Scholarship & Opportunity Programme (ESOP)? Same window.
• The April window is only for Swiss bachelor's holders.
• Late or incomplete applications can't be processed.

If ETH is on your list, use this week to finish and check your full application. If it isn't realistic this year, note the window for next November.

Source: ethz.ch, master's application dates

{ivy(2)}""")

add("18:00","studycanadascholarships","Study in Canada 2026-2027","https://www.facebook.com/groups/studycanadascholarships/",51000,"ref",
"Joined today (51K, no rules listed); Canadian applicants need references before December and January deadlines.",
f"""Canadian grad applications: don't let reference letters be the reason you miss a deadline.

What helps most:
• Ask your referees at least a month ahead.
• Pick people who can describe your work in detail.
• Send them a short brief: programmes, deadlines, your CV and what you'd like them to mention.
• Check their email address in each portal; the request link goes straight there.
• Look at the portal a week before the deadline and remind them kindly if the letter isn't in.

Most Canadian portals let you send reference requests before you submit the rest of the application. If yours does, do that today.

{ivy(3)}""")

add("18:00","161010260327902","Scholarship Corner","https://www.facebook.com/groups/161010260327902",44100,"clar",
"Joined today (44K, no rules listed); Clarendon is fully funded and needs no form, a useful fact for scholarship hunters.",
f"""Did you know Oxford's Clarendon Scholarship has no separate application?

From Oxford's official page:
• Apply to your graduate course by its December or January funding deadline and you're automatically considered.
• It covers course fees in full, plus a living grant for full-time scholars.
• No nationality restrictions.
• Most offers come by the end of April.

So the real work is a strong course application: a clear statement, good references and your transcripts, all submitted before the funding deadline on your course page.

Source: ox.ac.uk, Clarendon information for applicants

{ivy(0)}""")

# ---------- 20:00
add("20:00","1134190539977871","Germany Study Visa Information","https://www.facebook.com/groups/1134190539977871",44000,"sop",
"Joined today (44K, very active, no rules listed); people here are still choosing programmes, so a motivation-letter check fits (no visa claims).",
f"""Before the visa comes the admission, and for many German programmes the motivation letter is what decides it.

Four checks before you submit:
1. Did you answer this programme's questions, not a generic "why Germany"?
2. Is the right university and programme named in every paragraph?
3. Can your transcript, CV and references back up every claim? Committees compare them.
4. Are you within the programme's length limit?

Also: keep copies of everything you submit. You may need the same documents again later in the process.

{ivy(1)}""")

add("20:00","1128865187855883","Fully Funded Scholarships In USA","https://www.facebook.com/groups/1128865187855883",43700,"ref",
"Joined today (43.7K, no rules listed); US applicants need recommenders lined up before December deadlines.",
f"""US scholarship and grad school deadlines are close. Is every recommender lined up?

Five tips:
1. Ask now, at least a month before your earliest deadline.
2. Choose people who know your work in detail.
3. Give each a one-page brief: schools, deadlines, your CV and what you'd like them to highlight.
4. Enter their email carefully in each portal; the request goes straight to that address.
5. Check a week before each deadline that the portal shows "received".

And send a thank-you note afterwards. You may need them again.

{ivy(2)}""")

add("20:00","914259400881276","CSC Scholarship 2027-28 (中国政府奖学金)","https://www.facebook.com/groups/914259400881276/",42000,"sop",
"Joined today (42K, no rules listed); CSC 2027 applicants are drafting study plans with supervisor letters in hand.",
f"""CSC 2027 applicants: before you upload your study plan or research proposal, four checks.

1. Follow the university's own document list. Some want a study plan, some a research proposal, some both.
2. Name the right university and supervisor. Easy to get wrong when you apply to several.
3. Make it match your acceptance letter. If your supervisor agreed to a topic, your plan should describe that topic.
4. Keep to the length they give.

And keep your documents consistent: the same name spelling, dates and degree titles across your passport, transcripts and forms.

{ivy(3)}""")

add("20:00","803002904217112","PhD and Postdoc Scholarships","https://www.facebook.com/groups/803002904217112",25000,"clar",
"PhD/postdoc audience (25K), posts publish directly; Oxford DPhil funding deadlines are in December and January.",
f"""Applying for a DPhil (PhD) at Oxford for 2027? Your Clarendon Scholarship chance depends on one date: your course's funding deadline.

From Oxford's Clarendon page:
• No separate scholarship form. All applicants to eligible graduate courses are considered.
• Apply by your course's December or January funding deadline.
• Full course fees, plus a living grant for full-time scholars of at least the UKRI minimum doctoral stipend rate.
• No nationality restrictions.
• Most offers by end of April.

Plan backwards from that date: research proposal, references and transcripts first.

Source: ox.ac.uk, Clarendon information for applicants

{ivy(0)}""")

add("20:00","1609501323275645","Nigerians Abroad","https://www.facebook.com/groups/1609501323275645",21000,"sh",
"Nigerian audience (21K); Nigeria was on the Stipendium Hungaricum partner list, and the Sending Partner nomination is the step people miss.",
f"""For Nigerians looking at Hungary: Stipendium Hungaricum has two selection points, and the first one happens at home.

From the official 2026/27 call:
• Nigeria was on the partner list.
• Your country's Sending Partner must nominate you. Without that, the application isn't considered.
• The Hungarian university then runs its own admission, often with an exam or interview.
• You could apply for up to two programmes.
• It covered tuition, a monthly stipend, housing support and medical insurance, though the call says this isn't all your living costs.

The 2027/28 call isn't out yet. Get your transcripts, passport and the nominating body's requirements ready now.

Source: stipendiumhungaricum.hu, 2026/27 Call for Applications

{ivy(1)}""")

assert len(P) == 35, len(P)
import collections
print(collections.Counter(p["slot"] for p in P))
assert len({p["key"] for p in P}) == 35
for p in P:
    w = len(p["text"].split())
    if w < 110 or w > 240: print("len", p["key"], w)
json.dump(P, open("/home/claude/automaster/marketing/facebook/videos/2026-11-24/posts.json", "w"), ensure_ascii=False, indent=1)
