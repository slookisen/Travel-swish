from __future__ import annotations

from app import prefetch


def setup_function() -> None:
    prefetch.clear_for_tests()


def test_prefetch_is_single_use_and_signature_scoped() -> None:
    token = prefetch.reserve("sig-a")
    prefetch.mark_ready(token, {"items": [{"id": "one"}]})

    status, payload = prefetch.take(token, "sig-b")
    assert status == "mismatch"
    assert payload is None

    status, payload = prefetch.take(token, "sig-a")
    assert status == "ready"
    assert payload == {"items": [{"id": "one"}]}
    assert prefetch.get_status(token) == "expired"


def test_prefetch_failure_is_visible_without_payload() -> None:
    token = prefetch.reserve("sig")
    assert prefetch.get_status(token) == "preparing"
    prefetch.mark_failed(token)
    assert prefetch.get_status(token) == "failed"
    status, payload = prefetch.take(token, "sig")
    assert status == "failed"
    assert payload is None
