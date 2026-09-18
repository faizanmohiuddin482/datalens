# 0006 — Infer types conservatively and disclose ambiguity

**Status:** Accepted · 2026-09-18

## Context

Spreadsheets are not typed. A salary column arrives as `₹85,000`, a loss as
`(1,234)`, a missing value as `N/A`, `-` or an empty cell. Dates arrive in at
least five formats, and `01/02/2024` means 1 February in most of the world and
2 January in the United States.

These decisions are invisible and consequential. If a currency column is read
as text, `SUM` fails or returns nonsense. If day-first dates are parsed
month-first, every "last quarter" filter is silently wrong.

## Decision

Three rules:

1. **Parse generously at the cell level.** Thousands separators, currency
   symbols, percentages and accounting negatives all resolve to numbers.
   Recognised blank markers (`""`, `-`, `N/A`, `NULL`) become SQL `NULL`.
2. **Type conservatively at the column level.** A column is numeric only if
   *every* non-blank cell parses as a number. One `TBD` keeps the whole column
   `TEXT`. Losing rows to a coercion is worse than an inconvenient type.
3. **Resolve date ambiguity from evidence, and disclose what cannot be
   resolved.** The whole column is scanned for a value that can only be read
   one way — any first component above 12 proves day-first. When no such value
   exists, the column is genuinely ambiguous: day-first is assumed, and a
   warning is surfaced in the UI stating the assumption.

Dates are normalised to ISO `YYYY-MM-DD` text, which sorts and compares
correctly in SQLite and works with `strftime`.

## Consequences

**Good**

- Realistic exports work without the user cleaning them first.
- The wrong-but-invisible class of error becomes a visible statement the user
  can correct, which is the honest engineering answer to an ambiguity that
  genuinely cannot be resolved from the data.
- Inference is pure and unit-tested, so its behaviour is pinned rather than
  discovered in a demo.

**Bad**

- One malformed cell downgrades an entire column to `TEXT`, which can surprise
  a user whose file has a stray footer row. A per-column type override in the
  UI would address this.
- Whole-column scanning costs a pass over the data at ingest.
- Column-level typing cannot represent genuinely mixed columns.

## Alternatives considered

- **Everything as TEXT, cast in SQL.** Simplest to implement, and pushes the
  entire problem onto model-generated `CAST` expressions — the least reliable
  place to put it.
- **Majority-vote typing** (numeric if 95% of cells parse). Handles footer rows
  gracefully but silently nulls real data, which is exactly the invisible
  failure this ADR exists to prevent.
- **Ask the user to confirm every column.** Most correct, and too much friction
  for an upload-and-ask tool.
