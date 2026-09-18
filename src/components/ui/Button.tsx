"use client";

import type { ButtonHTMLAttributes } from "react";
import { variants } from "./cx";

const button = variants(
  "step-in inline-flex items-center justify-center gap-1.5 border-2 font-medium uppercase " +
    "tracking-[0.08em] disabled:cursor-not-allowed disabled:opacity-40",
  {
    tone: {
      primary: "border-ink bg-blue text-ink-inverse hover:bg-ink",
      outline: "border-ink bg-bg text-ink hover:bg-blue-tint",
      ghost: "border-transparent bg-transparent text-ink-mute hover:text-ink hover:bg-blue-tint",
      link: "border-transparent bg-transparent p-0 text-ink-mute underline underline-offset-4 hover:text-blue",
    },
    size: {
      sm: "px-2 py-1 text-[11px]",
      md: "px-3 py-1.5 text-xs",
      lg: "px-4 py-2.5 text-xs",
    },
  },
  { tone: "primary", size: "md" },
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "outline" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
};

export default function Button({ tone, size, className, type = "button", ...rest }: Props) {
  return <button type={type} className={button({ tone, size, className })} {...rest} />;
}
