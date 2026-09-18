/**
 * Prompt construction and response parsing.
 *
 * Pure: no network, no database. The model's reply is parsed and validated here
 * before anything downstream trusts its shape.
 */

import { describeSchema } from "./profile";
import type { ChartSpec, JoinCandidate, Plan, QueryResult, TableProfile } from "./types";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

const PLAN_SYSTEM = `You translate questions about spreadsheet data into a single SQLite query.

You are given the exact schema of tables loaded from the user's uploaded files.

RULES
1. Use only the tables and columns listed. Never invent a name. If the data cannot answer the question, say so with a clarify response.
2. When filtering a text column, use the literal values shown in the schema, matching their exact spelling and capitalisation. If the user's wording differs from the stored value, map it to the stored value.
3. SQLite dialect only. Dates are stored as ISO text ('YYYY-MM-DD'), so they compare and sort with plain operators; use strftime('%Y', col) or strftime('%Y-%m', col) to group by period.
4. Prefer an explicit JOIN over guessing. Only join on the relationships listed under RELATIONSHIPS. Joining on an unlisted column pair is a bug: it silently multiplies rows and inflates every total.
5. Label every output column with a readable alias, e.g. SUM(salary) AS total_salary.
6. Return at most 200 rows. Aggregate or rank rather than dumping raw rows.
7. Never compute a number yourself. Your SQL is executed and the real result is returned to you afterwards.

AMBIGUITY
If the question could be read two materially different ways, or names something absent from the schema, return a clarify response instead of guessing. Answering the wrong question confidently is the worst outcome. A question that is merely broad is not ambiguous — answer it.

CHARTS
Set a chart when a comparison, distribution or trend is being shown:
- "bar" to compare a value across categories
- "line" for a value over time (x must be the date or period column)
- "pie" only for parts of a whole with 6 or fewer slices
Use "none" for a single number, a yes/no answer, or a plain list.
"x" is the category or time column; "y" lists the numeric columns. Both must match your SELECT aliases exactly.

OUTPUT
Reply with one JSON object and nothing else. No prose, no markdown fences.

{"kind":"query","sql":"SELECT ...","explanation":"one sentence on what the query does","chart":{"type":"bar","x":"department","y":["total_salary"],"title":"Total salary by department"}}

or

{"kind":"clarify","question":"what needs pinning down","suggestions":["a concrete rephrasing","another one"]}`;

export function buildPlanMessages(
  tables: TableProfile[],
  joins: JoinCandidate[],
  question: string,
): Message[] {
  return [
    { role: "system", content: PLAN_SYSTEM },
    { role: "user", content: `SCHEMA\n\n${describeSchema(tables, joins)}\n\nQUESTION\n${question}` },
  ];
}

/**
 * The repair turn. The failed SQL and the database's own error message are fed
 * back, which is far more actionable than re-asking the original question.
 */
export function buildRepairMessages(prior: Message[], badSql: string, error: string): Message[] {
  return [
    ...prior,
    { role: "assistant", content: JSON.stringify({ kind: "query", sql: badSql }) },
    {
      role: "user",
      content: `That query failed: ${error}

Re-read the schema above — the column and table names there are exact. Return the corrected JSON object, same format, nothing else.`,
    },
  ];
}

const NARRATE_SYSTEM = `You state the answer to a question about spreadsheet data, given the real result of a query that has already run.

Write prose — complete sentences a colleague would say out loud. This is the single most important rule. A list of values is not an answer.

RULES
1. Every number you write must appear verbatim in the results, copied exactly as shown. Never calculate, re-round, extrapolate or estimate.
2. One to three sentences, and always a full sentence naming what the number refers to. For a single figure, say what it counts or measures — not the bare number.
3. Lead with the answer. Then, if the result has several rows, add what stands out: the highest, the lowest, or a gap worth noticing. Do not recite every row — the table is shown alongside you.
4. When the result is empty, say plainly that no rows matched, and name the filter that excluded them.
5. No preamble ("Based on the data..."), no bullet points, no headings, no semicolon-separated value dumps.

EXAMPLES
Result: active_employee_count = 91
-> "91 employees are currently active."

Result: department/avg_annual_ctc over 6 rows
-> "Engineering has the highest average CTC at 2,671,529.41, about three times Support at 844,066.67. The remaining four departments sit between 1,355,600 and 2,038,863.64."`;

/** Caps how many result rows are shown to the model when narrating. */
export const NARRATE_ROW_CAP = 50;

export function buildNarrateMessages(question: string, sql: string, result: QueryResult): Message[] {
  const shown = result.rows.slice(0, NARRATE_ROW_CAP);

  // Numbers are formatted the same way the UI formats them, so "copy the value
  // verbatim" and "what the user sees" are the same string. Sending raw floats
  // invites 2,671,529.411764706 into the sentence.
  const cell = (c: unknown) =>
    c === null || c === undefined
      ? ""
      : typeof c === "number"
        ? c.toLocaleString("en-US", { maximumFractionDigits: 2 })
        : String(c);

  const table = [
    result.columns.join(" | "),
    ...shown.map((r) => r.map(cell).join(" | ")),
  ].join("\n");

  const note =
    result.rows.length > shown.length
      ? `\n\n(showing ${shown.length} of ${result.rows.length} rows)`
      : "";

  return [
    { role: "system", content: NARRATE_SYSTEM },
    { role: "user", content: `QUESTION\n${question}\n\nQUERY\n${sql}\n\nRESULT\n${table}${note}` },
  ];
}

/**
 * Pulls the JSON object out of a model reply. Models wrap JSON in prose or
 * fences often enough that a bare JSON.parse is not good enough.
 */
export function extractJson(raw: string): unknown {
  const text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : text;

  try {
    return JSON.parse(candidate);
  } catch {
    // Fall back to the outermost braces.
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("No JSON object in model response.");
    return JSON.parse(candidate.slice(start, end + 1));
  }
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function parseChart(v: unknown): ChartSpec | null {
  if (!v || typeof v !== "object") return null;
  const c = v as Record<string, unknown>;
  const type = c.type;
  if (type !== "bar" && type !== "line" && type !== "pie") return null;
  const x = typeof c.x === "string" ? c.x : "";
  const y = asStringArray(c.y);
  if (!x || y.length === 0) return null;
  return { type, x, y, title: typeof c.title === "string" ? c.title : undefined };
}

/** Validates the model's reply into a Plan, or throws with a usable message. */
export function parsePlan(raw: string): Plan {
  const obj = extractJson(raw) as Record<string, unknown>;

  if (obj.kind === "clarify" || (!obj.sql && typeof obj.question === "string")) {
    const question = typeof obj.question === "string" ? obj.question : "";
    if (!question) throw new Error("Clarify response had no question.");
    return { kind: "clarify", question, suggestions: asStringArray(obj.suggestions).slice(0, 4) };
  }

  if (typeof obj.sql !== "string" || !obj.sql.trim()) {
    throw new Error("Model response contained no SQL.");
  }

  return {
    kind: "query",
    sql: obj.sql.trim(),
    explanation: typeof obj.explanation === "string" ? obj.explanation : "",
    chart: parseChart(obj.chart),
  };
}

/**
 * A chart spec is only usable if its columns actually came back. The model
 * sometimes names a column it intended to select but didn't.
 */
export function reconcileChart(chart: ChartSpec | null, columns: string[]): ChartSpec | null {
  if (!chart || chart.type === "none") return null;
  if (!columns.includes(chart.x)) return null;
  const y = chart.y.filter((c) => columns.includes(c));
  if (y.length === 0) return null;
  return { ...chart, y };
}
