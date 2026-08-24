from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class Health(BaseModel):
    ok: bool = True
    service: str


class EventIn(BaseModel):
    user_id: str
    session_id: str
    ts: int
    name: str
    mode: str
    destination: str = ""
    card_id: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)


class PrefsGet(BaseModel):
    user_id: str
    mode: str


class PrefsUpsert(BaseModel):
    user_id: str
    mode: str
    prefs: Dict[str, Any]
    updated_ts: int


class Card(BaseModel):
    id: str
    mode: str
    card: Dict[str, Any]
    updated_ts: int


class CardsResponse(BaseModel):
    ok: bool = True
    items: List[Card]


class TaxonomyResponse(BaseModel):
    ok: bool = True
    taxonomy: Dict[str, Any]
    updated_ts: int


class EventOut(BaseModel):
    id: str
    user_id: str
    session_id: str
    ts: int
    name: str
    mode: str
    destination: str
    card_id: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)


class EventsResponse(BaseModel):
    ok: bool = True
    items: List[EventOut]


class RecsRequest(BaseModel):
    user_id: str
    mode: str
    destination: str
    limit: int = 20


class RecItem(BaseModel):
    id: str
    name: str
    match: float = 0
    why: str = ""
    url: str = ""
    cat: str = ""


class RecsResponse(BaseModel):
    ok: bool = True
    items: List[RecItem]
    model_version: str = "v1-stub"


# --- Web search (Brave) ---


class WebSearchItem(BaseModel):
    """RecItem-like shape used for external web results."""

    id: str
    name: str
    url: str = ""
    cat: str = ""
    why: str = ""
    match: float = 0
    source: str = "brave"
    snippet: str = ""


class WebSearchResponse(BaseModel):
    ok: bool = True
    q: str
    provider: str = "brave"
    cached: bool = False
    items: List[WebSearchItem]


# --- Web recs (Brave -> ranker) ---


class WebRecsRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=128)
    mode: str = Field(min_length=1, max_length=32)
    destination: str = Field(min_length=1, max_length=160)
    limit: int = Field(default=20, ge=1, le=50)

    # query generation / provider controls
    max_queries: int = Field(default=8, ge=1, le=10)
    per_query: int = Field(default=10, ge=1, le=20)
    seed: int = 42

    # Brave params (optional)
    country: Optional[str] = None
    search_lang: Optional[str] = None
    safesearch: str = "moderate"
    freshness: Optional[str] = None

    # Multi-layer taste profile from frontend
    taste: dict | None = None

    # Profile-aware discovery. `mode` still selects the stored swipe profile;
    # `search_kind` controls what the user wants to discover with that profile.
    search_kind: Optional[str] = Field(default=None, max_length=24)
    query_text: str = Field(default="", max_length=160)
    trip_context: Dict[str, str] = Field(default_factory=dict)
    exclude_ids: List[str] = Field(default_factory=list, max_length=200)

    # Single-use token for a transiently prepared next selection.
    prefetch_token: Optional[str] = Field(default=None, max_length=80)


class WebRecsQuery(BaseModel):
    query: str
    weight: float = 0
    source: str = ""
    negatives: List[str] = Field(default_factory=list)


class WebRecItem(BaseModel):
    """Ranked RecItem-like web result (adds snippet/source/domain)."""

    id: str
    name: str
    match: float = 0
    why: str = ""
    url: str = ""
    website_url: str = ""
    maps_url: str = ""
    cat: str = ""

    source: str = "brave"
    snippet: str = ""
    domain: str = ""
    query_source: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    rating: Optional[float] = None
    rating_count: Optional[int] = None
    price_level: str = ""
    types: List[str] = Field(default_factory=list)
    primary_type: str = ""


class WebRecsResponse(BaseModel):
    ok: bool = True
    cached: bool = False
    model_version: str = "v2-web-ranker"
    queries: List[WebRecsQuery] = Field(default_factory=list)
    items: List[WebRecItem]
    provider: str = ""
    served_from_prefetch: bool = False
    next_token: Optional[str] = None
    next_status: str = "unavailable"
    next_seed: Optional[int] = None
