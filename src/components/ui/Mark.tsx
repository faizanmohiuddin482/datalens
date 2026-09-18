import type { ReactNode } from "react";

/**
 * The signature motif: the single most important token on a surface, boxed in
 * yellow. One per view, never decorative (design system B2).
 */
export default function Mark({ children }: { children: ReactNode }) {
  return <mark className="bg-yellow px-1.5 py-0.5 text-ink">{children}</mark>;
}
