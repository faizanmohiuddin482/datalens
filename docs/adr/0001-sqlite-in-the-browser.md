# 0001 — Run SQLite in the browser instead of a server-side database

**Status:** Accepted · 2026-09-18

## Context

The app ingests user-uploaded CSV/Excel files and answers analytical questions
about them. Something has to hold that tabular data and execute aggregations,
filters and joins over it.

Three forces:

1. **Sensitivity.** The natural datasets for this app are payroll, headcount and
   attendance — exactly the data an HR platform handles. Uploading them to a
   third party is a real objection, not a hypothetical one.
2. **Deployment.** The prototype needs a hosted link. Serverless platforms have
   an ephemeral filesystem and no sticky sessions, so a server-side database
   would not survive between two requests from the same user.
3. **Scope.** Adding a persistent store means provisioning, connection
   management, session identity and cleanup — a large fraction of the 4–6 hour
   budget spent on plumbing rather than on answer quality.

## Decision

Compile SQLite to WebAssembly (`sql.js`) and run the database inside the
browser tab. Each uploaded sheet becomes a table in an in-memory SQLite
database owned by the page. The server keeps no data at all.

## Consequences

**Good**

- Raw rows are structurally incapable of leaving the browser — privacy is a
  property of the architecture, not a promise in a policy document.
- The server becomes a pure function (question + schema → SQL), which is
  precisely the workload serverless platforms are good at. One deploy, no
  database, no blob storage, no session store.
- Full SQL — joins, window functions, CTEs, date functions — for free, rather
  than a hand-rolled query engine over in-memory arrays.
- Zero marginal cost per query. Only the LLM call costs anything.

**Bad**

- Data is bounded by tab memory. Comfortable to roughly 10⁵–10⁶ rows; a
  100 MB+ file is out of scope and should be rejected with a clear message.
- Parsing and loading occupy the main thread, so a very large file will jank
  the UI until moved to a Web Worker.
- Nothing persists across a refresh. Acceptable for a single-session analysis
  tool; would need IndexedDB or a server if sessions had to be resumable.

## Alternatives considered

- **Server-side DuckDB or SQLite.** Better for large files and the more common
  production shape, but requires a stateful host, loses the privacy property,
  and costs two deployments instead of one.
- **Send the data to the model directly.** Only viable for tiny files, and it
  makes the model responsible for arithmetic — rejected for the reasons in
  [ADR 0002](0002-model-writes-sql-database-computes.md).
- **A hand-written query engine over parsed arrays.** No new dependency, but
  re-implements grouping, joins and date bucketing — more code and more bugs
  than the database that already does it correctly.
