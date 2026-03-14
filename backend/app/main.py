from __future__ import annotations

import json
import time
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .db import connect, init_db
from .schemas import (
    CardsResponse,
    EventIn,
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


@app.get("/health", response_model=Health)
def health() -> Health:
    return Health(ok=True, service="travel-swish-backend")


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
        con.commit()
        return {"ok": True, "id": eid}
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
    # Stub for now: backend-first means we move the actual ranking here next.
    if not req.destination.strip():
        raise HTTPException(status_code=400, detail="destination required")
    return RecsResponse(items=[], model_version="v1-stub")
