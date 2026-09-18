---
name: new-adr
description: Write a new Architecture Decision Record in docs/adr with the right number, format and index entry. Use when a structural decision is being made — a new dependency, a change to the data flow, a security boundary, or a trade-off a future reader would otherwise mistake for an accident.
---

# New ADR

## When one is warranted

Write an ADR for a decision that is **expensive to reverse** or that a reader
would otherwise misread as arbitrary: a new runtime dependency, a change to
where data lives or flows, anything touching the model/database boundary, or a
deliberate rejection of the obvious approach.

Do not write one for a refactor, a naming choice, or a bug fix.

## Steps

1. `ls docs/adr/` and take the next number, zero-padded to four digits.
2. Create `docs/adr/NNNN-kebab-case-title.md` using the template below.
3. Add the row to the table in `docs/adr/README.md`.
4. Commit it **with** the code it describes, not separately.

## Template

```markdown
# NNNN — Decision stated as an imperative

**Status:** Accepted · YYYY-MM-DD

## Context

The forces in play, written so someone who has never seen the code understands
the pressure. Name the failure being prevented concretely. No solution here.

## Decision

What was chosen, in the active voice. Specific enough to check the code against.

## Consequences

**Good** — what this buys, including second-order effects.

**Bad** — the real costs. An ADR with no costs listed is marketing; every
decision worth recording gave something up.

## Alternatives considered

Each rejected option and the specific reason it lost. This is the section future
readers actually need — it stops the same option being re-proposed every quarter.
```

## Style

Past-tense and factual; an ADR records a decision already made. State costs
plainly rather than defending them — honesty in the **Bad** section is the whole
value of the record. Keep it under roughly 80 lines.
