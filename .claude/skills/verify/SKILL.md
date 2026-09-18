---
name: verify
description: Run the full check suite for this repo — pure-logic tests, typecheck and lint — and report what failed. Use before any commit, after changing anything in src/lib, or when asked to check whether the repo is green.
---

# Verify

Run all three checks, in this order, and do not stop at the first failure —
report everything at once so it can be fixed in one pass.

```bash
npm test          # assertion runners in scripts/
npx tsc --noEmit  # strict typecheck
npm run lint
```

## Reporting

State the outcome per check: pass, or the specific failures. For a failed
assertion, quote the `FAIL` line — the runners print `got X, want Y`, which is
usually enough to locate the cause without re-running anything.

## When something fails

- **A failed assertion in `scripts/test-infer.ts` or `test-guard.ts`** is a
  logic regression. Fix the module, not the test — unless the test encodes a
  genuinely wrong expectation, in which case say so explicitly before changing
  it.
- **Never weaken `sql-guard.ts` to make a test pass.** It is the security
  boundary (ADR 0003). A blocked query that should be allowed is a bug in the
  prompt or the query, not in the guard.
- **A typecheck error in `src/lib`** must not be silenced with `any` or a
  `@ts-expect-error`. Narrow from `unknown` instead.

## Adding coverage

New behaviour in a pure module needs assertions in the matching runner in the
same commit. A bug fix needs a case that fails before the fix and passes after.
