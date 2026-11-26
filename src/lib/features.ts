// the feature pages (/features/[slug]): one per thing the agents do, each with a demo of it working, how it works,
// what stays with the applicant, and the questions people ask about it. every claim here has to match what ships:
// FACTS and FAQ (lib/site, lib/faq), the inbox watcher (lib/inbox), the calendar sync (lib/calendar-sync,
// lib/calendar-plan) and the Chrome extension (extension/, claude/extension-roadmap.md). say "application form",
// not "portal", in anything a visitor reads.

export type FeatureDemo = "programs" | "essays" | "forms" | "funding" | "inbox" | "calendar" | "chrome";

export type Feature = {
  slug: string;
  nav: string; // short name for links and the footer
  title: string; // the page's h1
  lead: string;
  metaTitle: string;
  description: string;
  demo: FeatureDemo;
  steps: [string, string][];
  notes: [string, string][]; // what stays with the applicant, and limits worth knowing
  faq: [string, string][];
  store?: boolean; // offers Add to Chrome
  second?: { href: string; label: string }; // a second way in, beside Start free
};

export const FEATURES: Feature[] = [
  {
    slug: "finding-programs",
    nav: "Finding programs",
    title: "A shortlist you can actually get into.",
    lead: "Tell Ivyward what you want to study and where. Agents check each program's official pages against your profile, budget and regions, and keep the ones you can realistically get into.",
    metaTitle: "Find university programs that fit you",
    description:
      "Ivyward's agents check each program's official pages against your profile, budget and regions, and keep the bachelor's, master's, MBA and PhD programs you can realistically get into, with deadlines, fees and funding. The shortlist is free.",
    demo: "programs",
    steps: [
      ["Say what you want", "A field, a level and the regions you'd consider, plus your budget. Your CV and transcript fill in the rest."],
      ["Agents check each program", "They read each program's own pages for requirements, deadlines, fees and funding, from the top-ranked schools down."],
      ["You get a shortlist", "Each program with its deadline, fee and funding, and how realistic it is for you. Programs you can't realistically get into are left out."],
    ],
    notes: [
      ["Free to start", "Your first shortlist comes from programs Ivyward has already checked, with deadlines, fees and funding."],
      ["Any field, any level", "Bachelor's, master's (including MBA) and PhD programs, at schools in any country with an online application."],
      ["You choose what to apply to", "The shortlist is a starting point. Nothing is applied for until you pick it."],
    ],
    faq: [
      ["Is the shortlist free?", "Yes. Starting is free: a shortlist from programs Ivyward has already checked, with deadlines, fees and funding, and deadline alerts. The agents' work on applications is paid in credits."],
      ["Which degrees and countries does it cover?", "Bachelor's, master's (including MBA) and PhD programs in any field, at schools in any country with an online application. You choose the regions; the agents search them, from the top-ranked schools down."],
      ["How does Ivyward decide what fits?", "It compares each program's published requirements, deadlines, fees and funding with your profile, budget and regions, and keeps only the programs you can realistically get into."],
    ],
    second: { href: "/match", label: "See my matches" },
  },
  {
    slug: "essays",
    nav: "Essays",
    title: "Essays from your own facts.",
    lead: "Ivyward drafts your statements of purpose and essays from your own CV and answers, checks every claim against your documents, and leaves the final words and the signature to you.",
    metaTitle: "Statement of purpose and essay drafts, fact-checked",
    description:
      "Ivyward drafts statements of purpose and application essays from facts in your own profile and documents, checks every claim against them, and flags anything you couldn't back up. You edit, approve and sign.",
    demo: "essays",
    steps: [
      ["It learns your story", "Upload your CV and transcript and talk to Ivyward AI. Your stories and achievements are saved to your profile."],
      ["A first draft for each school", "Written to each school's own prompt, from facts in your profile, never from invented ones."],
      ["Every claim checked", "Numbers, dates and achievements are checked against your documents. Anything you couldn't back up is flagged for you."],
    ],
    notes: [
      ["Your words, in the end", "You edit each draft into your own voice and approve it. Nothing is sent without your signature."],
      ["Schools' AI rules differ", "Some schools ask applicants to disclose or limit AI help with essays. Check each school's policy."],
      ["Nothing invented", "Ivyward only drafts from facts you gave it."],
    ],
    faq: [
      ["Does it write my essays for me?", "It writes first drafts from facts in your profile and your conversations with Ivyward AI, then checks every claim against your documents. You edit them into your own words and approve each one. Nothing is sent without your signature."],
      ["Is it allowed to use AI on university applications?", "It depends on the school. Some ask applicants to disclose or limit AI help with essays, so check each school's policy. Ivyward only drafts from facts you gave it, flags any claim you can't back up, and leaves the final words and the signature to you, as the applicant."],
      ["What does fact-checked mean?", "Each claim in a draft is checked against your CV, transcript and answers. A number, date or achievement that isn't in your documents is flagged for you to fix or remove."],
    ],
  },
  {
    slug: "application-forms",
    nav: "Application forms",
    title: "Application forms, filled for you.",
    lead: "Agents find each school's online application, create your account, fill in every page from your profile and upload your documents. You approve the packet before anything is submitted.",
    metaTitle: "University application forms filled in for you",
    description:
      "Ivyward's agents find each school's online application form, create your account, fill in every page from your profile and upload your documents. You read and sign the packet, pay the fee on the school's site, and tick any bot check.",
    demo: "forms",
    steps: [
      ["The form is found and your account made", "Agents find each school's online application and create your account. Passwords are encrypted."],
      ["Every page filled, documents uploaded", "Answers come from your profile. A question your profile doesn't cover is asked once, then saved for every other school."],
      ["You approve, then it's submitted", "You read and sign the packet first. Fees are paid by you on the school's site."],
    ],
    notes: [
      ["What stays with you", "Signing each packet, paying application fees, and the occasional bot check. Agents never solve bot checks."],
      ["Works with most systems", "Slate, Salesforce, PeopleSoft, UK systems like SITS, and schools' own application forms."],
      ["When a form needs your browser", "If a school's site blocks cloud browsers, the free Ivyward extension finishes the form in your own Chrome."],
    ],
    faq: [
      ["What do I still have to do myself?", "Read and sign your application packets, pay application fees on each school's site, and tick the occasional bot check. Finding the application form, creating your account, filling every page and uploading documents is done for you."],
      ["Which application systems does Ivyward work with?", "Most of them: Slate, Salesforce, PeopleSoft, UK systems like SITS, and schools' own application forms. When a school's site blocks cloud browsers, the free Ivyward extension finishes the application in your own Chrome."],
      ["What happens when a form asks something my profile doesn't cover?", "Ivyward AI asks you. The answer is saved to your profile, so no other school has to ask again, and the agents carry on by themselves."],
    ],
  },
  {
    slug: "funding",
    nav: "Fees and funding",
    title: "Funding, asked for.",
    lead: "Agents ask for application fee waivers before you pay, find scholarships that match your profile, and after an admission ask for merit reconsideration and assistantships. You approve every request.",
    metaTitle: "Application fee waivers, scholarships and merit aid, asked for you",
    description:
      "Ivyward's agents check each program's fee waiver rules and ask before you pay, find and apply for scholarships that match your profile, and after an admission ask for merit reconsideration and assistantships. You approve every request.",
    demo: "funding",
    steps: [
      ["Fee waivers first", "Agents check each program's waiver rules and apply for any you qualify for. Where there's no form, they draft a short request for you to approve."],
      ["Scholarships that match", "Agents find scholarships and funding by every eligibility hook in your profile, and apply the same way they apply to programs."],
      ["After an admission", "They look for merit reconsideration, assistantships and scholarships, and draft the emails for you to approve."],
    ],
    notes: [
      ["The fee waits for the answer", "An application waits for the waiver reply, so you don't pay a fee that could have been waived."],
      ["You pay schools directly", "Application fees go from you to the school. Card details never reach Ivyward."],
      ["You approve every ask", "No request goes to a school until you've approved it."],
    ],
    faq: [
      ["Can Ivyward get my application fees waived?", "It tries before you pay. The agents check each program's fee waiver rules, apply for any waiver you qualify for, and where there's no form they draft a short request for you to approve. The application waits for the answer, so you don't pay a fee that could have been waived."],
      ["Can it apply for scholarships too?", "Yes. The agents find scholarships and funding that match your profile, and can apply for them the same way they apply to programs: drafts you approve, a packet you sign, then submission. After an admission they also ask for merit reconsideration and assistantships."],
      ["Does Ivyward pay my application fees?", "No. Application fees are paid by you directly to each school, and card details never reach Ivyward. The agents ask for fee waivers first."],
    ],
  },
  {
    slug: "after-admission",
    nav: "After you're admitted",
    title: "Admitted. Now the rest.",
    lead: "Confirm your admission with the school's email or your letter, and Ivyward carries on with you: funding and scholarships at that school, then your visa, school fees, housing and travel, up to your first day.",
    metaTitle: "After your admission: funding, student visa, fees and travel, step by step",
    description:
      "Once a university admits you, Ivyward confirms the admission from the school's email or your letter, looks for more funding at that school, and lists every step to your first day: the student visa for your destination with the government's official pages, the deposit and tuition, housing, your flight and arrival.",
    demo: "funding",
    steps: [
      ["Confirm your admission", "With Gmail connected, the agents find the school's admission email. Or upload the letter. An admission you had before Ivyward counts too."],
      ["Funding first", "The agents look for merit reconsideration, assistantships and the school's own scholarships, and draft the emails for you to approve."],
      ["Visa, fees and travel, step by step", "Your dashboard lists the visa steps for your destination with the official pages, then the deposit, tuition, housing, your flight and arrival. You tick them off as you go."],
    ],
    notes: [
      ["Official pages only", "Each visa step links to the government's own page. Fees and dates change, so you read them there."],
      ["You pay schools directly", "Deposits and tuition go from you to the school, on its own payment page. Card details never reach Ivyward."],
      ["Guidance, not a visa agent", "Ivyward doesn't apply for your visa or promise one. It keeps you on track, and Ivyward AI answers your questions from official sources."],
    ],
    faq: [
      ["Does Ivyward help after I'm admitted?", "Yes. Once the admission is confirmed, the agents look for more funding at that school, and your dashboard lists every step to your first day: the student visa, the deposit and tuition, housing, your flight and arrival."],
      ["I got my admission before I found Ivyward. Can it still help?", "Yes. Upload the admission letter on your dashboard. Ivyward checks it, adds the school, and starts on funding and your visa steps for it."],
      ["Does Ivyward apply for my student visa?", "No. It lists the steps for your destination country with links to the government's official pages, and answers your questions as you go. You submit the visa application yourself."],
      ["Can Ivyward pay my school fees?", "No. You pay the deposit and tuition directly to the school, on its own payment page, and keep the receipts. Ivyward reminds you of each step."],
    ],
  },
  {
    slug: "school-replies",
    nav: "School replies",
    title: "School replies, read for you.",
    lead: "Connect Gmail and Ivyward reads what your schools send: decisions, interview invites, document requests, fee-waiver replies. Anything that needs you goes to the top of your list.",
    metaTitle: "University emails read and sorted for you, with Gmail",
    description:
      "Connect Gmail and Ivyward reads the emails your schools send, works out what each one means, and puts anything that needs you at the top of your list. Nothing in your inbox is moved or deleted, and you can disconnect at any time.",
    demo: "inbox",
    steps: [
      ["Connect Gmail", "During setup, or any time after. You can disconnect it whenever you like."],
      ["New school mail is read", "Decisions, interview invites, document requests, aid offers, fee-waiver replies, verification codes and receipts."],
      ["You see what it means", "Each email becomes what it means and what happens next. Interview dates and due dates go to your calendar too."],
    ],
    notes: [
      ["Your inbox stays as it is", "Nothing in Gmail is moved, labelled or deleted."],
      ["What needs you comes first", "A document request or an interview invite goes to the top of your list, with what to do."],
      ["Off whenever you like", "Disconnect Gmail at any time from your settings."],
    ],
    faq: [
      ["Which emails does Ivyward read?", "New emails from the schools on your list. It works out what each one is (a decision, an interview invite, a document request, an aid offer, a fee-waiver reply, a code or a receipt) and what you need to do."],
      ["Will it change anything in my inbox?", "No. Nothing in your Gmail is moved, labelled or deleted. The connection also lets Ivyward send the emails you approve, like a fee-waiver request, from your own address."],
      ["Can I disconnect Gmail later?", "Yes, at any time. Your applications carry on; you'll just need to watch school emails yourself."],
    ],
  },
  {
    slug: "deadlines",
    nav: "Deadlines",
    title: "Every deadline on your calendar.",
    lead: "Connect Google Calendar and every application deadline lands there, with reminders a week, two days and a day before. Interviews, webinars and due dates from school emails are added too.",
    metaTitle: "University application deadlines on your Google Calendar",
    description:
      "Connect Google Calendar and Ivyward puts every application deadline on it with reminders a week, two days and a day before, plus interviews, webinars, open days and due dates your schools email about, each linked back to its application.",
    demo: "calendar",
    steps: [
      ["Connect Google Calendar", "During setup, or any time after."],
      ["Deadlines go on", "Every deadline on your list, with reminders at 9am a week, two days and a day before."],
      ["It stays in step", "Interviews, webinars, open days and due dates from school emails are added, and anything that changes is updated about once an hour."],
    ],
    notes: [
      ["Only its own events", "Ivyward changes only the events it added. The rest of your calendar is left alone."],
      ["Linked back", "Each event links to its application, so you're one tap from what's due."],
      ["Works while agents are paused", "The calendar keeps up even when you've paused the agents."],
    ],
    faq: [
      ["When do the reminders come?", "For an application deadline: at 9am a week, two days and a day before. For a due date a school emailed about: two days and a day before."],
      ["Will it touch my other events?", "No. Ivyward only adds, updates and removes the events it created."],
      ["Do I need Google Calendar?", "Only for this. Without it, every deadline still shows in Ivyward, on each application and on your dashboard."],
    ],
    second: { href: "/deadlines", label: "See deadlines by month" },
  },
  {
    slug: "chrome-extension",
    nav: "Chrome extension",
    title: "Ivyward for Chrome.",
    lead: "Some application forms only work in your own browser. The free Ivyward extension fills them there, page by page, in a tab you can watch, and waits for your yes before anything is submitted.",
    metaTitle: "Ivyward for Chrome: finish university applications in your own browser",
    description:
      "The free Ivyward extension lets the agents finish university application forms in your own Chrome when a school's site blocks cloud browsers. You watch, pause or take over at any time, review every answer, and approve before anything is submitted.",
    demo: "chrome",
    store: true,
    steps: [
      ["Add it to Chrome", "Free on the Chrome Web Store, listed as Ivyward runner. It also works in Edge and Brave."],
      ["The form is filled in a tab you can watch", "Signed in as you. A side panel shows what's happening, and you can pause, take over or stop at any time."],
      ["You review, then submit", "Every answer, page by page, before anything is submitted. Submitting and paying always wait for you."],
    ],
    notes: [
      ["Bot checks stay with you", "When one appears, the tab comes forward for you to tick. The agents never solve them."],
      ["Stays on the school's site", "A run that lands anywhere else stops and asks you first."],
      ["Keeps an eye on submitted applications", "Once a week it checks each submitted application for updates, read-only, and tells you what changed."],
    ],
    faq: [
      ["Is the extension free?", "Yes. It's free on the Chrome Web Store, listed as Ivyward runner, and works in Chrome, Edge and Brave."],
      ["Does it submit without asking me?", "No. By default it fills everything and asks before submitting, and you can set it to ask before each page. Submitting and paying always wait for you."],
      ["When do I need it?", "Only when a school's application form blocks cloud browsers. Ivyward tells you when an application needs it; everything else runs without it."],
    ],
  },
];

export const featureBySlug = (slug: string) => FEATURES.find((f) => f.slug === slug) ?? null;
