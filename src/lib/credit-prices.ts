// the credit wallet's price list (founder's call, 24 nov 2026). pure, so the pricing page, the app and the agents
// read the same numbers. one currency for everything the agents do:
//   earning: a pack gives PACK credits that last PACK_DAYS; Pro gives PRO a paid month; a friend who joins through an
//            invite and finishes setup earns both people INVITE, which don't expire.
//   using:   an application costs APPLICATION (set aside when the agents start it, spent when it's submitted, given
//            back if it's dropped first); checking a programme or a scholarship CHECK; a funding request REQUEST.
// checks of programmes from Ivyward's checked library (the free shortlist's fit checks) cost nothing.

export const CREDITS = {
  pack: 60,
  packDays: 30,
  pro: 160,
  invite: 10,
  group: 3, // each member of a study group of five
  application: 10,
  check: 1,
  request: 1,
  legacySubmission: 10, // an old one-off submission checkout, still honoured
} as const;

// a search for new programmes checks at most this many in one run (a credit each)
export const SEARCH_CHECKS = 10;

export const PRICE_LINE = `An application uses ${CREDITS.application} credits. Checking a programme or a scholarship uses ${CREDITS.check}, and so does a funding request.`;

// how many applications a balance covers
export const applicationsFor = (credits: number) => Math.max(0, Math.floor(credits / CREDITS.application));

// how many programmes one search checks: never more than the balance pays for
export const searchSize = (planned: number, balance: number) => Math.max(0, Math.min(planned, SEARCH_CHECKS, Math.floor(balance / CREDITS.check)));
