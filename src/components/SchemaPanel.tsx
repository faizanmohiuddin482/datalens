"use client";

import { useState } from "react";
import type { JoinCandidate, TableProfile } from "@/lib/types";

interface Props {
  tables: TableProfile[];
  joins: JoinCandidate[];
  warnings: string[];
  onReset: () => void;
}

const TYPE_COLOR: Record<string, string> = {
  number: "text-accent",
  date: "text-accent",
  boolean: "text-accent",
  text: "text-muted",
};

export default function SchemaPanel({ tables, joins, warnings, onReset }: Props) {
  const [open, setOpen] = useState<string | null>(tables[0]?.name ?? null);

  return (
    <aside className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">
          Loaded data
          <span className="ml-2 font-normal text-muted">
            {tables.length} table{tables.length === 1 ? "" : "s"}
          </span>
        </h2>
        <button onClick={onReset} className="text-xs text-muted hover:text-foreground underline">
          Clear
        </button>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-3 text-xs">
          <p className="mb-1 font-medium">Assumptions made while reading your files</p>
          <ul className="space-y-1 text-muted">
            {warnings.map((w) => <li key={w}>· {w}</li>)}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        {tables.map((t) => (
          <div key={t.name} className="rounded-lg border border-border bg-surface">
            <button
              onClick={() => setOpen(open === t.name ? null : t.name)}
              className="flex w-full items-baseline justify-between gap-2 px-3 py-2 text-left"
            >
              <span className="font-mono text-xs font-medium">{t.name}</span>
              <span className="shrink-0 text-xs text-muted">{t.rowCount.toLocaleString()} rows</span>
            </button>

            {open === t.name && (
              <ul className="space-y-1 border-t border-border px-3 py-2">
                {t.columns.map((c) => (
                  <li key={c.sqlName} className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="font-mono">{c.sqlName}</span>
                    <span className={`shrink-0 ${TYPE_COLOR[c.type]}`}>{c.type}</span>
                  </li>
                ))}
                <li className="pt-1 text-[11px] text-muted">from {t.source}</li>
              </ul>
            )}
          </div>
        ))}
      </div>

      {joins.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-3 text-xs">
          <p className="mb-2 font-medium">Detected relationships</p>
          <ul className="space-y-1.5">
            {joins.slice(0, 5).map((j) => (
              <li key={`${j.leftTable}.${j.leftColumn}-${j.rightTable}.${j.rightColumn}`}>
                <span className="font-mono text-[11px]">
                  {j.leftTable}.{j.leftColumn} = {j.rightTable}.{j.rightColumn}
                </span>
                <span className="ml-1 text-muted">{Math.round(j.overlap * 100)}% match</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted">
            Found by comparing actual values, then given to the model so it joins
            on real keys rather than guessing.
          </p>
        </div>
      )}
    </aside>
  );
}
