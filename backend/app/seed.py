from __future__ import annotations

import json
import time

from .db import connect


def seed_if_empty() -> None:
    """Seed minimal demo data so /cards, /taxonomy and /recs can return something.

    This is NOT final content. It's a bootstrap so we can iterate backend-first.
    """
    now = int(time.time())
    con = connect()
    try:
        # taxonomy
        row = con.execute("SELECT 1 FROM taxonomy WHERE id='taxonomy.v1'").fetchone()
        if not row:
            taxonomy = {
                "id": "taxonomy.v1",
                "facets": [
                    {"id": "facet.budget", "label": {"en": "Budget", "no": "Budsjett"}},
                    {"id": "facet.vibe", "label": {"en": "Vibe", "no": "Stemning"}},
                    {"id": "facet.food.spicy", "label": {"en": "Spicy", "no": "Sterk mat"}},
                    {"id": "facet.food.seafood", "label": {"en": "Seafood", "no": "Sjømat"}},
                    {"id": "facet.culture", "label": {"en": "Culture", "no": "Kultur"}},
                    {"id": "facet.nature", "label": {"en": "Nature", "no": "Natur"}},
                ],
            }
            con.execute(
                "INSERT INTO taxonomy(id, tax_json, updated_ts) VALUES(?, ?, ?)",
                ("taxonomy.v1", json.dumps(taxonomy, ensure_ascii=False), now),
            )

        # cards
        any_card = con.execute("SELECT 1 FROM cards LIMIT 1").fetchone()
        if not any_card:
            cards = [
                {
                    "id": "r_0001_budget",
                    "mode": "restaurants",
                    "card": {
                        "type": "binary",
                        "prompt": {"en": "Do you prefer budget-friendly places?", "no": "Foretrekker du budsjettvennlige steder?"},
                        "facets": ["facet.budget"],
                        "delta": {"facet.budget": 1.0},
                    },
                },
                {
                    "id": "r_0002_spice",
                    "mode": "restaurants",
                    "card": {
                        "type": "binary",
                        "prompt": {"en": "Do you like spicy food?", "no": "Liker du sterk mat?"},
                        "facets": ["facet.food.spicy"],
                        "delta": {"facet.food.spicy": 1.0},
                    },
                },
                {
                    "id": "e_0001_nature",
                    "mode": "experiences",
                    "card": {
                        "type": "binary",
                        "prompt": {"en": "Nature over museums?", "no": "Natur fremfor museer?"},
                        "facets": ["facet.nature", "facet.culture"],
                        "delta": {"facet.nature": 1.0, "facet.culture": -0.5},
                    },
                },
            ]
            for c in cards:
                con.execute(
                    "INSERT INTO cards(id, mode, card_json, updated_ts) VALUES(?, ?, ?, ?)",
                    (c["id"], c["mode"], json.dumps(c["card"], ensure_ascii=False), now),
                )

        # POIs
        any_poi = con.execute("SELECT 1 FROM pois LIMIT 1").fetchone()
        if not any_poi:
            pois = [
                {
                    "id": "oslo_rest_maaemo",
                    "mode": "restaurants",
                    "destination": "Oslo",
                    "name": "Maaemo",
                    "url": "https://maaemo.no/",
                    "cat": "fine",
                    "tags": {"facet.budget": -1.0, "facet.food.seafood": 0.4, "facet.vibe": 0.2},
                },
                {
                    "id": "oslo_rest_street",
                    "mode": "restaurants",
                    "destination": "Oslo",
                    "name": "Street-food hall (example)",
                    "url": "",
                    "cat": "street",
                    "tags": {"facet.budget": 0.8, "facet.food.spicy": 0.4, "facet.vibe": 0.6},
                },
                {
                    "id": "oslo_exp_forest",
                    "mode": "experiences",
                    "destination": "Oslo",
                    "name": "Nordmarka hike (example)",
                    "url": "",
                    "cat": "nature",
                    "tags": {"facet.nature": 1.0, "facet.culture": -0.2},
                },
            ]
            for p in pois:
                con.execute(
                    """
                    INSERT INTO pois(id, mode, destination, name, url, cat, tags_json, updated_ts)
                    VALUES(?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        p["id"],
                        p["mode"],
                        p["destination"],
                        p["name"],
                        p.get("url") or "",
                        p.get("cat") or "",
                        json.dumps(p.get("tags") or {}, ensure_ascii=False),
                        now,
                    ),
                )

        con.commit()
    finally:
        con.close()
