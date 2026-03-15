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
