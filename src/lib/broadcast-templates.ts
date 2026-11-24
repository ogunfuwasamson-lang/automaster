import type { Broadcast } from "@/lib/broadcast-format";
import { CHANNELS } from "@/lib/site";

// drafts the composer can start from. product news only: no prices (free is fine), no promise of admission.
const WHATSAPP_CHANNEL = CHANNELS.whatsapp;

export const TEMPLATES: { key: string; label: string; msg: Broadcast }[] = [
  {
    key: "whats-new-nov-2026",
    label: "What's new in Ivyward (November 2026)",
    msg: {
      subject: "New in Ivyward: deadlines on your calendar, and scholarships every day",
      preheader: "Seven things we shipped to help you get your applications in on time.",
      headline: "What's new in Ivyward",
      body: `Hi {first_name},

Here's what we shipped in the last two weeks to help you get more applications in, on time. All of it is already live in your account.

### Your deadlines on Google Calendar
Connect Google Calendar and Ivyward adds every deadline on your list, plus the webinars, open days and interviews your schools email you about. You get a reminder a week, two days and a day before, and each one opens that application in Ivyward.
[[Connect Google Calendar]](/api/calendar/connect?then=/dashboard)

### Scholarships every day on WhatsApp
Our new channel, Global Scholarship by Ivyward AI, posts 5 scholarship and funding opportunities a day for study in the US, UK, Canada, Germany and more. Follow it so you don't miss a deadline.
[[Follow on WhatsApp]](${WHATSAPP_CHANNEL})

### See where each application stands
Every application now has a simple progress line and one sentence on what's happening. Your home page shows everything that's waiting on you in one list, each with one button.

### The agents find the real application portal
Before they start, the agents now find and check each school's actual application portal, so they don't get lost on programme pages. If a school needs you to create the portal account yourself, Ivyward shows you the link, the email and the password to use.

### The right intake, the right deadline, the right boxes
Fixes from real submissions: the agents choose the intake your programme actually admits for, use the international deadline that applies to you, and fill parent and emergency-contact boxes with the right people, never your own name.

### Documents by school and deadline
Each application lists the documents that school needs, so you know what to upload and by when.

### Share a school with a friend
Tap Share on any school on your list to send its deadline, fees and requirements on WhatsApp, with a link to apply. If your friend joins through it and finishes setup, you both get one application free.

[[Open Ivyward]](/dashboard)

Free for anyone you know: the [2027 scholarship deadline calendar](/scholarships/deadlines) and [study-abroad guides](/guides).

Reply to this email if anything isn't working for you. We read every reply.`,
    },
  },
];
