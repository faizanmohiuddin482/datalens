import type { ReactNode } from "react";
import { cx, variants } from "./cx";

/**
 * The framed window — the one container in the system.
 *
 * Every card, panel, modal and input is this: a 2px ink outline, square
 * corners, white or blue-tint fill. Elevation is a second inset frame, never a
 * shadow (design system B1).
 */
const frame = variants(
  "frame step-in",
  {
    fill: {
      paper: "bg-bg",
      tint: "bg-blue-tint",
      active: "bg-blue-tint border-blue",
      warn: "bg-bg border-warn",
    },
    pad: { none: "", sm: "p-2", md: "p-4", lg: "p-8" },
    depth: { flat: "", raised: "frame-double" },
  },
  { fill: "paper", pad: "md", depth: "flat" },
);

interface Props {
  children: ReactNode;
  fill?: "paper" | "tint" | "active" | "warn";
  pad?: "none" | "sm" | "md" | "lg";
  depth?: "flat" | "raised";
  className?: string;
}

export default function Frame({ children, fill, pad, depth, className }: Props) {
  return <div className={frame({ fill, pad, depth, className })}>{children}</div>;
}

/** The evidence strip under an answer: an ink rule, then meta in mono caps. */
export function FrameFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("mt-4 flex flex-wrap items-center gap-2 border-t-2 border-ink pt-3", className)}>
      {children}
    </div>
  );
}
