# Deploy Travel-Swish to GitHub Pages (link-only / unlisted-ish)

Important: **GitHub Pages is public**. “Only people with the link” is security-by-obscurity.
If you need real access control, we should use Netlify/Vercel with auth, or a private preview.

## Option A (simple): publish from `/docs`
This repo already contains:
- `docs/index.html`
- `docs/robots.txt`

### Steps
1) Create a Git repo (if you don’t already):
```powershell
cd C:\Users\dafre\Travel-Swish
git init
```

2) Commit:
```powershell
git add .
git commit -m "Initial Travel-Swish Pages build"
```

3) Create a GitHub repo (web UI) named e.g. `travel-swish`.

4) Add remote and push:
```powershell
git remote add origin https://github.com/<your-username>/travel-swish.git
git branch -M main
git push -u origin main
```

5) Enable Pages:
- GitHub repo → **Settings** → **Pages**
- Source: **Deploy from a branch**
- Branch: `main`
- Folder: `/docs`

6) Your URL will be something like:
`https://<your-username>.github.io/travel-swish/`

## Notes
- We added `<meta name="robots" content="noindex, nofollow">` and `robots.txt` to reduce search indexing.
- GitHub Pages can serve a cached `index.html` (often ~10 minutes) that points at deleted hashed assets after a deploy (=> blank screen). Our `index.html` boots the app via a **dynamic import** and, if it fails, forces a cache-busted reload (`?v=<ts>`).
- The app also checks `version.json` on load and shows a “new version available” banner if the deployed version differs.
- The app persists user preference learning in `localStorage` (browser). That still works on Pages.
- Current version asks each user for an Anthropic API key (stored locally in browser). For a real product, we’ll move the API calls to a backend.
