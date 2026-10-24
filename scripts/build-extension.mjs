// builds the chrome extension: bundles extension/src (the shared portal engine + chrome adapter) into
// extension/background.js, writes the in-page helper to extension/dom-helper.js, then zips it for download.
// run: node scripts/build-extension.mjs
import { build } from "esbuild";
import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await build({
  entryPoints: [path.join(root, "extension/src/background.ts")],
  outfile: path.join(root, "extension/background.js"),
  bundle: true,
  format: "iife",
  target: "chrome116",
  platform: "browser",
  tsconfig: path.join(root, "tsconfig.json"),
  legalComments: "none",
  banner: { js: "// automaster runner: built from extension/src by scripts/build-extension.mjs. don't edit by hand." },
});
const dom = readFileSync(path.join(root, "src/lib/runner-dom.ts"), "utf8");
const m = dom.match(/String\.raw`([\s\S]*)`;\s*$/);
if (!m) throw new Error("couldn't find DOM_HELPER");
writeFileSync(path.join(root, "extension/dom-helper.js"), m[1].trim() + "\n");
if (existsSync(path.join(root, "extension/runner.js"))) rmSync(path.join(root, "extension/runner.js"));
execFileSync("python3", [path.join(root, "scripts/pack-extension.py")], { stdio: "inherit" });
