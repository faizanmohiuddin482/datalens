/**
 * End-to-end over the real sample files, in Node, without a browser.
 *
 * Exercises everything except React and the model call: parse -> infer -> load
 * into SQLite -> profile -> join detection -> guarded execution. Expected values
 * are computed independently from the CSVs so the assertions test the pipeline
 * rather than restating it.
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import Papa from "papaparse";
import { Workspace, type RawSheet } from "../src/lib/db";
import { findJoinCandidates, describeSchema } from "../src/lib/profile";

const require = createRequire(import.meta.url);
const wasmDir = require.resolve("sql.js/dist/sql-wasm.js").replace(/sql-wasm\.js$/, "");

let failed = 0;
function check(pass: boolean, label: string, detail = "") {
  if (!pass) failed++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label.padEnd(52)} ${detail}`);
}
function eq(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  check(a === e, label, a === e ? "" : `got ${a}, want ${e}`);
}

function sheetFrom(file: string): RawSheet {
  const text = readFileSync(`public/samples/${file}`, "utf8");
  const rows = Papa.parse<unknown[]>(text, { header: false, skipEmptyLines: "greedy" }).data;
  return {
    label: file.replace(/\.csv$/, ""),
    source: file,
    headers: rows[0].map(String),
    rows: rows.slice(1),
  };
}

// --- independent ground truth, straight from the CSV text -------------------
const empRows = sheetFrom("employees.csv");
const compRows = sheetFrom("compensation.csv");

const deptOf = new Map<string, string>();
const statusOf = new Map<string, string>();
for (const r of empRows.rows) {
  deptOf.set(String(r[0]), String(r[2]));
  statusOf.set(String(r[0]), String(r[6]));
}
const ctcOf = new Map<string, number>();
for (const r of compRows.rows) {
  ctcOf.set(String(r[0]), Number(String(r[1]).replace(/[₹,]/g, "")));
}

const engActive = [...ctcOf.entries()].filter(
  ([id]) => deptOf.get(id) === "Engineering" && statusOf.get(id) === "Active",
);
const expectedAvg = engActive.reduce((s, [, v]) => s + v, 0) / engActive.length;
const expectedHeadcount = [...statusOf.values()].filter((s) => s === "Active").length;

// --- the pipeline under test ------------------------------------------------
const ws = await Workspace.create((f) => wasmDir + f);
for (const f of ["employees.csv", "compensation.csv", "attendance.csv"]) ws.addSheet(sheetFrom(f));

console.log("-- ingest --");
eq(ws.tables.map((t) => t.name), ["employees", "compensation", "attendance"], "three tables loaded");
eq(ws.tables[0].rowCount, 102, "employees row count");
eq(ws.tables[2].rowCount, 546, "attendance row count");

console.log("\n-- inferred types --");
const emp = ws.tables[0], comp = ws.tables[1], att = ws.tables[2];
const typeOf = (t: typeof emp, col: string) => t.columns.find((c) => c.sqlName === col)?.type;
eq(typeOf(emp, "joining_date"), "date", "dd/mm/yyyy recognised as a date");
eq(typeOf(emp, "department"), "text", "department is text");
eq(typeOf(comp, "annual_ctc"), "number", "₹1,234,000 recognised as a number");
eq(typeOf(comp, "variable_pay"), "number", "12% recognised as a number");
eq(typeOf(att, "overtime_hours"), "number", "N/A treated as NULL, column stays numeric");

console.log("\n-- profiling --");
const dept = emp.columns.find((c) => c.sqlName === "department")!;
eq(dept.distinctValues?.length, 6, "low-cardinality values captured for grounding");
eq(dept.distinctValues?.includes("Engineering"), true, "literal value available to the model");
const ctc = comp.columns.find((c) => c.sqlName === "annual_ctc")!;
check(Number(ctc.min) > 500_000 && Number(ctc.max) < 5_000_000, "CTC range is plausible", `${ctc.min}–${ctc.max}`);
check(ws.warnings.length === 0, "no ambiguous-date warning (day>12 present in data)", ws.warnings.join("; "));

console.log("\n-- join detection --");
const joins = findJoinCandidates(ws.tables);
const key = joins.find((j) => j.leftTable === "employees" && j.rightTable === "compensation");
check(!!key, "employees ↔ compensation relationship found");
eq([key?.leftColumn, key?.rightColumn], ["employee_id", "emp_id"], "joined on the right columns");
check(describeSchema(ws.tables, joins).includes("RELATIONSHIPS"), "relationships reach the prompt");

console.log("\n-- cross-file query correctness --");
const avg = ws.run(`
  SELECT AVG(c.annual_ctc) AS avg_ctc
  FROM employees e JOIN compensation c ON e.employee_id = c.emp_id
  WHERE e.department = 'Engineering' AND e.status = 'Active'`);
const got = Number(avg.result!.rows[0][0]);
check(Math.abs(got - expectedAvg) < 0.5, "average CTC matches ground truth",
      `sqlite ${got.toFixed(2)} vs csv ${expectedAvg.toFixed(2)}`);

const head = ws.run("SELECT COUNT(*) FROM employees WHERE status = 'Active'");
eq(Number(head.result!.rows[0][0]), expectedHeadcount, "active headcount matches ground truth");

const trend = ws.run(`
  SELECT strftime('%Y', joining_date) AS year, COUNT(*) AS joiners
  FROM employees GROUP BY year ORDER BY year`);
check(trend.result!.rows.length >= 5, "date grouping works on normalised ISO dates",
      trend.result!.rows.map((r) => `${r[0]}:${r[1]}`).join(" "));
eq(trend.result!.rows.reduce((s, r) => s + Number(r[1]), 0), 102, "every row lands in a year bucket");

const nulls = ws.run("SELECT COUNT(*) FROM attendance WHERE overtime_hours IS NULL");
check(Number(nulls.result!.rows[0][0]) > 0, "N/A cells became SQL NULL",
      `${nulls.result!.rows[0][0]} nulls`);

console.log("\n-- guard in the real path --");
eq(ws.run("DROP TABLE employees").error, "Only SELECT queries are allowed.", "destructive SQL blocked before execution");
eq(ws.run("SELECT * FROM nope").error?.includes("no such table"), true, "genuine SQL errors surface for the repair loop");
eq(ws.tables.length, 3, "tables survived the blocked DROP");

console.log(`\n${failed === 0 ? "end-to-end pipeline verified" : `${failed} FAILED`}`);
ws.close();
process.exit(failed === 0 ? 0 : 1);
