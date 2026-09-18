import Text from "./Text";

/**
 * The XP-style confidence bar, filled in discrete blocks rather than a smooth
 * sweep — used for join-match confidence.
 */
export default function Bar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(1, value));
  const blocks = 10;
  const filled = Math.round(pct * blocks);

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-[2px]" role="img" aria-label={`${Math.round(pct * 100)} percent`}>
        {Array.from({ length: blocks }, (_, i) => (
          <span
            key={i}
            className={`h-2.5 w-2 border border-ink ${i < filled ? "bg-yellow" : "bg-bg"}`}
          />
        ))}
      </div>
      {label && <Text as="span" role="caption">{label}</Text>}
    </div>
  );
}
