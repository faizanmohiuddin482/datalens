"use client";

import type { InputHTMLAttributes } from "react";
import { cx } from "./cx";

/**
 * The terminal input: a framed window with a `>` prompt glyph and a blinking
 * block cursor when empty (design system B3).
 */
export default function Field({
  className, value, ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  const empty = !value || String(value).length === 0;

  return (
    <div className={cx("frame step-in flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5", className)}>
      <span aria-hidden className="select-none text-blue">&gt;</span>
      <input
        value={value}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-mute disabled:opacity-60"
        {...rest}
      />
      {empty && <span aria-hidden className="cursor-blink inline-block h-4 w-2 bg-ink" />}
    </div>
  );
}
