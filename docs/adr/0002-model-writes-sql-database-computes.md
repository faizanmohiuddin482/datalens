# 0002 — The model writes SQL; the database computes every number

**Status:** Accepted · 2026-09-18

## Context

"Ask a question, get a correct answer" can be built two ways. The data can be
handed to the model so it answers directly, or the model can be asked to
produce a query that a deterministic engine executes.

Language models are strong at translating intent into query structure and weak
at arithmetic over many rows. A model summing 400 salaries will produce a
confident, plausible, and wrong total — and there is no signal in the output
that distinguishes it from a right one.

## Decision

Draw a hard boundary:

- **The model decides _what to compute_** — it emits SQL and a chart spec, and
  nothing else that could be mistaken for a result.
- **SQLite decides _what the number is_** — every figure the user sees was
  computed by the database from the actual rows.
- **The model narrates only after execution**, and only from the real result
  set, which is passed back to it verbatim.

No numeric value in the UI ever originates from token prediction.

## Consequences

**Good**

- Arithmetic hallucination is eliminated by construction rather than reduced by
  prompting. The failure mode moves from "wrong number" to "wrong query" —
  which is inspectable, because the SQL is shown.
- Answers are reproducible: the same SQL against the same data always yields
  the same figure.
- The narration step sees real values, so it cannot describe a trend the data
  does not contain.

**Bad**

- Two model round-trips per question (plan, then narrate) instead of one,
  costing latency. Mitigated by using a fast inference provider; a scalar
  result could skip the narration call.
- Questions that SQL genuinely cannot express must be declined rather than
  approximated.

## Alternatives considered

- **Model answers directly from sampled rows.** Fast and simple, but the answer
  is only as good as the sample, and totals over a sample are simply wrong.
- **Model generates Python/pandas executed in a sandbox.** Strictly more
  expressive than SQL, but needs a sandboxed runtime, a much larger security
  surface, and is far harder to audit than a readable `SELECT`.
