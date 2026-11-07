// what an applicant pays, by where they are. pure, so the pricing page, the app and the server agree.
//   africa: preparing is free. submissions come in packs: ₦10,000 (or the local equivalent) buys 5, used one at a
//           time as applications, scholarship forms or funding requests go in. no subscription; buy another pack
//           when the 5 are used. credits don't expire.
//   everywhere else: 3 applications free, then $20 a month for up to 10 submissions a month.
// local pack prices are ₦10,000 converted at the current exchange rate, refreshed monthly (lib/fx); the table below
// is the fallback, from early November 2026.

export const AFRICA = new Set([
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM", "CG", "CD", "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW",
  "KE", "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG", "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG",
  "TN", "UG", "ZM", "ZW", "EH", "RE", "YT", "SH",
]);

const XOF = ["SN", "CI", "BJ", "BF", "ML", "NE", "TG", "GW"];
const XAF = ["CM", "GA", "CG", "TD", "CF", "GQ"];

export const PACK_SIZE = 5;

// the currencies Bachs collects in, and a ₦10,000 pack in each
export const PACK_PRICE: Record<string, { amount: string; symbol: string }> = {
  NGN: { amount: "10000.00", symbol: "₦" },
  GHS: { amount: "88.00", symbol: "GH₵" },
  KES: { amount: "960.00", symbol: "KSh " },
  UGX: { amount: "32000.00", symbol: "USh " },
  TZS: { amount: "19500.00", symbol: "TSh " },
  RWF: { amount: "11000.00", symbol: "RF " },
  ZMW: { amount: "148.00", symbol: "K" },
  MWK: { amount: "13000.00", symbol: "MK " },
  XOF: { amount: "4400.00", symbol: "CFA " },
  XAF: { amount: "4400.00", symbol: "FCFA " },
  USD: { amount: "7.60", symbol: "$" }, // african countries whose currency Bachs doesn't collect
};
const CURRENCY: Record<string, string> = { NG: "NGN", GH: "GHS", KE: "KES", UG: "UGX", TZ: "TZS", RW: "RWF", ZM: "ZMW", MW: "MWK", ...Object.fromEntries(XOF.map((c) => [c, "XOF"])), ...Object.fromEntries(XAF.map((c) => [c, "XAF"])) };

export const PRO_MONTHLY = { amount: "20.00", currency: "USD", label: "$20 a month" } as const;
export const FREE_APPLICATIONS = 3;
export const PRO_MONTHLY_SUBMISSIONS = 10; // submissions a calendar month on Pro

export type Pricing =
  | { model: "pack"; country: string; currency: string; amount: string; size: number; label: string; each: string }
  | { model: "subscription"; country: string; currency: "USD"; amount: string; label: string; free: number };

const money = (symbol: string, amount: string | number) => `${symbol}${Number(amount).toLocaleString("en-US", { minimumFractionDigits: Number(amount) % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

// prices follow the exchange rate: a monthly refresh (lib/fx) passes the current amounts in; these are the fallback
export function pricingFor(country: string | null | undefined, amounts?: Record<string, string> | null): Pricing {
  const c = (country ?? "").toUpperCase();
  if (AFRICA.has(c)) {
    const currency = CURRENCY[c] ?? "USD";
    const p = { ...PACK_PRICE[currency], ...(amounts?.[currency] ? { amount: amounts[currency] } : {}) };
    const each = Number(p.amount) / PACK_SIZE;
    return { model: "pack", country: c, currency, amount: p.amount, size: PACK_SIZE, label: `${money(p.symbol, p.amount)} for ${PACK_SIZE} submissions`, each: money(p.symbol, Number(each.toFixed(each < 10 ? 2 : 0))) };
  }
  return { model: "subscription", country: c || "US", currency: "USD", amount: PRO_MONTHLY.amount, label: PRO_MONTHLY.label, free: FREE_APPLICATIONS };
}

// the pack price on its own: "₦10,000"
export const packPrice = (p: Extract<Pricing, { model: "pack" }>) => p.label.replace(/ for \d+ submissions$/, "");

// ₦10,000 in another currency, rounded the way a price tag would be: $7.57 -> 7.60, GH₵87.6 -> 88, KSh 958 -> 960,
// USh 31,800 -> 32,000
export function friendlyAmount(x: number): string {
  if (x < 10) return (Math.ceil(x * 10) / 10).toFixed(2);
  if (x < 100) return Math.round(x).toFixed(2);
  if (x < 1000) return (Math.round(x / 5) * 5).toFixed(2);
  if (x < 10000) return (Math.round(x / 100) * 100).toFixed(2);
  return (Math.round(x / 500) * 500).toFixed(2);
}
