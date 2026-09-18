/**
 * Turning messy spreadsheet cells into typed SQLite columns.
 *
 * Everything here is pure so it can be tested without a browser or a database.
 * The rules are deliberately conservative: when a column doesn't cleanly fit a
 * type, it stays TEXT rather than silently losing rows to a bad coercion.
 */

import type { ColumnProfile, ColumnType } from "./types";

const RESERVED = new Set([
  "select", "from", "where", "group", "order", "by", "table", "index",
  "join", "left", "right", "inner", "outer", "on", "as", "and", "or",
  "not", "null", "limit", "offset", "having", "union", "all", "distinct",
  "case", "when", "then", "else", "end", "in", "is", "like", "between",
  "values", "into", "set", "default", "primary", "key", "references",
]);

/** snake_cases a header into a safe, unquoted SQLite identifier. */
export function sanitizeIdentifier(raw: string, fallback = "col"): string {
  let s = raw
    .normalize("NFKD")
    .replace(/['"`‘’“”]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  if (!s) s = fallback;
  if (/^[0-9]/.test(s)) s = `_${s}`;
  if (RESERVED.has(s)) s = `${s}_`;
  return s;
}

/** Appends _2, _3 ... until the name is unused. Mutates `taken`. */
export function uniqueName(name: string, taken: Set<string>): string {
  if (!taken.has(name)) { taken.add(name); return name; }
  let n = 2;
  while (taken.has(`${name}_${n}`)) n++;
  const out = `${name}_${n}`;
  taken.add(out);
  return out;
}

export function isBlank(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  const s = String(v).trim();
  return s === "" || s === "-" || s.toLowerCase() === "n/a" || s.toLowerCase() === "na" || s.toLowerCase() === "null";
}

/**
 * Parses a number, tolerating thousands separators, currency symbols,
 * percentages and accounting-style negatives like (1,234).
 * Returns null when the cell isn't really a number.
 */
export function parseNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (isBlank(v)) return null;
  let s = String(v).trim();

  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }

  let percent = false;
  if (s.endsWith("%")) { percent = true; s = s.slice(0, -1); }

  s = s.replace(/[$£€¥₹]/g, "").replace(/,/g, "").trim();
  if (s.startsWith("-")) { negative = true; s = s.slice(1); }
  if (s === "" || !/^\d*\.?\d+([eE][+-]?\d+)?$/.test(s)) return null;

  let n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (percent) n = n / 100;
  return negative ? -n : n;
}

const BOOL_TRUE = new Set(["true", "yes", "y", "t"]);
const BOOL_FALSE = new Set(["false", "no", "n", "f"]);

export function parseBoolean(v: unknown): 0 | 1 | null {
  if (typeof v === "boolean") return v ? 1 : 0;
  if (isBlank(v)) return null;
  const s = String(v).trim().toLowerCase();
  if (BOOL_TRUE.has(s)) return 1;
  if (BOOL_FALSE.has(s)) return 0;
  return null;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** The shapes of date we accept. `dmy`/`mdy` disambiguate slash dates. */
export type DateStyle = "iso" | "dmy" | "mdy" | "mon";

interface DateParts { a: number; b: number; y: number; time?: string }

/** Splits a date-ish string without yet deciding what a and b mean. */
function splitDate(raw: string): { style: DateStyle; parts: DateParts } | null {
  const s = String(raw).trim();

  // 2024-03-17 or 2024-03-17T09:30:00 or 2024/03/17
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T ](\d{2}:\d{2}(?::\d{2})?))?$/);
  if (m) return { style: "iso", parts: { a: +m[2], b: +m[3], y: +m[1], time: m[4] } };

  // 17/03/2024, 3-17-2024, 17.03.2024
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[T ](\d{2}:\d{2}(?::\d{2})?))?$/);
  if (m) return { style: "dmy", parts: { a: +m[1], b: +m[2], y: +m[3], time: m[4] } };

  // 17-Mar-2024, 17 March 2024, Mar 17, 2024
  m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{4})$/);
  if (m) {
    const mo = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mo) return { style: "mon", parts: { a: mo, b: +m[1], y: +m[3] } };
  }
  m = s.match(/^([A-Za-z]{3,})[-\s](\d{1,2}),?[-\s](\d{4})$/);
  if (m) {
    const mo = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mo) return { style: "mon", parts: { a: mo, b: +m[2], y: +m[3] } };
  }
  return null;
}

function valid(y: number, mo: number, d: number): boolean {
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1000 || y > 9999) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Decides day-first vs month-first for a whole column by looking for a value
 * that can only be read one way. A column of 01/02/2024-style dates with no
 * component above 12 is genuinely ambiguous — we report that so the UI can
 * say so rather than quietly picking one.
 */
export function detectDateStyle(values: unknown[]): { style: DateStyle | null; ambiguous: boolean } {
  let seen = 0;
  let slashFirstOver12 = false;
  let slashSecondOver12 = false;
  let sawSlash = false;
  let sawOther: DateStyle | null = null;

  for (const v of values) {
    if (isBlank(v)) continue;
    const split = splitDate(String(v));
    if (!split) return { style: null, ambiguous: false };
    seen++;
    if (split.style === "dmy") {
      sawSlash = true;
      if (split.parts.a > 12) slashFirstOver12 = true;
      if (split.parts.b > 12) slashSecondOver12 = true;
    } else {
      sawOther = split.style;
    }
  }
  if (seen === 0) return { style: null, ambiguous: false };

  if (sawSlash) {
    if (slashFirstOver12 && slashSecondOver12) return { style: null, ambiguous: false };
    if (slashFirstOver12) return { style: "dmy", ambiguous: false };
    if (slashSecondOver12) return { style: "mdy", ambiguous: false };
    // Nothing above 12 anywhere: day-first is the more common convention
    // outside the US, but flag it so we can surface the assumption.
    return { style: "dmy", ambiguous: true };
  }
  return { style: sawOther, ambiguous: false };
}

/** Normalises one cell to `YYYY-MM-DD` (plus time when present). */
export function parseDate(v: unknown, style: DateStyle): string | null {
  if (isBlank(v)) return null;
  const split = splitDate(String(v));
  if (!split) return null;
  const { a, b, y, time } = split.parts;

  let mo: number, d: number;
  if (split.style === "iso" || split.style === "mon") { mo = a; d = b; }
  else if (style === "mdy") { mo = a; d = b; }
  else { d = a; mo = b; }

  if (!valid(y, mo, d)) return null;
  return `${y}-${pad(mo)}-${pad(d)}${time ? ` ${time}` : ""}`;
}

export interface InferredColumn {
  type: ColumnType;
  dateStyle?: DateStyle;
  dateAmbiguous?: boolean;
}

/**
 * Picks a column type from its values. A column qualifies as number/date/bool
 * only if every non-blank cell parses — one stray "TBD" keeps it TEXT, which
 * is the honest outcome.
 */
export function inferColumn(values: unknown[]): InferredColumn {
  const present = values.filter((v) => !isBlank(v));
  if (present.length === 0) return { type: "text" };

  if (present.every((v) => parseBoolean(v) !== null)) return { type: "boolean" };
  if (present.every((v) => parseNumber(v) !== null)) return { type: "number" };

  const { style, ambiguous } = detectDateStyle(present);
  if (style && present.every((v) => parseDate(v, style) !== null)) {
    return { type: "date", dateStyle: style, dateAmbiguous: ambiguous };
  }
  return { type: "text" };
}

/** Converts a cell to the value we bind into SQLite for that column type. */
export function coerce(v: unknown, col: InferredColumn): string | number | null {
  if (isBlank(v)) return null;
  switch (col.type) {
    case "number": return parseNumber(v);
    case "boolean": return parseBoolean(v);
    case "date": return parseDate(v, col.dateStyle ?? "iso");
    default: return String(v).trim();
  }
}

export const SQLITE_TYPE: Record<ColumnType, string> = {
  number: "REAL",
  boolean: "INTEGER",
  date: "TEXT",
  text: "TEXT",
};

/** Cardinality below which we hand the model the full value list. */
export const LOW_CARDINALITY = 25;

/** Builds the profile the prompt is grounded on. */
export function profileColumn(
  name: string,
  sqlName: string,
  values: (string | number | null)[],
  inferred: InferredColumn,
): ColumnProfile {
  const present = values.filter((v) => v !== null) as (string | number)[];
  const distinct = new Set(present.map(String));
  const sorted = inferred.type === "number"
    ? [...present].map(Number).sort((a, b) => a - b)
    : [...distinct].sort();

  return {
    name,
    sqlName,
    type: inferred.type,
    nullCount: values.length - present.length,
    distinctCount: distinct.size,
    distinctValues: distinct.size <= LOW_CARDINALITY ? [...distinct].map(String).sort() : undefined,
    sampleValues: [...distinct].slice(0, 3).map(String),
    min: sorted.length ? String(sorted[0]) : undefined,
    max: sorted.length ? String(sorted[sorted.length - 1]) : undefined,
  };
}
