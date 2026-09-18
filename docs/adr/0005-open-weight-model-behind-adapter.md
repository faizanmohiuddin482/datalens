# 0005 — Open-weight model via Groq, behind a provider adapter

**Status:** Accepted · 2026-09-18

## Context

The brief requires open-source AI models. It also requires a working prototype
a reviewer can open and use. Those pull in opposite directions: the purest
reading of "open-source" is a model running locally, which cannot back a hosted
link.

## Decision

Use **Llama 3.3 70B** — an open-weight model — served by **Groq**, and put the
call behind a one-method adapter interface so the provider is an environment
variable rather than a code change. **Ollama** is supported as the local,
fully-offline path using the same interface.

The task is constrained enough — schema in, JSON with SQL out — that a 70B
open-weight model is not a compromise for it.

## Consequences

**Good**

- Satisfies the constraint honestly: the weights are open, the vendor is only
  hosting them, and the same model can be run locally with no code change.
- Groq's inference speed keeps the two-round-trip design (plan, then narrate)
  fast enough to feel interactive.
- The adapter is the seam that makes an air-gapped deployment a configuration
  choice — a live concern for a customer who will not send schemas off-site.

**Bad**

- The hosted demo depends on a third-party API key and its free-tier limits.
- Two supported paths mean two paths to keep working; the Ollama route is
  documented but exercised less.
- Structured-output support differs between providers, so the JSON contract is
  validated in application code rather than relying on provider guarantees.

## Alternatives considered

- **Ollama only.** The strictest reading of the constraint, but the reviewer
  gets local run instructions instead of a link — worse against the deliverable
  that explicitly asks for a hosted prototype.
- **A proprietary frontier model.** Likely a few points better at hard SQL, and
  a direct violation of the brief.
- **A small local model (7B class).** Attractive for latency and privacy, but
  noticeably weaker at multi-table joins, which is the criterion under test.
