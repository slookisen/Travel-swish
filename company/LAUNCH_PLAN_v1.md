# Travel-Swish: Go-to-Market Launch Plan v1

> **Dato:** 24. mars 2026
> **Status:** Draft — til diskusjon og iterasjon
> **Forutsetning:** 1 person + AI-assistenter, $0 funding, bootstrapped

---

## 1. Produkt-oppsummering (for nye lesere)

Travel-Swish er en preference-basert reiseopplevelse-anbefaler. Brukeren swiper gjennom reiseopplevelser og restauranter — som Tinder for reise — og systemet lærer preferansene over tid. Basert på disse preferansene leverer Travel-Swish rangerte anbefalinger med forklaringer ("why this matches you") og lenker til kilder via live web-søk (Brave Search API).

**Live demo:** https://slookisen.github.io/Travel-swish/
**Backend:** https://travel-swish-backend.onrender.com
**Tech stack:** React/Vite (GitHub Pages) + Python/FastAPI (Render free tier) + Brave Search API

---

## 2. Hvem er de første 100 brukerne?

### Primær målgruppe: "Planleggings-frustrerte reisende"

Mennesker som vet de vil reise, men er overveldet av TripAdvisor-lister med 500+ resultater og generiske "topp 10"-artikler. De vil ha noe personlig, raskt, og visuelt.

**Konkrete segmenter (i prioritert rekkefølge):**

1. **Solo-reisende 25-40 (globalt, engelskspråklig)** — Allerede aktive på r/solotravel (1.9M medlemmer), r/travel (9M+), og lignende communities. Teknisk komfortable, villige til å prøve nye verktøy, og deler gjerne funn med andre.

2. **Norske reisende 25-45** — Naturlig førstenettverk. Norge har høy reisefrekvens, god tech-adopsjon, og et lite nok marked til å bygge tett feedback-loop. Kan nås via norske reiseforum, Facebook-grupper ("Backpacking fra Norge", "Reise-tips Norge"), og personlig nettverk.

3. **Digital nomader og langdistanse-arbeidere** — Aktive i communities som Nomad List forum, r/digitalnomad, og diverse Slack/Discord-grupper. Reiser ofte, trenger destinasjons-spesifikke tips raskt.

### Sekundær målgruppe (fase 2): Reiseagenter og influencers

Vi vurderer å lansere for "agenter" — reisebyråer, travel influencers, og travel planners — som kan vise produktet til sine nettverk.

**Fordeler med agent-tilnærming:**
- Multiplikator-effekt: én agent kan introdusere 50-200 brukere
- Validering fra en "ekspert" gir kredibilitet
- Agenter kan gi kvalitets-feedback fra profesjonelt perspektiv
- Potensielt B2B-spor senere

**Ulemper med agent-tilnærming:**
- Reisebyråer har etablerte verktøy og er trege til å adoptere
- Influencers forventer ofte betaling eller "sponsorship deal" vi ikke har budsjett for
- Risiko for at produktet formes etter agenter i stedet for sluttbrukere
- Lengre salgssyklus

**Anbefaling:** Start med direkte-til-sluttbruker (D2C) for de første 100. Bruk agent-sporet som vekst-akselerator fra fase 2 (etter at produktet er validert med ekte brukere).

**Risiko:** De første brukerne er bare tech-entusiaster, ikke "ekte" reisende.
**Fallback:** Rekruttér aktivt fra reise-spesifikke communities, ikke bare HN/PH.

---

## 3. Distribusjonskanaler

### Kanal 1: Reddit (høyest ROI for bootstrapped)

**Hvor:** r/solotravel, r/travel, r/digitalnomad, r/backpacking, r/TravelHacks

**Vinkel (ikke spam — vær nyttig):**
- Lag en post: *"I built a free tool that recommends travel experiences based on your preferences — like Tinder for travel. Would love feedback from real travelers."* Post i r/SideProject og r/solotravel.
- Kommenter på "hjelp meg planlegge"-tråder med genuint nyttige svar + "btw, I built a tool that might help" (kun når relevant).
- Norsk vinkel: Post i r/norge med *"Laget en reise-app som matcher opplevelser til dine preferanser — noen som vil teste?"*

**Risiko:** Reddit er allergisk mot self-promotion. Kan bli nedstemmet eller fjernet.
**Fallback:** Bygg karma over 2-3 uker med genuine bidrag først. Bruk "Show HN"-tilnærmingen: vær ydmyk, be om feedback, vis at det er et hobby-prosjekt.

### Kanal 2: Product Hunt

**Timing:** Etter soft launch og minst 20-30 ekte brukere med feedback.
**Vinkel:** "Travel-Swish — Tinder meets travel recommendations. Swipe to teach it your taste, get personalized experience suggestions with sources."

**Risiko:** Product Hunt gir et spike, men brukerne er ofte "tire kickers" som aldri kommer tilbake.
**Fallback:** Ha en e-post-optin eller notification-toggle klar slik at PH-brukere kan re-engages.

### Kanal 3: Hacker News ("Show HN")

**Vinkel:** Teknisk vinkel — *"Show HN: I built a preference-learning travel recommender using swipe UX and Brave Search API"*
**Styrke:** HN verdsetter tekniske sideprosjekter. Open-source aspektet (GitHub Pages) er et pluss.

**Risiko:** Lav konvertering til gjentatte brukere. HN-publikum er tech, ikke nødvendigvis reisende.
**Fallback:** Bruk HN primært for teknisk feedback og developer-interesse, ikke som bruker-kanal.

### Kanal 4: Norske reiseforum og Facebook-grupper

**Hvor:** "Reise-tips Norge" (FB), "Backpacking fra Norge" (FB), Finn.no reiseforum
**Vinkel (norsk):** *"Hei! Jeg har laget en gratis reise-app som lærer hva du liker og foreslår opplevelser basert på dine preferanser. Noen som vil teste og gi tilbakemelding?"*

**Risiko:** Lite volum sammenlignet med Reddit.
**Fallback:** Bruk som kvalitativ feedback-kanal, ikke volum-kanal.

### Kanal 5: Invite-only / Limited Access (FOMO-strategi)

**Vurdering:** Invite-only kan fungere for å:
- Skape eksklusivitet og word-of-mouth
- Kontrollere server-belastning og API-kostnader
- Bygge en venteliste som gir en "launch day" boost

**Konkret implementering:**
- Lag en enkel landing page med e-post-optin: "Join the beta — limited spots"
- Gi de første 50 brukerne 3 invitasjoner hver
- Vis venteliste-posisjon for å skape urgency

**Risiko:** Produktet er for tidlig — FOMO virker bare hvis folk allerede vil ha det.
**Fallback:** Dropp invite-only hvis de første 20 brukerne er vanskelige å finne. Gå open beta i stedet.

---

## 4. Stegvis lanseringsplan

### Fase 1: Soft Launch (10-50 brukere) — Uke 1-3

**Hvem:** Personlig nettverk + 1-2 Reddit-poster i niche-communities
**Hvordan:**
- Send direkte meldinger til 20-30 venner/bekjente som reiser
- Post i r/SideProject og én norsk Facebook-gruppe
- Be spesifikt om 5 min testing + 3 spørsmål-feedback

**Hva måler vi:**
- Fullføringsrate: Hvor mange fullfører minst 10 swipes?
- Recs-engagement: Klikker de på anbefalingene?
- Kvalitativ: "Forstår du hva appen gjør?" / "Vil du bruke den igjen?"
- Teknisk: Feilrate, load-tider, Brave API-bruk per bruker

**Suksesskriterier for å gå videre:**
- ≥60% fullfører 10+ swipes
- ≥30% klikker på minst én anbefaling
- Ingen kritiske tekniske feil
- Minst 5 kvalitative tilbakemeldinger mottatt

**Risiko:** Venner gir høflige, ikke ærlige tilbakemeldinger.
**Fallback:** Legg til en anonym feedback-knapp i appen. Mål atferd (swipes, klikk) mer enn hva folk sier.

### Fase 2: Beta Launch (50-500 brukere) — Uke 4-8

**Hvem:** Reddit-communities, Product Hunt, eventuelt Hacker News
**Kanaler:**
- 2-3 Reddit-poster (r/solotravel, r/travel, r/digitalnomad)
- Product Hunt launch (forbered i fase 1: screenshots, tagline, maker-profil)
- 1-2 reisebloggere som beta-testere (tilby "be the first to review")

**Feedback-loops:**
- In-app feedback-knapp (thumbs up/down + fritekst)
- Ukentlig oppsummering av mest-klikket vs minst-klikket anbefalinger
- Discord/Telegram-kanal for beta-brukere (maks 50 aktive)
- Google Analytics eller Plausible (gratis, personvern-vennlig) for basic metrics

**Suksesskriterier for å gå videre:**
- ≥100 brukere har fullført minst én hel "session" (swipe → get recs → click rec)
- Gjennomsnittlig 15+ swipes per session
- NPS (Net Promoter Score) spørsmål: ≥7/10 gjennomsnitt
- Brave API-kostnader under $25/mnd

**Risiko:** Render free tier har cold starts (30+ sek). Brukere dropper av.
**Fallback:** Upgrade til Render Starter ($7/mnd) hvis cold starts er et verifisert problem. Eller legg til en "loading your personalized results..." UX-melding som setter forventninger.

### Fase 3: Public Launch — Uke 8-12

**Timing:** Lanser public når:
- Fase 2 suksesskriterier er møtt
- Minst 3 bug-frie dager på rad
- Analytics-dashboard er oppe

**PR og kanaler:**
- Oppdatert Product Hunt-listing med "launched" badge
- Hacker News "Show HN" (hvis ikke brukt i fase 2)
- Medium/Dev.to artikkel: "How I built a preference-learning travel recommender as a solo dev"
- Twitter/X: thread om reisen fra idé til launch
- Norske tech-medier: Kode24, Shifter (pitch som "norsk solo-dev bygger AI-reise-app")

**Risiko:** Scaling-problemer ved plutselig trafikk.
**Fallback:** Implementer enkel rate-limiting og cache-lag før public launch.

### Fase 4: Scaling — Uke 12+

**Hva trigger neste fase:**
- >500 monthly active users (MAU)
- >5% av brukere returnerer innen 14 dager
- Positiv enhetsøkonomi (inntekt per bruker > kostnad per bruker)

**Fokus i scaling-fasen:**
- Implementer auth (brukerkontoer) for å lagre preferanser server-side
- A/B-testing av swipe-kort og anbefalingsformat
- Utforsk monetisering (se MONETIZATION_STRATEGY_v1.md)
- Vurder partnerskap med reisebloggere og influencers

---

## 5. Partnerskap med reisebloggere/influencers

### Hva vi kan tilby (uten budsjett):

1. **"Powered by"-integrasjon:** Bloggeren embedder Travel-Swish i sin side med en destinasjon pre-valgt. Leserne deres kan swipe og få anbefalinger kontekstuelt. Bloggeren får en unik lenke for tracking.

2. **Innholds-samarbeid:** Vi lager en "top picks by [blogger]" seed-liste som gir deres anbefalinger ekstra vekt i algoritmen for deres publikum.

3. **Tidlig tilgang + eksklusiv feature:** Beta-tester status, deres feedback prioritert, nevnt i "launch credits."

4. **Affiliate-spor (fremtidig):** Når vi har affiliate-integrasjon, kan bloggere tjene en andel av bookinger via deres embed.

### Hvem å kontakte:

**Mikro-influencers (1K-50K følgere) — høyest ROI:**
- Norske reisebloggere med engasjert publikum
- Solo-travel YouTubers med <20K subscribers
- Instagram travel-kontoer med <10K følgere men høy engagement rate (>5%)

**Approach:** Personlig DM, ikke "Dear influencer"-mal. Vis at du kjenner innholdet deres. Be om 5 min av tiden deres for en demo.

**Risiko:** Influencers svarer ikke, eller krever betaling.
**Fallback:** Fokuser på communities (Reddit, forum) som er "gratis" distribusjon.

---

## 6. Konkrete aksjoner — neste 2 uker (prioritert rekkefølge)

### Uke 1 (dag 1-7):

| # | Aksjon | Estimat | Hvorfor først |
|---|--------|---------|---------------|
| **1** | **Legg til basic analytics** — Implementer Plausible Analytics (gratis self-hosted eller $9/mnd hosted). Track: sidevisninger, swipe-events, recs-klikk, session-lengde. | 2-3 timer | Uten data flyr vi blindt. Alt annet avhenger av dette. |
| **2** | **Legg til en in-app feedback-knapp** — Enkel "How was this?" thumbs up/down + valgfri fritekst etter at brukeren har fått anbefalinger. Lagre i backend. | 2-3 timer | Kritisk for å lære fra de første brukerne. |
| **3** | **Lag en minimal landing page med e-post-optin** — Kan være en enkel side på GitHub Pages med Mailchimp/Buttondown embed. "Travel-Swish — swipe your way to the perfect trip. Join the beta." | 2-3 timer | Gir oss en URL å dele og en e-post-liste å bygge. |
| **4** | **Skriv og post på r/SideProject** — Tittel: "I built a free tool that learns your travel preferences through swiping and gives personalized recommendations. Would love feedback!" Inkluder 2-3 screenshots. | 1 time | Lav-risiko test av messaging og interesse. |
| **5** | **Send personlige meldinger til 15-20 venner/bekjente** — "Hei! Jeg har laget en reise-app og trenger ærlige testere. 5 min av din tid? [lenke]" Spesifiser 3 ting du vil ha feedback på. | 1 time | Raskeste vei til de første 10-20 brukerne. |

### Uke 2 (dag 8-14):

| # | Aksjon | Estimat | Hvorfor nå |
|---|--------|---------|------------|
| **6** | **Analyser uke 1-data** — Se på analytics + feedback. Hvor dropper folk av? Hva sier de? Fiks topp 2-3 problemer. | 3-4 timer | Data-drevet prioritering fremfor gjetning. |
| **7** | **Post i r/solotravel eller r/travel** — Bruk en mer "story"-basert tilnærming: "I got frustrated with generic travel recommendations, so I built something different." Tilpass basert på r/SideProject-respons. | 1-2 timer | Største potensielle bruker-pool. |
| **8** | **Post i 1-2 norske Facebook-grupper** — Norsk vinkel, be om tilbakemelding, vær personlig. | 30 min | Norsk nettverk for kvalitativ feedback. |
| **9** | **Forbered Product Hunt-launch** — Lag screenshots, skriv tagline, sett opp maker-profil. Ikke lanser ennå — bare forbered. | 2-3 timer | PH-launch bør være koordinert, ikke spontan. |
| **10** | **Kontakt 3-5 mikro-influencers** — Send personlige DMs til 3-5 reisebloggere/YouTubers med <20K følgere. Tilby tidlig tilgang og en "powered by"-embed. | 1-2 timer | Plante frø for fase 2-vekst. |

---

## 7. Metrics-dashboard (hva å tracke fra dag 1)

| Metric | Kilde | Mål (fase 1) | Mål (fase 2) |
|--------|-------|--------------|--------------|
| Daglige aktive brukere (DAU) | Plausible | 5-10 | 30-50 |
| Swipes per session | Backend events-tabell | 10+ | 15+ |
| Recs-klikk per session | Plausible | 1+ | 2+ |
| Fullføringsrate (swipe → recs) | Backend/Plausible | 60% | 70% |
| Brave API-kall per dag | Backend logging | <50 | <300 |
| Return rate (7-dagers) | Plausible | 10% | 20% |
| Feedback-score (thumbs up %) | Backend feedback-tabell | >60% | >70% |

---

## 8. Risiko-matrise

| Risiko | Sannsynlighet | Konsekvens | Mitigering |
|--------|--------------|------------|------------|
| Render cold starts dreper UX | Høy | Høy | Upgrade til betalt tier ($7/mnd) når verifisert problem |
| Brave API-kvote brukt opp | Middels | Høy | Implementer caching (allerede delvis på plass), rate-limit per bruker, fallback-melding |
| Reddit-poster blir fjernet som spam | Middels | Lav | Bygg genuine bidrag først, bruk feedback-vinkel ikke salgs-vinkel |
| Ingen returnerer etter første besøk | Høy | Høy | E-post-optin for "nye destinasjoner", push-notifications (fremtidig), forbedre recs-kvalitet |
| Preferanser lagres kun lokalt → mistes | Middels | Middels | Prioriter server-side prefs + enkel auth i fase 2 |
| Solo-dev burnout | Middels | Høy | Sett realistiske mål, bruk AI-assistenter effektivt, ta pauser |

---

## 9. Nøkkelantakelser og hva som må valideres

| Antakelse | Hvordan validere | Deadline |
|-----------|-----------------|----------|
| Swipe-UX er engasjerende nok til 10+ swipes | Analytics: swipes per session | Uke 2 |
| Anbefalingene er nyttige (ikke bare "Google search med ekstra steg") | Feedback-score + kvalitative svar | Uke 3 |
| Folk forstår konseptet uten forklaring | Fullføringsrate fra landing page til recs | Uke 2 |
| Brave Search gir gode nok resultater for reise | Manuell kvalitetssjekk av topp 10 recs for 5 destinasjoner | Uke 1 |
| Det finnes et marked utover tech-entusiaster | Respons fra reise-communities vs tech-communities | Uke 4 |

---

*Dokument generert: 24. mars 2026 | Neste revisjon: etter fase 1-data (ca. uke 3)*
