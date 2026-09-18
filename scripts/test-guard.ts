import { guard } from "../src/lib/sql-guard";

const cases: [string, boolean, string][] = [
  ["SELECT 1", true, "plain select"],
  ["  select * from employees ", true, "leading space, lowercase"],
  ["WITH t AS (SELECT 1) SELECT * FROM t", true, "CTE"],
  ["SELECT * FROM emp WHERE name = 'delete me'", true, "keyword inside a string literal"],
  ["SELECT * FROM emp WHERE note = 'a; DROP TABLE x'", true, "semicolon inside a literal"],
  ["SELECT * FROM emp -- drop table x", true, "keyword in a line comment"],
  ["SELECT /* drop */ 1", true, "keyword in a block comment"],
  ['SELECT "drop" FROM emp', true, "keyword as a quoted identifier"],
  ["SELECT * FROM emp;", true, "trailing semicolon is tolerated"],
  ["DROP TABLE employees", false, "bare DROP"],
  ["SELECT 1; DROP TABLE employees", false, "stacked statement"],
  ["INSERT INTO emp VALUES (1)", false, "INSERT"],
  ["UPDATE emp SET salary = 0", false, "UPDATE"],
  ["ATTACH DATABASE '/etc/passwd' AS x", false, "ATTACH"],
  ["PRAGMA table_info(emp)", false, "PRAGMA"],
  ["SELECT load_extension('evil.so')", false, "load_extension"],
  ["", false, "empty"],
  ["   ", false, "whitespace only"],
];

let failed = 0;
for (const [sql, expected, label] of cases) {
  const r = guard(sql);
  const pass = r.ok === expected;
  if (!pass) failed++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label.padEnd(36)} ${r.ok ? "allowed" : `blocked: ${r.reason}`}`);
}

// The wrapper must preserve the original query verbatim.
const w = guard("SELECT dept, COUNT(*) c FROM emp GROUP BY dept ORDER BY c DESC LIMIT 3");
console.log("\nwrapped:", w.sql?.replace(/\n/g, " "));

console.log(`\n${failed === 0 ? "all guard tests passed" : `${failed} FAILED`}`);
process.exit(failed === 0 ? 0 : 1);
