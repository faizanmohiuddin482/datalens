import { toCsv, fileNameFor } from "../src/lib/export";
import type { QueryResult } from "../src/lib/types";

let failed = 0;
function eq(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  const pass = a === e;
  if (!pass) failed++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label.padEnd(50)} ${pass ? "" : `got ${a}, want ${e}`}`);
}

const make = (columns: string[], rows: unknown[][]): QueryResult =>
  ({ columns, rows, truncated: false, elapsedMs: 1 });

console.log("-- csv shape --");
eq(toCsv(make(["a", "b"], [[1, 2], [3, 4]])), "a,b\r\n1,2\r\n3,4\r\n", "header and rows");
eq(toCsv(make(["a"], [])), "a\r\n", "header only when no rows");
eq(toCsv(make(["a"], [[null]])), "a\r\n\r\n", "null becomes an empty field");

console.log("\n-- escaping --");
eq(toCsv(make(["a"], [["x,y"]])), 'a\r\n"x,y"\r\n', "comma forces quoting");
eq(toCsv(make(["a"], [['say "hi"']])), 'a\r\n"say ""hi"""\r\n', "quotes are doubled");
eq(toCsv(make(["a"], [["line1\nline2"]])), 'a\r\n"line1\nline2"\r\n', "newline forces quoting");
eq(toCsv(make(["a"], [[2671529.411764706]])), "a\r\n2671529.411764706\r\n", "numbers unformatted for recalculation");

console.log("\n-- spreadsheet formula injection --");
eq(toCsv(make(["a"], [["=1+1"]])), "a\r\n'=1+1\r\n", "leading = neutralised");
eq(toCsv(make(["a"], [["+SUM(A1)"]])), "a\r\n'+SUM(A1)\r\n", "leading + neutralised");
eq(toCsv(make(["a"], [["-2+3"]])), "a\r\n'-2+3\r\n", "leading - neutralised");
eq(toCsv(make(["a"], [["@import"]])), "a\r\n'@import\r\n", "leading @ neutralised");
eq(toCsv(make(["a"], [["=HYPERLINK(\"x\"),y"]])), 'a\r\n"\'=HYPERLINK(""x""),y"\r\n', "neutralised and quoted together");
eq(toCsv(make(["a"], [["a=1"]])), "a\r\na=1\r\n", "= not at the start is left alone");

console.log("\n-- file names --");
const d = new Date("2026-09-18T00:00:00Z");
eq(fileNameFor("Average CTC by department?", d), "average-ctc-by-department-2026-09-18.csv", "slug from the question");
eq(fileNameFor("   ", d), "result-2026-09-18.csv", "blank question falls back");
eq(fileNameFor("a".repeat(200), d).length <= 60 + 15, true, "long questions are capped");
eq(fileNameFor("Who joined in 2024 — and where?", d), "who-joined-in-2024-and-where-2026-09-18.csv", "punctuation collapsed, no trailing dash");

console.log(`\n${failed === 0 ? "all export tests passed" : `${failed} FAILED`}`);
process.exit(failed === 0 ? 0 : 1);
