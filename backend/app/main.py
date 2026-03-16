from __future__ import annotations

import json
import logging
import sqlite3
import time
import uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .config import cors_config
from .db import connect, init_db
from .seed import seed_if_empty
from .algo import (
    DISLIKE_WEIGHT,
    LIKE_WEIGHT,
    detect_direction,
    diversify,
    format_why,
    score_match,
)
from .brave_search import brave_web_search
from .auth_lite import require_demo_auth
from .ratelimit import (
    RateLimitError,
    api_consume_or_raise,
    api_rate_limit_key,
    brave_rate_limit_key,
)
from .web_recs import rank_web_recs

log = logging.getLogger(__name__)
from .schemas import (
    CardsResponse,
    EventIn,
    EventOut,
    EventsResponse,
    Health,
    PrefsUpsert,
    RecsRequest,
    RecsResponse,
    TaxonomyResponse,
    WebSearchResponse,
    WebRecsRequest,
    WebRecsResponse,
)

app = FastAPI(title="Travel-Swish API", version="0.1.0")

# CORS: local dev defaults; override with TS_CORS_ORIGINS for public deploys.
_allow_origins, _allow_credentials = cors_config()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    init_db()
    seed_if_empty()


@app.get("/health", response_model=Health)
def health() -> Health:
    return Health(ok=True, service="travel-swish-backend")



def _get_card_delta(con: sqlite3.Connection, card_id: str) -> dict[str, float] | None:
    """Load facet deltas from the card table. Supports {delta:{…}} and {dims:{…}}."""
    row = con.execute("SELECT card_json FROM cards WHERE id=?", (card_id,)).fetchone()
    if not row:
        return None
    card = json.loads(row["card_json"])
    delta = card.get("delta") or card.get("dims")
    if not isinstance(delta, dict):
        return None
    # coerce values to float
    out: dict[str, float] = {}
    for k, v in delta.items():
        try:
            out[k] = float(v)
        except (ValueError, TypeError):
            continue
    return out or None


def _update_prefs_from_swipe(
    con: sqlite3.Connection,
    user_id: str,
    mode: str,
    card_id: str,
    direction: float,
    ts: int,
) -> bool:
    """Increment pref_stats, recompute prefs row. Returns True if updated."""
    delta = _get_card_delta(con, card_id)
    if not delta:
        return False

    weight = LIKE_WEIGHT if direction > 0 else DISLIKE_WEIGHT

    for facet, facet_val in delta.items():
        contribution = weight * facet_val
        den_add = abs(facet_val)
        if den_add == 0:
            continue
        con.execute(
            """
            INSERT INTO pref_stats(user_id, mode, facet, num, den)
            VALUES(?, ?, ?, ?, ?)
            ON CONFLICT(user_id, mode, facet) DO UPDATE SET
              num = num + excluded.num,
              den = den + excluded.den
            """,
            (user_id, mode, facet, contribution, den_add),
        )

    # recompute full prefs dict from pref_stats
    rows = con.execute(
        "SELECT facet, num, den FROM pref_stats WHERE user_id=? AND mode=?",
        (user_id, mode),
    ).fetchall()
    prefs: dict[str, float] = {}
    for r in rows:
        den = r["den"]
        if den == 0:
            continue
        prefs[r["facet"]] = max(-1.0, min(1.0, r["num"] / den))

    con.execute(
        """
        INSERT INTO prefs(user_id, mode, prefs_json, updated_ts)
        VALUES(?, ?, ?, ?)
        ON CONFLICT(user_id, mode) DO UPDATE SET
          prefs_json=excluded.prefs_json,
          updated_ts=excluded.updated_ts
        """,
        (user_id, mode, json.dumps(prefs, ensure_ascii=False), ts),
    )
    return True


@app.post("/events")
def ingest_event(ev: EventIn, request: Request) -> dict:
    # Abuse guard: only allow known Origins or an API key.
    require_demo_auth(request)

    # Basic per-IP (and per-user when possible) rate limiting.
    try:
        api_consume_or_raise(key=api_rate_limit_key(request=request, user_id=ev.user_id), cost=1)
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail="rate_limited", headers={"Retry-After": str(e.retry_after_s)})

    con = connect()
    try:
        # upsert user
        con.execute(
            "INSERT OR IGNORE INTO users(id, created_ts) VALUES(?, ?)",
            (ev.user_id, int(time.time())),
        )
        eid = str(uuid.uuid4())
        con.execute(
            """
            INSERT INTO events(id, user_id, session_id, ts, name, mode, destination, card_id, payload_json)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                eid,
                ev.user_id,
                ev.session_id,
                ev.ts,
                ev.name,
                ev.mode,
                ev.destination,
                ev.card_id,
                json.dumps(ev.payload, ensure_ascii=False),
            ),
        )

        # --- prefs update from swipe ---
        prefs_updated = False
        if ev.card_id:
            direction = detect_direction(ev.payload, ev.name)
            if direction is not None:
                try:
                    prefs_updated = _update_prefs_from_swipe(
                        con, ev.user_id, ev.mode, ev.card_id, direction, ev.ts,
                    )
                except Exception:
                    log.exception("pref_stats update failed (non-fatal)")
        # --------------------------------

        con.commit()
        return {"ok": True, "id": eid, "prefs_updated": prefs_updated}
    finally:
        con.close()


@app.get("/events", response_model=EventsResponse)
def list_events(
    user_id: str | None = None,
    session_id: str | None = None,
    mode: str | None = None,
    destination: str | None = None,
    limit: int = 50,
) -> EventsResponse:
    """List recent events with optional filters."""
    limit = max(1, min(200, limit))
    clauses: list[str] = []
    params: list[object] = []
    if user_id is not None:
        clauses.append("user_id = ?")
        params.append(user_id)
    if session_id is not None:
        clauses.append("session_id = ?")
        params.append(session_id)
    if mode is not None:
        clauses.append("mode = ?")
        params.append(mode)
    if destination is not None:
        clauses.append("lower(destination) = lower(?)")
        params.append(destination)
    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    sql = f"SELECT * FROM events{where} ORDER BY ts DESC LIMIT ?"
    params.append(limit)
    con = connect()
    try:
        rows = con.execute(sql, params).fetchall()
        items = [
            EventOut(
                id=r["id"],
                user_id=r["user_id"],
                session_id=r["session_id"],
                ts=int(r["ts"]),
                name=r["name"],
                mode=r["mode"],
                destination=r["destination"],
                card_id=r["card_id"],
                payload=json.loads(r["payload_json"]) if r["payload_json"] else {},
            )
            for r in rows
        ]
        return EventsResponse(items=items)
    finally:
        con.close()


@app.get("/prefs")
def get_prefs(user_id: str, mode: str) -> dict:
    con = connect()
    try:
        row = con.execute(
            "SELECT prefs_json, updated_ts FROM prefs WHERE user_id=? AND mode=?",
            (user_id, mode),
        ).fetchone()
        if not row:
            return {"ok": True, "prefs": {}, "updated_ts": 0}
        return {"ok": True, "prefs": json.loads(row["prefs_json"]), "updated_ts": int(row["updated_ts"])}
    finally:
        con.close()


@app.post("/prefs")
def upsert_prefs(p: PrefsUpsert, request: Request) -> dict:
    require_demo_auth(request)
    try:
        api_consume_or_raise(key=api_rate_limit_key(request=request, user_id=p.user_id), cost=2)
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail="rate_limited", headers={"Retry-After": str(e.retry_after_s)})

    con = connect()
    try:
        con.execute(
            "INSERT OR IGNORE INTO users(id, created_ts) VALUES(?, ?)",
            (p.user_id, int(time.time())),
        )
        con.execute(
            """
            INSERT INTO prefs(user_id, mode, prefs_json, updated_ts)
            VALUES(?, ?, ?, ?)
            ON CONFLICT(user_id, mode) DO UPDATE SET prefs_json=excluded.prefs_json, updated_ts=excluded.updated_ts
            """,
            (p.user_id, p.mode, json.dumps(p.prefs, ensure_ascii=False), p.updated_ts),
        )
        con.commit()
        return {"ok": True}
    finally:
        con.close()


@app.get("/cards", response_model=CardsResponse)
def get_cards(mode: str, limit: int = 200) -> CardsResponse:
    con = connect()
    try:
        rows = con.execute(
            "SELECT id, mode, card_json, updated_ts FROM cards WHERE mode=? ORDER BY id LIMIT ?",
            (mode, limit),
        ).fetchall()
        items = [
            {
                "id": r["id"],
                "mode": r["mode"],
                "card": json.loads(r["card_json"]),
                "updated_ts": int(r["updated_ts"]),
            }
            for r in rows
        ]
        return CardsResponse(items=items)
    finally:
        con.close()


@app.get("/taxonomy", response_model=TaxonomyResponse)
def get_taxonomy() -> TaxonomyResponse:
    con = connect()
    try:
        row = con.execute(
            "SELECT tax_json, updated_ts FROM taxonomy WHERE id='taxonomy.v1'",
        ).fetchone()
        if not row:
            return TaxonomyResponse(taxonomy={}, updated_ts=0)
        return TaxonomyResponse(taxonomy=json.loads(row["tax_json"]), updated_ts=int(row["updated_ts"]))
    finally:
        con.close()


@app.get("/search/brave", response_model=WebSearchResponse)
def brave_search(
    request: Request,
    q: str,
    count: int = 10,
    country: str | None = None,
    search_lang: str | None = None,
    safesearch: str = "moderate",
    freshness: str | None = None,
) -> WebSearchResponse:
    """Server-side Brave web search.

    Notes:
    - Uses env-provided API key (prefer OpenClaw env, fallback TS_BRAVE_API_KEY).
    - Adds basic timeouts, retries and a small in-process TTL cache to avoid hammering.
    """

    q = (q or "").strip()
    if not q:
        raise HTTPException(status_code=400, detail="q required")

    require_demo_auth(request)
    try:
        api_consume_or_raise(key=api_rate_limit_key(request=request), cost=4)
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail="rate_limited", headers={"Retry-After": str(e.retry_after_s)})

    rl_key = brave_rate_limit_key(request=request)

    try:
        items, cached = brave_web_search(
            q=q,
            count=count,
            country=country,
            search_lang=search_lang,
            safesearch=safesearch,
            freshness=freshness,
            rate_limit_key=rl_key,
        )
        return WebSearchResponse(q=q, provider="brave", cached=cached, items=items)
    except RateLimitError as e:
        log.warning("brave_search rate_limited key=%s retry_after_s=%s", e.key, e.retry_after_s)
        raise HTTPException(status_code=429, detail="rate_limited", headers={"Retry-After": str(e.retry_after_s)})
    except RuntimeError as e:
        # config / missing key
        raise HTTPException(status_code=500, detail=str(e))
    except Exception:
        log.exception("brave_search failed")
        raise HTTPException(status_code=502, detail="brave_search_failed")


@app.post("/recs/web", response_model=WebRecsResponse)
def recs_web(req: WebRecsRequest, request: Request) -> WebRecsResponse:
    """Live web recommendations (Brave -> normalize -> rank -> diversify).

    This endpoint is intended for the Brave demo MVP. It:
    - generates multiple destination-aware queries from learned prefs
    - calls Brave Web Search server-side (API key never reaches client)
    - scores results against prefs (keyword/facet matching)
    - de-dups, adds domain/category diversity, and returns explainable why
    """

    if not req.destination.strip():
        raise HTTPException(status_code=400, detail="destination required")

    require_demo_auth(request)
    try:
        api_consume_or_raise(key=api_rate_limit_key(request=request, user_id=req.user_id), cost=8)
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail="rate_limited", headers={"Retry-After": str(e.retry_after_s)})

    con = connect()
    try:
        prow = con.execute(
            "SELECT prefs_json FROM prefs WHERE user_id=? AND mode=?",
            (req.user_id, req.mode),
        ).fetchone()
        prefs = json.loads(prow["prefs_json"]) if prow and prow["prefs_json"] else {}

        rl_key = brave_rate_limit_key(request=request, user_id=req.user_id)

        try:
            payload = rank_web_recs(
                user_id=req.user_id,
                mode=req.mode,
                destination=req.destination,
                prefs=prefs,
                limit=req.limit,
                max_queries=req.max_queries,
                per_query=req.per_query,
                seed=req.seed,
                country=req.country,
                search_lang=req.search_lang,
                safesearch=req.safesearch,
                freshness=req.freshness,
                rate_limit_key=rl_key,
            )
        except RateLimitError as e:
            log.warning("recs_web rate_limited key=%s retry_after_s=%s", e.key, e.retry_after_s)
            raise HTTPException(status_code=429, detail="rate_limited", headers={"Retry-After": str(e.retry_after_s)})

        return WebRecsResponse(**payload)
    finally:
        con.close()


@app.post("/recs", response_model=RecsResponse)
def recs(req: RecsRequest, request: Request) -> RecsResponse:
    """v1 ranking with category diversity and facet-level explainability.

    Scoring: dot-product of user pref weights × POI tag values → normalized to 0-100.
    Diversity: round-robin across categories so the result list stays varied.
    Explainability: `why` includes the top contributing facets with their direction (+/-).
    """
    if not req.destination.strip():
        raise HTTPException(status_code=400, detail="destination required")

    require_demo_auth(request)
    try:
        api_consume_or_raise(key=api_rate_limit_key(request=request, user_id=req.user_id), cost=2)
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail="rate_limited", headers={"Retry-After": str(e.retry_after_s)})

    con = connect()
    try:
        # load prefs (if any)
        prow = con.execute(
            "SELECT prefs_json FROM prefs WHERE user_id=? AND mode=?",
            (req.user_id, req.mode),
        ).fetchone()
        prefs = json.loads(prow["prefs_json"]) if prow and prow["prefs_json"] else {}

        rows = con.execute(
            """
            SELECT id, name, url, cat, tags_json
            FROM pois
            WHERE mode=? AND lower(destination)=lower(?)
            """,
            (req.mode, req.destination),
        ).fetchall()

        items = []
        for r in rows:
            tags = json.loads(r["tags_json"] or "{}")

            # Robust scoring + explainability are implemented in app/algo.py
            # so they can be tested independently from FastAPI/SQLite.
            match, contributions = score_match(prefs=prefs, tags=tags)
            why = format_why(contributions)

            items.append(
                {
                    "id": r["id"],
                    "name": r["name"],
                    "match": match,
                    "why": why,
                    "url": r["url"] or "",
                    "cat": r["cat"] or "",
                }
            )

        items.sort(key=lambda x: x.get("match") or 0, reverse=True)

        # apply diversity: round-robin across categories
        final_limit = max(1, min(200, req.limit))
        items = diversify(items, final_limit)

        return RecsResponse(items=items, model_version="v1-diverse")
    finally:
        con.close()
