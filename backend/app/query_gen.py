from __future__ import annotations

"""query_gen.py — server-side query generation (Python port of src/queryGen.ts).

Purpose:
- Generate multiple diverse search queries from (mode, destination, prefs)
- Keep it pure: no network calls, deterministic with seed

Notes:
- The frontend queryGen.ts supports DimId->facet mapping. On the backend we mostly
  see learned prefs stored as facet IDs (e.g. "facet.food.spicy"). This module
  handles both: direct facet-bank keys ("spicy") and pref facet IDs.
"""

from dataclasses import dataclass
import re
from typing import Any, Dict, Iterable, List, Mapping, Sequence


Mode = str


@dataclass(frozen=True)
class GeneratedQuery:
    query: str
    weight: float
    source: str
    negatives: List[str]


# ─── Constants: Facet → Keyword mappings ────────────────────────────────────

EXPERIENCE_KEYWORDS: Dict[str, List[str]] = {
    "adrenaline": [
        "extreme sports",
        "adventure tour",
        "bungee jumping",
        "paragliding",
        "zip-line",
        "white water rafting",
        "skydiving experience",
    ],
    "relaxation": [
        "spa retreat",
        "wellness experience",
        "yoga class",
        "hammam",
        "thermal baths",
        "meditation session",
        "sunset cruise",
    ],
    "culture": [
        "museum tour",
        "art gallery",
        "historical walking tour",
        "heritage site",
        "local festival",
        "traditional performance",
        "archaeological tour",
    ],
    "food": [
        "food tour",
        "cooking class",
        "street food walk",
        "market tour",
        "wine tasting",
        "farm to table",
        "culinary workshop",
    ],
    "nature": [
        "hiking trail",
        "nature walk",
        "national park tour",
        "wildlife safari",
        "botanical garden",
        "kayaking",
        "snorkelling trip",
    ],
    "social": [
        "pub crawl",
        "group tour",
        "meetup event",
        "hostel social",
        "beach party",
        "dance class",
        "local community event",
    ],
    "nightlife": [
        "nightclub",
        "rooftop bar",
        "live music venue",
        "jazz club",
        "cocktail bar",
        "late night food",
        "night market",
    ],
    "luxury": [
        "private tour",
        "luxury yacht",
        "fine dining experience",
        "helicopter tour",
        "five star hotel",
        "VIP access",
        "champagne tasting",
    ],
    "spontaneous": [
        "hidden gem",
        "off the beaten path",
        "surprise experience",
        "secret spot",
        "local hangout",
        "unplanned adventure",
        "serendipity walk",
    ],
    "learning": [
        "workshop",
        "language class",
        "pottery class",
        "photography tour",
        "history lecture",
        "science museum",
        "craft workshop",
    ],
    "shopping": [
        "local market",
        "vintage shop",
        "souvenir shopping",
        "artisan crafts",
        "flea market",
        "designer boutique",
        "antique store",
    ],
    "pace": [
        "slow travel",
        "leisurely stroll",
        "scenic route",
        "bike tour",
        "canal cruise",
        "countryside drive",
        "train journey",
    ],
}

RESTAURANT_KEYWORDS: Dict[str, List[str]] = {
    "cuisine": [
        "best local restaurant",
        "authentic cuisine",
        "traditional dishes",
        "regional food",
        "signature dish",
    ],
    "casual": [
        "casual dining",
        "bistro",
        "neighbourhood cafe",
        "cozy restaurant",
        "laid back eatery",
    ],
    "spicy": [
        "spicy food",
        "hot chili restaurant",
        "Thai restaurant",
        "Sichuan cuisine",
        "Mexican cantina",
        "curry house",
    ],
    "fine": [
        "fine dining",
        "Michelin star",
        "tasting menu",
        "upscale restaurant",
        "chef table experience",
    ],
    "fresh": [
        "fresh seafood",
        "salad bar",
        "organic restaurant",
        "farm fresh",
        "raw bar",
        "poke bowl",
    ],
    "drinks": [
        "wine bar",
        "cocktail restaurant",
        "craft beer pub",
        "sake bar",
        "speakeasy",
        "mezcal bar",
    ],
    "sharing": [
        "tapas bar",
        "mezze restaurant",
        "shared plates",
        "dim sum",
        "izakaya",
        "family style dining",
    ],
    "hearty": [
        "comfort food",
        "steak house",
        "BBQ restaurant",
        "slow cooked",
        "ramen shop",
        "soul food",
    ],
    "ambience": [
        "romantic restaurant",
        "candlelit dinner",
        "scenic dining",
        "garden restaurant",
        "waterfront restaurant",
        "rooftop dining",
    ],
    "lively": [
        "buzzy restaurant",
        "live music dinner",
        "open kitchen",
        "food hall",
        "night market food",
        "social dining",
    ],
    "quick": [
        "fast casual",
        "grab and go",
        "food truck",
        "counter service",
        "quick lunch spot",
    ],
    "dessert": [
        "pastry shop",
        "gelato",
        "chocolate shop",
        "bakery cafe",
        "dessert bar",
        "sweet shop",
    ],
    "local": [
        "local favourite",
        "hidden gem restaurant",
        "no tourist trap",
        "where locals eat",
        "neighbourhood spot",
    ],
    "craft": [
        "artisan bakery",
        "craft coffee",
        "small batch",
        "handmade pasta",
        "sourdough pizza",
        "micro roastery",
    ],
    "diet": [
        "vegan restaurant",
        "gluten free",
        "vegetarian friendly",
        "plant based",
        "health food",
    ],
    "family": [
        "family friendly restaurant",
        "kids menu",
        "casual family dining",
        "all ages restaurant",
    ],
    "quiet": [
        "quiet restaurant",
        "intimate dining",
        "peaceful cafe",
        "secluded table",
        "library cafe",
    ],
    "brunch": [
        "brunch spot",
        "bottomless brunch",
        "eggs benedict",
        "pancake house",
        "morning cafe",
        "weekend brunch",
    ],
    "seafood": [
        "seafood restaurant",
        "oyster bar",
        "fish market restaurant",
        "sushi restaurant",
        "ceviche bar",
    ],
    "bbq": [
        "BBQ joint",
        "smokehouse",
        "grill restaurant",
        "charcoal grill",
        "asado restaurant",
    ],
    "streetfood": [
        "street food stall",
        "hawker centre",
        "food cart",
        "night market food",
        "roadside eatery",
    ],
    "coffee": [
        "specialty coffee",
        "third wave coffee",
        "coffee roastery",
        "espresso bar",
        "latte art cafe",
    ],
}


DESTINATION_COLOUR: Dict[str, Dict[str, List[str]]] = {
    "tokyo": {
        "keywords": ["izakaya", "onsen", "temple", "anime district"],
        "areas": ["Shibuya", "Shinjuku", "Asakusa", "Harajuku", "Ginza", "Roppongi"],
        "localFood": ["ramen", "sushi", "tempura", "yakitori", "matcha", "okonomiyaki"],
    },
    "bangkok": {
        "keywords": ["tuk-tuk tour", "floating market", "temple tour", "Muay Thai"],
        "areas": ["Sukhumvit", "Khao San Road", "Silom", "Chinatown", "Thonburi"],
        "localFood": ["pad thai", "som tam", "mango sticky rice", "tom yum", "khao soi"],
    },
    "paris": {
        "keywords": ["Eiffel Tower", "Seine river", "Montmartre", "Louvre"],
        "areas": ["Le Marais", "Saint-Germain", "Montmartre", "Bastille", "Belleville"],
        "localFood": ["croissant", "croque-monsieur", "escargot", "macaron", "boeuf bourguignon"],
    },
    "barcelona": {
        "keywords": ["Gaudi architecture", "Gothic Quarter", "Sagrada Familia", "La Rambla"],
        "areas": ["El Born", "Gràcia", "Barceloneta", "Eixample", "Raval"],
        "localFood": ["tapas", "paella", "jamón ibérico", "cava", "pan con tomate"],
    },
    "new york": {
        "keywords": ["Broadway show", "Central Park", "Statue of Liberty", "Brooklyn Bridge"],
        "areas": ["Manhattan", "Brooklyn", "Williamsburg", "Harlem", "SoHo", "Lower East Side"],
        "localFood": ["New York pizza", "bagel", "cheesecake", "pastrami sandwich", "hot dog"],
    },
    "roma": {
        "keywords": ["Colosseum", "Vatican", "Trevi Fountain", "Roman Forum"],
        "areas": ["Trastevere", "Testaccio", "Monti", "Centro Storico", "Prati"],
        "localFood": ["carbonara", "cacio e pepe", "supplì", "gelato", "pizza al taglio"],
    },
    "london": {
        "keywords": ["Big Ben", "Tower of London", "West End show", "Thames river"],
        "areas": ["Soho", "Shoreditch", "Camden", "Notting Hill", "Borough", "Brixton"],
        "localFood": ["fish and chips", "Sunday roast", "full English", "pie and mash", "afternoon tea"],
    },
    "istanbul": {
        "keywords": ["Hagia Sophia", "Grand Bazaar", "Bosphorus cruise", "Blue Mosque"],
        "areas": ["Sultanahmet", "Beyoğlu", "Kadıköy", "Balat", "Karaköy"],
        "localFood": ["kebab", "baklava", "meze", "börek", "Turkish tea", "lahmacun"],
    },
    "marrakech": {
        "keywords": ["medina", "Jemaa el-Fna", "riad", "souk"],
        "areas": ["Medina", "Gueliz", "Mellah", "Kasbah"],
        "localFood": ["tagine", "couscous", "mint tea", "pastilla", "harira"],
    },
    "mexico city": {
        "keywords": ["Frida Kahlo museum", "Zócalo", "Chapultepec", "Xochimilco"],
        "areas": ["Roma Norte", "Condesa", "Coyoacán", "Polanco", "Centro Histórico"],
        "localFood": ["tacos al pastor", "mole", "churros", "elote", "mezcal"],
    },
    "seoul": {
        "keywords": ["Gyeongbokgung Palace", "Bukchon Hanok", "K-pop", "DMZ tour"],
        "areas": ["Gangnam", "Hongdae", "Itaewon", "Myeongdong", "Insadong", "Jongno"],
        "localFood": ["bibimbap", "Korean BBQ", "tteokbokki", "kimchi jjigae", "soju"],
    },
    "bali": {
        "keywords": ["rice terrace", "temple ceremony", "surf lesson", "volcano trek"],
        "areas": ["Ubud", "Seminyak", "Canggu", "Uluwatu", "Nusa Dua"],
        "localFood": ["nasi goreng", "babi guling", "satay", "jamu", "mie goreng"],
    },
    "cape town": {
        "keywords": ["Table Mountain", "Cape Point", "Robben Island", "V&A Waterfront"],
        "areas": ["Bo-Kaap", "Woodstock", "Camps Bay", "Constantia", "Long Street"],
        "localFood": ["braai", "bobotie", "biltong", "Cape Malay curry", "rooibos"],
    },
    "buenos aires": {
        "keywords": ["tango show", "La Boca", "Recoleta Cemetery", "Plaza de Mayo"],
        "areas": ["Palermo", "San Telmo", "Recoleta", "La Boca", "Puerto Madero"],
        "localFood": ["asado", "empanada", "dulce de leche", "choripán", "malbec wine"],
    },
    "lisbon": {
        "keywords": ["tram 28", "Alfama", "Belém Tower", "fado music"],
        "areas": ["Alfama", "Bairro Alto", "Chiado", "Mouraria", "LX Factory"],
        "localFood": ["pastel de nata", "bacalhau", "francesinha", "ginjinha", "sardines"],
    },
    "amsterdam": {
        "keywords": ["canal cruise", "Rijksmuseum", "Anne Frank House", "Vondelpark"],
        "areas": ["Jordaan", "De Pijp", "Oud-West", "Negen Straatjes", "Noord"],
        "localFood": ["stroopwafel", "bitterballen", "herring", "poffertjes", "Dutch cheese"],
    },
    "oslo": {
        "keywords": ["Vigeland Park", "Opera House", "Munch Museum", "fjord cruise"],
        "areas": ["Grünerløkka", "Aker Brygge", "Tjuvholmen", "Tøyen", "Majorstuen"],
        "localFood": ["brunost", "fårikål", "raspeball", "smoked salmon", "aquavit"],
    },
}


NEGATIVE_KEYWORDS: Dict[Mode, List[str]] = {
    "experiences": [
        "timeshare",
        "multilevel marketing",
        "scam",
        "tourist trap",
        "overpriced souvenir",
        "chain restaurant",
        "airport transfer only",
    ],
    "restaurants": [
        "fast food chain",
        "McDonald's",
        "Subway",
        "Burger King",
        "airport food court",
        "hospital cafeteria",
        "vending machine",
    ],
}


FACET_NEGATIVES: Dict[str, List[str]] = {
    "luxury": ["budget", "hostel", "backpacker"],
    "relaxation": ["extreme", "adrenaline", "crowded"],
    "adrenaline": ["spa", "meditation", "gentle"],
    "quiet": ["loud", "party", "nightclub"],
    "nightlife": ["morning", "sunrise", "early bird"],
    "fine": ["fast food", "takeaway", "drive through"],
    "diet": ["deep fried", "all you can eat buffet"],
    "family": ["bar only", "adults only", "18+"],
}


_EXPERIENCE_TEMPLATES: List[str] = [
    "best {kw} in {dest}",
    "{kw} {dest} for tourists",
    "top rated {kw} near {area} {dest}",
    "{dest} {kw} unique experience",
    "authentic {kw} {dest} local guide",
    "things to do {dest} {kw}",
    "{dest} {area} {kw} activity",
]

_RESTAURANT_TEMPLATES: List[str] = [
    "best {kw} in {dest}",
    "{kw} restaurant {dest} {area}",
    "top rated {kw} near {area} {dest}",
    "{dest} authentic {kw} dining",
    "where to eat {localFood} in {dest}",
    "{dest} {kw} restaurant local favourite",
    "{area} {dest} {kw} food",
]


# ─── Core logic ─────────────────────────────────────────────────────────────


def _hash_seed(seed: int, i: int) -> float:
    # deterministic hash: returns [0,1)
    h = (seed * 2654435761 + i * 340573321) & 0xFFFFFFFF
    h = ((h >> 16) ^ h) * 0x45D9F3B & 0xFFFFFFFF
    h = ((h >> 16) ^ h) * 0x45D9F3B & 0xFFFFFFFF
    h = ((h >> 16) ^ h) & 0xFFFFFFFF
    return (h & 0xFFFFFFFF) / 0xFFFFFFFF


def _pick(arr: Sequence[Any], seed: int, idx: int) -> Any:
    if not arr:
        return ""
    j = int(_hash_seed(seed, idx) * len(arr))
    return arr[j]


_WORD_SPLIT_RE = re.compile(r"[\s._\-/]+")


def _facet_bank_key(facet: str) -> str:
    """Map a pref facet id to a keyword-bank key when possible.

    Examples:
      - "spicy" -> "spicy"
      - "facet.food.spicy" -> "spicy"
      - "facet.nature" -> "nature"
    """

    f = (facet or "").strip().lower()
    if not f:
        return ""

    # exact hit
    if f in RESTAURANT_KEYWORDS or f in EXPERIENCE_KEYWORDS:
        return f

    # try suffix match against known banks
    for k in list(RESTAURANT_KEYWORDS.keys()) + list(EXPERIENCE_KEYWORDS.keys()):
        if f.endswith("." + k) or f.endswith("_" + k) or f.endswith("-" + k) or f.endswith(k):
            return k

    return ""


def _facet_to_phrase(facet: str) -> str:
    f = (facet or "").strip()
    if not f:
        return ""
    # take last segment of a dotted facet id
    last = f.split(".")[-1]
    toks = [t for t in _WORD_SPLIT_RE.split(last) if t]
    if not toks:
        return last
    return " ".join(toks)


def _top_pref_facets(prefs: Mapping[str, Any], n: int) -> List[tuple[str, float]]:
    # Prefer positive weights, but if none exist fall back to absolute.
    vals: List[tuple[str, float]] = []
    for k, v in (prefs or {}).items():
        try:
            w = float(v)
        except Exception:
            continue
        if w == 0.0:
            continue
        vals.append((str(k), w))

    pos = sorted([kv for kv in vals if kv[1] > 0], key=lambda x: x[1], reverse=True)
    if pos:
        return pos[:n]

    # fallback: strongest abs prefs
    vals.sort(key=lambda x: abs(x[1]), reverse=True)
    return vals[:n]


def _fill_template(template: str, dest: str, kw: str, area: str, local_food: str) -> str:
    s = (
        template.replace("{dest}", dest)
        .replace("{kw}", kw)
        .replace("{area}", area)
        .replace("{localFood}", local_food)
    )
    return re.sub(r"\s{2,}", " ", s).strip()


def capitalise(s: str) -> str:
    return " ".join([w[:1].upper() + w[1:] for w in re.split(r"[\s-]+", (s or "").strip()) if w])


def negative_string(negatives: Iterable[str]) -> str:
    negs = []
    for n in negatives or []:
        n = (n or "").strip()
        if n:
            negs.append(f'-"{n}"')
    return " ".join(negs)


def to_search_string(gq: GeneratedQuery) -> str:
    negs = negative_string(gq.negatives)
    return (gq.query + (" " + negs if negs else "")).strip()


def generate_queries(
    mode: Mode,
    destination: str,
    prefs: Mapping[str, Any],
    *,
    max_queries: int = 5,
    seed: int = 42,
) -> List[GeneratedQuery]:
    """Generate diverse, weighted search queries.

    `prefs` is a facet->weight mapping as stored in the backend.
    """

    max_queries = max(1, min(10, int(max_queries)))
    dest_key = (destination or "").strip().lower()
    dest_display = capitalise(destination)

    colour = DESTINATION_COLOUR.get(dest_key) or {"keywords": [], "areas": [], "localFood": []}
    default_area = (colour.get("areas") or ["city centre"])[0] or "city centre"
    default_food = (colour.get("localFood") or ["local speciality"])[0] or "local speciality"

    templates = _RESTAURANT_TEMPLATES if mode == "restaurants" else _EXPERIENCE_TEMPLATES
    global_negs = NEGATIVE_KEYWORDS.get(mode, [])

    ranked = _top_pref_facets(prefs, max_queries + 2)
    if not ranked:
        # weak fallback: generic
        ranked = [("cuisine" if mode == "restaurants" else "culture", 0.5)]

    max_score = max([abs(s) for _, s in ranked] + [0.001])

    results: List[GeneratedQuery] = []
    used_tpl: set[int] = set()

    for i, (facet, score) in enumerate(ranked[:max_queries]):
        bank_key = _facet_bank_key(facet)
        phrase = _facet_to_phrase(facet)

        keyword_bank = RESTAURANT_KEYWORDS if mode == "restaurants" else EXPERIENCE_KEYWORDS
        kws = keyword_bank.get(bank_key) if bank_key else None

        if kws:
            kw = str(_pick(kws, seed, i))
            source = bank_key
        else:
            # use cleaned facet phrase
            kw = phrase or ("things to do" if mode != "restaurants" else "restaurant")
            source = facet

        # choose a template not used yet
        tpl_idx = int(_hash_seed(seed, i + 100) * len(templates))
        attempts = 0
        while tpl_idx in used_tpl and attempts < len(templates):
            tpl_idx = (tpl_idx + 1) % len(templates)
            attempts += 1
        used_tpl.add(tpl_idx)

        areas = colour.get("areas") or []
        foods = colour.get("localFood") or []
        area = areas[i % len(areas)] if areas else default_area
        food = foods[i % len(foods)] if foods else default_food

        q = _fill_template(templates[tpl_idx], dest_display, kw, area, food)

        weight = 0.5 + 0.5 * (abs(score) / max_score)
        weight = round(weight, 2)

        facet_negs = FACET_NEGATIVES.get(bank_key or "", [])
        negatives = list(dict.fromkeys(list(global_negs) + list(facet_negs)))

        results.append(GeneratedQuery(query=q, weight=weight, source=str(source), negatives=negatives))

    # destination-colour bonus
    if colour.get("keywords") and len(results) < max_queries:
        bonus_kw = str(_pick(colour["keywords"], seed, 999))
        bonus_area = str(_pick(colour.get("areas") or [""], seed, 998))
        bonus_food = str(_pick(colour.get("localFood") or [default_food], seed, 997))
        bonus_tpl = "where to eat {localFood} in {dest}" if mode == "restaurants" else "{dest} {kw} unique experience"
        q = _fill_template(bonus_tpl, dest_display, bonus_kw, bonus_area, bonus_food)

        results.append(
            GeneratedQuery(query=q, weight=0.6, source="destination-colour", negatives=list(global_negs))
        )

    results.sort(key=lambda x: x.weight, reverse=True)
    return results[:max_queries]
