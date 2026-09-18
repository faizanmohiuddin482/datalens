# Design system — how Sync is applied here

The visual language is the **Sync** system (the source spec is kept verbatim at
[`design-system-source.md`](design-system-source.md)). This document records how
it maps onto a data Q&A tool, and what was deliberately left out.

The structural reasoning behind the component tiers lives in
[ADR 0007](adr/0007-component-architecture.md).

## What carries over unchanged

- **Palette.** Blue `#2F5BFF` dominant, ink `#0B1020` structuring everything,
  yellow `#FFD400` as the single accent. No second accent anywhere.
- **White ground with a 24px graph-paper grid** behind every screen. Light is
  the only theme; there is no dark variant, by design.
- **Every container is a framed window** — 2px ink border, square corners, no
  shadows. Elevation is a second inset 1px frame (`<Frame depth="raised">`).
- **Mono for all UI** (IBM Plex Mono), with the serif italic display face used
  once per view and never for chrome.
- **Colon-suffixed stat lines** (`employees: 102 rows`) for any label/value pair.
- **Stepped motion** — `steps(3)` transitions, a blinking block cursor on the
  ask box, and progress that fills in visible chunks.

## How the surfaces map

Sync's component map targets Home, Memory, Rooms and Skills. The equivalents:

| Sync surface | Here |
|---|---|
| Home ask box — framed terminal, `>` prompt, blinking cursor | The question field, exactly as specified |
| Answer panel with a boxed keyword | The answer card; the **boxed yellow figure is the answer itself** — the one thing on the surface worth marking |
| Rooms receipt lines | The evidence strip under each answer: what ran, how long it took, and whether a query had to be corrected first |
| Skills graph — pixel nodes and connection lines | Detected join relationships, drawn as two table nodes joined by a link |
| The `LVL:` XP bar | Join-match confidence, filled in ten discrete blocks |
| Quest log | The pipeline stages, named as they happen |
| `--warn` approval banner | The assumptions panel and error cards — the one place the palette raises its voice |

## What was deliberately not taken

- **Part A's illustrated pixel scenes and pixel avatars.** They belong to a deck
  and to Sync's people-centred surfaces. There are no people in this product,
  and decorative illustration would work against a tool whose entire claim is
  that its numbers are checkable.
- **Motif density is dialled to the "pro" end** of the range the source spec
  itself sanctions in its closing caution. The grammar is complete — frames,
  mono, grid, the yellow keyword, stepped motion — without the arcade
  decoration, because the audience for this build is an enterprise buyer.

## The guardrail checklist

From the source spec's B4, as it stands:

- [x] White background plus faint grid on every screen; no dark theme
- [x] Every container is a square-cornered framed window; zero radii, zero shadows
- [x] Mono everywhere except the single serif-italic hero line
- [x] Yellow only for: the answer figure, active state, progress fill, focus ring
- [x] Node/line grammar reused for detected relationships
- [x] Blue dominant; no second accent introduced
- [x] Stepped motion, blinking cursor, chunked progress — no ease curves

Radii and shadows are enforced globally in `globals.css` rather than trusted to
review, so a stray `rounded-lg` from a future contributor cannot regress it.
