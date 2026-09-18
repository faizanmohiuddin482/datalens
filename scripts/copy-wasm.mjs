/**
 * Copies SQLite's WebAssembly binaries out of the installed sql.js into public/.
 *
 * Two are needed, not one. sql.js exports a different build per environment —
 * `sql-wasm-browser.js` in a bundler, `sql-wasm.js` under Node — and each asks
 * for a binary named after itself. The browser build requesting a binary only
 * the Node build ships is a 404 at runtime, surfacing as an opaque emscripten
 * abort with no mention of the missing file.
 *
 * Runs before dev and build so the served binaries can never drift from the
 * glue that loads them.
 */
import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { basename } from "node:path";

const require = createRequire(import.meta.url);

// Debug builds are skipped — same behaviour, ~77 KB larger each.
const NEEDED = ["sql-wasm.wasm", "sql-wasm-browser.wasm"];

mkdirSync("public", { recursive: true });

for (const name of NEEDED) {
  const from = require.resolve(`sql.js/dist/${name}`);
  const to = `public/${basename(from)}`;
  copyFileSync(from, to);
  console.log(`${name} → ${to} (${(statSync(to).size / 1024).toFixed(0)} KB)`);
}
