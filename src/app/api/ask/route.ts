/**
 * The only server-side endpoint: question + schema in, SQL out.
 *
 * Stateless by design. It holds no uploaded data, so the browser stays the sole
 * owner of the rows (ADR 0001) and the deployment needs no database.
 *
 * The client orchestrates: plan -> execute locally -> repair if needed ->
 * narrate. Keeping that loop client-side is what lets this run as a plain
 * serverless function.
 */

import { NextResponse } from "next/server";
import { MissingCredentialsError, provider } from "@/lib/llm";
import {
  buildNarrateMessages, buildPlanMessages, buildRepairMessages, parsePlan,
} from "@/lib/prompt";
import type { JoinCandidate, QueryResult, TableProfile } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

interface PlanBody {
  mode: "plan";
  tables: TableProfile[];
  joins: JoinCandidate[];
  question: string;
}
interface RepairBody {
  mode: "repair";
  tables: TableProfile[];
  joins: JoinCandidate[];
  question: string;
  sql: string;
  error: string;
}
interface NarrateBody {
  mode: "narrate";
  question: string;
  sql: string;
  result: QueryResult;
}
type Body = PlanBody | RepairBody | NarrateBody;

const MAX_QUESTION = 500;

function invalid(body: unknown): string | null {
  if (!body || typeof body !== "object") return "Malformed request body.";
  const b = body as Record<string, unknown>;
  if (b.mode !== "plan" && b.mode !== "repair" && b.mode !== "narrate") return "Unknown mode.";
  if (typeof b.question !== "string" || !b.question.trim()) return "A question is required.";
  if (b.question.length > MAX_QUESTION) return `Questions are limited to ${MAX_QUESTION} characters.`;
  if (b.mode !== "narrate") {
    if (!Array.isArray(b.tables) || b.tables.length === 0) return "No tables were provided.";
  }
  if (b.mode === "repair" && (typeof b.sql !== "string" || typeof b.error !== "string")) {
    return "A repair needs the failed SQL and its error.";
  }
  if (b.mode === "narrate" && (typeof b.sql !== "string" || !b.result)) {
    return "Narration needs the query and its result.";
  }
  return null;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Request body was not valid JSON." }, { status: 400 });
  }

  const problem = invalid(body);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    const llm = provider();

    if (body.mode === "narrate") {
      const text = await llm.complete(
        buildNarrateMessages(body.question, body.sql, body.result),
        { temperature: 0.2 },
      );
      // The narration prompt asks for a sentence, but json_object mode means it
      // may arrive wrapped. Accept either.
      let answer = text.trim();
      try {
        const obj = JSON.parse(answer) as Record<string, unknown>;
        const first = Object.values(obj).find((v) => typeof v === "string");
        if (typeof first === "string") answer = first;
      } catch { /* plain text is fine */ }
      return NextResponse.json({ answer, model: llm.model });
    }

    const base = buildPlanMessages(body.tables, body.joins ?? [], body.question);
    const messages =
      body.mode === "repair" ? buildRepairMessages(base, body.sql, body.error) : base;

    const raw = await llm.complete(messages);
    return NextResponse.json({ plan: parsePlan(raw), model: llm.model });
  } catch (e) {
    if (e instanceof MissingCredentialsError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    const message = e instanceof Error ? e.message : "The model request failed.";
    console.error("[/api/ask]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
