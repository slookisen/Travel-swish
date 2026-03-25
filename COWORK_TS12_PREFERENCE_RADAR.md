# COWORK TS12: Preference Radar — "Se din smaksprofil"

## Context
File: `src/App.tsx`
Design system: `src/ui.ts`

Users want to see their preference profile — what they've built up through swiping. Currently there's a minimal text-based profile summary (TS3). This adds a proper visual "taste radar" the user can open on demand.

## Goal
A full-screen modal (or slide-up panel on mobile) that shows the user's preference profile as a visual radar/spider chart built with pure SVG — no external chart libs.

## Deliverables

### Component: `PreferenceRadarModal`

**Trigger:** A button on both the swipe page and results page — label:
- NO: `"🧭 Min smak"`
- EN: `"🧭 My taste"`

Show the button only when `totalSwipes >= 5` (before that there's not enough data to show anything meaningful).

**Modal structure:**
```
[X close button — top right]
[Title: "Din smaksprofil" / "Your taste profile"]
[Subtitle: "Basert på X sveip" / "Based on X swipes"]
[SVG Radar chart — centered]
[Dimension list below chart — name + bar + value]
[Footer: "Jo mer du sveiper, jo bedre treff 🎯" / "The more you swipe, the better the matches 🎯"]
```

### SVG Radar Chart (pure SVG, no libs)

Dimensions: use `DIMS` from `dataset.ts` (9 dimensions: adv, soc, lux, act, cul, nat, food, night, spont).

**Implementation:**
```ts
function RadarChart({ profile, labels }: { profile: Record<string, number>; labels: Record<string, string> }) {
  const dims = DIMS; // ['adv','soc','lux','act','cul','nat','food','night','spont']
  const size = 220;
  const cx = size / 2, cy = size / 2;
  const maxR = 80;
  
  // Normalize: profile values are -1 to 1. Map to 0-1 for radius.
  const normalize = (v: number) => Math.max(0, Math.min(1, (v + 1) / 2));
  
  // Polygon points for user profile
  const points = dims.map((d, i) => {
    const angle = (i / dims.length) * 2 * Math.PI - Math.PI / 2;
    const r = normalize(profile[d] || 0) * maxR;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });
  
  // Grid circles (3 levels)
  // Axis lines + labels
  // Filled polygon for user profile (teal, opacity 0.3)
  // Stroke polygon (teal, opacity 0.8)
  // Label text at each axis tip
}
```

Style:
- Background: `T.card`, border `T.borderSoft`
- Fill: `rgba(52, 211, 153, 0.25)` (T.teal transparent)
- Stroke: `T.teal`, strokeWidth 2
- Axis lines: `T.borderSoft`, strokeWidth 1
- Grid circles: `T.borderSoft`, strokeWidth 0.5, dashed
- Labels: dim color, small font, positioned just outside the max radius

### Dimension list below chart
For each dimension, show:
```
[emoji] [label]     ████████░░  72%
```
- Only show dimensions where `|profile[d]| > 0.15` (has meaningful data)
- Sort by absolute value descending (strongest first)
- Bar: `height: 6px`, `borderRadius: 3px`, fill `linear-gradient(T.gold, T.teal)`, background `T.borderSoft`
- Percentage: `Math.round((profile[d] + 1) / 2 * 100)`

Tone: add a one-liner "profile archetype" based on top 2 dimensions:
- e.g., top = `cul` + `nat`: `"🏛️🌿 Kulturell naturentusiast"`
- top = `adv` + `spont`: `"⚡🎲 Eventyrlysten villstyring"`
- top = `lux` + `food`: `"✨🍽️ Luksuriøs matelsker"`
Map at least 6 combinations. If no clear match, fallback: `"🌍 Fri sjel"`

### State
Add `const [showRadar, setShowRadar] = useState(false)` to main App state.
Button: in swipe page header area and in results page (next to share/find more buttons).

## DoD
- [ ] Radar modal opens from both swipe and results pages
- [ ] SVG chart renders with all 9 dimensions, no external libs
- [ ] Normalized correctly: neutral swipes = small polygon, strong prefs = large polygon
- [ ] Dimension list shows only meaningful dims (|v| > 0.15), sorted
- [ ] Profile archetype text shown
- [ ] Works well on mobile (modal is `max-height: 90vh`, `overflow-y: auto`)
- [ ] Only visible after ≥5 swipes
- [ ] `npm run build` passes
