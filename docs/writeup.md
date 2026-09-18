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

**Close the remaining correctness gaps.** A verification pass — ask whether the
result actually answers the question — and a row-count check that warns when a
join multiplies rows past the larger input. That second one catches the most
damaging silent error there is: a total that is wrong because the join was.

**Answer differently depending on who is asking.** In an HR system this is the
real problem. "Average salary by department" is a reasonable question from a CHRO
and a data breach from a team lead. Filters would have to be applied to the query
before execution, not to the result after, and the app would need to say *why* a
number is scoped rather than silently narrowing it.

**Point it at live systems instead of uploads.** Uploading an export is how you
demo this; connecting to the system of record is how anyone uses it. The pipeline
already separates profiling from querying, so a live schema and a warehouse
connection slot into the same shape — the guard and the grounding do not change.

**Move the engine server-side past the browser's ceiling.** In-browser SQLite is
the right call for a single-session tool on files a person can upload, and the
wrong one at millions of rows. That is a deliberate trade
([ADR 0001](adr/0001-sqlite-in-the-browser.md)), and the privacy property it buys
is worth keeping as long as possible — but the boundary between the model and the
database is unchanged by the move, which is why it is a swap rather than a
rewrite.

**Then the smaller things:** follow-up questions so "and by location?" works,
per-column type overrides, and moving ingest to a Web Worker.

Seven ADRs in `docs/adr/` record each decision with its costs stated plainly.
