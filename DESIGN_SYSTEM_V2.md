# Travel‑Swish v2 — Design system (tokens + rules)

This project intentionally uses **inline React styles** + a small `globalCss` string for speed.
To keep the UI consistent, we treat `src/ui.ts` as the **single source of truth** for design tokens.

## Goals

- Consistent color, spacing, radii, typography
- “Tinder-clean” surfaces: big cards, low noise
- Clear states: loading / empty / error
- Motion that feels snappy **and** respects reduced-motion

---

## Tokens (source of truth)

Implementation lives in `src/ui.ts`.

### Color tokens (`T.*`)

Use these instead of hardcoded hex/rgba in components:

- Background: `T.bg`
- Surfaces: `T.card`, `T.glassHi`, `T.glassLo`
- Text: `T.txt`, `T.dim`
- Accent: `T.gold`, `T.teal`
- Status: `T.red`, `T.green`
- Borders: `T.border`, `T.borderSoft`, `T.goldBorder`
- Overlays/washes: `T.overlay`, `T.goldWash`, `T.goldWashHi`
- Shadows: `T.shadow`, `T.shadowMd`

### Radius scale (`R.*`)

- `R.sm` (small UI corners)
- `R.md` (inputs/buttons)
- `R.lg` (default card)
- `R.xl` (hero/swipe cards)
- `R.pill` (chips)

Rule: avoid ad-hoc `borderRadius` values.

### Spacing scale (`S.*`)

- `S.xxs`, `S.xs`, `S.xs2`, `S.sm`, `S.sm2`, `S.md`, `S.md2`, `S.lg`, `S.xl`, `S.page`

Rule: prefer composition like `S.page + S.xxs` over random one-offs.

### Typography (`F.*`)

- Font stack: `F.system`
- Sizes: `F.size.sm/base/md/lg/hero/emoji`
- Weights: `F.weight.medium/bold/black/ultra`

Rule: headings should usually be `black/ultra` (800–950). Body copy stays calm.

### Motion (`M.*`)

- `M.fadeUp` — for section enter
- `M.snap` — quick interactive transitions
- `M.commit` — slightly longer “commit” animations (e.g. swipe off-screen)
- `M.ease` — default easing

Rule: keep transitions short (<250ms) and meaningful.

---

## Global primitives (CSS classes)

Defined in `globalCss` (`src/ui.ts`):

- `.container` — page width + padding
- `.card` — surface + border + shadow + radius
- `.btn` / `.btnPrimary` / `.btnGhost` — buttons
- `.input` — inputs
- `.pill` — chips/selects/badges
- `.muted`, `.row`, `.wrap`, `.spacer`, `.fadeUp`

Rule: **use primitives first**, then add inline tweaks only where needed.

---

## Motion + reduced motion

### Default motion rules

- Page sections use `.fadeUp`
- Swipe cards use transform transitions (snap/commit)

### Reduced motion

We support `prefers-reduced-motion: reduce` in `globalCss`:

- All animations/transitions are disabled via a media query
- JS-driven motion should use a reduced-motion aware duration helper (see `motionMs()` usage)

Rule: if motion communicates state, provide a non-animated fallback (text/state change).

---

## Empty / error / loading microcopy

Keep copy:

- Short, human, action-oriented
- Close to the control that caused it
- Consistent across languages (NO / EN / SV)

Patterns:

- **Loading**: “Loading…” + disabled CTA
- **Empty**: explain why it’s empty + offer a next action (e.g. “Find more”, “Start over”)
- **Error**: red text near the relevant action; avoid raw stack traces

---

## Visual Definition of Done (DoD)

A screen is “polished” when:

- No magic colors: uses `T.*`
- No random radii: uses `R.*`
- No random spacing: uses `S.*` (or composed from it)
- Empty/error states reviewed
- Reduced-motion is respected
- Works on mobile widths
