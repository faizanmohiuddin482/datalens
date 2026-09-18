/** Builds a multi-sheet .xlsx from the sample CSVs, for testing the Excel path. */
import * as XLSX from "xlsx";
import { readFileSync, writeFileSync } from "node:fs";
import Papa from "papaparse";

const wb = XLSX.utils.book_new();
for (const [file, sheet] of [["employees", "Employees"], ["compensation", "Compensation"], ["attendance", "Attendance"]]) {
  const rows = Papa.parse(readFileSync(`public/samples/${file}.csv`, "utf8"), {
    header: false, skipEmptyLines: "greedy",
  }).data;
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sheet);
}

const out = process.argv[2] ?? "hr-workbook.xlsx";
writeFileSync(out, XLSX.write(wb, { bookType: "xlsx", type: "buffer" }));
console.log(`wrote ${out} — 3 sheets`);
