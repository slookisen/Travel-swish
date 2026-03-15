#!/usr/bin/env python3
"""Reset / reseed the Travel-Swish dev SQLite database.

Safe by default: prints the DB path and current status.
Pass --force to actually delete the DB file before recreating it.

Usage (from backend/):
    py -3.12 -m scripts.reset_db              # dry-run: show path & status
    py -3.12 -m scripts.reset_db --force       # delete DB, recreate tables, seed
    py -3.12 -m scripts.reset_db --reseed      # keep DB, just re-seed if empty
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Ensure backend/ is on sys.path so `from app.…` works when invoked as a module.
_backend_dir = Path(__file__).resolve().parents[1]
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from app.db import db_path, init_db  # noqa: E402
from app.seed import seed_if_empty   # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Reset / reseed the Travel-Swish dev SQLite DB."
    )
    parser.add_argument(
        "--force", "--yes",
        action="store_true",
        help="Actually delete the existing DB file before recreating it.",
    )
    parser.add_argument(
        "--reseed",
        action="store_true",
        help="Run seed_if_empty() without deleting the DB (safe additive).",
    )
    args = parser.parse_args()

    p = db_path()
    exists = p.exists()
    size = p.stat().st_size if exists else 0

    print(f"DB path  : {p}")
    print(f"Exists   : {exists}" + (f" ({size:,} bytes)" if exists else ""))

    if args.force:
        if exists:
            p.unlink()
            print("✓ Deleted old DB file.")
        else:
            print("  (nothing to delete)")
        init_db()
        print("✓ Tables created.")
        seed_if_empty()
        print("✓ Seed data inserted.")
    elif args.reseed:
        init_db()
        print("✓ Tables ensured.")
        seed_if_empty()
        print("✓ Seed pass done (only inserts into empty tables).")
    else:
        print()
        print("Dry-run mode (no changes). Use --force to reset or --reseed to re-seed.")


if __name__ == "__main__":
    main()
