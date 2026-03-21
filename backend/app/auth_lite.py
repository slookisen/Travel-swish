from __future__ import annotations

"""Lightweight auth / abuse guard for the public demo.

This backend is consumed by a public GitHub Pages frontend. We can't keep a
"secret" API key in the browser, so this guard is intentionally pragmatic:

- Allow browser traffic from allowed Origins (same allowlist as CORS)
- Optionally allow non-browser clients via an API key header
- Reject requests with no/unknown Origin unless API key is present

This is NOT real authentication. It's an abuse-speedbump.

Env:
- TS_AUTH_MODE:
    - "origin_or_key" (default)
    - "off" (disable all checks)
- TS_API_KEY: optional shared key for scripts/ops clients
- TS_AUTH_HEADER: header name for the key (default: X-TS-API-Key)

Notes:
- If CORS origins include "*", we cannot reliably enforce an origin allowlist,
  so in that case we require TS_API_KEY for protected endpoints.
"""

import os
from typing import TYPE_CHECKING

from fastapi import HTTPException

from .config import cors_config

if TYPE_CHECKING:  # pragma: no cover
    from starlette.requests import Request


def _env(name: str, default: str = "") -> str:
    return str(os.getenv(name) or default).strip()


def auth_mode() -> str:
    return (_env("TS_AUTH_MODE", "origin_or_key") or "origin_or_key").lower()


def api_key() -> str:
    return _env("TS_API_KEY", "")


def api_key_header_name() -> str:
    return _env("TS_AUTH_HEADER", "X-TS-API-Key")


def _allowed_origins() -> list[str]:
    origins, _allow_credentials = cors_config()
    return list(origins)


def origin_is_allowed(origin: str) -> bool:
    origin = (origin or "").strip()
    if not origin:
        return False
    origins = _allowed_origins()
    if any(o == "*" for o in origins):
        # Can't validate origin when wildcard is in play.
        return False
    return origin in set(origins)


def require_demo_auth(request: "Request") -> None:
    """Raise HTTPException if request is not allowed for protected endpoints."""

    mode = auth_mode()
    if mode in {"off", "disabled", "none"}:
        return

    # 1) Optional API key path (for scripts/non-browser clients)
    key = api_key()
    if key:
        hdr = api_key_header_name()
        got = (request.headers.get(hdr) or "").strip()
        if got and got == key:
            return

    # 2) Browser path: enforce Origin allowlist.
    origin = (request.headers.get("origin") or "").strip()
    if origin and origin_is_allowed(origin):
        return

    # If CORS is wildcard, the only safe-ish option we have is an API key.
    origins = _allowed_origins()
    if any(o == "*" for o in origins):
        raise HTTPException(status_code=401, detail="api_key_required")

    # If no origin header, it's likely curl/bot; require API key.
    raise HTTPException(status_code=403, detail="origin_not_allowed")
