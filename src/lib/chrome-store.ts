import "server-only";

// the Ivyward runner on the Chrome Web Store. until Google publishes the listing its page doesn't exist, so the
// Connect Chrome page checks (at most once an hour) and switches from the manual download to "Add to Chrome".
export const CHROME_STORE_ID = "blccjbkkijhejelihanjilmkapoigffl";
export const CHROME_STORE_URL = `https://chromewebstore.google.com/detail/${CHROME_STORE_ID}`;

export async function storeLive(): Promise<boolean> {
  if (process.env.CHROME_STORE_LIVE === "1") return true;
  try {
    const res = await fetch(CHROME_STORE_URL, { redirect: "follow", next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return false;
    // an unpublished id lands on the store's "not found" page, sometimes with a 200
    const html = await res.text();
    return html.includes(CHROME_STORE_ID) && /Ivyward/i.test(html);
  } catch {
    return false;
  }
}
