/** Drives the real app in Chromium: upload -> profile -> ask -> chart. */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3001";
const shots = "/tmp/dlshots";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

const step = async (label, fn) => {
  try { await fn(); console.log(`PASS  ${label}`); }
  catch (e) { console.log(`FAIL  ${label}\n      ${e.message.split("\n")[0]}`); }
};

await step("page loads", async () => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1 }).waitFor({ timeout: 10000 });
});
await page.screenshot({ path: `${shots}/1-empty.png`, fullPage: true });

await step("sample data loads into SQLite", async () => {
  await page.getByRole("button", { name: /load sample hr data/i }).click();
  await page.getByText(/employees/i).first().waitFor({ timeout: 25000 });
});
await page.screenshot({ path: `${shots}/2-loaded.png`, fullPage: true });

await step("three tables profiled", async () => {
  for (const t of ["employees", "compensation", "attendance"]) {
    await page.getByText(t, { exact: false }).first().waitFor({ timeout: 5000 });
  }
});

await step("join relationships detected in UI", async () => {
  await page.getByText(/detected relationships/i).waitFor({ timeout: 5000 });
});

await step("ask a cross-file question", async () => {
  await page.getByLabel("Your question").fill("What is the average annual CTC by department?");
  await page.getByRole("button", { name: /^ask$/i }).click();
  await page.getByText(/show the query/i).waitFor({ timeout: 60000 });
});
await page.screenshot({ path: `${shots}/3-answer.png`, fullPage: true });

await step("a chart rendered", async () => {
  await page.locator("svg.recharts-surface").first().waitFor({ timeout: 5000 });
});

await step("the SQL is disclosable", async () => {
  await page.getByRole("button", { name: /show the query/i }).click();
  await page.locator("pre").first().waitFor({ timeout: 5000 });
  console.log("      SQL:", (await page.locator("pre").first().innerText()).replace(/\s+/g, " ").slice(0, 150));
});
await page.screenshot({ path: `${shots}/4-sql.png`, fullPage: true });

await step("scalar question shows a headline figure", async () => {
  await page.getByLabel("Your question").fill("How many employees are currently active?");
  await page.getByRole("button", { name: /^ask$/i }).click();
  await page.locator("mark").first().waitFor({ timeout: 60000 });
  console.log("      headline:", await page.locator("mark").first().innerText());
});

await step("the answer is a written sentence, not the fallback", async () => {
  const text = await page.locator("article, .frame").first().innerText();
  const line = text.split("\n").find((l) => /\d/.test(l) && l.length > 30) ?? "";
  console.log("      narration:", line.slice(0, 140));
  if (/^\d+ rows? returned\.?$/.test(line.trim())) throw new Error("narration fell back");
});
await page.screenshot({ path: `${shots}/5-scalar.png`, fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
// Recharts re-measures via a ResizeObserver; give it a frame before asserting.
await page.waitForTimeout(800);
await step("no horizontal overflow at phone width", async () => {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (over > 1) throw new Error(`page scrolls ${over}px sideways`);
});
await page.screenshot({ path: `${shots}/6-mobile.png`, fullPage: true });

console.log(errors.length ? `\nCONSOLE ERRORS (${errors.length}):` : "\nno console errors");
for (const e of [...new Set(errors)].slice(0, 12)) console.log("  ·", e.slice(0, 220));

await browser.close();
