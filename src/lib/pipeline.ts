/**
 * The ask loop, run from the browser.
 *
 * plan -> guard + execute locally -> repair once on failure -> narrate from the
 * real result. Keeping the loop here is what lets the server stay stateless: it
 * answers three independent questions and remembers nothing (ADR 0001).
 */

import type { Workspace } from "./db";
import { findJoinCandidates } from "./profile";
import { reconcileChart } from "./prompt";
import type { ChartSpec, Plan, QueryResult } from "./types";

export interface Answer {
  kind: "answer";
  question: string;
  /** The sentence, from the model, describing results it was actually shown. */
  text: string;
  sql: string;
  explanation: string;
  result: QueryResult;
  chart: ChartSpec | null;
  /** Set when the first query failed and the model was asked to fix it. */
  repairedFrom?: { sql: string; error: string };
  model: string;
}

export interface Clarification {
  kind: "clarify";
  question: string;
  ask: string;
  suggestions: string[];
}

export interface Failure {
  kind: "error";
  question: string;
  message: string;
  /** Present when the failure was SQL that would not run. */
  sql?: string;
}

export type Outcome = Answer | Clarification | Failure;

export type Stage = "planning" | "running" | "repairing" | "writing";

async function callApi<T>(body: unknown): Promise<T> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status}).`);
  return json;
}

export async function ask(
  ws: Workspace,
  question: string,
  onStage: (s: Stage) => void = () => {},
): Promise<Outcome> {
  const tables = ws.tables;
  const joins = findJoinCandidates(tables);

  try {
    onStage("planning");
    const planned = await callApi<{ plan: Plan; model: string }>({
      mode: "plan", tables, joins, question,
    });

    if (planned.plan.kind === "clarify") {
      return {
        kind: "clarify",
        question,
        ask: planned.plan.question,
        suggestions: planned.plan.suggestions,
      };
    }

    let { sql } = planned.plan;
    let { explanation, chart } = planned.plan;
    let repairedFrom: Answer["repairedFrom"];

    onStage("running");
    let run = ws.run(sql);

    // One repair round. The database's own error message is far more actionable
    // to the model than the original question restated.
    if (run.error) {
      onStage("repairing");
      const failedSql = sql;
      const failure = run.error;
      try {
        const fixed = await callApi<{ plan: Plan; model: string }>({
          mode: "repair", tables, joins, question, sql: failedSql, error: failure,
        });
        if (fixed.plan.kind === "query") {
          sql = fixed.plan.sql;
          explanation = fixed.plan.explanation;
          chart = fixed.plan.chart;
          onStage("running");
          run = ws.run(sql);
          repairedFrom = { sql: failedSql, error: failure };
        }
      } catch { /* keep the original error below */ }

      if (run.error) {
        return { kind: "error", question, message: run.error, sql };
      }
    }

    const result = run.result!;

    onStage("writing");
    let text: string;
    let model = planned.model;
    try {
      const narrated = await callApi<{ answer: string; model: string }>({
        mode: "narrate", question, sql, result,
      });
      text = narrated.answer;
      model = narrated.model;
    } catch {
      // The numbers are already correct — the sentence is the only casualty.
      text = describeFallback(result);
    }

    return {
      kind: "answer",
      question,
      text,
      sql,
      explanation,
      result,
      chart: reconcileChart(chart, result.columns),
      repairedFrom,
      model,
    };
  } catch (e) {
    return { kind: "error", question, message: e instanceof Error ? e.message : String(e) };
  }
}

/** Used when narration fails: state the result plainly rather than nothing. */
function describeFallback(result: QueryResult): string {
  if (result.rows.length === 0) return "No rows matched that question.";
  if (result.rows.length === 1 && result.columns.length === 1) {
    return `${result.columns[0]}: ${String(result.rows[0][0])}`;
  }
  return `${result.rows.length} row${result.rows.length === 1 ? "" : "s"} returned.`;
}
