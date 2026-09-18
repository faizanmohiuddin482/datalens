# DataLens — approach, decisions, and what's next

## The problem I actually solved

The brief asks for plain-English questions over uploaded spreadsheets. The naive
build — schema in, model out, run the SQL, render — takes about an hour and
demos well on a clean CSV. It fails in front of a customer in specific, boring
ways, and every one produces **a wrong answer that looks right**:

- a column the model invented because it sounded plausible;
- `WHERE status = 'Active'` when the file says `ACTIVE` — zero rows, reported as
  the number 0;
- a join between two files on a key that doesn't relate them, tripling the row
  count and inflating every total;
- `01/02/2024` read as January when the file means February, quietly breaking
  every date filter.

So I treated *trustworthiness*, not SQL generation, as the engineering problem.

## The organising decision

> **The model decides what to compute. SQLite decides what the number is.**

The model emits a query; a real database executes it against the real rows; the
model is then shown the actual result and writes a sentence around it. No figure
in the UI originates from token prediction. Arithmetic hallucination isn't
reduced, it's structurally impossible — and the remaining failure mode, a wrong
*query*, is inspectable, which is why the SQL is always one click away.

## Key decisions

**SQLite compiled to WebAssembly, running in the browser.** The natural datasets
here are payroll and headcount, so "your rows never leave the tab" is a real
objection answered rather than a policy promise — only the schema crosses the
network. It also makes the server a pure function, which is why this deploys as
one Vercel project with no database, blob store or session layer. The cost is a
ceiling of ~100k rows; past that this design is wrong and the database belongs
server-side.

**Grounding beats prompting.** Every column is profiled at upload: exact names,
inferred types, ranges, and — for low-cardinality columns — the *actual value
list*. Join candidates are found by measuring how much of one column's values
genuinely appear in another and scored by overlap. The model is handed evidence,
so guessing is never the path of least resistance. This is what makes cross-file
questions work without the user explaining how their files relate.

**The guard is code, not an instruction.** Model output is untrusted input:
single statement, `SELECT`/`WITH` only, no DDL/DML/`PRAGMA`/`ATTACH`, with string
literals and comments blanked before keyword matching so `WHERE note = 'a; DROP
TABLE x'` still works. Safety doesn't change when the model does.

**Ambiguity is disclosed, not resolved silently.** Date direction is settled from
evidence in the column; when nothing settles it, the assumption is stated in the
UI. The model may also decline to answer and ask a clarifying question — a
confident answer to the wrong question is the costliest thing this app can do.

**Open-weight, behind an adapter.** `gpt-oss-120b` on Groq for the hosted demo,
Ollama for a fully offline run, swapped by one environment variable.

## What I'd want a reviewer to check

Testing is split so the parts that decide correctness have no I/O: type
inference, the guard, prompt parsing and join detection are pure and carry ~70
assertions. `scripts/test-e2e.mts` runs the whole pipeline headless over the
sample files and checks results against figures computed independently from the
CSV text — the cross-file average matches to the cent. `scripts/smoke.mjs`
drives Chromium through the real flow, which is how I found four defects that
typecheck, lint and the unit tests had all waved through, including a WASM
binary that 404'd so SQLite never loaded at all.

Seven ADRs in `docs/adr/` record each decision with its costs stated plainly.

## What I'd build next

1. **Verification pass.** Re-ask the model whether the returned result actually
   answers the question, and flag empty results caused by a filter that matched
   nothing — today's largest remaining source of confidently wrong answers.
2. **Row-count sanity on joins.** Warn when a join multiplies rows beyond the
   larger input; that single check catches the most damaging silent error class.
3. **Web Worker for ingest.** Parsing on the main thread janks large files.
4. **Per-column type overrides.** One stray cell downgrades a column to text;
   the user should be able to correct it without editing the file.
5. **Follow-up questions.** Carry the prior query as context so "and by
   location?" works.
6. **Saved questions.** The same five questions get asked every month; let them
   be pinned and re-run against a fresh upload.
