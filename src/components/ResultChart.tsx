"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { ChartSpec, QueryResult } from "@/lib/types";

/** Colour-blind-safe sequence, readable on both themes. */
const SERIES = ["#2f6f4f", "#3f7ea8", "#b5762f", "#7a5ea8", "#a33a2c", "#4f8a6b"];

const fmt = (v: unknown) =>
  typeof v === "number"
    ? v.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : String(v ?? "");

export default function ResultChart({ spec, result }: { spec: ChartSpec; result: QueryResult }) {
  const xi = result.columns.indexOf(spec.x);
  const yis = spec.y.map((c) => result.columns.indexOf(c)).filter((i) => i >= 0);
  if (xi < 0 || yis.length === 0) return null;

  // Recharts wants objects; the guard already capped the row count, and a chart
  // past a few hundred points is unreadable anyway.
  const data = result.rows.slice(0, 200).map((row) => {
    const point: Record<string, unknown> = { [spec.x]: row[xi] };
    for (const i of yis) point[result.columns[i]] = row[i];
    return point;
  });

  const axis = { stroke: "var(--muted)", fontSize: 11 };
  const grid = <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />;
  const tip = (
    <Tooltip
      formatter={(v: unknown) => fmt(v)}
      contentStyle={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        fontSize: 12,
        color: "var(--foreground)",
      }}
    />
  );

  return (
    <figure className="mt-4">
      {spec.title && <figcaption className="mb-2 text-xs text-muted">{spec.title}</figcaption>}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {spec.type === "line" ? (
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              {grid}
              <XAxis dataKey={spec.x} {...axis} tickMargin={8} />
              <YAxis {...axis} tickFormatter={fmt} width={64} />
              {tip}
              {spec.y.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {spec.y.map((c, i) => (
                <Line key={c} type="monotone" dataKey={c} stroke={SERIES[i % SERIES.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          ) : spec.type === "pie" ? (
            <PieChart>
              {tip}
              <Pie data={data} dataKey={spec.y[0]} nameKey={spec.x} outerRadius="75%" label={{ fontSize: 11 }}>
                {data.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
              </Pie>
            </PieChart>
          ) : (
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              {grid}
              <XAxis dataKey={spec.x} {...axis} tickMargin={8} interval={0} angle={data.length > 6 ? -25 : 0} textAnchor={data.length > 6 ? "end" : "middle"} height={data.length > 6 ? 62 : 32} />
              <YAxis {...axis} tickFormatter={fmt} width={64} />
              {tip}
              {spec.y.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {spec.y.map((c, i) => (
                <Bar key={c} dataKey={c} fill={SERIES[i % SERIES.length]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
