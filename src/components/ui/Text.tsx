import type { ElementType, ReactNode } from "react";
import { variants } from "./cx";

/**
 * The type scale (design system B1). Mono for everything; the serif italic
 * display role is used once per view and never for UI chrome.
 *
 * Components pick a role — "answer", "label", "caption" — rather than a size,
 * so the scale is retuned in one place.
 */
const text = variants(
  "",
  {
    role: {
      display: "font-display italic text-[40px] leading-[1.1] sm:text-[52px]",
      h1: "text-2xl font-bold uppercase tracking-[0.06em]",
      h2: "text-base font-bold uppercase tracking-[0.06em]",
      stat: "text-[32px] font-bold tabular-nums leading-tight",
      answer: "text-sm leading-relaxed",
      body: "text-sm",
      label: "text-xs uppercase tracking-[0.08em]",
      caption: "text-[11px] leading-snug",
      data: "text-xs tabular-nums",
    },
    tone: {
      ink: "text-ink",
      mute: "text-ink-mute",
      blue: "text-blue",
      warn: "text-warn",
      ok: "text-ok",
      inverse: "text-ink-inverse",
    },
  },
  { role: "body", tone: "ink" },
);

interface Props {
  children: ReactNode;
  as?: ElementType;
  role?: "display" | "h1" | "h2" | "stat" | "answer" | "body" | "label" | "caption" | "data";
  tone?: "ink" | "mute" | "blue" | "warn" | "ok" | "inverse";
  className?: string;
}

export default function Text({ children, as: Tag = "p", role, tone, className }: Props) {
  // Captions default to muted; every other role defaults to ink.
  const resolved = tone ?? (role === "caption" ? "mute" : "ink");
  return <Tag className={text({ role, tone: resolved, className })}>{children}</Tag>;
}

/**
 * A colon-suffixed stat line — `ROWS: 546`. The reference treatment for any
 * label/value pair in the system.
 */
export function StatLine({ label, value, tone }: { label: string; value: ReactNode; tone?: Props["tone"] }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <Text as="span" role="label" tone="mute">{label}:</Text>
      <Text as="span" role="data" tone={tone} className="text-right">{value}</Text>
    </div>
  );
}
