/**
 * Exporting a result set as CSV.
 *
 * `toCsv` and `fileNameFor` are pure so they can be tested directly; only
 * `download` touches the browser.
 */

import type { QueryResult } from "./types";

/**
 * Cells that a spreadsheet would execute rather than display.
 *
 * Excel and Sheets treat a leading =, +, - or @ as the start of a formula, so a
 * value like `=HYPERLINK(...)` arriving from an uploaded file would run when the
 * export is opened. Prefixing with an apostrophe forces it to stay text — the
 * apostrophe is not shown by the spreadsheet.
 */
const FORMULA_LEAD = /^[=+\-@\t\r]/;

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  // Numbers are written unformatted: an export is for further calculation, and
  // thousands separators would make the column text in every spreadsheet.
  if (typeof value === "number") return String(value);

  let s = String(value);
  if (FORMULA_LEAD.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(result: QueryResult): string {
  const lines = [
    result.columns.map(escapeCell).join(","),
    ...result.rows.map((row) => row.map(escapeCell).join(",")),
  ];
  // Trailing newline: POSIX convention, and some parsers drop the last row without it.
  return `${lines.join("\r\n")}\r\n`;
}

/** `average ctc by department` -> `average-ctc-by-department-2026-09-18.csv` */
export function fileNameFor(question: string, today = new Date()): string {
  const slug = question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  const date = today.toISOString().slice(0, 10);
  return `${slug || "result"}-${date}.csv`;
}

/** Hands the file to the browser. No network involved — the rows never left. */
export function download(result: QueryResult, question: string): void {
  // The BOM makes Excel read UTF-8 correctly; without it, ₹ and accents break.
  const blob = new Blob(["﻿", toCsv(result)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileNameFor(question);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
