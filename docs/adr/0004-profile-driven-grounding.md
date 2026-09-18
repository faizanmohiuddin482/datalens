# 0004 — Ground the prompt in a real data profile

**Status:** Accepted · 2026-09-18

## Context

The dominant failure mode in natural-language-to-SQL is not broken syntax. It
is SQL that runs cleanly and returns the wrong thing:

- a column name the model invented because it sounded plausible;
- `WHERE status = 'Active'` when the file contains `ACTIVE`, returning zero
  rows, which the UI then reports as the number **0**;
- a join between two files on a key that does not actually relate them,
  multiplying rows and inflating every subsequent `SUM`.

All three produce a confident, well-formatted, wrong answer. Handing the model
a bare `CREATE TABLE` statement does nothing to prevent any of them, because
the information needed to avoid them is in the *values*, not the schema.

## Decision

Profile the data at ingest time and put the findings in the prompt:

- **Exact column names and inferred types** for every table, with row counts.
- **The real value vocabulary** for low-cardinality columns (≤ 25 distinct):
  the literal strings are listed, so the model matches the user's phrasing to
  what is actually stored rather than guessing at capitalisation.
- **Min/max ranges** for numeric and date columns, which bound filters and make
  out-of-range questions answerable as "no data for that period".
- **Join candidates verified against the data** — column pairs scored by what
  fraction of one column's values actually appear in the other, presented as
  `employees.employee_id = attendance.emp_id (98% of values match)`.

Join detection compares value sets where they are known and falls back to
name-and-type matching (with normalisation, so `emp_id` matches `employee_id`)
for high-cardinality identifier columns.

## Consequences

**Good**

- Removes the model's *reason* to hallucinate: the correct answer is present in
  the context, so guessing is never the path of least resistance.
- Cross-file questions work without the user explaining how their files relate,
  which is the acceptance criterion that separates this from a single-file toy.
- The overlap percentage is genuine evidence, and showing it in the UI lets a
  user overrule a bad join.

**Bad**

- Profiling costs a pass over every column at ingest, adding time on large
  files.
- The value vocabulary consumes prompt tokens; the 25-value cut-off is a
  judgement call balancing grounding against context length.
- Listing distinct values of a low-cardinality column does send a small,
  bounded sample of data content to the model. Department names and status
  codes are disclosed; individual records are not. This is the one deliberate
  exception to [ADR 0001](0001-sqlite-in-the-browser.md)'s privacy property and
  is called out in the UI.

## Alternatives considered

- **Schema only.** Cheapest and the most common implementation; fails at all
  three failure modes above.
- **Send sample rows.** Good grounding, but leaks actual records — a
  significantly worse privacy trade for weaker signal than a full value list on
  the columns that matter.
- **Let the model query the schema interactively.** More agentic and more
  general, but costs several extra round-trips per question for information a
  single profiling pass already has.
