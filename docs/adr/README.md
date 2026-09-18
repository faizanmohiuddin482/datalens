# Architecture Decision Records

Short records of the decisions that shaped this codebase, written at the time
the decision was made. Each one states the forces in play, what was chosen, and
what that choice costs — so a future reader can tell a deliberate trade-off from
an accident.

Format: [Michael Nygard's template](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

| # | Decision | Status |
|---|---|---|
| [0001](0001-sqlite-in-the-browser.md) | Run SQLite in the browser instead of a server-side database | Accepted |
| [0002](0002-model-writes-sql-database-computes.md) | The model writes SQL; the database computes every number | Accepted |
| [0003](0003-sql-guard-not-prompt.md) | Enforce read-only access in code, not in the prompt | Accepted |
| [0004](0004-profile-driven-grounding.md) | Ground the prompt in a real data profile | Accepted |
| [0005](0005-open-weight-model-behind-adapter.md) | Open-weight model via Groq, behind a provider adapter | Accepted |
| [0006](0006-conservative-type-inference.md) | Infer types conservatively and disclose ambiguity | Accepted |
