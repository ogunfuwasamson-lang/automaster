// web setup's screens by number (app/onboarding): the wizard, the page that opens it on a step, and the app's
// redirect for accounts that haven't linked WhatsApp all use these
export const SETUP = { matches: 3, whatsapp: 4, connect: 5 } as const;

// WhatsApp is required in web setup for accounts made from this moment (founder, 26 nov 2026). accounts made
// before it aren't sent back to setup for it.
export const WHATSAPP_REQUIRED_SINCE = "2026-11-26T22:00:00Z";

// where WhatsApp is blocked, the step is optional and the agents email instead (founder, 26 nov 2026: "only for
// people in those regions"). by the country they're connecting from. checked 26 nov 2026: China since 2017, North
// Korea, Turkmenistan (Reuters, RFE/RL), Russia since 12 feb 2026 (Kremlin-confirmed block). Iran lifted its ban in
// december 2024; the UAE, Qatar, Egypt and Jordan restrict calls only, so messages work there.
export const WHATSAPP_BLOCKED: Record<string, string> = { CN: "China", KP: "North Korea", RU: "Russia", TM: "Turkmenistan" };
export const blockedIn = (country: string | null | undefined): string | null => (country ? (WHATSAPP_BLOCKED[country.toUpperCase()] ?? null) : null);

export const needsWhatsApp = (createdAt: string | null | undefined, linked: boolean, country?: string | null) =>
  !linked && !blockedIn(country) && !!createdAt && Date.parse(createdAt) >= Date.parse(WHATSAPP_REQUIRED_SINCE);

// the country they're connecting from: the host's header (set on Agent37), else Cloudflare's
export const countryFrom = (h: { get(name: string): string | null }) => (h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? "").toUpperCase() || null;
