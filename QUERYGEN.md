# queryGen — Search Query Generation

> `src/queryGen.ts` — Pure-function module that turns user preference profiles
> into diverse, weighted search queries for any destination + mode.

## Purpose

When a user finishes swiping, we have a **preference profile** (dim scores like
`food: 0.8, lux: 0.3, night: 0.6`) and a **destination** (e.g. `"tokyo"`).
`queryGen` combines these with mode-specific templates, facet→keyword mappings,
and destination-aware local colour to produce 3–5 search queries ready for
Google Places, GetYourGuide, Unsplash, or any search API.

## Architecture

```
PrefProfile + Destination + Mode
        │
        ▼
┌──────────────────────────┐
│  topFacets()             │  Rank facets by user's dim scores
│  (adv→adrenaline, etc.)  │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│  Template selection      │  Pick diverse templates (no repeats)
│  + keyword sampling      │  Rotate through areas for location diversity
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│  Destination colour      │  Inject local landmarks, food, neighbourhoods
│  + negative keywords     │  Add global + facet-specific exclusions
└──────────┬───────────────┘
           ▼
     GeneratedQuery[]
```

## API

### `generateQueries(mode, destination, profile, opts?)`

```ts
import { generateQueries } from './queryGen';

const queries = generateQueries('restaurants', 'tokyo', {
  food: 0.8,
  lux: 0.3,
  soc: 0.6,
  night: 0.4,
});
```

Returns `GeneratedQuery[]`:

| Field      | Type       | Description                                 |
|------------|------------|---------------------------------------------|
| `query`    | `string`   | The actual search string                    |
| `weight`   | `number`   | 0..1, higher = more relevant to profile     |
| `source`   | `string`   | Which facet drove this query                |
| `negatives`| `string[]` | Keywords to exclude from results            |

### `toSearchString(gq)` / `negativeString(negatives)`

Convenience helpers to format queries with `-"exclusion"` syntax.

## Examples

### Example 1: Food-loving adventurer in Tokyo (restaurants mode)

```ts
const profile = { food: 0.9, adv: 0.7, soc: 0.5, nat: 0.3 };
const queries = generateQueries('restaurants', 'tokyo', profile);
```

Typical output:
```
[
  { query: "best ramen shop in Tokyo",                         weight: 1.0,  source: "cuisine"    },
  { query: "street food stall Tokyo Shibuya local favourite",  weight: 0.88, source: "streetfood" },
  { query: "top rated seafood restaurant near Asakusa Tokyo",  weight: 0.82, source: "seafood"    },
  { query: "where to eat yakitori in Tokyo",                   weight: 0.75, source: "hearty"     },
  { query: "where to eat ramen in Tokyo",                      weight: 0.60, source: "destination-colour" },
]
```

### Example 2: Culture + luxury in Paris (experiences mode)

```ts
const profile = { cul: 0.9, lux: 0.8, food: 0.4 };
const queries = generateQueries('experiences', 'paris', profile);
```

Typical output:
```
[
  { query: "best museum tour in Paris",                   weight: 1.0,  source: "culture"  },
  { query: "top rated private tour near Le Marais Paris", weight: 0.94, source: "luxury"   },
  { query: "Paris pottery class unique experience",       weight: 0.78, source: "learning" },
  { query: "best cooking class in Paris",                 weight: 0.72, source: "food"     },
  { query: "Paris Eiffel Tower unique experience",        weight: 0.60, source: "destination-colour" },
]
```

### Example 3: Nightlife in Barcelona (experiences mode)

```ts
const profile = { night: 1.0, soc: 0.8, spont: 0.6 };
const queries = generateQueries('experiences', 'barcelona', profile);
```

Typical output:
```
[
  { query: "best nightclub in Barcelona",                    weight: 1.0,  source: "nightlife"    },
  { query: "top rated pub crawl near El Born Barcelona",     weight: 0.92, source: "social"       },
  { query: "Barcelona hidden gem unique experience",         weight: 0.83, source: "spontaneous"  },
  { query: "Barcelona cocktail bar local favourite",         weight: 0.76, source: "drinks"       },
  { query: "Barcelona Gaudi architecture unique experience", weight: 0.60, source: "destination-colour" },
]
```

### Example 4: Unknown destination (no local colour)

```ts
const profile = { nat: 0.8, act: 0.6 };
const queries = generateQueries('experiences', 'reykjavik', profile);
```

Falls back to generic templates without local areas/food:
```
[
  { query: "best hiking trail in Reykjavik",              weight: 1.0,  source: "nature"    },
  { query: "Reykjavik extreme sports unique experience",  weight: 0.88, source: "adrenaline"},
  { query: "top rated wellness experience near city centre Reykjavik", weight: 0.75, source: "relaxation" },
]
```

## Keyword Diversity

The module ensures diversity through several mechanisms:

1. **Template rotation**: Each query uses a different template pattern
2. **Area rotation**: Queries spread across different neighbourhoods
3. **Seed-based determinism**: Same inputs always produce the same output (testable)
4. **Facet dedup**: One query per facet, ordered by relevance
5. **Destination bonus**: An extra local-colour query when destination data exists

## Negative Keywords

Two levels of exclusion:

- **Global negatives** (per mode): filter out tourist traps, fast food chains, etc.
- **Facet negatives**: context-specific exclusions (e.g. luxury queries exclude "budget", "hostel")

These can be appended to API search strings via `toSearchString()` or used as
filter criteria in backend logic.

## Extending

### Adding a new destination
Add an entry to `DESTINATION_COLOUR` in `queryGen.ts`:
```ts
'new destination': {
  keywords: ['landmark1', 'landmark2'],
  areas: ['Area1', 'Area2', 'Area3'],
  localFood: ['dish1', 'dish2'],
}
```

### Adding a new facet
1. Add the category to `facets.json` in `src/dataset/taxonomy/`
2. Add keyword array to `EXPERIENCE_KEYWORDS` or `RESTAURANT_KEYWORDS`
3. Optionally add facet-specific negatives to `FACET_NEGATIVES`
4. Update `DIM_TO_FACETS` mapping if the facet should be reachable via dim scores

## Integration Points

This module is designed to be consumed by:
- **Backend API** (`/api/suggestions`): generate queries → fan out to search APIs
- **Frontend preview**: show users what kind of results they'll get
- **Card generation tooling**: produce diverse sample cards for new destinations
