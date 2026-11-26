// web setup's screens by number (app/onboarding): the wizard, the page that opens it on a step, and the app's
// redirect for accounts that haven't linked WhatsApp all use these
export const SETUP = { matches: 3, whatsapp: 4, connect: 5 } as const;

// WhatsApp is required in web setup for accounts made from this moment (founder, 26 nov 2026). accounts made
// before it aren't sent back to setup for it.
export const WHATSAPP_REQUIRED_SINCE = "2026-11-26T22:00:00Z";
export const needsWhatsApp = (createdAt: string | null | undefined, linked: boolean) => !linked && !!createdAt && Date.parse(createdAt) >= Date.parse(WHATSAPP_REQUIRED_SINCE);
