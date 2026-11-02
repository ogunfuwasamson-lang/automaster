// the Ivyward runner on the Chrome Web Store (published and public since 2 Nov 2026)
export const CHROME_STORE_ID = "blccjbkkijhejelihanjilmkapoigffl";
export const CHROME_STORE_URL = `https://chromewebstore.google.com/detail/${CHROME_STORE_ID}`;

// kept as a switch so the manual download can come back if the listing is ever taken down (CHROME_STORE_LIVE=0)
export async function storeLive(): Promise<boolean> {
  return process.env.CHROME_STORE_LIVE !== "0";
}
