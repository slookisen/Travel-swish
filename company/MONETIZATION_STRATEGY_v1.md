# Travel-Swish: Monetization Strategy & Cost Analysis v1

> **Dato:** 24. mars 2026
> **Status:** Draft — til diskusjon og iterasjon
> **Forutsetning:** 1 person + AI-assistenter, $0 funding, bootstrapped

---

## 1. Produkt-kontekst

Travel-Swish er en preference-basert reiseanbefaler som bruker swipe-interaksjoner til å lære brukerens smak, og deretter leverer rangerte anbefalinger med forklaringer og kildelenker via Brave Search API.

**Nåværende kostnadsprofil:**
- Frontend hosting: GitHub Pages (gratis)
- Backend hosting: Render free tier (gratis, men med cold starts)
- Søk: Brave Search API ($5 kreditt/mnd ≈ 1000 søk, deretter $5/1000 søk)
- Auth: ingen
- Database: SQLite (in-process, gratis)

---

## 2. Inntektsmodeller — vurdering og rangering

### Modell 1: Affiliate/booking-lenker

**Beskrivelse:** Når Travel-Swish anbefaler en restaurant, opplevelse, eller hotell, kan anbefalings-lenken gå via et affiliate-program (Booking.com, GetYourGuide, Viator, TripAdvisor affiliate). Vi tjener en kommisjon på bookinger.

**Konkret implementering:**
- Erstatt direkte URL-er i recs med affiliate-lenker
- GetYourGuide: 8% kommisjon på opplevelser
- Booking.com: 25-40% av deres kommisjon (typisk 3-6% av booking-verdi)
- Viator: 8% på aktiviteter og turer
- Amazon Associates (reiseutstyr): 1-5%

**Estimert inntekt:** En booking-verdi på $100 gir ~$5-8 i affiliate-inntekt. Med 1% konvertering fra klikk til booking, og 1000 recs-klikk/mnd: ~$50-80/mnd.

**Risiko:** Lav konvertering, brukere som allerede har booket, affiliate-programmer krever minimum trafikk for godkjenning.
**Fallback:** Start med GetYourGuide/Viator (lavere terskel) og skaler til Booking.com når trafikken rettferdiggjør det.

**Rangering:**
- Enklest å starte: ⭐⭐⭐⭐ (4/5) — krever minimal kode, bare lenke-endring
- Unit economics: ⭐⭐ (2/5) — lav konvertering, lav kommisjon per klikk
- Skalerbarhet: ⭐⭐⭐ (3/5) — skalerer med trafikk, men aldri høy margin

---

### Modell 2: Freemium med premium-funksjoner

**Beskrivelse:** Gratis versjon med begrenset funksjonalitet. Betalt versjon låser opp premium-features.

**Gratis (alle brukere):**
- Swipe-opplevelsen (ubegrenset)
- Anbefalinger for 1 destinasjon om gangen
- Topp 5 anbefalinger per søk
- Standard "why"-forklaringer

**Premium ($4.99/mnd eller $29.99/år):**
- Ubegrenset antall destinasjoner og anbefalinger per søk (topp 20)
- "Deep match"-analyse: detaljert breakdown av hvorfor noe matcher
- Sammenlignings-modus: legg inn 2-3 destinasjoner, se hvilken som passer best
- Lagrede preferanse-profiler (server-side, synkronisert)
- Eksport: last ned din anbefalingsliste som PDF/lesbar liste
- Prioritert anbefaling-kvalitet (flere Brave-søk per forespørsel)
- Ingen reklame (hvis vi legger til annonser i free tier)

**Estimert inntekt:** Med 5% konvertering til betalt: 100 brukere → 5 betalende → $25-150/mnd. 1000 brukere → 50 betalende → $250-1500/mnd.

**Risiko:** Vanskelig å finne riktig "paywall-punkt" — for mye bak paywall dreper vekst, for lite gir ingen grunn til å betale.
**Fallback:** Start med alt gratis, legg til premium når vi forstår hvilke features brukere faktisk verdsetter.

**Rangering:**
- Enklest å starte: ⭐⭐ (2/5) — krever auth-system, betalingsintegrasjon (Stripe)
- Unit economics: ⭐⭐⭐⭐ (4/5) — høy margin, forutsigbar inntekt
- Skalerbarhet: ⭐⭐⭐⭐ (4/5) — skalerer lineært med brukere

---

### Modell 3: Per-trip betaling

**Beskrivelse:** Brukeren betaler en engangssum for en komplett "reise-rapport" for en spesifikk destinasjon, basert på deres preferanser.

**Konkret produkt:** "Travel-Swish Trip Report: Oslo" — en personalisert guide med 20-30 anbefalinger, forklart og kategorisert, med kart og lenker. PDF eller interaktiv nettside. Pris: $2.99-4.99 per rapport.

**Estimert inntekt:** Med 3% kjøpsrate: 100 brukere → 3 kjøp → $9-15. 1000 brukere → 30 kjøp → $90-150/mnd.

**Risiko:** Lav gjenkjøpsrate (folk reiser sjelden). Vanskelig å rettferdiggjøre pris når anbefalingene allerede er delvis synlige gratis.
**Fallback:** Tilby som add-on til premium, ikke selvstendig produkt.

**Rangering:**
- Enklest å starte: ⭐⭐⭐ (3/5) — trenger PDF-generering og betaling, men ikke auth
- Unit economics: ⭐⭐⭐ (3/5) — ok margin, men uforutsigbar volum
- Skalerbarhet: ⭐⭐ (2/5) — begrenset av reisefrekvens

---

### Modell 4: Subscription (SaaS-modell)

**Beskrivelse:** Ren subscription uten free tier. Alle betaler fra dag 1.

**Anbefales IKKE for tidlig fase.** Grunnen: vi har null brand-kjennskap og trenger å bevise verdi før folk betaler. En subscription uten free tier dreper vekst når du er ukjent.

**Rangering:**
- Enklest å starte: ⭐ (1/5) — krever full auth + betaling + onboarding
- Unit economics: ⭐⭐⭐⭐⭐ (5/5) — 100% betalende brukere
- Skalerbarhet: ⭐⭐ (2/5) — begrenset vekst uten free tier

---

### Modell 5: B2B Licensing

**Beskrivelse:** Reisebyråer, hotellkjeder, eller reise-plattformer lisenserer Travel-Swish teknologi (preferanse-algoritmen + swipe-UX) for å integrere i sine egne produkter.

**Konkret tilbud:**
- White-label widget: embed Travel-Swish swipe+recs i deres nettside
- API-tilgang: send bruker-preferanser, få tilbake rangerte anbefalinger
- Pris: $200-500/mnd per integrasjon, eller per-API-kall prising

**Estimert inntekt:** 1 B2B-kunde = $200-500/mnd. 5 kunder = $1000-2500/mnd.

**Risiko:** Lang salgssyklus (3-6 mnd). Krever enterprise-grade stabilitet vi ikke har ennå. Reisebyråer er konservative.
**Fallback:** Ikke prioriter B2B før vi har et bevist konsept med D2C-brukere.

**Rangering:**
- Enklest å starte: ⭐ (1/5) — krever salgsarbeid, kontraktforhandling, SLA
- Unit economics: ⭐⭐⭐⭐⭐ (5/5) — høy verdi per kunde
- Skalerbarhet: ⭐⭐⭐ (3/5) — begrenset antall kunder, men høy verdi

---

### Oppsummering: Rangering av modeller

| Modell | Enklest å starte | Unit economics | Skalerbarhet | **Anbefalt fase** |
|--------|:-:|:-:|:-:|:-:|
| 1. Affiliate-lenker | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | **Fase 1 — start her** |
| 2. Freemium | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | **Fase 2 — etter auth** |
| 3. Per-trip rapport | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | Fase 2 — som add-on |
| 4. Ren subscription | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | Ikke anbefalt nå |
| 5. B2B licensing | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | **Fase 3+ — når bevist** |

**Anbefalt strategi:** Start med affiliate-lenker (fase 1, nesten gratis å implementere), bygg freemium med premium-features (fase 2, krever auth), utforsk B2B når vi har traction (fase 3).

---

## 3. Kostnadskontroll

### 3.1 Brave Search API — den største variable kostnaden

**Nåværende prising (mars 2026):**
- $5 gratis kreditt/mnd (≈ 1000 søk)
- Deretter $5 per 1000 søk
- Krav: attribusjon av Brave Search i produktet

**Bruk per bruker-session:**
- Én `/recs/web`-forespørsel genererer 3-5 Brave-søk (configurable via `max_queries`)
- Med default (5 queries × 7 resultater): 5 API-kall per recs-forespørsel
- Gjennomsnittlig bruker gjør 1-2 recs-forespørsler per session

**Estimert Brave-kost per aktiv bruker per måned:**
- Antar 3 sessions/mnd, 2 recs per session, 5 API-kall per rec
- = 3 × 2 × 5 = 30 API-kall per bruker per mnd
- Kostnad: 30 × $0.005 = **$0.15 per aktiv bruker per måned**

**Hvordan kontrollere:**
1. **Aggressiv caching** (allerede delvis implementert): Cache Brave-resultater per query+destination i 24-48 timer. Mange brukere søker samme destinasjoner.
2. **Reduser max_queries:** Gå fra 5 til 3 queries per recs-forespørsel for free-tier brukere. Spar 40% API-kall.
3. **Rate-limit per bruker:** Maks 5 recs-forespørsler per dag for free-tier.
4. **Pre-fetch populære destinasjoner:** Cache resultater for topp 20 destinasjoner daglig (bakgrunnsjobb). Koster ~100 API-kall/dag men sparer tusenvis.
5. **Fallback til cached results:** Hvis API-kvote er brukt, vis cached (potensielt utdaterte) resultater i stedet for å feile.

### 3.2 LLM-kostnader (fremtidig)

Hvis vi legger til en AI query planner (for å generere bedre søk basert på preferanser):

**Estimat med Claude Haiku (billigst for korte oppgaver):**
- ~$0.001 per query-generering (kort prompt, kort svar)
- 30 kall per bruker per mnd × $0.001 = **$0.03 per bruker per mnd**
- Negligerbart sammenlignet med Brave-kostnaden

**Alternativ:** Bruk regelbasert query-generering (som nå) og hopp over LLM helt. Sparer kompleksitet og kostnad.

### 3.3 Hosting

| Tjeneste | Free tier | Betalt tier | Trigger for upgrade |
|----------|-----------|-------------|-------------------|
| **GitHub Pages** (frontend) | Ubegrenset | N/A | Aldri — alltid gratis |
| **Render** (backend) | Gratis, men cold starts (30-60 sek) | Starter: $7/mnd (always on) | >50 daglige brukere eller negativ feedback om load-tider |
| **SQLite** (database) | In-process, gratis | PostgreSQL: $7-15/mnd (Render) | >1000 brukere eller behov for concurrent writes |
| **Plausible Analytics** | Self-hosted gratis, hosted $9/mnd | $9/mnd | Bruk hosted fra start for enkelhet |
| **Domene** (valgfritt) | N/A | ~$12/år | Når vi vil se profesjonelle ut |

### 3.4 Break-even per bruker per måned

| Kostnad | Per bruker/mnd | Merknad |
|---------|:--:|---------|
| Brave API | $0.15 | Med 30 kall/mnd, etter caching |
| Hosting (fordelt) | $0.02-0.10 | Avhenger av total brukermasse |
| LLM (fremtidig) | $0.03 | Kun hvis implementert |
| **Total variable kostnad** | **~$0.18-0.28** | Per aktiv bruker per mnd |

**Break-even med affiliate:** Trenger ~$0.25 affiliate-inntekt per bruker per mnd. Med $5 per konvertert booking og 5% klikk-til-booking: trenger minst 1 affiliate-klikk som konverterer per 100 brukere per mnd. Realistisk men stramt.

**Break-even med freemium:** Trenger $0.25 per bruker totalt, men bare betalende brukere genererer inntekt. Med 5% konvertering og $4.99/mnd: $0.25/bruker i snitt. Akkurat break-even. Med $29.99/år: $0.125/bruker/mnd — under break-even.

### 3.5 Skaleringsscenario: kostnader ved vekst

| Aktive brukere | Brave API/mnd | Hosting/mnd | Total/mnd | Estimert inntekt (affiliate) | Estimert inntekt (freemium 5%) |
|:--:|:--:|:--:|:--:|:--:|:--:|
| **100** | $15 (med caching: $8) | $0 (free tier) | **$8-15** | $5-10 | $25 |
| **1 000** | $150 (med caching: $75) | $7-14 | **$82-164** | $50-100 | $250 |
| **10 000** | $1500 (med caching: $600) | $50-100 | **$650-1600** | $500-1000 | $2500 |

**Observasjon:** Freemium gir bedre unit economics enn affiliate ved alle skalaer. Affiliate er lettere å starte men skalerer dårligere.

**Anbefaling:** Implementer affiliate fra dag 1 (enkelt), bygg freemium som primær inntektskilde for fase 2.

---

## 4. Beskytte mot kopiering (Moat-analyse)

### 4.1 Hva er vår moat?

La oss være ærlige: per i dag er moaten **tynn**. Her er en realistisk vurdering:

| Potensielt moat-element | Styrke | Vurdering |
|------------------------|:------:|-----------|
| **Swipe-UX** | Svak | Lett å kopiere. Tinder-lignende UX er well-understood. |
| **Preferanse-algoritme** | Middels | Algoritmen er relativt enkel (dot-product scoring), men kombinasjonen av 9 dimensjoner + asymmetrisk vekting + diversity round-robin er spesifikk for oss. Likevel kan den reverse-engineeres. |
| **Brave Search-integrasjon** | Svak | Hvem som helst kan bruke Brave API. |
| **Akkumulerte preferanse-data** | Potensielt sterk | Etter tusenvis av swipes per bruker har vi et unikt signal om brukerens reisesmak som er vanskelig å gjenskape. Men: data lagres lokalt i dag. |
| **Nettverkseffekter** | Ingen (ennå) | Ingen sosial komponent, ingen bruker-til-bruker interaksjon. |
| **Brand/community** | Svak (ennå) | Ingen kjennskap. Men kan bygges over tid med godt innhold og community-engasjement. |

### 4.2 Kan noen bare kopiere UI-et?

**Ja.** Et team med 2-3 utviklere kan bygge noe lignende på 2-4 uker. Swipe-UX er åpen kildekode-biblioteker (react-tinder-card etc.), og Brave API er åpen for alle.

**Men kopieringsrisikoen er lav fordi:**
- Markedet er lite nok til at store aktører (Google, TripAdvisor) ikke bryr seg om vår nisje
- Kopiering krever at noen ser nok verdi til å kopiere — det er en validering i seg selv
- Utførelse og iterasjonshastighet er det som betyr noe for bootstrapped produkter

### 4.3 Hvordan bygge moat over tid

1. **Preferanse-data som moat (viktigst):** Migrer fra lokal lagring til server-side. Over tid har hver bruker hundrevis av swipes som representerer en unik smaksprofil. Denne dataen er vår og er meningsfull for personalisering. Jo lenger en bruker har vært med, jo bedre blir anbefalingene, og jo vanskeligere er det å bytte.

2. **Algoritme-raffinering:** Continuerlig forbedring basert på klikk-through data. Collaborative filtering ("brukere som liker X liker også Y"). A/B-testing av scoring-modeller. Dette tar måneder å bygge og er ikke trivielt å kopiere.

3. **Innholds-kurasjon:** Over tid bygger vi opp et lag med kuratert innhold — kvalitetssjekket anbefalinger, destinasjons-spesifikke tips, "editor's picks" — som ikke finnes i rå Brave-søk.

4. **Community og brand:** Hvis vi bygger en aktiv community (Discord, subreddit, nyhetsbrev) av Travel-Swish-brukere, blir det en sosial moat.

5. **Distribusjon-partnerskap:** Embeds på reiseblogger, white-label for reisebyråer. Hver integrasjon er en lock-in.

### 4.4 IP og patenter

**Patenter:** Ikke realistisk for en solo-bootstrapped bedrift. Patentsøknader koster $5000-15000+ og tar 2-3 år. Preferanse-basert anbefaling er heller ikke nytt nok til å være patenterbart.

**Trade secrets:** Algoritme-detaljer, vektingskonfigurasjoner, og query-genereringslogikk bør ikke publiseres i detalj. Hold repo privat (backend).

**Trademark:** Registrer "Travel-Swish" som varenavn når budsjett tillater (~$250-500 i Norge via Patentstyret).

**Anbefaling:** Ikke bruk tid/penger på patenter. Fokuser på execution speed og brukerdata som moat.

---

## 5. Monetiseringsveikart

| Fase | Tidsramme | Inntektsmodell | Estimert MRR | Investeringsbehov |
|------|-----------|----------------|:--:|:--:|
| **Fase 0** (nå) | Mars-april 2026 | Ingen | $0 | $0 |
| **Fase 1** | Mai-juni 2026 | Affiliate-lenker | $10-50 | $0 (kode-endring) |
| **Fase 2** | Juli-sept 2026 | Freemium + affiliate | $100-500 | $50-100 (Stripe, auth) |
| **Fase 3** | Q4 2026 | Premium + affiliate + B2B-test | $500-2000 | $100-200 (infra-upgrade) |
| **Fase 4** | 2027 | Full modell-mix | $2000+ | Variabel |

---

## 6. Nøkkelspørsmål å besvare med data

| Spørsmål | Hvordan måle | Når |
|----------|-------------|-----|
| Klikker brukere på anbefalings-lenker? | Affiliate-klikk tracking | Fase 1 |
| Konverterer klikk til bookinger? | Affiliate-dashboard | Fase 1 (2-4 uker etter implementering) |
| Vil brukere betale for premium? | A/B-test med paywall-prompt | Fase 2 |
| Hva er willingness-to-pay? | Pristest ($2.99 vs $4.99 vs $9.99/mnd) | Fase 2 |
| Reduserer caching Brave-kostnader nok? | API-kall logging vs cache-hit rate | Fase 1 |
| Er B2B-interesse reell? | Outreach til 10 reisebyråer, mål respons | Fase 3 |

---

*Dokument generert: 24. mars 2026 | Neste revisjon: etter fase 1-inntektsdata*
