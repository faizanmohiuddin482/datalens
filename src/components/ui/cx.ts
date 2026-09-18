/**
 * Class composition and variant resolution.
 *
 * Deliberately not `clsx` + `cva` + `tailwind-merge`: three dependencies to
 * replace twenty lines, on a surface this small. If the variant matrix grows
 * past what is readable here, that trade flips.
 */

export type ClassValue = string | false | null | undefined;

export function cx(...parts: ClassValue[]): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Builds a variant resolver from a base class plus named axes.
 *
 * Keeping variants in a lookup — rather than in ternaries at the call site —
 * means a component's whole visual surface is one readable object, and adding a
 * size or tone is a data change rather than an edit to JSX.
 */
export function variants<V extends Record<string, Record<string, string>>>(
  base: string,
  axes: V,
  defaults: { [K in keyof V]: keyof V[K] },
) {
  return (props: Partial<{ [K in keyof V]: keyof V[K] }> & { className?: string } = {}) => {
    const picked = (Object.keys(axes) as (keyof V)[]).map(
      (axis) => axes[axis][(props[axis] ?? defaults[axis]) as string],
    );
    return cx(base, ...picked, props.className);
  };
}
