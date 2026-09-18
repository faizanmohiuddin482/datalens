# Sync — Design System & Pixel Scene Shot List

Two parts:
- **Part A** — the four pixel scenes for the deck (a shot list for whoever illustrates).
- **Part B** — turning the *product we've built* (Home, Memory, Rooms, Skills) into this same visual language, as a real design system for frontend.

The deck and the product share ONE system, so the pitch and the live demo feel like the same universe.

---

# PART A — Pixel Scene Shot List (deck)

Four scenes, one continuous arc: **disconnected -> wired -> in use -> leveled up.** Same pixel resolution, same character proportions, same object language across all four.

## Scene 1 — "Disconnected" (Slide 1)
- **Subject:** one chunky pixel person, centered-right, standing still.
- **Around them:** 5 floating pixel "cartridge" panels drifting apart with clear gaps between them. Each is a low-res tool icon:
  - pixel chat bubble = Slack
  - pixel kanban card = Jira
  - pixel headset = CRM
  - pixel `</>` = GitHub
  - pixel bar chart = Analytics
- **Action:** the figure reaches one arm toward the nearest panel, hand stopping short — not connecting.
- **Mood:** surrounded by knowledge, can't reach it. Wry, not grim.
- **No connection lines anywhere.** The absence of lines is the point.

## Scene 2 — "Wired" (Slide 2) — the payoff, highest priority
- **Same 5 panels, same positions**, now joined by yellow pixel connection lines into one network.
- **Center:** a bright pixel Sync hub node the lines converge on.
- **Figures:** 3 department people, each at their panel, now lit up: seller w/ headset, engineer at a screen, leader w/ tablet.
- **Hero action:** one figure types into a pixel chat window; a pixel answer bubble beams back carrying a small `[SOURCE]` tag.
- **The move:** this is Scene 1 healed. Same composition, now connected — the visual should be instantly recognizable as "the fixed version" of Slide 1.

## Scene 3 — "In use" (Slide 3) — minimal, breathes
- **Single vignette, centered**, lots of white around it.
- Pixel presenter figure gesturing toward a large framed pixel monitor/window.
- Screen glows faint yellow; content is abstract pixel blocks, NOT real UI.
- Nothing else on the slide.

## Scene 4 — "Leveled up" (Slide 4)
- **Left-to-right progression** (an XP / level track):
  - LVL 1 (NOW): small pixel network cluster, few figures.
  - LVL 2 (NEXT): more panels, more departments, more figures joining.
  - LVL 3 (LATER): a full pixel **brain-shaped network** tucked inside a pixel **house/shield outline** (owned, on their hardware), small pixel crowd beneath.
- **Under all three:** a yellow pixel progress bar (like the reference's `LVL: 24`) filling toward LATER.
- Growth must read at a glance before any text is read.

**Character rules (all scenes):** same pixel grid size, same head-to-body ratio, same 3-4 skin/hair block colors, blue as the dominant garment color. Objects reuse identical icons wherever they reappear (a Slack bubble looks the same in Scene 1 and Scene 2).

---

# PART B — Turning the product into this design system

The app today (Home, Skills, Memory, Rooms, Guide + a dark/galaxy theme) gets re-skinned into the retro-futuristic pixel-terminal language. This is the spec.

## B1. Design tokens

**Color**
```
--bg            #FFFFFF   /* app background — white, always */
--grid          #DCE6FF   /* faint graph-paper lines, ~30% opacity in use */
--ink           #0B1020   /* primary text + all pixel/panel outlines */
--ink-mute      #5B6472   /* secondary text, captions, timestamps */
--blue          #2F5BFF   /* dominant: primary buttons, active nav, figures, panel fills-tint */
--blue-tint     #EAF0FF   /* panel/inactive fills, hover states */
--yellow        #FFD400   /* single accent: highlights, active progress, boxed keyword, focus */
--ink-inverse   #FFFFFF   /* text on blue fills */
--ok            #1DB954   /* success / receipt confirmed */
--warn          #E8590C   /* approval-required banners */
```
Rule: blue carries 60-70% of weight, ink structures everything, yellow marks ONLY the one thing that matters on a given surface. Never introduce a second accent.

**Type**
```
--font-mono     "IBM Plex Mono" (or JetBrains Mono / Berkeley Mono) — body, labels, UI, data
--font-display  a serif italic (e.g. "Playfair Display" italic) — hero lines ONLY, used once per view
```
Scale (mono unless noted):
```
display   40-56px  serif italic   — the one hero line on a marketing/empty-state view
h1        24px     mono bold caps  — page title
h2        16px     mono bold caps  — section / panel label (QUEST LOG, IN PRACTICE)
body      14px     mono            — default
label     12px     mono caps, +1 letterspacing — field labels (NAME:, LVL:, SOURCE:)
caption   11px     mono, ink-mute  — timestamps, citations, meta
```
Labels are colon-suffixed and right-aligned to their value where it reads as a stat line (mirrors the reference's `NAME: … STEPHANIE`).

**Grid & surface**
```
--radius        0px       /* hard corners — pixel/terminal feel, no rounding */
--border        2px solid var(--ink)   /* the framed "UI window" outline */
--border-double an inner 1px inset border 3px inside the outer, for the double-frame look
--grid-bg       repeating 24px light-blue graph lines on white, behind everything
--space         8px base unit; gaps in multiples (8/16/24/32)
```
Every card, panel, modal, and input is a **framed window**: 2px ink outer border, optional 1px inner inset border, square corners, white or blue-tint fill. No drop shadows (they break the flat pixel feel) — use the double border for elevation instead.

**Motion**
- Stepped, not smooth: transitions snap in 2-3 frames (e.g. `steps(3)` easing) rather than ease-curves, so it feels pixel/terminal.
- Cursor blink on the ask box; progress bars fill in visible chunks, not a smooth sweep.

## B2. Signature motif in-product
The **yellow keyword box** carries over from the deck: use it to highlight the single most important token on a surface — the search term the answer matched, the active room name, the one stat that changed. One per view, never decorative.

## B3. Component -> product-surface mapping

**Global nav (Home / Skills / Memory / Rooms / Guide)**
- Top bar, mono caps, letter-spaced (like `WORKS  ABOUT  CONTACT` in the reference).
- Active item gets a yellow underline (the reference's ABOUT treatment). Not a fill — an underline.
- Remove the dark/galaxy theme entirely; light is the only theme. (If a toggle must survive, it switches grid density, not dark mode.)

**Home — the ask box + answer**
- The ask input is a framed terminal window with a blinking cursor and a `>` prompt glyph.
- Answers render in a framed panel; each citation is a mono `[SOURCE: #channel]` chip in blue, the matched search term boxed in yellow.
- Empty state ("nothing recorded yet") uses one serif-italic hero line + a pixel vignette (reuse Scene-3 style monitor).

**Memory — facts by person & topic**
- People render as **pixel avatars** (the reference's blockhead avatar is the template) in a framed roster, each with a stat-line card: `NAME:`, `ROLE:`, and a mini "fact count" bar styled like the `LVL:` XP bar.
- Topics render as framed cards; source filter is a row of mono caps toggle chips.
- Editing a fact opens a framed modal; the edited value is the yellow-boxed word on save.

**Rooms — agents, tasks, documents, receipts**
- Agent chips above the message box = mono caps pills in blue, one-line role beneath (matches the guide's spec).
- Every agent action drops a **receipt line**: a mono, ink-mute row prefixed with a pixel status glyph (searched / wrote / updated). Confirmed = `--ok`.
- The `notify_slack` approval banner = a framed `--warn`-outlined strip: "APPROVE TO SEND?" with mono Approve / Discard buttons. This is the one place the calm palette raises its voice — good, it should.
- Task list = a quest log: checkboxes as pixel squares, done items get a yellow strike/box.

**Skills — the graph**
- Nodes = framed pixel tiles; edges = pixel connection lines (same visual grammar as Scene 2's network — the product literally looks like the pitch).
- Import / Add = framed modal; a pending PR-review skill shows a `STATUS: IN REVIEW` label chip.

**Auth / sign-in**
- Email-only, framed terminal input, `>` prompt. Copy stays plain (the guide warns a typo makes you a different person — surface that as mono helper text under the field).

## B4. Consistency guardrails (the app-wide checklist)
- [ ] Background white + faint grid on every screen; dark theme removed
- [ ] Every container is a square-cornered framed window; zero rounded corners, zero shadows
- [ ] Mono everywhere except the one serif-italic hero line per view
- [ ] Yellow used only for: active state, progress fill, the one boxed keyword, focus ring
- [ ] Pixel avatars + pixel node/line grammar reused identically in Memory, Skills, and the deck scenes
- [ ] Blue is dominant; no second accent color introduced anywhere
- [ ] Stepped motion, blinking cursor, chunked progress bars — no smooth ease curves

## B5. Suggested build order (lowest risk first)
1. Tokens + the framed-window base component + grid background (touches everything once).
2. Nav restyle (fast, high visual payoff, proves the direction).
3. Home ask box + answer/citation panel (the most-demoed surface).
4. Memory pixel avatars + stat cards.
5. Rooms receipts + approval banner + quest-log tasks.
6. Skills graph nodes/edges.
Kill the dark theme in step 1 so nothing new gets built against it.

---

## One caution to raise with the team
This aesthetic is playful and memorable — great for the hackathon demo and for a product that wants personality. But a pixel-arcade look can read as "toy" to an enterprise buyer weighing whether to trust it with company memory. Recommend: ship this as the demo/marketing skin, and keep the option open for a straighter "pro" variant (same tokens, calmer motif density) if you later sell into risk-averse buyers. Same system, dialed up or down — not a rebuild.
