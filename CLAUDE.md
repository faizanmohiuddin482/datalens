# Working in this repo

DataLens answers plain-English analytical questions about uploaded CSV/Excel
files. Read `docs/adr/` before changing anything structural — the decisions
there are load-bearing, and several of them are non-obvious.

## The invariant

> The model decides **what to compute**. SQLite decides **what the number is**.

No figure shown to a user may originate from model output. The model emits SQL;
the database executes it; the model narrates only from the real result set.
A change that lets the model report a number directly is a bug, however good the
output looks. See [ADR 0002](docs/adr/0002-model-writes-sql-database-computes.md).

Two rules follow from it:

- **Model output is untrusted input.** All SQL passes `src/lib/sql-guard.ts`
  before execution. Never relax the guard to make a query work — fix the prompt.
- **Raw rows stay in the browser.** Only the schema profile crosses the network.
  Low-cardinality value lists are the one sanctioned exception (ADR 0004). Do not
  add sample rows to any prompt.

## Layout

```
src/lib/
  types.ts       shared contracts
  infer.ts       cell parsing + column typing      pure, tested
  sql-guard.ts   read-only SQL validation          pure, tested
  profile.ts     schema text + join detection      pure, tested
  prompt.ts      prompt construction               pure, tested
  db.ts          SQLite WASM workspace             browser only
  llm.ts         provider adapter                  server only
src/app/api/ask  stateless plan + narrate endpoint
src/components   UI
scripts/         node test runners (npm test)
docs/adr/        architecture decision records
```

The split is deliberate: everything in the top group is a pure function, so it
is testable without a browser, a database or an API key. Keep it that way — if
a new piece of logic needs I/O to test, it is probably in the wrong file.

## Conventions

- TypeScript strict. No `any` in `src/lib` — use `unknown` and narrow.
- Comments explain *why*, not *what*. Do not caption obvious code.
- Every pure module has a runner in `scripts/`. Add cases to it in the same
  commit as the behaviour, especially for a fixed bug.
- No new dependency without a line in the PR or commit body saying what it
  replaced and why the stdlib was not enough.

## Before committing

```bash
npm test          # pure-logic assertions
npx tsc --noEmit  # typecheck
npm run lint
```

Commits are [Conventional Commits](https://conventionalcommits.org) and scoped
to one concern. A decision that shapes the code gets an ADR in the same commit
as the code that implements it.
