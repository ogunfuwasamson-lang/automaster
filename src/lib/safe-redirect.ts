// a "next" path after sign-in: only a path on this site. "/\\evil.com" and "//evil.com" are other sites to a browser.
export const safeNextPath = (next: string | null | undefined, fallback = "/dashboard") => (next && /^\/(?![/\\])[^\s\\]*$/.test(next) ? next : fallback);
