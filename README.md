# DataLens

**Live: https://datalens-ntnrxrxiq-mohammed-faizan-mohiuddins-projects.vercel.app**

Upload CSV or Excel files, ask analytical questions in plain English, get an
answer you can check. Open the link and click *Load sample HR data* — no signup,
no files needed.

> **The model decides what to compute. SQLite decides what the number is.**

The model translates your question into SQL. A real database executes it against
your real rows and produces the figure. The model is then shown the actual result
and writes a sentence around it. No number in this app is ever produced by token
prediction — which is what makes the answers reproducible rather than merely
fluent.

Your data never leaves your browser. SQLite is compiled to WebAssembly and runs
in the tab; only the schema — column names, types, and the value lists of small
categorical columns — is sent to the model.

## Quick start

```bash
npm install
cp .env.example .env.local     # add a Groq key, free at console.groq.com
npm run dev
```

Open http://localhost:3000 and click **Load sample HR data**, or drop your own
files in.

To run entirely offline, with no third-party API at all:

```bash
ollama pull qwen2.5-coder:7b
# in .env.local:
MODEL_PROVIDER=ollama
```

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| App | Next.js 16, React 19, TypeScript (strict) | One deploy serves both the UI and the single API route |
| Query engine | SQLite via `sql.js` (WebAssembly), in-browser | Full SQL without a server; data stays on the user's machine ([ADR 0001](docs/adr/0001-sqlite-in-the-browser.md)) |
| Model | `gpt-oss-120b` (open weights, Apache 2.0) on Groq, or Ollama locally | Open-weight as the brief requires, behind a one-method adapter ([ADR 0005](docs/adr/0005-open-weight-model-behind-adapter.md)) |
| Parsing | PapaParse (CSV), SheetJS (Excel) | Multi-sheet workbooks become one table per sheet |
| Charts | Recharts | Rendered only when the question implies a comparison or trend |
| Styling | Tailwind v4 + semantic tokens | The visual system is swappable in one file ([design system](docs/design-system.md)) |

## How a question is answered

```
 ┌─ Browser tab ──────────────────────────────────────────┐
 │  upload → parse → infer types → SQLite tables          │
 │                    ↓                                   │
 │              profile: names, types, real values,       │
 │                       verified join keys               │
 └──────────┬──────────────────────────────┬──────────────┘
            │ schema only — never rows     │ SQL
            ▼                              ▼
     /api/ask  (stateless)           guard → execute
            │                              │
      open-weight model                    │ error? one repair round
            │                              ▼
            └──────── narrate(real rows) ◄─┘
```

1. **Profile** — every column is typed and profiled at upload. Low-cardinality
   columns contribute their actual value list; numeric and date columns their
   range. Column pairs are scored for join candidacy by how much of one column's
   values genuinely appear in the other.
2. **Plan** — the model receives that profile and returns either SQL plus a chart
   spec, or a request for clarification if the question is ambiguous.
3. **Guard** — every query is validated as untrusted input before execution:
   single statement, `SELECT`/`WITH` only, no DDL/DML/`PRAGMA`/`ATTACH`, and a
   row cap applied by wrapping rather than appending.
4. **Execute** — SQLite runs the query in your browser.
5. **Repair** — if the query failed, the database's own error is sent back once
   for a correction, and the correction is disclosed in the UI.
6. **Narrate** — the model is shown the real result and writes the sentence.

## What makes the answers trustworthy

This is the part that took the thinking. Each mitigation targets a specific way
natural-language-to-SQL produces a *confident wrong answer*:

| Failure mode | What this app does |
|---|---|
| Invents a column that sounds plausible | The exact schema is in the prompt |
| `status = 'Active'` when the file says `ACTIVE` → silent zero | Real distinct values are inlined for low-cardinality columns |
| Joins two files on an unrelated key, inflating every total | Join keys are verified against actual values and scored |
| `01/02/2024` read as the wrong month | Resolved from evidence in the column; when genuinely ambiguous, the assumption is **stated in the UI** |
| SQL that doesn't run | One repair round using the database's error |
| Destructive or injected SQL | A guard in code, not an instruction in the prompt |
| A fluent answer to a question you didn't ask | The model may ask for clarification instead |
| Arithmetic hallucination | Structurally impossible — the model never emits a figure |

## Demo recording

```bash
npm run demo -- https://your-deployment.vercel.app ~/Desktop
```

Drives the real app in a real browser and records it, with a synthetic cursor so
it reads as a walkthrough. No screen recorder, no desktop clutter, and it can be
re-run after any change rather than re-filmed.

## Tests

```bash
npm test          # 70+ assertions, no browser or API key needed
npx tsc --noEmit
npm run lint
```

The pure modules — type inference, the SQL guard, prompt parsing, join detection
— have no I/O and are tested directly. `scripts/test-e2e.mts` runs the entire
pipeline headless over the real sample files and checks the results against
figures computed independently from the CSV text, so the assertions verify the
pipeline rather than restating its output.

## Deploying

```bash
vercel --prod
```

Set `GROQ_API_KEY` in the project's environment. Nothing else is needed: the
server holds no state, so there is no database, blob store or session layer to
provision.

The acceptance suite can be pointed at a deployment rather than localhost, which
is how the live build above was verified:

```bash
BASE=https://your-deployment.vercel.app npm run test:acceptance
```

## Project layout

```
src/lib/      infer · sql-guard · profile · prompt   (pure, tested)
              db · ingest · pipeline                 (browser)
              llm                                    (server)
src/app/      page.tsx (the only stateful container) · api/ask
src/components/  feature components · ui/ (primitives)
docs/adr/     seven architecture decision records
scripts/      test runners · sample data generators
```

## Known limits

- Data is bounded by browser memory — comfortable to ~100k rows, not millions.
- Parsing runs on the main thread, so a very large file will briefly block the UI.
- Nothing persists across a refresh; this is a single-session analysis tool.
- One malformed cell downgrades a whole column to text — conservative on purpose
  ([ADR 0006](docs/adr/0006-conservative-type-inference.md)), but a per-column
  type override would be the fix.

## Further reading

- [Architecture decision records](docs/adr/) — seven decisions, with the costs
  of each stated plainly
- [Design system](docs/design-system.md) — how the visual language is applied
- [Write-up](docs/writeup.md) — approach, key decisions, what's next
- [CLAUDE.md](CLAUDE.md) — the invariant, and the rules for working in this repo
