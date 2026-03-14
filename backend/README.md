# Travel‑Swish Backend (v2 foundation)

Goal: move the preference engine + destination-aware recommendations out of the browser.

## Stack (initial)
- Python + **FastAPI**
- SQLite for local dev (easy to ship, easy migrations)

## Run (local)
```powershell
cd C:\Users\dafre\Travel-Swish\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8787
```

Open:
- http://127.0.0.1:8787/health
- http://127.0.0.1:8787/docs

## Notes
- This is **local-only** initially.
- No real auth yet. Before any public deployment we add auth + rate limits.
