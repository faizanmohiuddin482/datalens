# 0003 — Enforce read-only access in code, not in the prompt

**Status:** Accepted · 2026-09-18

## Context

The model returns SQL that is executed against the user's database. The system
prompt instructs it to produce a single read-only `SELECT`. That instruction is
a strong prior, not a guarantee: prompt injection can arrive through the data
itself (a column header or cell value that reads as an instruction), and models
occasionally emit multiple statements unprompted.

## Decision

Treat model output as untrusted input. Every string, without exception, passes
through `src/lib/sql-guard.ts` before reaching SQLite:

1. String literals, quoted identifiers and comments are blanked out, so keyword
   matching cannot be fooled by `WHERE note = 'a; DROP TABLE x'`.
2. The statement must begin with `SELECT` or `WITH`.
3. A single statement only — no embedded semicolons.
4. A denylist rejects DDL, DML, `ATTACH`, `PRAGMA` and `load_extension`.
5. The query is wrapped, not appended to — `SELECT * FROM (<sql>) LIMIT n` —
   preserving any inner `ORDER BY`/`LIMIT` while capping the result set.

The guard is covered by unit tests that assert both directions: dangerous SQL
is blocked, and legitimate SQL containing scary-looking strings is not.

## Consequences

**Good**

- Safety no longer depends on model behaviour, prompt wording, or which model
  is configured. Swapping to a weaker local model changes answer quality, not
  the security posture.
- The rules are a small, readable, testable file rather than a paragraph of
  English buried in a prompt.
- Wrapping instead of appending fixes a real bug class — naively adding
  `LIMIT 100` to a query that already ends in `LIMIT 3` is a syntax error.

**Bad**

- Keyword denylisting is coarse: a legitimate query using a banned word as an
  unquoted identifier is rejected. Acceptable — the fix is to quote it.
- Not a real parser, so it reasons about SQL lexically. The blanking pass
  removes the obvious evasions, but a true AST check would be stronger.

## Alternatives considered

- **Trust the prompt.** Zero code, and wrong: instructions are not a boundary.
- **Full SQL parser/AST validation.** Meaningfully stronger, but a large
  dependency and a poor use of the time budget when the read-only subset is
  this narrow.
- **Rely on the browser sandbox alone.** The database is in-memory and
  user-owned, so blast radius is limited — but "the damage is confined to the
  user's own data" is not an argument for allowing `DROP TABLE`.
