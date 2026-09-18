"use client";

import { useState } from "react";
import { Button, Text, cx } from "./ui";
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
    return <Text role="body" tone="mute" className="mt-4">The query ran and matched no rows.</Text>;
  }

  return (
    <div className="mt-4">
      <div className="scroll-x frame">
        <table className="w-full min-w-max text-left text-xs">
          <thead className="border-b-2 border-ink bg-blue-tint">
            <tr>
              {result.columns.map((c) => (
                <th key={c} scope="col" className="whitespace-nowrap px-3 py-2 text-[11px] font-bold uppercase tracking-[0.06em]">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={cx(i > 0 && "border-t border-grid")}>
                {r.map((c, j) => (
                  <td key={j} className={cx("whitespace-nowrap px-3 py-1.5", typeof c === "number" && "tabular-nums")}>
                    {fmt(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.rows.length > PAGE && (
        <Button tone="link" size="sm" className="mt-2" onClick={() => setShowAll(!showAll)}>
          {showAll ? "show fewer" : `show all ${result.rows.length.toLocaleString()} rows`}
        </Button>
      )}
      {result.truncated && <Text role="caption" className="mt-2">Result capped at the row limit.</Text>}
    </div>
  );
}
