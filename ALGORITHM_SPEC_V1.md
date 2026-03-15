# Travel-Swish Preference Algorithm v1 — Specification

> **Version:** 1.0.0  
> **Last updated:** 2026-03-15  
> **Status:** Implemented (backend `main.py` recs endpoint)  
> **Task:** ts-v2-algo

---

## 1. Overview

The Travel-Swish preference algorithm learns user taste from swipe interactions and produces ranked, explainable recommendations. It operates in two phases:

1. **Learning** — swipe events update per-facet preference weights
2. **Ranking** — preference weights score POIs via dot-product, then diversity post-processing rebalances the result list

Each mode (`experiences`, `restaurants`) maintains **separate** preference memory, so restaurant swipes never pollute experience preferences and vice versa.

---

## 2. Dimensional Model

### 2.1 Dims (continuous axes)

Nine continuous dimensions, each ranging `[-1, 1]`:

| Dim ID | Label | Semantic |
|--------|-------|----------|
| `adv` | Adventure | Risk-seeking ↔ Safety-seeking |
| `soc` | Social | Group/party-oriented ↔ Solo/intimate |
| `lux` | Luxury | Premium/splurge ↔ Budget/backpacker |
| `act` | Activity | High-energy physical ↔ Low-energy passive |
| `cul` | Culture | Deep cultural immersion ↔ Mainstream/tourist |
| `nat` | Nature | Outdoors/wilderness ↔ Urban/indoor |
| `food` | Food | Foodie-centric ↔ Food-as-fuel |
| `night` | Nightlife | Party/nightlife ↔ Early-bird/daytime |
| `spont` | Spontaneity | Improvised/flexible ↔ Planned/structured |

Each card carries a `dims` object with values for 1–9 of these axes. Zero or missing dims are treated as neutral (no contribution).

### 2.2 Facets (categorical tags)

Each card also carries 1–3 `facets` entries (facetId + valueId pairs) from the taxonomy. These are used for category-based diversity and UI labeling, not directly in the scoring function.

The `cat` field on each card (the primary facet value) determines its diversity bucket.

---

## 3. Preference Learning

### 3.1 Swipe Detection

Direction is inferred from the event using this priority cascade:

1. `payload.dir` — numeric; `≥ 0` → like, `< 0` → dislike
2. `payload.liked` — boolean
3. Event `name` regex: `like|right|swipe_right` → like; `nope|dislike|left|swipe_left` → dislike

If none match, the event is not a swipe and prefs are not updated.

### 3.2 Weight Assignment

| Direction | Weight |
|-----------|--------|
| Like (right swipe) | `+1.0` |
| Dislike (left swipe) | `−0.3` |

**Rationale for asymmetric weights:** Dislikes carry less magnitude to prevent rapid preference collapse. A user who dislikes one spicy card shouldn't tank their entire `food` dimension; likes are more intentional signals.

### 3.3 Accumulator Update

For each facet `f` in the swiped card's `delta`/`dims` with value `v_f`:

```
contribution = weight × v_f
denominator_add = |v_f|

pref_stats[user, mode, f].num += contribution
pref_stats[user, mode, f].den += denominator_add
```

### 3.4 Preference Recomputation

After every swipe, the full preference vector for `(user_id, mode)` is recomputed:

```
For each facet f in pref_stats[user, mode]:
    pref[f] = clamp(num_f / den_f, -1.0, +1.0)
```

This produces a normalized weight per facet, bounded to `[-1, 1]`.

**Properties:**
- Fresh users start with empty prefs → all POIs score equally (50/100)
- Preferences converge toward the user's actual taste as swipe count increases
- The denominator prevents a single strong-signal card from dominating
- Clamping ensures no facet weight exceeds the `[-1, 1]` range

---

## 4. Recommendation Scoring

### 4.1 Dot-Product Score

For each POI with tag vector `T` and user preference vector `P`:

```
raw_score = Σ_f (P[f] × T[f])    for all facets f where both P[f] and T[f] are nonzero
```

### 4.2 Normalization

Convert raw score to a 0–100 match percentage:

```
match = clamp(50 + raw_score × 50, 0, 100)
```

**Interpretation:**
- `50` = neutral match (no preference signal or orthogonal)
- `100` = perfect alignment
- `0` = maximum misalignment

**Note:** With the current 9-dim model and weights in `[-1, 1]`, theoretical raw_score range is `[-9, +9]`, but real-world scores rarely exceed `±2.0` because:
- Cards typically have 3–5 nonzero dims
- User prefs are normalized averages (rarely ±1.0)
- The `50 ± score×50` mapping is intentionally compressed

### 4.3 Category Diversity (Post-Ranking)

After scoring and sorting by `match` descending, results are rebalanced via round-robin category interleaving:

1. Partition scored items into buckets by `cat` field
2. Round-robin pick: take the highest-scored item from each category in order
3. Repeat until `limit` items selected or all buckets empty

**Effect:** If a user strongly prefers "spicy" foods, the top-N results still include varied categories (seafood, brunch, etc.) rather than 20 spicy restaurants in a row.

**Current limitation:** Diversity is category-only. No novelty penalty for recently-seen cards (see §5).

---

## 5. Novelty & Diversity Heuristics

### 5.1 Implemented: Category Round-Robin

See §4.3. This is the only diversity mechanism in v1.

### 5.2 Planned: Temporal Novelty (v2 roadmap)

Track which POIs a user has already seen/swiped. Apply a decay penalty:

```
novelty_penalty = decay_factor ^ (days_since_last_shown)
adjusted_match = match × novelty_penalty
```

Where `decay_factor ≈ 0.95` so items resurface after ~2 weeks of not being shown.

### 5.3 Planned: Intra-List Diversity (v2 roadmap)

MMR (Maximal Marginal Relevance) or similar: penalize items that are too similar to already-selected items in the result list. Similarity measured by cosine distance on the `dims` vector.

```
MMR_score = λ × match − (1−λ) × max_similarity_to_selected
```

Where `λ ≈ 0.7` (tunable).

---

## 6. Explainability ("Why" Rules)

Each recommendation includes a human-readable `why` field explaining the match.

### 6.1 Generation Rules

1. **Collect contributions:** For each facet where both user pref and POI tag are nonzero, compute `contribution = pref_weight × tag_value`
2. **Sort by |contribution| descending**
3. **Take top 5** contributing facets
4. **Format:** `"Top factors: facet_name (+0.65), facet_name (−0.12), …"`
   - Sign uses `+` for positive contributions, `−` (minus sign) for negative
   - Value shown to 2 decimal places
5. **Fallback:** If no contributions exist (new user, no matching facets): `"Bootstrap match (no prefs yet)"`

### 6.2 Example Outputs

| Scenario | Why Text |
|----------|----------|
| Experienced spicy-food lover | `"Top factors: spicy (+0.65), street_food (+0.45), local (+0.12)"` |
| Luxury traveler seeing budget option | `"Top factors: lux (−0.40), casual (+0.10)"` |
| Brand new user | `"Bootstrap match (no prefs yet)"` |

### 6.3 Design Principles

- **Transparency over precision:** Show the actual scoring factors, not a simplified marketing message
- **Bidirectional:** Show both positive and negative contributors so users understand mismatches too
- **Stable:** The same user+POI pair always produces the same why text (deterministic)
- **Compact:** Max 5 factors keeps the UI clean

---

## 7. Separate Memory Per Mode

Preferences are stored with a composite key `(user_id, mode)`:

- `pref_stats` table: `PRIMARY KEY (user_id, mode, facet)`
- `prefs` table: `PRIMARY KEY (user_id, mode)`

This means:
- Swiping restaurant cards only updates restaurant prefs
- Swiping experience cards only updates experience prefs
- A user can have wildly different preference profiles per mode (e.g., adventurous experiences but comfort-food restaurants)

---

## 8. Evaluation Metrics

### 8.1 Offline Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Precision@10** | Fraction of top-10 recs the user would like (based on held-out swipes) | ≥ 0.6 |
| **Category coverage** | Number of distinct categories in top-10 | ≥ 3 |
| **Cold-start convergence** | Swipes needed before precision@10 > 0.5 | ≤ 15 |
| **Score spread** | Std deviation of match scores in result list | > 5.0 (meaningful differentiation) |

### 8.2 Online Metrics (future)

| Metric | Description |
|--------|-------------|
| **Swipe-through rate** | % of shown cards that get swiped (not skipped/abandoned) |
| **Like ratio** | likes / total swipes per session |
| **Rec click-through** | % of recommendations tapped for detail |
| **Session depth** | Cards swiped per session (engagement proxy) |

### 8.3 Evaluation Test Cases

See `backend/tests/test_scoring.py` for concrete test scenarios covering:
- Zero-pref baseline scoring
- Single-facet scoring
- Multi-facet dot product
- Asymmetric weight accumulation
- Clamp bounds
- Why-text generation
- Category diversity reordering

---

## 9. Constraints & Known Limitations

| Constraint | Detail |
|------------|--------|
| No collaborative filtering | Scoring is per-user only; no "users like you" signal |
| No content-based features beyond dims | Image/text similarity not used |
| No temporal decay | Recently-swiped cards can reappear immediately |
| Linear scoring | Dot-product assumes facet independence; no interaction terms |
| Fixed weight asymmetry | Like=+1.0 / Dislike=−0.3 is hardcoded, not learned |
| No negative sampling | Unseen cards are not treated as implicit dislikes |

---

## 10. Glossary

| Term | Definition |
|------|------------|
| **Dim** | Continuous preference dimension (e.g., `adv`, `lux`), range `[-1, 1]` |
| **Facet** | Categorical tag from taxonomy (e.g., category=adrenaline) |
| **Delta / Dims** | The numeric vector on a card mapping dim IDs to values |
| **pref_stats** | Running accumulator (numerator/denominator per facet) |
| **prefs** | Computed preference weights derived from pref_stats |
| **POI** | Point of Interest — a recommendable entity (restaurant, activity, etc.) |
| **MMR** | Maximal Marginal Relevance — diversity-aware ranking method |
