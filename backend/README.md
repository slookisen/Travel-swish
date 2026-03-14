# Travel‑Swish Backend (v2 foundation)

Goal: move the preference engine + destination-aware recommendations out of the browser.

## Stack (initial)
- Python + **FastAPI**
- SQLite for local dev (easy to ship, easy migrations)

### Windows note (Python 3.14)
On this machine Python is 3.14. For now we run the backend in a **Python 3.12** venv to avoid native build friction.
(With 3.14, `pydantic-core` may need to compile, which can be blocked by policy.)

## Run (local)
```powershell
cd C:\Users\dafre\Travel-Swish\backend
# Use Python 3.12 for now (avoids native build friction on 3.14)
py -3.12 -m venv .venv
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
