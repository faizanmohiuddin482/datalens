# 0007 — Four component tiers, with rules about what each may import

**Status:** Accepted · 2026-09-18

## Context

A prototype built in a few hours usually grows styling the same way: Tailwind
classes typed directly into feature components, a colour picked per element, and
state reached for wherever it is convenient. It works until the second person
touches it, or until the visual language changes — at which point every
component has to be edited, because every component encodes the design.

That last case was not hypothetical here: the app was re-skinned onto an
existing design system after the components were written.

## Decision

Four tiers, with a strict rule about direction of dependency:

| Tier | Lives in | May import | Knows about |
|---|---|---|---|
| 1 · Tokens | `app/globals.css` | — | nothing |
| 2 · Primitives | `components/ui/*` | tokens, other primitives | nothing about the app |
| 3 · Feature components | `components/*` | primitives, domain types | domain shapes, no behaviour |
| 4 · Container | `app/page.tsx` | everything | all state and orchestration |

The rules that give this teeth:

- **No component names a colour, size or font.** They reference semantic tokens
  through primitives: `<Frame fill="tint">`, `<Text role="caption">`. A literal
  hex outside `globals.css` or the chart ramp is a defect.
- **Primitives never import from `lib/`.** They take props and emit events, so
  they can be rendered in isolation.
- **Feature components hold no workspace state.** They receive data and
  callbacks, which is why `AnswerCard` can render an outcome without knowing
  whether a model, a repair loop or a fallback produced it.
- **Only the container touches `Workspace` and `pipeline`.** One place owns the
  database handle and the ask loop.
- **Variants are data, not ternaries.** `variants()` resolves a component's
  visual surface from a lookup table, so adding a tone is an edit to one object.

## Consequences

**Good**

- The re-skin was a token file, the primitives, and nothing else. Feature
  components changed only where the system introduced a genuinely new element
  (receipt lines, the confidence bar).
- Variant maps are typed, so the compiler lists every component still using a
  retired role. Thirty errors on the re-skin were thirty exact edit sites rather
  than a manual audit.
- The design system is legible in one directory instead of being spread across
  the app as class strings.

**Bad**

- Indirection: reading a component now means also reading the primitive to know
  what `role="caption"` resolves to.
- A hand-rolled `variants()` is a small reimplementation of `cva`. Justified at
  twenty lines and one dependency avoided; it stops being justified if the
  matrix grows much past this.
- Tiering costs more files than a four-hour prototype strictly needs.

## Alternatives considered

- **Tailwind classes inline, no primitives.** Faster for the first screen and
  the reason re-skins usually become rewrites.
- **A component library (shadcn/ui, MUI).** Solves this and brings its own
  visual language, which would have to be fought to reach a bespoke pixel
  terminal system. Wrong tool when the design is the point.
- **CSS modules per component.** Real encapsulation, but moves styling away from
  the markup and loses the typed variant surface that made the re-skin safe.
