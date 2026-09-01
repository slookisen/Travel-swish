from __future__ import annotations

import json
import hashlib
import logging
import os
import sqlite3
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .config import cors_config
from .db import connect, delete_user_records, init_db
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
from .places_recs import rank_places_recs
from .prefetch import get_status as get_prefetch_status
from .prefetch import mark_failed as mark_prefetch_failed
from .prefetch import mark_ready as mark_prefetch_ready
from .prefetch import reserve as reserve_prefetch
from .prefetch import take as take_prefetch
from .web_recs import rank_web_recs

log = logging.getLogger(__name__)
from .schemas import (
    CardsResponse,
    EventIn,
    EventOut,
    EventsResponse,
    Health,
    FeedbackIn,
    PrefsUpsert,
    RecsRequest,
    RecsResponse,
    SessionIn,
    TaxonomyResponse,
    WebSearchResponse,
    WebRecsRequest,
    WebRecsResponse,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    seed_if_empty()
    log.info("travel-swish backend ready db=%s", os.getenv("TS_DB_PATH", "default"))
    yield


app = FastAPI(title="Travel Swipe API", version="0.6.1", lifespan=lifespan)

# CORS: local dev defaults; override with TS_CORS_ORIGINS for public deploys.
_allow_origins, _allow_credentials = cors_config()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=Health)
def health() -> Health:
    con = connect()
    try:
        con.execute("SELECT 1").fetchone()
    finally:
        con.close()
    providers = []
    if os.getenv("GOOGLE_PLACES_API_KEY"):
        providers.append("google_places")
    if any(os.getenv(key) for key in ("BRAVE_SEARCH_API_KEY", "BRAVE_API_KEY", "OPENCLAW_BRAVE_API_KEY", "TS_BRAVE_API_KEY")):
        providers.append("brave")
    return Health(service="travel-swish-backend", providers=providers)


@app.delete("/users/{user_id}")
def delete_user_data(user_id: str, request: Request) -> dict:
    """Delete the data linked to a pseudonymous client identity."""
    require_demo_auth(request)
    if not 1 <= len(user_id) <= 160:
        raise HTTPException(status_code=422, detail="invalid_user_id")
    try:
        api_consume_or_raise(key=api_rate_limit_key(request=request, user_id=user_id), cost=4)
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail="rate_limited", headers={"Retry-After": str(e.retry_after_s)})

    con = connect()
    try:
        deleted = delete_user_records(con, user_id)
        con.commit()
        return {"ok": True, "deleted": deleted}
    finally:
        con.close()


@app.post("/sessions")
def upsert_session(session: SessionIn, request: Request) -> dict:
    require_demo_auth(request)
    try:
        api_consume_or_raise(key=api_rate_limit_key(request=request, user_id=session.user_id), cost=1)
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail="rate_limited", headers={"Retry-After": str(e.retry_after_s)})

    con = connect()
    try:
        con.execute(
            "INSERT OR IGNORE INTO users(id, created_ts) VALUES(?, ?)",
            (session.user_id, session.ts),
        )
        con.execute(
            """
            INSERT INTO sessions(id, user_id, created_ts, last_ts, mode, destination, context_json, profile_version, client_version)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              last_ts=excluded.last_ts,
              mode=excluded.mode,
              destination=excluded.destination,
              context_json=excluded.context_json,
              profile_version=excluded.profile_version,
              client_version=excluded.client_version
            """,
            (
                session.session_id,
                session.user_id,
                session.ts,
                session.ts,
                session.mode,
                session.destination.strip(),
                json.dumps(session.context, ensure_ascii=False),
                session.profile_version,
                session.client_version,
            ),
        )
        con.commit()
        return {"ok": True, "session_id": session.session_id}
    finally:
        con.close()


@app.post("/feedback")
def ingest_feedback(feedback: FeedbackIn, request: Request) -> dict:
    require_demo_auth(request)
    try:
        api_consume_or_raise(key=api_rate_limit_key(request=request, user_id=feedback.user_id), cost=1)
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail="rate_limited", headers={"Retry-After": str(e.retry_after_s)})

    con = connect()
    try:
        con.execute(
            "INSERT OR IGNORE INTO users(id, created_ts) VALUES(?, ?)",
            (feedback.user_id, feedback.ts),
        )
        session_exists = con.execute(
            "SELECT 1 FROM sessions WHERE id=? AND user_id=?",
            (feedback.session_id, feedback.user_id),
        ).fetchone()
        run_exists = con.execute(
            "SELECT 1 FROM recommendation_runs WHERE id=? AND user_id=?",
            (feedback.run_id, feedback.user_id),
        ).fetchone()
        session_id = feedback.session_id if session_exists else None
        run_id = feedback.run_id if run_exists else None
        feedback_id = str(uuid.uuid4())
        con.execute(
            """
            INSERT INTO result_feedback(
              id, user_id, session_id, run_id, item_id, item_name, feedback,
              mode, destination, payload_json, ts
            ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(run_id, item_id, user_id) DO UPDATE SET
              feedback=excluded.feedback,
              payload_json=excluded.payload_json,
              ts=excluded.ts
            """,
            (
                feedback_id,
                feedback.user_id,
                session_id,
                run_id,
                feedback.item_id,
                feedback.item_name,
                feedback.feedback,
                feedback.mode,
                feedback.destination.strip(),
                json.dumps(feedback.payload, ensure_ascii=False),
                feedback.ts,
            ),
        )
        con.commit()
        return {"ok": True, "id": feedback_id}
    finally:
        con.close()



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
    request: Request,
    user_id: str | None = None,
    session_id: str | None = None,
    mode: str | None = None,
    destination: str | None = None,
    limit: int = 50,
) -> EventsResponse:
    """List recent events with optional filters."""
    require_demo_auth(request)
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
def get_prefs(user_id: str, mode: str, request: Request) -> dict:
    require_demo_auth(request)
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


_DISCOVERY_KINDS = {"hotels", "tours", "custom"}


def _brave_configured() -> bool:
    return any(
        str(os.getenv(name) or "").strip()
        for name in ("BRAVE_SEARCH_API_KEY", "BRAVE_API_KEY", "OPENCLAW_BRAVE_API_KEY", "TS_BRAVE_API_KEY")
    )


def _load_search_prefs(user_id: str, mode: str, search_kind: str) -> dict[str, float]:
    con = connect()
    try:
        rows = con.execute(
            "SELECT mode, prefs_json FROM prefs WHERE user_id=? AND mode IN ('experiences','restaurants')",
            (user_id,),
        ).fetchall()
    finally:
        con.close()

    by_mode: dict[str, dict[str, float]] = {}
    for row in rows:
        try:
            raw = json.loads(row["prefs_json"] or "{}")
        except Exception:
            raw = {}
        by_mode[str(row["mode"])] = {
            str(key): float(value) for key, value in raw.items() if isinstance(value, (int, float))
        }
    if search_kind not in _DISCOVERY_KINDS:
        return dict(by_mode.get(mode, {}))

    combined: dict[str, list[float]] = {}
    for profile in by_mode.values():
        for key, value in profile.items():
            combined.setdefault(key, []).append(value)
    return {key: sum(values) / len(values) for key, values in combined.items() if values}


def _search_signature(req: WebRecsRequest, prefs: dict[str, float], search_kind: str) -> str:
    raw = json.dumps(
        {
            "user_id": req.user_id,
            "mode": req.mode,
            "destination": req.destination.strip().casefold(),
            "search_kind": search_kind,
            "query_text": req.query_text.strip().casefold(),
            "trip_context": dict(sorted(req.trip_context.items())),
            "prefs": prefs,
            "taste": req.taste or {},
        },
        sort_keys=True,
        ensure_ascii=False,
        separators=(",", ":"),
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _next_seed(seed: int) -> int:
    return ((int(seed) * 1103515245 + 12345) & 0x7FFFFFFF) or 43


def _run_brave_prefetch(token: str, params: dict) -> None:
    try:
        mark_prefetch_ready(token, rank_web_recs(**params))
    except Exception as exc:  # noqa: BLE001 - isolated background boundary
        log.warning("recommendation prefetch failed: %s", exc)
        mark_prefetch_failed(token)


def _schedule_next_selection(
    background_tasks: BackgroundTasks,
    *,
    req: WebRecsRequest,
    prefs: dict[str, float],
    search_kind: str,
    signature: str,
    current_items: list[dict],
    rate_limit_key: str,
) -> tuple[str | None, int | None]:
    if not _brave_configured():
        return None, None
    next_seed = _next_seed(req.seed)
    token = reserve_prefetch(signature, ttl_s=180)
    exclude_ids = list(dict.fromkeys(
        [str(value) for value in req.exclude_ids if value]
        + [str(item.get("id") or "") for item in current_items if item.get("id")]
    ))[-200:]
    background_tasks.add_task(_run_brave_prefetch, token, {
        "user_id": req.user_id,
        "mode": req.mode,
        "destination": req.destination,
        "prefs": prefs,
        "taste": req.taste,
        "limit": req.limit,
        "max_queries": min(4, req.max_queries),
        "per_query": min(10, req.per_query),
        "seed": next_seed,
        "country": req.country,
        "search_lang": req.search_lang,
        "freshness": req.freshness,
        "safesearch": req.safesearch,
        "rate_limit_key": rate_limit_key,
        "search_kind": search_kind,
        "query_text": req.query_text,
        "trip_context": req.trip_context,
        "exclude_ids": exclude_ids,
        "cache_ttl_s": 120,
        "allow_persistent_cache": False,
    })
    return token, next_seed


@app.get("/recs/prefetch/{token}")
def recs_prefetch_status(token: str, request: Request) -> dict:
    require_demo_auth(request)
    if len(token) > 80:
        raise HTTPException(status_code=400, detail="invalid_prefetch_token")
    return {"ok": True, "status": get_prefetch_status(token)}


@app.post("/recs/web", response_model=WebRecsResponse)
def recs_web(req: WebRecsRequest, request: Request, background_tasks: BackgroundTasks) -> WebRecsResponse:
    """Live web recommendations (Google Places preferred, Brave fallback).

    This endpoint:
    - uses Google Places when GOOGLE_PLACES_API_KEY is configured
    - falls back to Brave web recommendations if Google key is missing
    - generates multiple destination-aware queries from learned prefs
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

    search_kind = req.search_kind or req.mode
    if search_kind == "custom" and not req.query_text.strip():
        raise HTTPException(status_code=400, detail="query_text required for custom search")

    started = time.monotonic()
    prefs = _load_search_prefs(req.user_id, req.mode, search_kind)
    signature = _search_signature(req, prefs, search_kind)
    rl_key = brave_rate_limit_key(request=request, user_id=req.user_id)
    payload: dict | None = None

    if req.prefetch_token:
        status, prepared = take_prefetch(req.prefetch_token, signature, wait_s=1.25)
        if status == "ready" and prepared:
            excluded = {str(value) for value in req.exclude_ids if value}
            prepared_items = [
                item for item in list(prepared.get("items") or [])
                if str(item.get("id") or "") not in excluded
            ]
            if prepared_items:
                payload = dict(prepared)
                payload["items"] = prepared_items
                payload["served_from_prefetch"] = True

    try:
        google_key = os.getenv("GOOGLE_PLACES_API_KEY")
        use_brave = search_kind in {"tours", "custom"} or not google_key
        if payload is None and use_brave:
            if not _brave_configured():
                raise HTTPException(status_code=503, detail="search_provider_unavailable")
            payload = rank_web_recs(
                user_id=req.user_id,
                mode=req.mode,
                destination=req.destination,
                prefs=prefs,
                taste=req.taste,
                limit=req.limit,
                max_queries=req.max_queries,
                per_query=req.per_query,
                seed=req.seed,
                country=req.country,
                search_lang=req.search_lang,
                safesearch=req.safesearch,
                freshness=req.freshness,
                rate_limit_key=rl_key,
                search_kind=search_kind,
                query_text=req.query_text,
                trip_context=req.trip_context,
                exclude_ids=req.exclude_ids,
            )
        elif payload is None:
            payload = rank_places_recs(
                user_id=req.user_id,
                mode=req.mode,
                destination=req.destination,
                prefs=prefs,
                taste=req.taste,
                limit=req.limit,
                max_queries=req.max_queries,
                seed=req.seed,
                language=req.language,
                search_kind=search_kind,
                query_text=req.query_text,
                exclude_ids=req.exclude_ids,
            )
    except RateLimitError as e:
        log.warning("recs_web rate_limited key=%s retry_after_s=%s", e.key, e.retry_after_s)
        raise HTTPException(status_code=429, detail="rate_limited", headers={"Retry-After": str(e.retry_after_s)})

    items = payload.get("items") if isinstance(payload.get("items"), list) else []
    next_token, next_seed = (None, None)
    if items:
        next_token, next_seed = _schedule_next_selection(
            background_tasks,
            req=req,
            prefs=prefs,
            search_kind=search_kind,
            signature=signature,
            current_items=items,
            rate_limit_key=rl_key,
        )
    payload["next_token"] = next_token
    payload["next_status"] = "preparing" if next_token else "unavailable"
    payload["next_seed"] = next_seed

    run_id = str(uuid.uuid4())
    provider = str(payload.get("provider") or ("brave" if use_brave else "google_places"))
    model_version = str(payload.get("model_version") or "unknown")
    result_ids = [str(item.get("id") or "") for item in items if isinstance(item, dict)]
    con = connect()
    try:
        con.execute("INSERT OR IGNORE INTO users(id, created_ts) VALUES(?, ?)", (req.user_id, int(time.time())))
        session_id = None
        if req.session_id:
            session_exists = con.execute(
                "SELECT 1 FROM sessions WHERE id=? AND user_id=?", (req.session_id, req.user_id)
            ).fetchone()
            session_id = req.session_id if session_exists else None
        con.execute(
            """
            INSERT INTO recommendation_runs(
              id, user_id, session_id, mode, destination, provider, model_version,
              request_json, result_ids_json, created_ts
            ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id, req.user_id, session_id, req.mode, req.destination.strip(), provider, model_version,
                json.dumps(req.model_dump(exclude={"prefetch_token"}), ensure_ascii=False),
                json.dumps(result_ids, ensure_ascii=False), int(time.time()),
            ),
        )
        con.commit()
    finally:
        con.close()

    payload["run_id"] = run_id
    payload["provider"] = provider
    log.info(
        "recommendations complete run_id=%s provider=%s mode=%s search_kind=%s items=%s duration_ms=%s",
        run_id, provider, req.mode, search_kind, len(result_ids), round((time.monotonic() - started) * 1000),
    )
    return WebRecsResponse(**payload)


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
