// builds a plain-text RFC 5322 message for the gmail send api. pure, so it's tested.

function encodeHeader(v: string): string {
  // RFC 2047 for anything non-ascii (names with accents, ₦, smart quotes)
  return /^[\x20-\x7e]*$/.test(v) ? v : `=?UTF-8?B?${Buffer.from(v, "utf8").toString("base64")}?=`;
}

function clean(v: string): string {
  // header injection guard: no CR/LF in header values
  return v.replace(/[\r\n]+/g, " ").trim();
}

export function isEmail(s: string): boolean {
  return /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[a-z]{2,}$/i.test(s.trim());
}

export function buildMime(m: { from: string; fromName?: string | null; to: string; subject: string; body: string; inReplyTo?: string | null }): string {
  if (!isEmail(m.to)) throw new Error(`not an email address: ${m.to}`);
  const from = m.fromName ? `${encodeHeader(clean(m.fromName))} <${clean(m.from)}>` : clean(m.from);
  const headers = [
    `From: ${from}`,
    `To: ${clean(m.to)}`,
    `Subject: ${encodeHeader(clean(m.subject))}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  ];
  if (m.inReplyTo) headers.push(`In-Reply-To: ${clean(m.inReplyTo)}`, `References: ${clean(m.inReplyTo)}`);
  const body = Buffer.from(m.body.replace(/\r?\n/g, "\r\n"), "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n");
  return `${headers.join("\r\n")}\r\n\r\n${body}`;
}

export function toBase64Url(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}
