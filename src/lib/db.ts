/**
 * The in-browser SQLite database.
 *
 * Every uploaded sheet becomes a table here. Nothing in this file talks to the
 * network: the raw data never leaves the tab, which is what lets us send only a
 * schema summary to the model.
 */

import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import {
  SQLITE_TYPE, coerce, inferColumn, profileColumn, sanitizeIdentifier, uniqueName,
  type InferredColumn,
} from "./infer";
import { guard, ROW_LIMIT } from "./sql-guard";
import type { QueryResult, TableProfile } from "./types";

let sqlPromise: Promise<SqlJsStatic> | null = null;

function getSqlJs(): Promise<SqlJsStatic> {
  // Relative to the deployed origin, so localhost and Vercel behave the same.
  sqlPromise ??= initSqlJs({ locateFile: (f) => `/${f}` });
  return sqlPromise;
}

export interface RawSheet {
  /** Suggested table name, e.g. the file name or "file — sheet". */
  label: string;
  source: string;
  headers: string[];
  rows: unknown[][];
}

export class Workspace {
  private db!: Database;
  private taken = new Set<string>();
  tables: TableProfile[] = [];
  /** Columns whose date format was genuinely ambiguous, for the UI to disclose. */
  warnings: string[] = [];

  static async create(): Promise<Workspace> {
    const SQL = await getSqlJs();
    const ws = new Workspace();
    ws.db = new SQL.Database();
    return ws;
  }

  /** Creates one table from a parsed sheet and profiles it. */
  addSheet(sheet: RawSheet): TableProfile {
    const tableName = uniqueName(sanitizeIdentifier(sheet.label, "table"), this.taken);

    const colNames = new Set<string>();
    const headers = sheet.headers.map((h, i) =>
      uniqueName(sanitizeIdentifier(h || `column_${i + 1}`, `column_${i + 1}`), colNames),
    );

    const inferred: InferredColumn[] = headers.map((_, i) => {
      const values = sheet.rows.map((r) => r[i]);
      const col = inferColumnSafe(values);
      if (col.dateAmbiguous) {
        this.warnings.push(
          `${tableName}.${headers[i]}: dates like 01/02/2024 are ambiguous — read as day-first (DD/MM/YYYY).`,
        );
      }
      return col;
    });

    const ddl = `CREATE TABLE "${tableName}" (${headers
      .map((h, i) => `"${h}" ${SQLITE_TYPE[inferred[i].type]}`)
      .join(", ")})`;
    this.db.run(ddl);

    const insert = this.db.prepare(
      `INSERT INTO "${tableName}" VALUES (${headers.map(() => "?").join(", ")})`,
    );
    const coerced: (string | number | null)[][] = [];
    this.db.run("BEGIN");
    for (const row of sheet.rows) {
      const values = headers.map((_, i) => coerce(row[i], inferred[i]));
      coerced.push(values);
      insert.run(values as (string | number | null)[]);
    }
    this.db.run("COMMIT");
    insert.free();

    const profile: TableProfile = {
      name: tableName,
      source: sheet.source,
      rowCount: sheet.rows.length,
      columns: headers.map((h, i) =>
        profileColumn(sheet.headers[i] || h, h, coerced.map((r) => r[i]), inferred[i]),
      ),
    };
    this.tables.push(profile);
    return profile;
  }

  /** Runs model-generated SQL through the guard, then executes it. */
  run(rawSql: string): { result?: QueryResult; error?: string } {
    const checked = guard(rawSql);
    if (!checked.ok) return { error: checked.reason };

    const started = performance.now();
    try {
      const stmt = this.db.prepare(checked.sql!);
      const columns: string[] = [];
      const rows: unknown[][] = [];
      while (stmt.step()) {
        if (columns.length === 0) columns.push(...stmt.getColumnNames());
        rows.push(stmt.get() as unknown[]);
      }
      if (columns.length === 0) columns.push(...stmt.getColumnNames());
      stmt.free();

      const truncated = rows.length > ROW_LIMIT;
      return {
        result: {
          columns,
          rows: truncated ? rows.slice(0, ROW_LIMIT) : rows,
          truncated,
          elapsedMs: Math.round(performance.now() - started),
        },
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }

  dropAll() {
    for (const t of this.tables) this.db.run(`DROP TABLE IF EXISTS "${t.name}"`);
    this.tables = [];
    this.taken.clear();
    this.warnings = [];
  }

  close() {
    this.db?.close();
  }
}

/** A malformed column should downgrade to TEXT, never break the whole upload. */
function inferColumnSafe(values: unknown[]): InferredColumn {
  try { return inferColumn(values); } catch { return { type: "text" }; }
}
