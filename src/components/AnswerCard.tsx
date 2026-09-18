"use client";

import ResultChart from "./ResultChart";
import ResultTable from "./ResultTable";
import { Button, Chip, Code, Disclosure, Frame, FrameFooter, Mark, Receipt, Text } from "./ui";
import { download } from "@/lib/export";
import type { Answer, Clarification, Failure, Outcome } from "@/lib/pipeline";

/**
 * Every answer ships with its evidence. The query is one click away because a
 * number nobody can check is a claim, not an answer.
 *
 * Presentational only: it receives an Outcome and emits questions. It knows
 * nothing about the workspace, the pipeline, or how the answer was produced.
 */
export default function AnswerCard({
  outcome, onAsk,
}: { outcome: Outcome; onAsk: (q: string) => void }) {
  if (outcome.kind === "clarify") return <ClarifyCard outcome={outcome} onAsk={onAsk} />;
  if (outcome.kind === "error") return <ErrorCard outcome={outcome} />;
  return <ResultCard outcome={outcome} />;
}

/** The question, echoed as a terminal prompt line. */
function Asked({ children }: { children: string }) {
  return (
    <Text role="label" tone="mute">
      <span aria-hidden className="mr-1.5 text-blue">&gt;</span>{children}
    </Text>
  );
}

function ClarifyCard({ outcome, onAsk }: { outcome: Clarification; onAsk: (q: string) => void }) {
  return (
    <Frame>
      <Asked>{outcome.question}</Asked>
      <Text role="answer" className="mt-3">{outcome.ask}</Text>

      {outcome.suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {outcome.suggestions.map((s) => <Chip key={s} onClick={() => onAsk(s)}>{s}</Chip>)}
        </div>
      )}

      <Text role="caption" className="mt-4">
        Asked rather than guessed — a confident answer to the wrong question is
        the costliest thing this app could do.
      </Text>
    </Frame>
  );
}

function ErrorCard({ outcome }: { outcome: Failure }) {
  return (
    <Frame fill="warn">
      <Asked>{outcome.question}</Asked>
      <Text role="answer" tone="warn" className="mt-3">{outcome.message}</Text>
      {outcome.sql && <div className="mt-3"><Code>{outcome.sql}</Code></div>}
    </Frame>
  );
}

function ResultCard({ outcome }: { outcome: Answer }) {
  const { result } = outcome;
  const scalar = result.rows.length === 1 && result.columns.length === 1;
  const headline = scalar
    ? typeof result.rows[0][0] === "number"
      ? result.rows[0][0].toLocaleString(undefined, { maximumFractionDigits: 2 })
      : String(result.rows[0][0] ?? "—")
    : null;

  return (
    <Frame depth="raised">
      <Asked>{outcome.question}</Asked>

      {/* The one boxed keyword per surface: the figure that answers the question. */}
      {headline !== null && (
        <Text role="stat" className="mt-4"><Mark>{headline}</Mark></Text>
      )}

      <Text role="answer" className="mt-3">{outcome.text}</Text>

      {outcome.chart && <ResultChart spec={outcome.chart} result={result} />}
      {!scalar && <ResultTable result={result} />}

      <FrameFooter className="flex-col items-start gap-2">
        <div className="flex w-full flex-wrap items-center gap-3">
          <Disclosure label="Show the query" hideLabel="Hide the query">
            <div className="mt-3 space-y-2">
              {outcome.explanation && <Text role="caption">{outcome.explanation}</Text>}
              <Code>{outcome.sql}</Code>
            </div>
          </Disclosure>

          {result.rows.length > 0 && (
            <Button
              tone="link"
              size="sm"
              onClick={() => download(result, outcome.question)}
              title="Download these rows as CSV — generated in your browser"
            >
              Download CSV
            </Button>
          )}

          <Text as="span" role="caption" className="ml-auto">{outcome.model}</Text>
        </div>

        {/* Receipts: what actually happened to produce this number. */}
        <div className="space-y-1">
          {outcome.repairedFrom && (
            <Receipt status="failed">
              first query failed — {outcome.repairedFrom.error}, corrected and re-run
            </Receipt>
          )}
          <Receipt status="done">
            computed by SQLite in your browser · {result.rows.length.toLocaleString()} row
            {result.rows.length === 1 ? "" : "s"} · {result.elapsedMs} ms
          </Receipt>
        </div>
      </FrameFooter>
    </Frame>
  );
}
