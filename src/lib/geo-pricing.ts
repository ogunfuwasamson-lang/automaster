// what an applicant pays, by where they are. pure, so the pricing page, the app and the server agree.
//   africa: preparing is free; each submission (application, scholarship or funding form) costs the equivalent of
//           ₦2,500, paid just before the agents submit. no limit on how many.
//   everywhere else: 3 applications free, then $20 a month for up to 10 submissions a month.
// local prices are ₦2,500 converted at the current exchange rate, refreshed monthly (lib/fx); the table below is
// the fallback, from late October 2026 (about $1.90).

export const AFRICA = new Set([
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM", "CG", "CD", "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW",
  "KE", "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG", "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG",
  "TN", "UG", "ZM", "ZW", "EH", "RE", "YT", "SH",
]);

const XOF = ["SN", "CI", "BJ", "BF", "ML", "NE", "TG", "GW"];
const XAF = ["CM", "GA", "CG", "TD", "CF", "GQ"];

// the currencies Bachs collects in, and ₦2,500 in each
export const SUBMISSION_PRICE: Record<string, { amount: string; symbol: string }> = {
  NGN: { amount: "2500.00", symbol: "₦" },
  GHS: { amount: "22.00", symbol: "GH₵" },
  KES: { amount: "240.00", symbol: "KSh " },
  UGX: { amount: "8000.00", symbol: "USh " },
  TZS: { amount: "4900.00", symbol: "TSh " },
  RWF: { amount: "2750.00", symbol: "RF " },
  ZMW: { amount: "37.00", symbol: "K" },
  MWK: { amount: "3250.00", symbol: "MK " },
  XOF: { amount: "1100.00", symbol: "CFA " },
  XAF: { amount: "1100.00", symbol: "FCFA " },
  USD: { amount: "1.90", symbol: "$" }, // african countries whose currency Bachs doesn't collect
};
const CURRENCY: Record<string, string> = { NG: "NGN", GH: "GHS", KE: "KES", UG: "UGX", TZ: "TZS", RW: "RWF", ZM: "ZMW", MW: "MWK", ...Object.fromEntries(XOF.map((c) => [c, "XOF"])), ...Object.fromEntries(XAF.map((c) => [c, "XAF"])) };

export const PRO_MONTHLY = { amount: "20.00", currency: "USD", label: "$20 a month" } as const;
export const FREE_APPLICATIONS = 3;
export const PRO_MONTHLY_SUBMISSIONS = 10; // submissions a calendar month on Pro

export type Pricing =
  | { model: "per_submission"; country: string; currency: string; amount: string; label: string }
  | { model: "subscription"; country: string; currency: "USD"; amount: string; label: string; free: number };

const money = (symbol: string, amount: string) => `${symbol}${Number(amount).toLocaleString("en-US", { minimumFractionDigits: Number(amount) % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

// prices follow the exchange rate: a monthly refresh (lib/fx) passes the current amounts in; these are the fallback
export function pricingFor(country: string | null | undefined, amounts?: Record<string, string> | null): Pricing {
  const c = (country ?? "").toUpperCase();
  if (AFRICA.has(c)) {
    const currency = CURRENCY[c] ?? "USD";
    const p = { ...SUBMISSION_PRICE[currency], ...(amounts?.[currency] ? { amount: amounts[currency] } : {}) };
    return { model: "per_submission", country: c, currency, amount: p.amount, label: money(p.symbol, p.amount) };
  }
  return { model: "subscription", country: c || "US", currency: "USD", amount: PRO_MONTHLY.amount, label: PRO_MONTHLY.label, free: FREE_APPLICATIONS };
}

// ₦2,500 in another currency, rounded the way a price tag would be: $1.86 -> 1.90, GH₵21.6 -> 22, KSh 241 -> 245,
// USh 7,960 -> 8,000
export function friendlyAmount(x: number): string {
  if (x < 10) return (Math.ceil(x * 10) / 10).toFixed(2);
  if (x < 100) return Math.round(x).toFixed(2);
  if (x < 1000) return (Math.round(x / 5) * 5).toFixed(2);
  if (x < 10000) return (Math.round(x / 100) * 100).toFixed(2);
  return (Math.round(x / 500) * 500).toFixed(2);
}
