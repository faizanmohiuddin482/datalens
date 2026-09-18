"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { ChartSpec, QueryResult } from "@/lib/types";

/**
 * Blue carries the weight; ink and its mute structure everything. Yellow is not
 * in the series ramp — it is spent on the single highest bar, which is the one
 * thing worth marking on a chart (design system B1/B2).
 */
const SERIES = ["#2f5bff", "#0b1020", "#5b6472", "#7d9bff", "#1db954", "#e8590c"];
const HIGHLIGHT = "#ffd400";

const fmt = (v: unknown) =>
  typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(v ?? "");

/**
 * Axis ticks get compact notation — 2.7M rather than 2,671,529.41. A monospace
 * seven-digit tick does not fit the gutter and gets clipped to nonsense.
 */
const tick = (v: unknown) =>
  typeof v === "number" && Math.abs(v) >= 10_000
    ? v.toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 1 })
    : fmt(v);

export default function ResultChart({ spec, result }: { spec: ChartSpec; result: QueryResult }) {
  const xi = result.columns.indexOf(spec.x);
  const yis = spec.y.map((c) => result.columns.indexOf(c)).filter((i) => i >= 0);
  if (xi < 0 || yis.length === 0) return null;

  // Recharts wants objects; the guard already capped rows, and a chart past a
  // couple of hundred points is unreadable anyway.
  const data = result.rows.slice(0, 200).map((row) => {
    const point: Record<string, unknown> = { [spec.x]: row[xi] };
    for (const i of yis) point[result.columns[i]] = row[i];
    return point;
  });

  // Only mark a maximum when there is one series and the comparison is the point.
  const single = spec.y.length === 1;
  const values = single ? data.map((d) => Number(d[spec.y[0]])) : [];
  const peak = single ? values.indexOf(Math.max(...values)) : -1;

  const axis = { stroke: "var(--ink-mute)", fontSize: 11, fontFamily: "var(--font-plex-mono)" };
  const grid = <CartesianGrid stroke="var(--grid)" vertical={false} />;
  const tip = (
    <Tooltip
      cursor={{ fill: "var(--blue-tint)" }}
      formatter={(v: unknown) => fmt(v)}
      contentStyle={{
        background: "var(--bg)",
        border: "2px solid var(--ink)",
        borderRadius: 0,
        fontSize: 11,
        fontFamily: "var(--font-plex-mono)",
        color: "var(--ink)",
      }}
    />
  );

  const wide = data.length > 6;

  return (
    <figure className="mt-4">
      {spec.title && (
        <figcaption className="mb-2 text-[11px] uppercase tracking-[0.08em] text-ink-mute">
          {spec.title}
        </figcaption>
      )}
      <div className="frame h-72 w-full p-2">
        <ResponsiveContainer width="100%" height="100%">
          {spec.type === "line" ? (
            <LineChart data={data} margin={{ top: 6, right: 10, bottom: 4, left: 0 }}>
              {grid}
              <XAxis dataKey={spec.x} {...axis} tickMargin={8} />
              <YAxis {...axis} tickFormatter={tick} width={72} />
              {tip}
              {!single && <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-plex-mono)" }} />}
              {spec.y.map((c, i) => (
                <Line key={c} type="linear" dataKey={c} stroke={SERIES[i % SERIES.length]} strokeWidth={2} dot={{ r: 2.5, strokeWidth: 0, fill: SERIES[i % SERIES.length] }} />
              ))}
            </LineChart>
          ) : spec.type === "pie" ? (
            <PieChart>
              {tip}
              <Pie data={data} dataKey={spec.y[0]} nameKey={spec.x} outerRadius="72%" stroke="var(--ink)" strokeWidth={2}
                   label={{ fontSize: 11, fontFamily: "var(--font-plex-mono)", fill: "var(--ink)" }}>
                {data.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
              </Pie>
            </PieChart>
          ) : (
            <BarChart data={data} margin={{ top: 6, right: 10, bottom: 4, left: 0 }}>
              {grid}
              <XAxis
                dataKey={spec.x} {...axis} tickMargin={8} interval={0}
                angle={wide ? -30 : 0}
                textAnchor={wide ? "end" : "middle"}
                height={wide ? 68 : 32}
              />
              <YAxis {...axis} tickFormatter={tick} width={72} />
              {tip}
              {!single && <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-plex-mono)" }} />}
              {spec.y.map((c, i) => (
                <Bar key={c} dataKey={c} fill={SERIES[i % SERIES.length]} stroke="var(--ink)" strokeWidth={1.5}>
                  {single && data.map((_, row) => (
                    <Cell key={row} fill={row === peak ? HIGHLIGHT : SERIES[0]} />
                  ))}
                </Bar>
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
