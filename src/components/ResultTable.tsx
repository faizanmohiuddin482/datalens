"use client";

import { useState } from "react";
import type { QueryResult } from "@/lib/types";

const PAGE = 12;

const fmt = (v: unknown) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return String(v);
};

export default function ResultTable({ result }: { result: QueryResult }) {
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? result.rows : result.rows.slice(0, PAGE);

  if (result.rows.length === 0) {
    return <p className="mt-3 text-sm text-muted">The query ran and matched no rows.</p>;
  }

  return (
    <div className="mt-3">
      <div className="scroll-x rounded-lg border border-border">
        <table className="w-full min-w-max text-left text-xs">
          <thead className="bg-code-bg">
            <tr>
              {result.columns.map((c) => (
                <th key={c} className="whitespace-nowrap px-3 py-2 font-mono font-medium">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                {r.map((c, j) => (
                  <td key={j} className={`whitespace-nowrap px-3 py-1.5 ${typeof c === "number" ? "tabular-nums" : ""}`}>
                    {fmt(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-muted">
        {result.rows.length.toLocaleString()} row{result.rows.length === 1 ? "" : "s"}
        {result.truncated && " (capped)"} · {result.elapsedMs} ms
        {result.rows.length > PAGE && (
          <button onClick={() => setShowAll(!showAll)} className="ml-2 underline hover:text-foreground">
            {showAll ? "show fewer" : `show all ${result.rows.length.toLocaleString()}`}
          </button>
        )}
      </p>
    </div>
  );
}
