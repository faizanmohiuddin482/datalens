"use client";

import { useState } from "react";
import { Bar, Button, Frame, StatLine, Text } from "./ui";
import type { JoinCandidate, TableProfile } from "@/lib/types";

interface Props {
  tables: TableProfile[];
  joins: JoinCandidate[];
  warnings: string[];
  onReset: () => void;
}

export default function SchemaPanel({ tables, joins, warnings, onReset }: Props) {
  const [open, setOpen] = useState<string | null>(tables[0]?.name ?? null);

  return (
    <aside className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <Text as="h2" role="h2">Loaded data</Text>
        <Button tone="link" size="sm" onClick={onReset}>Clear</Button>
      </div>

      {warnings.length > 0 && (
        <Frame fill="warn" pad="sm">
          <Text role="label" tone="warn" className="mb-2">Assumptions made</Text>
          <ul className="space-y-1">
            {warnings.map((w) => <Text as="li" role="caption" key={w}>{w}</Text>)}
          </ul>
        </Frame>
      )}

      <div className="space-y-2">
        {tables.map((t) => (
          <Frame key={t.name} pad="none">
            <button
              onClick={() => setOpen(open === t.name ? null : t.name)}
              aria-expanded={open === t.name}
              className="step-in w-full px-3 py-2 text-left hover:bg-blue-tint"
            >
              <StatLine label={t.name} value={`${t.rowCount.toLocaleString()} rows`} />
            </button>

            {open === t.name && (
              <div className="space-y-1 border-t-2 border-ink px-3 py-2">
                {t.columns.map((c) => (
                  <StatLine
                    key={c.sqlName}
                    label={c.sqlName}
                    value={c.type}
                    tone={c.type === "text" ? "mute" : "blue"}
                  />
                ))}
                <Text role="caption" className="pt-1">from {t.source}</Text>
              </div>
            )}
          </Frame>
        ))}
      </div>

      {joins.length > 0 && (
        <Frame pad="sm">
          <Text role="label" className="mb-2">Detected relationships</Text>
          <ul className="space-y-2">
            {joins.slice(0, 5).map((j) => (
              <li key={`${j.leftTable}.${j.leftColumn}-${j.rightTable}.${j.rightColumn}`} className="space-y-1">
                {/* The node/line grammar from the deck: two tiles, one link. */}
                <Text role="caption" tone="ink" className="break-all">
                  {j.leftTable}.{j.leftColumn}
                  <span className="mx-1 text-blue" aria-hidden>──</span>
                  {j.rightTable}.{j.rightColumn}
                </Text>
                <Bar value={j.overlap} label={`${Math.round(j.overlap * 100)}% match`} />
              </li>
            ))}
          </ul>
          <Text role="caption" className="mt-3">
            Found by comparing actual values, then given to the model so it joins
            on real keys rather than guessing.
          </Text>
        </Frame>
      )}
    </aside>
  );
}
