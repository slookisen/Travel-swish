# COWORK TS7: Travel-Swish Launch Strategy & Business Model

## Kontekst
Travel-Swish er en preference-basert reiseopplevelse-anbefaler:
- Bruker swiper preferanser → får rangerte opplevelser med "why" + kildelenker
- Live demo: https://slookisen.github.io/Travel-swish/
- Backend: https://travel-swish-backend.onrender.com
- Brave Search API for live web-resultater
- Allerede laget: pitch one-pager, CustDev-plan, landing page copy

## Leverabler
Skriv **tre separate dokumenter** som dekker hele lanseringsstrategien:

### Dokument 1: `company/LAUNCH_PLAN_v1.md` — Go-to-market plan
Adresser disse spørsmålene konkret:

**Distribusjon & vekst:**
- Hvem er de første 100 brukerne, og hvor finner vi dem?
- Skal vi lansere for "agenter" (reisebyråer, travel influencers, travel planners) som viser det til sine nettverk? Fordeler/ulemper?
- Alternativ: direkte til sluttbrukere via Product Hunt, Reddit r/travel, Hacker News?
- Kan vi bruke "invite-only" eller "limited access" for å skape FOMO?
- Partnerskap med reiseblogger/influencere — hva tilbyr vi dem?

**Stegvis lanseringsplan:**
1. Soft launch (10-50 brukere): hvem, hvordan, hva måler vi?
2. Beta launch (50-500): hvem, kanaler, feedback-loops
3. Public launch: timing, PR, kanaler
4. Scaling: hva trigger neste fase?

**Konkrete aksjoner (neste 2 uker):**
- Liste med 10 spesifikke ting å gjøre, i prioritert rekkefølge

### Dokument 2: `company/MONETIZATION_STRATEGY_v1.md` — Inntekt & kostnader
Adresser:

**Hvordan tjene penger (konkret):**
- Freemium modell: hva er gratis vs betalt?
- Subscription: hva er pakken, hva koster den?
- Per-trip betaling: fungerer det?
- Affiliate/booking-lenker: realistisk? Hvor mye?
- B2B licensing (reisebyråer bruker vår tech): potensial?
- Rank modellene 1-5 etter: enklest å starte, best unit economics, mest skalerbar

**Kostnadskontroll:**
- Brave API koster per søk — hvordan kontrollere?
- LLM-kostnader (hvis vi legger til AI query planner)
- Hosting: Render free tier vs betalt
- Hva er break-even per bruker per måned?
- Hva koster 100 / 1000 / 10000 aktive brukere?

**Beskytte mot kopiering:**
- Hva er vår moat (competitive advantage)?
- Kan noen bare kopiere UI-et? Hva gjør vi da?
- Er preferanse-data en moat? Nettverkseffekter?
- Patenter / IP-strategi: relevant?

### Dokument 3: `company/COMPETITIVE_ANALYSIS_v1.md` — Konkurrenter & posisjonering
- Hvem gjør noe lignende? (Wanderlog, TripAdvisor, Google Travel, AI-reiseplanleggere)
- Hva gjør vi bedre? Hva gjør de bedre?
- Hvor er vårt "wedge" — den unike inngangen?
- Feature-matrise: oss vs 5 konkurrenter på 10 viktige funksjoner

## Generelle regler
- Vær **realistisk, ikke optimistisk** — vi er 1 person med AI-assistenter
- Vær **konkret** — "post on Twitter" er ikke nok, "post på r/solotravel med denne vinkelen" er bedre
- Vær **norsk-vennlig** — noen av de første brukerne er i Norge, men produktet er globalt
- Tenk **kostnadsbevisst** — vi har ikke funding, alt må bootstrappes
- Inkluder **risiko og fallback** for hvert forslag

## Teknisk info om produktet (for kontekst)
- Frontend: React/Vite, hostet på GitHub Pages (gratis)
- Backend: Python/FastAPI, hostet på Render (gratis tier)
- Data: Brave Search API (1000 gratis søk/mnd, deretter $5/1000)
- Auth: ingen foreløpig
- Analytics: ingen foreløpig
- Brukerdata: preferences lagres lokalt i browser (ingen server-side)

## DoD
- [ ] `company/LAUNCH_PLAN_v1.md` med konkret GTM og 10-punkts aksjonsliste
- [ ] `company/MONETIZATION_STRATEGY_v1.md` med rangerte modeller og kostnadsestimat
- [ ] `company/COMPETITIVE_ANALYSIS_v1.md` med feature-matrise og posisjonering
- [ ] Alle tre dokumenter er standalone-lesbare og kan deles med potensielle partnere
