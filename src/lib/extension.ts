import manifest from "../../extension/manifest.json";

// the newest Ivyward runner the site offers (public/ivyward-runner.zip). the extension and the site compare their
// version with this and say when an update is waiting.
export const EXTENSION_VERSION: string = manifest.version;
export const EXTENSION_ZIP = "/ivyward-runner.zip";

// "1.2.10" > "1.2.9"
export function olderThan(v: string | null | undefined, than: string = EXTENSION_VERSION): boolean {
  if (!v) return false;
  const a = v.split(".").map((x) => parseInt(x, 10) || 0);
  const b = than.split(".").map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) < (b[i] ?? 0);
  }
  return false;
}
