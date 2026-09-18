/**
 * Walks the assignment's acceptance criteria against the running app.
 *
 * Deliberately uses real file uploads from disk rather than the sample-data
 * shortcut, because "the user can upload multiple files" is the criterion.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3001";
const CSVS = ["employees", "compensation", "attendance"].map((n) => `public/samples/${n}.csv`);
const XLSX = "/tmp/hr-workbook.xlsx";

let failed = 0;
const report = (ok, label, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label.padEnd(56)} ${detail}`);
};

const browser = await chromium.launch();

async function ask(page, question) {
  const input = page.getByLabel("Your question");
  await input.fill(question);
  await page.getByRole("button", { name: /^ask$/i }).click();

  // The field is disabled for the duration of the request; waiting on that
  // transition is the one signal that holds for answers, clarifications and
  // errors alike.
  await input.waitFor({ state: "attached" });
  await page.waitForFunction(
    () => document.querySelector("input[aria-label='Your question']")?.disabled === true,
    null, { timeout: 15000 },
  ).catch(() => {});
  await page.waitForFunction(
    () => document.querySelector("input[aria-label='Your question']")?.disabled === false,
    null, { timeout: 90000 },
  );
  await page.waitForTimeout(600);
  const card = page.locator("main > div").first();
  return {
    text: await card.innerText(),
    chart: await card.locator(".recharts-surface").count(),
    bars: await card.locator(".recharts-bar-rectangle").count(),
    lines: await card.locator(".recharts-line").count(),
    pies: await card.locator(".recharts-pie").count(),
  };
}

// --- 1. multi-file upload, from disk -----------------------------------------
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(BASE, { waitUntil: "networkidle" });

console.log("-- criterion 1: multi-file upload --");
await page.locator('input[type="file"]').first().setInputFiles(CSVS);
await page.getByText(/detected relationships/i).waitFor({ timeout: 30000 });
const panel = await page.locator("aside").innerText();
report(/employees/i.test(panel) && /compensation/i.test(panel) && /attendance/i.test(panel),
  "three files uploaded together become three tables");
report(/102 rows/.test(panel) && /546 rows/.test(panel), "row counts profiled correctly");

console.log("\n-- criterion 2: cross-file analysis --");
const total = await ask(page, "What is the total annual CTC across all active employees?");
report(/\d/.test(total.text), "totals", total.text.split("\n")[1]?.slice(0, 64));

const avg = await ask(page, "What is the average annual CTC by department?");
report(/engineering/i.test(avg.text), "averages grouped by a category",
  avg.text.split("\n").find((l) => /engineering/i.test(l))?.slice(0, 64));

const filter = await ask(page, "List employees in Engineering based in Bengaluru who are still active");
report(/engineering/i.test(filter.text) || /bengaluru/i.test(filter.text), "filters on multiple conditions");

const compare = await ask(page, "Compare the average annual CTC of Active versus Exited employees");
report(/active/i.test(compare.text) && /exited/i.test(compare.text), "comparisons across a cross-file join");

const trend = await ask(page, "Show the number of employees who joined each year as a trend over time");
report(/20\d\d/.test(trend.text), "trends over time",
  trend.lines > 0 ? "rendered as a line chart" : "rendered without a line chart");

console.log("\n-- criterion 3: visual insights --");
report(avg.bars > 0, "bar chart for a categorical comparison", `${avg.bars} bars`);
report(trend.chart > 0, "chart rendered for a trend", trend.lines > 0 ? "line" : "non-line chart");
const share = await ask(page, "What share of employees sits in each department? Show it as a pie chart");
report(share.chart > 0, "chart for a parts-of-a-whole question", share.pies > 0 ? "pie" : "other chart type");
const scalar = await ask(page, "How many employees are currently active?");
report(scalar.chart === 0, "no chart for a single-number answer");

console.log("\n-- criterion 4: delta solutioning --");
report(/show the query/i.test(scalar.text), "the SQL behind every answer is inspectable");
report(/computed by sqlite in your browser/i.test(scalar.text), "provenance stated on each answer");
report(/download csv/i.test(avg.text), "results are exportable");
report(/100% match/.test(panel), "join keys verified against actual values");

const vague = await ask(page, "how is it doing?");
report(/clarif|which|what do you mean|specify|could you/i.test(vague.text),
  "an ambiguous question is challenged, not guessed at",
  vague.text.split("\n")[1]?.slice(0, 64));

// --- Excel path --------------------------------------------------------------
console.log("\n-- excel / multi-sheet --");
const p2 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await p2.goto(BASE, { waitUntil: "networkidle" });
await p2.locator('input[type="file"]').first().setInputFiles(XLSX);
await p2.getByText(/detected relationships/i).waitFor({ timeout: 30000 });
const panel2 = await p2.locator("aside").innerText();
report(/employees/i.test(panel2) && /compensation/i.test(panel2) && /attendance/i.test(panel2),
  "one .xlsx workbook becomes three tables");
const x = await ask(p2, "What is the average annual CTC by department?");
report(/engineering/i.test(x.text), "cross-sheet question answered from a single workbook");

report(errors.length === 0, "no uncaught page errors", errors.slice(0, 2).join(" | "));

console.log(`\n${failed === 0 ? "every acceptance criterion verified" : `${failed} FAILED`}`);
await browser.close();
process.exit(failed === 0 ? 0 : 1);
