# Travel‑Swish v2 — Design system (lightweight)

This project intentionally uses **inline React styles** for speed, but we still want a consistent look.
This file defines a small set of **tokens + rules** so the UI doesn’t drift.

## Goals

- Consistent typography, spacing, radii, and shadows
- Minimal visual noise (Tinder-clean)
- Clear states: loading / empty / error
- Keep it simple: prefer a few primitives over many one-off styles

## Tokens (source of truth)

Implementation lives in `src/ui.ts`.

### Colors

- Background: `T.bg`
- Card surface: `T.card`
- Text: `T.txt`
- Muted text: `T.dim`
- Accent gradient: `T.gold → T.teal`
- Status: `T.red`, `T.green`
- Borders: `T.border`, `T.borderSoft`

### Radius scale

Use these instead of ad-hoc values:

- `R.sm` = 10
- `R.md` = 12
- `R.lg` = 18  (default card)
- `R.xl` = 20
- `R.pill` = 999

### Spacing scale

- `S.xs` = 6
- `S.sm` = 10
- `S.md` = 14
- `S.lg` = 18
- `S.xl` = 22
- `S.page` = 24

### Typography

- Base font: `F.system`
- Prefer bold headers: 800–950 weight
- Defaults:
  - Body: 14–16
  - Small/meta: 12
  - H2: ~20
  - H1/hero: ~34

## Components (primitives)

We keep a few CSS classes in `globalCss` (see `src/ui.ts`):

- `.container` — page width + padding
- `.card` — surface + border + shadow + radius
- `.btn` / `.btnPrimary` / `.btnGhost` — buttons
- `.input` — inputs
- `.pill` — chips, selects, badges

Rule: **use these classes first**, then add inline tweaks where needed.

## Motion

- `fadeUp` (200ms) for page sections
- `pop` for micro-interactions

Rule: keep transitions short (<250ms) and avoid constant animations.

## States

- Loading: short label + disabled CTA
- Empty: clear explanation + reset CTA (`resetDeck`)
- Error: red text, placed close to the control causing it

## Definition of done (visual)

When we say a screen is “polished”:

- No magic colors: uses `T.*`
- No random radii: uses `R.*`
- No random spacing: uses `S.*`
- At least one empty/error state reviewed
- Works on mobile widths
