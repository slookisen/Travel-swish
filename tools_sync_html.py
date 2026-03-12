import re
from pathlib import Path

root = Path(r"C:\Users\dafre\Travel-Swish")

html_path = root / "index.html"
docs_html_path = root / "docs" / "index.html"
ts_path = root / "Travel-Swish.tsx"

html = html_path.read_text(encoding="utf-8")
ts = ts_path.read_text(encoding="utf-8")

m = re.search(r"<script type=\"text/babel\">[\s\S]*?</script>", html)
if not m:
    raise SystemExit("Could not find <script type=\"text/babel\"> block")

new_block = '<script type="text/babel">\n' + ts.strip() + '\n</script>'
new_html = html[: m.start()] + new_block + html[m.end() :]

html_path.write_text(new_html, encoding="utf-8")
docs_html_path.parent.mkdir(parents=True, exist_ok=True)
docs_html_path.write_text(new_html, encoding="utf-8")

print("Synced TSX -> index.html and docs/index.html")
