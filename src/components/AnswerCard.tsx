"use client";

import { useState } from "react";
import ResultChart from "./ResultChart";
import ResultTable from "./ResultTable";
import type { Outcome } from "@/lib/pipeline";

/**
 * Every answer ships with its evidence. The SQL is one click away because a
 * number nobody can check is not an answer — it is a claim.
 */
export default function AnswerCard({
  outcome, onAsk,
}: { outcome: Outcome; onAsk: (q: string) => void }) {
  const [showSql, setShowSql] = useState(false);

  if (outcome.kind === "clarify") {
    return (
      <article className="rounded-xl border border-border bg-surface p-5">
        <p className="text-xs text-muted">{outcome.question}</p>
        <p className="mt-2 text-sm font-medium">{outcome.ask}</p>
        {outcome.suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {outcome.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onAsk(s)}
                className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent-soft"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <p className="mt-3 text-[11px] text-muted">
          Asked rather than guessed — a confident answer to the wrong question is
          the costliest thing this app could do.
        </p>
      </article>
    );
  }

  if (outcome.kind === "error") {
    return (
      <article className="rounded-xl border border-border bg-surface p-5">
        <p className="text-xs text-muted">{outcome.question}</p>
        <p className="mt-2 text-sm text-danger">{outcome.message}</p>
        {outcome.sql && (
          <pre className="scroll-x mt-3 rounded-lg bg-code-bg p-3 font-mono text-xs">{outcome.sql}</pre>
        )}
      </article>
    );
  }

  const { result } = outcome;
  const scalar = result.rows.length === 1 && result.columns.length === 1;

  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <p className="text-xs text-muted">{outcome.question}</p>

      {scalar && (
        <p className="mt-3 text-3xl font-semibold tabular-nums">
          {typeof result.rows[0][0] === "number"
            ? result.rows[0][0].toLocaleString(undefined, { maximumFractionDigits: 2 })
            : String(result.rows[0][0] ?? "—")}
        </p>
      )}

      <p className={`${scalar ? "mt-1" : "mt-2"} text-[15px] leading-relaxed`}>{outcome.text}</p>

      {outcome.chart && <ResultChart spec={outcome.chart} result={result} />}
      {!scalar && <ResultTable result={result} />}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs text-muted">
        <button onClick={() => setShowSql(!showSql)} className="underline hover:text-foreground">
          {showSql ? "Hide" : "Show"} the query
        </button>
        <span>·</span>
        <span>computed by SQLite in your browser</span>
        <span>·</span>
        <span className="font-mono text-[11px]">{outcome.model}</span>
      </div>

      {showSql && (
        <div className="mt-3 space-y-2">
          {outcome.explanation && <p className="text-xs text-muted">{outcome.explanation}</p>}
          <pre className="scroll-x rounded-lg bg-code-bg p-3 font-mono text-xs leading-relaxed">{outcome.sql}</pre>
          {outcome.repairedFrom && (
            <details className="text-xs text-muted">
              <summary className="cursor-pointer">
                First attempt failed and was corrected automatically
              </summary>
              <p className="mt-1 text-danger">{outcome.repairedFrom.error}</p>
              <pre className="scroll-x mt-1 rounded-lg bg-code-bg p-3 font-mono text-[11px]">
                {outcome.repairedFrom.sql}
              </pre>
            </details>
          )}
        </div>
      )}
    </article>
  );
}
