"use client";

import type { ReactNode } from "react";
import { variants } from "./cx";

const chip = variants(
  "step-in inline-flex items-center border-2 px-2.5 py-1 text-[11px] uppercase tracking-[0.08em]",
  {
    tone: {
      suggestion: "border-ink bg-bg text-ink-mute hover:bg-blue-tint hover:text-ink",
      active: "border-ink bg-blue text-ink-inverse",
      static: "border-ink bg-blue-tint text-ink",
    },
  },
  { tone: "suggestion" },
);

/** A clickable rephrasing, or a static tag when no handler is given. */
export default function Chip({
  children, onClick, tone, disabled,
}: { children: ReactNode; onClick?: () => void; tone?: "suggestion" | "active" | "static"; disabled?: boolean }) {
  if (!onClick) return <span className={chip({ tone: tone ?? "static" })}>{children}</span>;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={chip({ tone })}>
      {children}
    </button>
  );
}
