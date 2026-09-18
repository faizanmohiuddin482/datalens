/** Shared types for the ingest -> profile -> plan -> execute pipeline. */

export type ColumnType = "number" | "date" | "text" | "boolean";

export interface ColumnProfile {
  name: string;
  /** Column name as it exists in SQLite (sanitised). */
  sqlName: string;
  type: ColumnType;
  nullCount: number;
  /** Distinct values, only kept for low-cardinality columns. */
  distinctValues?: string[];
  distinctCount: number;
  sampleValues: string[];
  min?: string;
  max?: string;
}

export interface TableProfile {
  /** Table name in SQLite, e.g. "employees" or "payroll_q1". */
  name: string;
  /** Original file (and sheet) this came from. */
  source: string;
  rowCount: number;
  columns: ColumnProfile[];
}

/** A column pair that looks like it joins two tables. */
export interface JoinCandidate {
  leftTable: string;
  leftColumn: string;
  rightTable: string;
  rightColumn: string;
  /** 0-1: share of left values also present on the right. */
  overlap: number;
}

export interface ChartSpec {
  type: "bar" | "line" | "pie" | "none";
  x: string;
  y: string[];
  title?: string;
}

/** What the model returns when it can answer with a query. */
export interface QueryPlan {
  kind: "query";
  sql: string;
  explanation: string;
  chart: ChartSpec | null;
}

/** What the model returns when the question is too ambiguous to answer. */
export interface ClarifyPlan {
  kind: "clarify";
  question: string;
  /** Concrete rephrasings the user can click. */
  suggestions: string[];
}

export type Plan = QueryPlan | ClarifyPlan;

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  /** True when the result was capped by the guard's row limit. */
  truncated: boolean;
  elapsedMs: number;
}
