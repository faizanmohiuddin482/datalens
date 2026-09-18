/**
 * Records a demo walkthrough by driving the real app in a real browser.
 *
 * Playwright captures the page itself, which means no screen recorder, no
 * desktop clutter, and a run that is reproducible after any change. A synthetic
 * cursor is drawn in so the result reads as a demo rather than as a test run.
 *
 *   node scripts/record-demo.mjs [url] [outDir]
 */
import { chromium } from "playwright";
import { readdirSync, renameSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3001";
const OUT = process.argv[3] ?? `${process.env.HOME}/Desktop`;
const SIZE = { width: 1440, height: 900 };

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: SIZE,
  recordVideo: { dir: "/tmp/dlvideo", size: SIZE },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

/** A visible pointer, since a headless browser has none. */
async function installCursor() {
  await page.addStyleTag({
    content: `
      #demo-cursor {
        position: fixed; z-index: 2147483647; width: 18px; height: 18px;
        margin: -9px 0 0 -9px; border-radius: 50% !important;
        background: rgba(47,91,255,.35); border: 2px solid #2f5bff;
        pointer-events: none; transition: transform 60ms linear;
        left: 0; top: 0;
      }
      #demo-cursor.click { background: #ffd400; transform: scale(.7); }
    `,
  });
  await page.evaluate(() => {
    const c = document.createElement("div");
    c.id = "demo-cursor";
    document.body.appendChild(c);
    window.__moveCursor = (x, y) => {
      const el = document.getElementById("demo-cursor");
      if (el) el.style.transform = `translate(${x}px, ${y}px)`;
    };
    window.__clickCursor = () => {
      const el = document.getElementById("demo-cursor");
      if (!el) return;
      el.classList.add("click");
      setTimeout(() => el.classList.remove("click"), 220);
    };
  });
}

let at = { x: 40, y: 40 };

/** Glides the pointer to an element so the eye can follow it. */
async function glideTo(locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) return;
  const to = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const steps = 22;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    // Ease-out, so the pointer settles rather than stopping dead.
    const e = 1 - Math.pow(1 - t, 3);
    const x = at.x + (to.x - at.x) * e;
    const y = at.y + (to.y - at.y) * e;
    await page.evaluate(([x, y]) => window.__moveCursor(x, y), [x, y]);
    await page.waitForTimeout(16);
  }
  at = to;
}

async function click(locator) {
  await glideTo(locator);
  await page.evaluate(() => window.__clickCursor());
  await page.waitForTimeout(160);
  await locator.click();
}

const beat = (ms) => page.waitForTimeout(ms);

/** Types a question at human speed and waits for the answer to settle. */
async function ask(question, settle = 4200) {
  const field = page.getByLabel("Your question");
  await click(field);
  await field.pressSequentially(question, { delay: 38 });
  await beat(500);
  await click(page.getByRole("button", { name: /^ask$/i }));
  await page.waitForFunction(
    () => document.querySelector("input[aria-label='Your question']")?.disabled === false,
    null, { timeout: 90000 },
  );
  await beat(settle);
}

// ---------------------------------------------------------------- the demo --
await page.goto(BASE, { waitUntil: "networkidle" });
await installCursor();
await beat(2200);

// 1. Three related files, loaded together.
await click(page.getByRole("button", { name: /load sample hr data/i }));
await page.getByText(/detected relationships/i).waitFor({ timeout: 40000 });
await installCursor();
await beat(1200);

// 2. The profiler's findings: tables, types, and verified join keys.
await glideTo(page.getByText(/detected relationships/i));
await beat(3200);

// 3. A question that has to span two files.
await ask("What is the average annual CTC by department?", 5200);

// 4. The evidence behind the number.
await click(page.getByRole("button", { name: /show the query/i }).first());
await beat(4200);

// 5. A trend over time.
await ask("How many employees joined each year? Show the trend.", 5200);

// 6. Ambiguity is challenged, not guessed at.
await ask("how is it doing?", 5000);

await beat(1200);
await context.close();
await browser.close();

const file = readdirSync("/tmp/dlvideo").find((f) => f.endsWith(".webm"));
const dest = `${OUT}/datalens-demo.webm`;
renameSync(`/tmp/dlvideo/${file}`, dest);
console.log(`recorded → ${dest}`);
