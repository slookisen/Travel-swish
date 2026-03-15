from __future__ import annotations

import json
import logging
import sqlite3
import time
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .db import connect, init_db
from .seed import seed_if_empty
from .algo import DISLIKE_WEIGHT, LIKE_WEIGHT, detect_direction, diversify

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
)

app = FastAPI(title="Travel-Swish API", version="0.1.0")

# Local dev only: allow Vite dev + localhost pages
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:8090",
        "http://localhost:8090",
    ],
    allow_credentials=True,
    allow_methods=["*"] ,
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
def ingest_event(ev: EventIn) -> dict:
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
def upsert_prefs(p: PrefsUpsert) -> dict:
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



@app.post("/recs", response_model=RecsResponse)
def recs(req: RecsRequest) -> RecsResponse:
    """v1 ranking with category diversity and facet-level explainability.

    Scoring: dot-product of user pref weights × POI tag values → normalized to 0-100.
    Diversity: round-robin across categories so the result list stays varied.
    Explainability: `why` includes the top contributing facets with their direction (+/-).
    """
    if not req.destination.strip():
        raise HTTPException(status_code=400, detail="destination required")

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
            score = 0.0
            # collect (facet_name, contribution) for explainability
            contributions: list[tuple[str, float]] = []
            for k, w in (prefs or {}).items():
                try:
                    w = float(w)
                except Exception:
                    continue
                tv = float(tags.get(k) or 0.0)
                if tv == 0.0:
                    continue
                contrib = w * tv
                score += contrib
                contributions.append((k, contrib))

            # normalize-ish into 0-100
            match = max(0.0, min(100.0, 50.0 + score * 50.0))

            # build explainable why string with top facet contributions
            if contributions:
                # sort by absolute contribution descending
                contributions.sort(key=lambda x: abs(x[1]), reverse=True)
                top = contributions[:5]
                parts = []
                for facet, c in top:
                    sign = "+" if c > 0 else "−"
                    parts.append(f"{facet} ({sign}{abs(c):.2f})")
                why = "Top factors: " + ", ".join(parts)
            else:
                why = "Bootstrap match (no prefs yet)"

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
