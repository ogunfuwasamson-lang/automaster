// a mistyped mail domain means the sign-in link goes nowhere and the person waits for an email that never comes.
// returns the address they probably meant, or null.
const KNOWN = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "proton.me", "protonmail.com", "live.com", "aol.com", "ymail.com", "yahoo.co.uk", "googlemail.com", "mail.com", "gmx.com", "gmx.net", "me.com", "msn.com", "zoho.com", "pm.me", "yahoo.fr", "yahoo.ca", "hotmail.co.uk", "outlook.fr"];

function distance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

export function emailTypo(email: string): string | null {
  const m = email.trim().toLowerCase().match(/^([^@\s]+)@([^@\s]+)$/);
  if (!m) return null;
  const [, name, domain] = m;
  if (KNOWN.includes(domain)) return null;
  // ".con", ".cmo", ".co" for ".com" on a known name
  const tld = domain.replace(/\.(con|cmo|ocm|vom|xom|comm|co)$/, ".com");
  if (tld !== domain && KNOWN.includes(tld)) return `${name}@${tld}`;
  // a university or company address is not a typo of gmail: only a near miss of a known provider counts
  const near = KNOWN.map((k) => ({ k, d: distance(domain, k) })).sort((a, b) => a.d - b.d)[0];
  return near.d === 1 && domain.length >= 6 ? `${name}@${near.k}` : null;
}
