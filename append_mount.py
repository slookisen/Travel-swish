from pathlib import Path

p = Path(r"C:\Users\dafre\Travel-Swish\Travel-Swish.tsx")
s = p.read_text(encoding="utf-8")
if "// Mount app" in s:
    print("mount already present")
    raise SystemExit(0)

mount = """

// Mount app
const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(<TravelSwish />);
}
"""

p.write_text(s.rstrip() + mount, encoding="utf-8")
print("appended mount")
