/**
 * Renders a markdown document to PDF through a real browser, styled to match
 * the app: mono headings, ink rules, blue accents, a yellow underline.
 *
 *   node md2pdf.mjs <input.md> <output.pdf>
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const [src, out] = process.argv.slice(2);
const md = readFileSync(src, "utf8");

const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Inline spans. Code is lifted out first so its contents stay literal. */
function inline(text) {
  const held = [];
  let t = text.replace(/`([^`]+)`/g, (_, c) => {
    held.push("<code>" + esc(c) + "</code>");
    return "@@HOLD" + (held.length - 1) + "@@";
  });
  t = esc(t);
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  return t.replace(/@@HOLD(\d+)@@/g, (_, i) => held[Number(i)]);
}

const blocks = [];
let para = [];
const flush = () => {
  if (para.length) {
    blocks.push("<p>" + inline(para.join(" ")) + "</p>");
    para = [];
  }
};

for (const raw of md.split("\n")) {
  const line = raw.trimEnd();
  if (!line.trim()) { flush(); continue; }
  if (line.startsWith("## ")) { flush(); blocks.push("<h2>" + inline(line.slice(3)) + "</h2>"); continue; }
  if (line.startsWith("# ")) { flush(); blocks.push("<h1>" + inline(line.slice(2)) + "</h1>"); continue; }
  if (line.startsWith("> ")) { flush(); blocks.push("<blockquote>" + inline(line.slice(2)) + "</blockquote>"); continue; }
  para.push(line.trim());
}
flush();

const css = `
  :root { --ink:#0b1020; --mute:#5b6472; --blue:#2f5bff; --yellow:#ffd400; --tint:#eaf0ff; }
  @page { size: A4; margin: 12mm 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "IBM Plex Sans", system-ui, sans-serif;
    color: var(--ink); font-size: 9pt; line-height: 1.4; margin: 0;
    -webkit-font-smoothing: antialiased;
  }
  h1 {
    font-family: "IBM Plex Mono", monospace; font-size: 13.5pt; font-weight: 700;
    text-transform: uppercase; letter-spacing: .06em;
    margin: 0 0 1.6mm; padding-bottom: 1.6mm; border-bottom: 2px solid var(--ink);
  }
  h1::after {
    content: ""; display: block; width: 34mm; height: 3px;
    background: var(--yellow); margin-top: 1.6mm;
  }
  h2 {
    font-family: "IBM Plex Mono", monospace; font-size: 8.8pt; font-weight: 700;
    text-transform: uppercase; letter-spacing: .08em;
    margin: 3.6mm 0 1.4mm;
  }
  p { margin: 0 0 1.9mm; text-align: justify; hyphens: auto; }
  strong { font-weight: 600; }
  em { font-style: italic; }
  code { font-family: "IBM Plex Mono", monospace; font-size: 8.6pt; background: var(--tint); padding: 0 .6mm; }
  a { color: var(--blue); text-decoration: none; }
  blockquote {
    font-family: "IBM Plex Mono", monospace; font-weight: 600; font-size: 9.2pt;
    margin: 2.2mm 0; padding: 2mm 2.6mm; border: 2px solid var(--ink);
    background: var(--tint); text-align: left;
  }
`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>${css}</style></head><body>${blocks.join("\n")}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: out, format: "A4", printBackground: true });
await browser.close();
console.log("wrote " + out);
