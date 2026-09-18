"use client";

import { useId, useState, type ReactNode } from "react";
import Button from "./Button";

/**
 * A labelled show/hide. The trigger states what is revealed rather than being a
 * bare chevron — the evidence behind an answer should name itself.
 */
export default function Disclosure({
  label, hideLabel, children, defaultOpen = false,
}: { label: string; hideLabel?: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <>
      <Button tone="link" size="sm" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        {open ? (hideLabel ?? `Hide ${label}`) : label}
      </Button>
      {open && <div id={id} className="w-full">{children}</div>}
    </>
  );
}
