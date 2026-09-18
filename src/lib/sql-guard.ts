/**
 * Read-only guard for model-generated SQL.
 *
 * The model is instructed to return a single SELECT, but instructions are not a
 * security boundary. Everything that reaches SQLite passes through here first.
 */

const FORBIDDEN = [
  "insert", "update", "delete", "drop", "create", "alter", "replace",
  "attach", "detach", "pragma", "vacuum", "reindex", "analyze",
  "begin", "commit", "rollback", "savepoint", "load_extension",
];

export const ROW_LIMIT = 5000;

export interface GuardResult {
  ok: boolean;
  /** The rewritten, execution-ready SQL. Only set when ok. */
  sql?: string;
  reason?: string;
}

/**
 * Blanks out string literals and comments so keyword matching can't be fooled
 * by a value like `WHERE name = 'delete me'`. Length is preserved so offsets
 * still line up with the original.
 */
export function stripLiteralsAndComments(sql: string): string {
  let out = "";
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    const next = sql[i + 1];

    if (c === "'" || c === '"' || c === "`") {
      const quote = c;
      out += " ";
      i++;
      while (i < sql.length) {
        if (sql[i] === quote && sql[i + 1] === quote) { out += "  "; i += 2; continue; }
        if (sql[i] === quote) { out += " "; i++; break; }
        out += " ";
        i++;
      }
      continue;
    }
    if (c === "[") {
      out += " ";
      i++;
      while (i < sql.length && sql[i] !== "]") { out += " "; i++; }
      if (i < sql.length) { out += " "; i++; }
      continue;
    }
    if (c === "-" && next === "-") {
      while (i < sql.length && sql[i] !== "\n") { out += " "; i++; }
      continue;
    }
    if (c === "/" && next === "*") {
      out += "  ";
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) { out += " "; i++; }
      if (i < sql.length) { out += "  "; i += 2; }
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

export function guard(rawSql: string): GuardResult {
  const sql = rawSql.trim().replace(/;\s*$/, "").trim();
  if (!sql) return { ok: false, reason: "Empty query." };

  const bare = stripLiteralsAndComments(sql);

  if (bare.includes(";")) {
    return { ok: false, reason: "Only a single statement is allowed." };
  }
  if (!/^\s*(select|with)\b/i.test(bare)) {
    return { ok: false, reason: "Only SELECT queries are allowed." };
  }

  for (const word of FORBIDDEN) {
    if (new RegExp(`\\b${word}\\b`, "i").test(bare)) {
      return { ok: false, reason: `Disallowed keyword: ${word.toUpperCase()}.` };
    }
  }

  // Wrapping (rather than appending) keeps an inner ORDER BY / LIMIT intact.
  // One extra row tells us whether the result was actually cut short.
  return { ok: true, sql: `SELECT * FROM (\n${sql}\n) LIMIT ${ROW_LIMIT + 1}` };
}
