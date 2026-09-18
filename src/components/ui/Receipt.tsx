import type { ReactNode } from "react";
import Text from "./Text";
import { cx } from "./cx";

/**
 * A receipt line: what the system did, prefixed with a status glyph. Borrowed
 * from Rooms (design system B3) to record the steps behind an answer — the
 * query that was run, and any query that had to be corrected first.
 */
const GLYPH = { done: "▪", failed: "✕", info: "▫" } as const;
const TONE = { done: "text-ok", failed: "text-warn", info: "text-ink-mute" } as const;

export default function Receipt({
  status = "info", children,
}: { status?: keyof typeof GLYPH; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span aria-hidden className={cx("text-[10px] leading-4", TONE[status])}>{GLYPH[status]}</span>
      <Text as="span" role="caption" tone={status === "failed" ? "warn" : "mute"}>{children}</Text>
    </div>
  );
}
