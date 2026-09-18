import {
  sanitizeIdentifier, uniqueName, parseNumber, parseBoolean,
  detectDateStyle, parseDate, inferColumn, coerce,
} from "../src/lib/infer";

let failed = 0;
function eq(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  const pass = a === e;
  if (!pass) failed++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label.padEnd(44)} ${pass ? "" : `got ${a}, want ${e}`}`);
}

console.log("-- identifiers --");
eq(sanitizeIdentifier("Employee Name"), "employee_name", "spaces to snake_case");
eq(sanitizeIdentifier("Total Salary (INR)"), "total_salary_inr", "punctuation stripped");
eq(sanitizeIdentifier("2024 Revenue"), "_2024_revenue", "leading digit prefixed");
eq(sanitizeIdentifier("select"), "select_", "reserved word escaped");
eq(sanitizeIdentifier("   "), "col", "empty falls back");
const taken = new Set<string>();
eq([uniqueName("dept", taken), uniqueName("dept", taken), uniqueName("dept", taken)], ["dept", "dept_2", "dept_3"], "duplicate headers");

console.log("\n-- numbers --");
eq(parseNumber("1,234.50"), 1234.5, "thousands separator");
eq(parseNumber("₹85,000"), 85000, "currency symbol");
eq(parseNumber("(1,234)"), -1234, "accounting negative");
eq(parseNumber("12.5%"), 0.125, "percentage");
eq(parseNumber("-42"), -42, "negative");
eq(parseNumber("1.2e3"), 1200, "scientific");
eq(parseNumber("N/A"), null, "blank marker");
eq(parseNumber("12 apples"), null, "not a number");
eq(parseNumber("2024-01-01"), null, "date is not a number");

console.log("\n-- booleans --");
eq(parseBoolean("Yes"), 1, "yes");
eq(parseBoolean("FALSE"), 0, "false");
eq(parseBoolean("maybe"), null, "non-boolean");

console.log("\n-- date style detection --");
eq(detectDateStyle(["2024-03-17", "2024-12-01"]), { style: "iso", ambiguous: false }, "ISO");
eq(detectDateStyle(["17/03/2024", "01/02/2024"]), { style: "dmy", ambiguous: false }, "day>12 proves day-first");
eq(detectDateStyle(["03/17/2024", "01/02/2024"]), { style: "mdy", ambiguous: false }, "second>12 proves month-first");
eq(detectDateStyle(["01/02/2024", "03/04/2024"]), { style: "dmy", ambiguous: true }, "genuinely ambiguous is flagged");
eq(detectDateStyle(["17-Mar-2024"]), { style: "mon", ambiguous: false }, "month name");
eq(detectDateStyle(["hello"]), { style: null, ambiguous: false }, "not a date");

console.log("\n-- date normalisation --");
eq(parseDate("17/03/2024", "dmy"), "2024-03-17", "dmy to ISO");
eq(parseDate("03/17/2024", "mdy"), "2024-03-17", "mdy to ISO");
eq(parseDate("Mar 17, 2024", "iso"), "2024-03-17", "month name to ISO");
eq(parseDate("2024-02-30", "iso"), null, "impossible date rejected");
eq(parseDate("2024-03-17T09:30", "iso"), "2024-03-17 09:30", "time preserved");

console.log("\n-- column inference --");
eq(inferColumn(["1", "2", "3"]).type, "number", "all numeric");
eq(inferColumn(["1", "2", "TBD"]).type, "text", "one bad cell keeps it text");
eq(inferColumn(["1", "2", ""]).type, "number", "blanks ignored");
eq(inferColumn(["yes", "no"]).type, "boolean", "booleans");
eq(inferColumn(["2024-01-01", "2024-06-15"]).type, "date", "dates");
eq(inferColumn([]).type, "text", "empty column");

console.log("\n-- coercion --");
eq(coerce("₹85,000", { type: "number" }), 85000, "number coerced");
eq(coerce("N/A", { type: "number" }), null, "blank to NULL");
eq(coerce("17/03/2024", { type: "date", dateStyle: "dmy" }), "2024-03-17", "date coerced");

console.log(`\n${failed === 0 ? "all inference tests passed" : `${failed} FAILED`}`);
process.exit(failed === 0 ? 0 : 1);
