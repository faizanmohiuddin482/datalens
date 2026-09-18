/**
 * Turning table profiles into the grounding text the model sees.
 *
 * This module is the answer to "why did it invent a column?" — the model is
 * given exact names, types, real value vocabularies for low-cardinality
 * columns, and explicit join keys, so it has no reason to guess.
 */

import type { ColumnProfile, JoinCandidate, TableProfile } from "./types";

/** Below this overlap we don't consider two columns a join key at all. */
const MIN_OVERLAP = 0.3;

/** Columns this unique are identifiers, not categories. */
const ID_NAME = /(^|_)(id|no|code|key|email|ref)$/i;

function valuesOf(col: ColumnProfile): Set<string> | null {
  if (col.distinctValues) return new Set(col.distinctValues);
  return null;
}

/**
 * Finds column pairs that plausibly join two tables, scored by how much of the
 * left column's value vocabulary appears on the right.
 *
 * We only have full value lists for low-cardinality columns, so for wide ID
 * columns we fall back to name-and-type matching — which is exactly how a human
 * reads two spreadsheets side by side.
 */
export function findJoinCandidates(tables: TableProfile[]): JoinCandidate[] {
  const out: JoinCandidate[] = [];

  for (let i = 0; i < tables.length; i++) {
    for (let j = i + 1; j < tables.length; j++) {
      const left = tables[i];
      const right = tables[j];

      for (const lc of left.columns) {
        for (const rc of right.columns) {
          if (lc.type !== rc.type) continue;

          const namesMatch =
            lc.sqlName === rc.sqlName ||
            normaliseKey(lc.sqlName) === normaliseKey(rc.sqlName);

          const lv = valuesOf(lc);
          const rv = valuesOf(rc);

          let overlap: number | null = null;
          if (lv && rv && lv.size > 0) {
            let hit = 0;
            for (const v of lv) if (rv.has(v)) hit++;
            overlap = hit / lv.size;
          }

          if (overlap !== null) {
            if (overlap >= MIN_OVERLAP) {
              out.push({ leftTable: left.name, leftColumn: lc.sqlName, rightTable: right.name, rightColumn: rc.sqlName, overlap });
            }
          } else if (namesMatch && looksLikeKey(lc) && looksLikeKey(rc)) {
            // Values unknown (high cardinality) but the names and types line up.
            out.push({ leftTable: left.name, leftColumn: lc.sqlName, rightTable: right.name, rightColumn: rc.sqlName, overlap: 1 });
          }
        }
      }
    }
  }

  return out.sort((a, b) => b.overlap - a.overlap).slice(0, 12);
}

/** `emp_id`, `employee_id` and `employeeid` should all match each other. */
export function normaliseKey(name: string): string {
  return name
    .replace(/_/g, "")
    .replace(/^employee/, "emp")
    .replace(/^customer/, "cust")
    .replace(/^product/, "prod")
    .replace(/identifier$/, "id")
    .replace(/number$/, "no");
}

function looksLikeKey(col: ColumnProfile): boolean {
  return ID_NAME.test(col.sqlName) || col.distinctCount > 0;
}

function describeColumn(col: ColumnProfile): string {
  const bits: string[] = [`  - ${col.sqlName} (${col.type}`];
  if (col.nullCount > 0) bits.push(`, ${col.nullCount} empty`);
  bits.push(")");

  let line = bits.join("");
  if (col.distinctValues && col.distinctValues.length > 0) {
    // The single highest-value piece of grounding: the model can match the
    // user's wording to the literal strings in the data.
    line += ` — values: ${col.distinctValues.map((v) => `'${v}'`).join(", ")}`;
  } else if (col.type === "number" || col.type === "date") {
    line += ` — range ${col.min} to ${col.max}`;
  } else if (col.sampleValues.length) {
    line += ` — e.g. ${col.sampleValues.map((v) => `'${v}'`).join(", ")} (${col.distinctCount} distinct)`;
  }
  return line;
}

/** The schema block injected into the prompt. */
export function describeSchema(tables: TableProfile[], joins: JoinCandidate[]): string {
  const parts = tables.map((t) => {
    const head = `TABLE ${t.name}  (${t.rowCount} rows, from ${t.source})`;
    return [head, ...t.columns.map(describeColumn)].join("\n");
  });

  if (joins.length) {
    const lines = joins.map(
      (j) =>
        `  - ${j.leftTable}.${j.leftColumn} = ${j.rightTable}.${j.rightColumn}` +
        ` (${Math.round(j.overlap * 100)}% of values match)`,
    );
    parts.push(["RELATIONSHIPS (verified by comparing actual values):", ...lines].join("\n"));
  }

  return parts.join("\n\n");
}
