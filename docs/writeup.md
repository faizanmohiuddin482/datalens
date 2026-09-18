# DataLens — approach, decisions, what's next

## The problem behind the problem

Schema in, model out, run the SQL, render — that takes an hour and demos well on
a clean CSV. It fails in front of a customer in specific ways, and each one
produces **a wrong answer that looks right**: an invented column; `status =
'Active'` when the file says `ACTIVE`, returning zero rows reported as the number
0; a join on an unrelated key that triples rows and inflates every total;
`01/02/2024` read as January when the file means February.

So I treated *trustworthiness*, not SQL generation, as the engineering problem.

## The organising decision

> **The model decides what to compute. SQLite decides what the number is.**

The model emits a query, a real database executes it against the real rows, and
only then does the model see the result and write a sentence around it. No figure
in the UI comes from token prediction — arithmetic hallucination isn't reduced,
it's structurally impossible. The remaining failure mode is a wrong *query*,
which is inspectable, so the SQL sits one click under every answer.

## Key decisions

**SQLite compiled to WebAssembly, in the browser.** The natural datasets here are
payroll and headcount, so "your rows never leave the tab" is a real objection
answered rather than a policy promise — only the schema crosses the network. It
also makes the server a pure function, which is why this deploys as one project
with no database or session store. The cost is a ceiling around 100k rows; past
that, this design is wrong and the database belongs server-side.

**Grounding beats prompting.** Columns are profiled at upload — exact names,
types, ranges, and the *actual value list* for low-cardinality columns. Join keys
are found by measuring how much of one column's values genuinely appear in
another, and scored. Handed evidence, the model has no reason to guess; this is
what makes cross-file questions work without the user explaining their files.

**The guard is code, not an instruction.** Model output is untrusted input:
single statement, `SELECT` only, no DDL or `PRAGMA`, with literals and comments
blanked before keyword matching. Safety doesn't change when the model does.

**Ambiguity is disclosed, not resolved silently.** Date direction is settled from
evidence; where nothing settles it, the assumption is stated in the UI. The model
may also decline and ask a clarifying question.

**Open-weight behind an adapter** — `gpt-oss-120b` hosted, Ollama offline, one
environment variable apart.

## Testing

The parts that decide correctness are pure and carry ~90 assertions. An
end-to-end run checks results against figures computed independently from the CSV
text. A browser suite walks each acceptance criterion — which is how I found four
defects that typecheck, lint and unit tests all waved through, including a WASM
binary that 404'd, so SQLite never loaded at all.

## What I'd build next

1. **Verification pass** — ask whether the result actually answers the question,
   and flag empty results caused by a filter matching nothing.
2. **Row-count sanity on joins** — warn when a join multiplies rows past the
   larger input; catches the most damaging silent error.
3. **Follow-up questions**, so "and by location?" works.
4. **Per-column type overrides** — today one stray cell downgrades a column.
5. **Web Worker ingest**, so large files don't jank the UI.

Seven ADRs in `docs/adr/` record each decision with its costs stated plainly.
