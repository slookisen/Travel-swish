from __future__ import annotations

import logging
import re
import sqlite3
from pathlib import Path

log = logging.getLogger(__name__)
MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "migrations"
MIGRATION_RE = re.compile(r"^(\d+)_.*\.sql$")


def run_migrations(con: sqlite3.Connection) -> list[int]:
    """Apply numbered SQL migrations once, in order, in atomic transactions."""
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          filename TEXT NOT NULL,
          applied_ts INTEGER NOT NULL DEFAULT (unixepoch())
        )
        """
    )
    applied = {int(row[0]) for row in con.execute("SELECT version FROM schema_migrations")}
    pending: list[tuple[int, Path]] = []
    for path in MIGRATIONS_DIR.glob("*.sql"):
        match = MIGRATION_RE.match(path.name)
        if match:
            pending.append((int(match.group(1)), path))

    newly_applied: list[int] = []
    for version, path in sorted(pending):
        if version in applied:
            continue
        script = path.read_text(encoding="utf-8")
        # The version originates from a digits-only filename and the filename is
        # escaped, so this metadata statement is safe to append to executescript.
        filename = path.name.replace("'", "''")
        con.executescript(
            "BEGIN IMMEDIATE;\n"
            f"{script}\n"
            f"INSERT INTO schema_migrations(version, filename) VALUES({version}, '{filename}');\n"
            "COMMIT;"
        )
        newly_applied.append(version)
        log.info("database migration applied version=%s file=%s", version, path.name)
    return newly_applied
