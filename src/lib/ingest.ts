/**
 * Reading uploaded files into raw sheets. Browser-only.
 *
 * Output is deliberately untyped — a header row plus a matrix of cells. All
 * type decisions belong to infer.ts, which is pure and tested (ADR 0006).
 */

import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { RawSheet } from "./db";

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_ROWS_PER_SHEET = 200_000;

const CSV_EXT = /\.(csv|tsv|txt)$/i;
const EXCEL_EXT = /\.(xlsx|xlsm|xls|ods)$/i;

export class IngestError extends Error {}

/** `Q1 Payroll.xlsx` -> `Q1 Payroll` */
function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

/**
 * Excel hands back Date objects for date cells. Normalising them here means
 * inference sees the same ISO strings it would get from a CSV.
 */
function normaliseCell(v: unknown): unknown {
  if (v instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const d = `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
    const hasTime = v.getHours() || v.getMinutes() || v.getSeconds();
    return hasTime ? `${d} ${pad(v.getHours())}:${pad(v.getMinutes())}` : d;
  }
  return v;
}

/** Drops trailing rows and columns that are entirely empty. */
function trim(matrix: unknown[][]): unknown[][] {
  const rows = matrix.filter((r) => r.some((c) => c !== null && c !== undefined && String(c).trim() !== ""));
  if (rows.length === 0) return rows;
  let width = 0;
  for (const r of rows) {
    for (let i = r.length - 1; i >= 0; i--) {
      if (r[i] !== null && r[i] !== undefined && String(r[i]).trim() !== "") { width = Math.max(width, i + 1); break; }
    }
  }
  return rows.map((r) => Array.from({ length: width }, (_, i) => normaliseCell(r[i])));
}

function toSheet(label: string, source: string, matrix: unknown[][]): RawSheet {
  const rows = trim(matrix);
  if (rows.length < 2) {
    throw new IngestError(`${source} has no data rows — a header row plus at least one row of data is needed.`);
  }
  if (rows.length - 1 > MAX_ROWS_PER_SHEET) {
    throw new IngestError(`${source} has ${rows.length - 1} rows, over the ${MAX_ROWS_PER_SHEET.toLocaleString()} limit for in-browser analysis.`);
  }
  return {
    label,
    source,
    headers: rows[0].map((h, i) => (h == null || String(h).trim() === "" ? `column_${i + 1}` : String(h).trim())),
    rows: rows.slice(1),
  };
}

async function readCsv(file: File): Promise<RawSheet[]> {
  const text = await file.text();
  const parsed = Papa.parse<unknown[]>(text, {
    header: false,
    skipEmptyLines: "greedy",
    dynamicTyping: false, // infer.ts owns typing
  });
  // Papa reports recoverable issues (ragged rows) as errors; only a total
  // failure leaves us with nothing usable.
  if (parsed.data.length === 0) {
    const why = parsed.errors[0]?.message ?? "no rows found";
    throw new IngestError(`Could not read ${file.name}: ${why}.`);
  }
  return [toSheet(baseName(file.name), file.name, parsed.data)];
}

async function readExcel(file: File): Promise<RawSheet[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { cellDates: true });
  const sheets: RawSheet[] = [];

  for (const name of wb.SheetNames) {
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], {
      header: 1,
      raw: true,
      defval: null,
    });
    // A workbook commonly carries empty or notes-only tabs; skip rather than fail.
    try {
      const multi = wb.SheetNames.length > 1;
      sheets.push(toSheet(multi ? `${baseName(file.name)} ${name}` : baseName(file.name),
                          multi ? `${file.name} — ${name}` : file.name, matrix));
    } catch { /* not a data sheet */ }
  }

  if (sheets.length === 0) {
    throw new IngestError(`${file.name} has no sheet with a header row and data.`);
  }
  return sheets;
}

export async function readFile(file: File): Promise<RawSheet[]> {
  if (file.size > MAX_FILE_BYTES) {
    throw new IngestError(
      `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB, over the ${MAX_FILE_BYTES / 1024 / 1024} MB limit. Analysis runs in your browser, so very large files are out of scope.`,
    );
  }
  if (CSV_EXT.test(file.name)) return readCsv(file);
  if (EXCEL_EXT.test(file.name)) return readExcel(file);
  throw new IngestError(`${file.name} is not a CSV or Excel file.`);
}
