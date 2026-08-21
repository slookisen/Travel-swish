from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class Health(BaseModel):
    ok: bool = True
    service: str
    version: str = "0.5.0"
    database: str = "ok"
    providers: List[str] = Field(default_factory=list)


class EventIn(BaseModel):
    user_id: str = Field(min_length=1, max_length=160)
    session_id: str = Field(min_length=1, max_length=160)
    ts: int = Field(ge=0)
    name: str = Field(min_length=1, max_length=80)
    mode: str = Field(min_length=1, max_length=40)
    destination: str = Field(default="", max_length=180)
    card_id: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)


class PrefsGet(BaseModel):
    user_id: str
    mode: str


class PrefsUpsert(BaseModel):
    user_id: str = Field(min_length=1, max_length=160)
    mode: Literal["experiences", "restaurants"]
    prefs: Dict[str, Any]
    updated_ts: int = Field(ge=0)


class SessionIn(BaseModel):
    user_id: str = Field(min_length=1, max_length=160)
    session_id: str = Field(min_length=1, max_length=160)
    mode: Literal["experiences", "restaurants"]
    destination: str = Field(min_length=1, max_length=180)
    context: Dict[str, Any] = Field(default_factory=dict)
    profile_version: int = Field(default=2, ge=1, le=20)
    client_version: str = Field(default="unknown", max_length=40)
    ts: int = Field(ge=0)


class FeedbackIn(BaseModel):
    user_id: str = Field(min_length=1, max_length=160)
    session_id: str = Field(min_length=1, max_length=160)
    run_id: str = Field(min_length=1, max_length=160)
    item_id: str = Field(min_length=1, max_length=300)
    item_name: str = Field(min_length=1, max_length=500)
    feedback: Literal["useful", "not_relevant", "visited", "wrong_info"]
    mode: Literal["experiences", "restaurants"]
    destination: str = Field(min_length=1, max_length=180)
    payload: Dict[str, Any] = Field(default_factory=dict)
    ts: int = Field(ge=0)


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
    user_id: str = Field(min_length=1, max_length=160)
    mode: Literal["experiences", "restaurants"]
    destination: str = Field(min_length=1, max_length=180)
    limit: int = Field(default=20, ge=1, le=50)


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
    user_id: str = Field(min_length=1, max_length=160)
    session_id: Optional[str] = Field(default=None, max_length=160)
    mode: Literal["experiences", "restaurants"]
    destination: str = Field(min_length=1, max_length=180)
    language: Literal["no", "en"] = "no"
    limit: int = Field(default=20, ge=1, le=30)

    # query generation / provider controls
    max_queries: int = Field(default=10, ge=1, le=12)
    per_query: int = Field(default=10, ge=1, le=20)
    seed: int = 42

    # Brave params (optional)
    country: Optional[str] = None
    search_lang: Optional[str] = None
    safesearch: str = "moderate"
    freshness: Optional[str] = None

    # Multi-layer taste profile from frontend
    taste: dict | None = None


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
    website_url: str = ""


class WebRecsResponse(BaseModel):
    ok: bool = True
    cached: bool = False
    model_version: str = "v2-web-ranker"
    provider: str = "unknown"
    run_id: str = ""
    queries: List[WebRecsQuery] = Field(default_factory=list)
    items: List[WebRecItem]
