from __future__ import annotations

from fastapi.testclient import TestClient

from app import main, prefetch


def test_web_recs_prepares_and_consumes_next_selection(monkeypatch) -> None:
    prefetch.clear_for_tests()
    monkeypatch.setenv("TS_BRAVE_API_KEY", "test-key")
    calls: list[dict] = []

    def fake_rank_web_recs(**kwargs):
        calls.append(dict(kwargs))
        seed = int(kwargs["seed"])
        return {
            "ok": True,
            "cached": False,
            "provider": "brave",
            "model_version": "test",
            "queries": [],
            "items": [
                {
                    "id": f"result-{seed}",
                    "name": f"Prepared result {seed}",
                    "url": "https://operator.example/trip",
                    "source": "brave",
                }
            ],
        }

    monkeypatch.setattr(main, "rank_web_recs", fake_rank_web_recs)

    request = {
        "user_id": "prefetch-test-user",
        "mode": "experiences",
        "destination": "Bergen",
        "search_kind": "tours",
        "query_text": "coastal hiking",
        "trip_context": {"party": "solo", "duration": "week"},
        "seed": 12,
        "limit": 5,
        "max_queries": 3,
        "per_query": 4,
    }
    headers = {"Origin": "http://127.0.0.1:5173"}

    with TestClient(main.app) as client:
        first = client.post("/recs/web", json=request, headers=headers)
        assert first.status_code == 200
        first_body = first.json()
        assert first_body["next_token"]
        assert first_body["next_status"] == "preparing"

        status = client.get(f"/recs/prefetch/{first_body['next_token']}", headers=headers)
        assert status.json()["status"] == "ready"

        second_request = dict(request)
        second_request["seed"] = first_body["next_seed"]
        second_request["prefetch_token"] = first_body["next_token"]
        second = client.post("/recs/web", json=second_request, headers=headers)
        assert second.status_code == 200
        second_body = second.json()
        assert second_body["served_from_prefetch"] is True
        assert second_body["items"][0]["id"] == f"result-{first_body['next_seed']}"

    assert calls[0]["search_kind"] == "tours"
    assert calls[0]["trip_context"] == {"party": "solo", "duration": "week"}
    assert calls[1]["allow_persistent_cache"] is False
