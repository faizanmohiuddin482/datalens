"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AnswerCard from "@/components/AnswerCard";
import { Button, Chip, Field, Spinner, Text } from "@/components/ui";
import SchemaPanel from "@/components/SchemaPanel";
import Uploader from "@/components/Uploader";
import { Workspace } from "@/lib/db";
import { IngestError, readFile } from "@/lib/ingest";
import { ask, type Outcome, type Stage } from "@/lib/pipeline";
import { findJoinCandidates } from "@/lib/profile";
import type { JoinCandidate, TableProfile } from "@/lib/types";

const STAGE_LABEL: Record<Stage, string> = {
  planning: "Working out the query",
  running: "Running it against your data",
  repairing: "That query failed — correcting it",
  writing: "Writing the answer",
};

const STARTERS = [
  "What is the average annual CTC by department?",
  "Which departments took the most leave days in 2026?",
  "How many people joined each year, and what is the trend?",
  "Compare average CTC for Active vs Exited employees",
];

const SAMPLE_FILES = ["employees.csv", "compensation.csv", "attendance.csv"];

export default function Home() {
  const ws = useRef<Workspace | null>(null);
  const [tables, setTables] = useState<TableProfile[]>([]);
  const [joins, setJoins] = useState<JoinCandidate[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);

  useEffect(() => () => ws.current?.close(), []);

  const load = useCallback(async (files: File[]) => {
    setLoading(true);
    setProblem(null);
    try {
      ws.current ??= await Workspace.create();
      const failures: string[] = [];

      for (const file of files) {
        try {
          for (const sheet of await readFile(file)) ws.current.addSheet(sheet);
        } catch (e) {
          // One bad file shouldn't discard the others.
          failures.push(e instanceof IngestError ? e.message : `Could not read ${file.name}.`);
        }
      }

      setTables([...ws.current.tables]);
      setJoins(findJoinCandidates(ws.current.tables));
      setWarnings([...ws.current.warnings]);
      if (failures.length) setProblem(failures.join(" "));
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Could not read those files.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSamples = useCallback(async () => {
    setLoading(true);
    try {
      const files = await Promise.all(
        SAMPLE_FILES.map(async (name) => {
          const res = await fetch(`/samples/${name}`);
          return new File([await res.blob()], name, { type: "text/csv" });
        }),
      );
      await load(files);
    } catch {
      setProblem("Could not load the sample files.");
      setLoading(false);
    }
  }, [load]);

  const submit = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || !ws.current || loading) return;
    setQuestion("");
    setLoading(true);
    setProblem(null);
    const outcome = await ask(ws.current, trimmed, setStage);
    setOutcomes((prev) => [outcome, ...prev]);
    setStage(null);
    setLoading(false);
  }, [loading]);

  function reset() {
    ws.current?.dropAll();
    setTables([]); setJoins([]); setWarnings([]); setOutcomes([]); setProblem(null);
  }

  const ready = tables.length > 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Nav bar: mono caps, letter-spaced, active item underlined in yellow. */}
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-ink pb-3">
        <Text as="h1" role="h1">
          Data<span className="border-b-4 border-yellow">lens</span>
        </Text>
        <Text role="caption" className="max-w-sm sm:text-right">
          The model writes the query · SQLite in your browser computes the answer
        </Text>
      </header>

      {!ready ? (
        <Uploader onFiles={load} onSamples={loadSamples} busy={loading} compact={false} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
          <main className="min-w-0 space-y-5 lg:order-1">
            <form
              onSubmit={(e) => { e.preventDefault(); void submit(question); }}
              className="flex gap-2"
            >
              <Field
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask anything about the data you loaded…"
                disabled={loading}
                aria-label="Your question"
              />
              <Button type="submit" size="lg" className="shrink-0" disabled={loading || !question.trim()}>
                Ask
              </Button>
            </form>

            {outcomes.length === 0 && !loading && (
              <div className="flex flex-wrap gap-2">
                {STARTERS.map((s) => (
                  <Chip key={s} onClick={() => void submit(s)}>{s}</Chip>
                ))}
              </div>
            )}

            {stage && <Spinner label={STAGE_LABEL[stage]} />}

            {problem && <Text role="body" tone="warn">{problem}</Text>}

            {outcomes.map((o, i) => (
              <AnswerCard key={outcomes.length - i} outcome={o} onAsk={(q) => void submit(q)} />
            ))}
          </main>

          <div className="space-y-4 lg:order-2">
            <SchemaPanel tables={tables} joins={joins} warnings={warnings} onReset={reset} />
            <Uploader onFiles={load} onSamples={loadSamples} busy={loading} compact />
          </div>
        </div>
      )}

      <footer className="mt-16 border-t-2 border-ink pt-3">
        <Text role="caption">
          Your files stay in this tab. Only column names, types and the distinct
          values of small categorical columns are sent to the model.
        </Text>
      </footer>
    </div>
  );
}
