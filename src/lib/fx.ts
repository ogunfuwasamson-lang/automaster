import "server-only";
import { admin } from "@/lib/supabase/admin";
import { PACK_PRICE, friendlyAmount } from "@/lib/geo-pricing";

// the submission-pack price in each african currency is ₦10,000 at the current rate. refreshed monthly from a free
// exchange-rate feed, kept in billing_settings, and read (cached for an hour) wherever prices are shown or charged.
const KEY = "pack_prices";
const BASE_NGN = 10000;

type Stored = { amounts: Record<string, string>; updated: string };
let cache: { at: number; amounts: Record<string, string> } | null = null;

export async function submissionAmounts(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < 3600_000) return cache.amounts;
  const { data } = await admin().from("billing_settings").select("value").eq("key", KEY).maybeSingle();
  let amounts: Record<string, string> = {};
  try {
    amounts = data?.value ? (JSON.parse(data.value) as Stored).amounts : {};
  } catch {
    amounts = {};
  }
  cache = { at: Date.now(), amounts };
  return amounts;
}

// once a day the worker asks; it refreshes when the stored prices are 25+ days old
export async function refreshPrices(force = false): Promise<{ updated: boolean; amounts?: Record<string, string> }> {
  const db = admin();
  const { data } = await db.from("billing_settings").select("value").eq("key", KEY).maybeSingle();
  if (!force && data?.value) {
    try {
      if (Date.now() - Date.parse((JSON.parse(data.value) as Stored).updated) < 25 * 86_400_000) return { updated: false };
    } catch {
      /* unreadable: refresh */
    }
  }
  const res = await fetch("https://open.er-api.com/v6/latest/NGN", { signal: AbortSignal.timeout(10_000) });
  const json = (await res.json().catch(() => ({}))) as { result?: string; rates?: Record<string, number> };
  if (json.result !== "success" || !json.rates) return { updated: false };
  const amounts: Record<string, string> = { NGN: PACK_PRICE.NGN.amount };
  for (const cur of Object.keys(PACK_PRICE)) {
    if (cur === "NGN") continue;
    const rate = json.rates[cur];
    // a wild rate (a feed glitch) keeps the old price: more than 2x away from the fallback is refused
    const fallback = Number(PACK_PRICE[cur].amount);
    const x = rate ? BASE_NGN * rate : 0;
    amounts[cur] = x && x < fallback * 2 && x > fallback / 2 ? friendlyAmount(x) : PACK_PRICE[cur].amount;
  }
  await db.from("billing_settings").upsert({ key: KEY, value: JSON.stringify({ amounts, updated: new Date().toISOString() } satisfies Stored) });
  cache = null;
  return { updated: true, amounts };
}
