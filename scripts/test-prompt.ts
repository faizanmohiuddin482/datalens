import { extractJson, parsePlan, reconcileChart, buildNarrateMessages } from "../src/lib/prompt";
import { findJoinCandidates, describeSchema, normaliseKey } from "../src/lib/profile";
import type { QueryResult, TableProfile } from "../src/lib/types";

let failed = 0;
function eq(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  const pass = a === e;
  if (!pass) failed++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label.padEnd(46)} ${pass ? "" : `got ${a}, want ${e}`}`);
}
function throws(fn: () => unknown, label: string) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  if (!threw) failed++;
  console.log(`${threw ? "PASS" : "FAIL"}  ${label}`);
}

console.log("-- JSON extraction --");
eq(extractJson('{"a":1}'), { a: 1 }, "bare JSON");
eq(extractJson('```json\n{"a":1}\n```'), { a: 1 }, "fenced JSON");
eq(extractJson('Here you go:\n{"a":1}\nHope that helps'), { a: 1 }, "JSON wrapped in prose");
throws(() => extractJson("no json at all"), "no JSON throws");

console.log("\n-- plan parsing --");
eq(parsePlan('{"kind":"query","sql":"SELECT 1","explanation":"x","chart":null}'),
   { kind: "query", sql: "SELECT 1", explanation: "x", chart: null }, "query plan");
eq(parsePlan('{"kind":"clarify","question":"which year?","suggestions":["2024","2025"]}'),
   { kind: "clarify", question: "which year?", suggestions: ["2024", "2025"] }, "clarify plan");
eq(parsePlan('{"sql":"SELECT 1"}').kind, "query", "kind inferred from sql");
eq((parsePlan('{"kind":"query","sql":"SELECT 1","chart":{"type":"pie"}}') as {chart: unknown}).chart,
   null, "chart missing x/y is dropped");
eq((parsePlan('{"kind":"query","sql":"SELECT 1","chart":{"type":"donut","x":"a","y":["b"]}}') as {chart: unknown}).chart,
   null, "unknown chart type is dropped");
throws(() => parsePlan('{"kind":"query","explanation":"hi"}'), "query with no SQL throws");

console.log("\n-- chart reconciliation --");
eq(reconcileChart({ type: "bar", x: "dept", y: ["total"] }, ["dept", "total"]),
   { type: "bar", x: "dept", y: ["total"] }, "columns present");
eq(reconcileChart({ type: "bar", x: "dept", y: ["total"] }, ["department", "total"]),
   null, "x column absent drops the chart");
eq(reconcileChart({ type: "bar", x: "dept", y: ["total", "ghost"] }, ["dept", "total"]),
   { type: "bar", x: "dept", y: ["total"] }, "absent series dropped, chart kept");

console.log("\n-- join detection --");
const tables: TableProfile[] = [
  { name: "employees", source: "employees.csv", rowCount: 3, columns: [
    { name: "Employee ID", sqlName: "employee_id", type: "text", nullCount: 0, distinctCount: 3, distinctValues: ["E1","E2","E3"], sampleValues: ["E1"] },
    { name: "Department", sqlName: "department", type: "text", nullCount: 0, distinctCount: 2, distinctValues: ["Engineering","Sales"], sampleValues: ["Sales"] },
  ]},
  { name: "attendance", source: "attendance.xlsx", rowCount: 4, columns: [
    { name: "Emp ID", sqlName: "emp_id", type: "text", nullCount: 0, distinctCount: 3, distinctValues: ["E1","E2","E3"], sampleValues: ["E1"] },
    { name: "Days", sqlName: "days", type: "number", nullCount: 0, distinctCount: 4, sampleValues: ["20"], min: "18", max: "22" },
  ]},
];
const joins = findJoinCandidates(tables);
eq(joins.length, 1, "exactly one join candidate found");
eq([joins[0].leftColumn, joins[0].rightColumn, joins[0].overlap], ["employee_id", "emp_id", 1], "employee_id joins emp_id at 100%");
eq(normaliseKey("employee_id"), normaliseKey("emp_id"), "key names normalise together");

console.log("\n-- schema description --");
const schema = describeSchema(tables, joins);
eq(schema.includes("'Engineering', 'Sales'"), true, "literal values inlined for grounding");
eq(schema.includes("range 18 to 22"), true, "numeric range included");
eq(schema.includes("100% of values match"), true, "join evidence included");
eq(schema.includes("3 rows, from employees.csv"), true, "provenance included");

console.log("\n-- narration input --");
const result: QueryResult = { columns: ["dept", "total"], rows: [["Sales", 100], ["Eng", null]], truncated: false, elapsedMs: 1 };
const msgs = buildNarrateMessages("totals?", "SELECT 1", result);
eq(msgs[1].content.includes("Sales | 100"), true, "rows rendered for the model");
eq(msgs[1].content.includes("Eng | "), true, "nulls rendered as blank");

console.log(`\n${failed === 0 ? "all prompt/profile tests passed" : `${failed} FAILED`}`);
process.exit(failed === 0 ? 0 : 1);
