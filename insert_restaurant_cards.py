from pathlib import Path

p = Path(r"C:\Users\dafre\Travel-Swish\Travel-Swish.tsx")

s = p.read_text(encoding="utf-8")
ins = Path(r"C:\Users\dafre\Travel-Swish\restaurant-cards.addition.txt").read_text(encoding="utf-8")

if "const RESTAURANT_CARDS" in s:
    raise SystemExit("RESTAURANT_CARDS already present")

anchor = "const PREF_CAT_GRAD"
idx = s.find(anchor)
if idx < 0:
    raise SystemExit("Anchor not found")

out = s[:idx] + ins + "\n\n" + s[idx:]
p.write_text(out, encoding="utf-8")
print("Inserted restaurant cards")
