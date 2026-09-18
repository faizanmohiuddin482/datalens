# Changelog

Notable changes to DataLens. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project uses
[semantic versioning](https://semver.org/).

Entries describe what changed for someone *using* the app. The reasoning behind
a structural decision belongs in an [ADR](docs/adr/), which entries link to
rather than restate.

## [Unreleased]

### Added

- **Ask questions about uploaded spreadsheets in plain English.** The model
  writes SQL, SQLite computes the figure, and the model then writes a sentence
  from the real result — no number in the UI comes from the model itself
  ([ADR 0002](docs/adr/0002-model-writes-sql-database-computes.md)).
- **Multi-file and multi-sheet upload.** CSV, TSV and Excel; every sheet in a
  workbook becomes its own table.
- **Cross-file questions.** Join keys are detected by measuring how much of one
  column's values actually appear in another, scored by overlap and shown in the
  UI ([ADR 0004](docs/adr/0004-profile-driven-grounding.md)).
- **Charts** — bar, line and pie — rendered when the question implies a
  comparison, trend or share, with the peak value marked.
- **Evidence with every answer:** the generated SQL, the row count, the elapsed
  time, and the model that wrote it.
- **Clarifying questions.** When a question is genuinely ambiguous the app asks
  back, with clickable rephrasings, instead of guessing.
- **Automatic query repair.** A query that fails is retried once using the
  database's own error message, and the correction is disclosed rather than
  hidden.
- **Disclosed assumptions.** Ambiguous date formats are resolved from evidence
  in the column; where nothing settles the question, the assumption made is
  stated in the UI ([ADR 0006](docs/adr/0006-conservative-type-inference.md)).
- **Sample HR datasets**, loadable in one click, deliberately containing the
  awkward cases real exports have: currency symbols, percentages, day-first
  dates and `N/A` in numeric columns.
- **Offline mode** via Ollama, selected with one environment variable
  ([ADR 0005](docs/adr/0005-open-weight-model-behind-adapter.md)).
- **Download any answer's rows as CSV.** The file is built in your browser, so
  exporting sends nothing anywhere. Numbers are written unformatted so they stay
  numbers when reopened, and the file carries a UTF-8 marker so Excel renders ₹
  and accented names correctly.

### Security

- Model-generated SQL is validated as untrusted input before execution — single
  statement, `SELECT`/`WITH` only, no DDL, DML, `PRAGMA` or `ATTACH`. String
  literals and comments are blanked before keyword matching, so a legitimate
  query containing `'a; DROP TABLE x'` as a *value* still runs
  ([ADR 0003](docs/adr/0003-sql-guard-not-prompt.md)).
- Uploaded data never leaves the browser. Only column names, types and the
  distinct values of small categorical columns are sent to the model
  ([ADR 0001](docs/adr/0001-sqlite-in-the-browser.md)).
- CSV exports neutralise spreadsheet formula injection. A cell beginning with
  `=`, `+`, `-` or `@` would otherwise execute when the downloaded file is
  opened in Excel or Sheets — a live risk here, since cell contents come from
  whatever file was uploaded.

### Fixed

- SQLite failed to load in the browser entirely: sql.js ships a separate build
  per environment and each requests a binary named after itself, but only the
  Node binary was published. Both are now copied before dev and build.
- Answers silently degraded to "N rows returned" — JSON mode was being forced on
  the narration call, which the provider rejects unless the prompt mentions
  JSON. JSON mode is now per-call.
- Narration listed raw floats (`2,671,529.411764706`) instead of writing a
  sentence. Result rows are formatted before the model sees them.
- Chart Y-axis labels were clipped to nonsense at seven digits; ticks above
  10,000 now use compact notation.
- A failed database initialisation is no longer cached, so one transient error
  no longer disables the app for the life of the tab.
