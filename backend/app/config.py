from __future__ import annotations

import os

DEFAULT_CORS_ORIGINS: list[str] = [
    # Vite dev server
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    # Local dashboard / Pages preview (team-dashboard)
    "http://127.0.0.1:8090",
    "http://localhost:8090",
]


def cors_config() -> tuple[list[str], bool]:
    """Return (allow_origins, allow_credentials) for FastAPI CORSMiddleware.

    Override with env (comma-separated):
      - TS_CORS_ORIGINS (preferred)
      - CORS_ALLOW_ORIGINS

    Notes:
    - If "*" is present, we must disable allow_credentials per CORS rules.
    """

    raw = (
        os.getenv("TS_CORS_ORIGINS")
        or os.getenv("CORS_ALLOW_ORIGINS")
        or ""
    ).strip()

    if raw:
        origins = [x.strip() for x in raw.split(",") if x.strip()]
        if any(o == "*" for o in origins):
            return ["*"], False
        return origins, True

    return list(DEFAULT_CORS_ORIGINS), True
