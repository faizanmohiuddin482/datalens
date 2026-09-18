import { cx } from "./cx";

/** SQL and errors, in a tinted framed window. Scrolls inside itself. */
export default function Code({ children, size = "sm" }: { children: string; size?: "sm" | "xs" }) {
  return (
    <pre className={cx("scroll-x frame bg-blue-tint p-3 leading-relaxed", size === "sm" ? "text-xs" : "text-[11px]")}>
      {children}
    </pre>
  );
}
