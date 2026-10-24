// finds a portal's verification code or link in an email. pure, so it's tested.

const LINK_WORDS = /(verif|confirm|activat|validate|register|account|pin|login|signin|sign-in|set.?password|token)/i;

export function hostRoot(host: string): string {
  // apply.babson.edu -> babson.edu ; gradapply.ox.ac.uk -> ox.ac.uk
  const parts = host.toLowerCase().split(".").filter(Boolean);
  const cc = parts.length >= 3 && /^(ac|co|edu|gov|org|com)$/.test(parts[parts.length - 2]) && parts[parts.length - 1].length === 2;
  return parts.slice(cc ? -3 : -2).join(".");
}

export function extractVerification(mail: { subject: string; text: string; html: string }, host: string): { code: string | null; link: string | null } {
  const text = `${mail.subject}\n${mail.text}\n${mail.html.replace(/<[^>]+>/g, " ")}`.replace(/&nbsp;/g, " ");
  // codes: "your code is 482913", "PIN: 7X3KQ9", "verification code 1234-5678"
  const near = text.match(/(?:code|pin|passcode|otp|token)\s*(?:is|:|-)?\s*([A-Z0-9]{4,10}(?:-[A-Z0-9]{3,6})?)\b/i);
  let code = near && /\d/.test(near[1]) ? near[1] : null;
  if (!code) {
    const six = text.match(/\b(\d{6})\b/);
    if (six && /(code|verif|pin|confirm)/i.test(text)) code = six[1];
  }
  const root = hostRoot(host);
  const links = [...`${mail.html} ${mail.text}`.matchAll(/https?:\/\/[^\s"'<>)]+/g)].map((m) => m[0].replace(/&amp;/g, "&").replace(/[.,;]+$/, ""));
  const link =
    links.find((l) => {
      try {
        const u = new URL(l);
        return hostRoot(u.hostname) === root && LINK_WORDS.test(u.pathname + u.search);
      } catch {
        return false;
      }
    }) ?? null;
  return { code, link };
}

// some portals (peoplesoft and friends) create the account themselves and email the login.
// pulls "user id: X" / "password: Y" (english and french) out of such an email.
export function extractCredentials(mail: { subject: string; text: string; html: string }): { username: string | null; password: string | null } {
  const text = `${mail.text}\n${mail.html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|tr|li)>/gi, "\n").replace(/<[^>]+>/g, " ")}`.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
  const grab = (re: RegExp) => {
    const m = text.match(re);
    return m ? m[1].trim().replace(/[.,;]+$/, "") : null;
  };
  const username = grab(/(?:user\s*id|user\s*name|username|login\s*(?:id|name)?|identifiant|code\s*(?:d['’]\s*)?utilisateur|nom\s*d['’]\s*utilisateur)\s*(?:is|est)?\s*[:：=]?\s*([A-Za-z0-9._@-]{3,64})/i);
  const password = grab(/(?:temporary\s*)?(?:password|passcode|mot\s*de\s*passe(?:\s*temporaire)?)\s*(?:is|est)?\s*[:：=]\s*(\S{4,64})/i);
  return { username, password };
}
