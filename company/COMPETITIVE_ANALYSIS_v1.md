# Travel-Swish: Competitive Analysis & Positioning v1

> **Dato:** 24. mars 2026
> **Status:** Draft — til diskusjon og iterasjon
> **Kilde:** Offentlig tilgjengelig informasjon, produktsider, anmeldelser (mars 2026)

---

## 1. Produkt-oppsummering

Travel-Swish er en preference-basert reiseopplevelse-anbefaler som bruker swipe-interaksjon for å lære brukerens smak, og deretter leverer personaliserte anbefalinger med forklaringer og kildelenker via live web-søk.

**Nøkkelkonsept:** I stedet for å spørre "hva vil du gjøre?" lærer Travel-Swish *hvem du er som reisende* gjennom atferd (swipes), og anbefaler deretter opplevelser som matcher profilen din — med transparente forklaringer på hvorfor.

---

## 2. Konkurrentoversikt

### 2.1 Google Travel (google.com/travel)

**Hva de gjør:** Googles reiseplanlegger integrerer fly, hoteller, og aktiviteter med AI-drevet planlegging. I 2026 har de lansert "AI Mode Canvas" som lar brukere bygge reiseplaner gjennom samtale med AI, og "Flight Deals" som finner billige reiser basert på fleksible preferanser. De jobber med agentic booking — booking direkte i AI-grensesnittet.

**Styrker:** Uslåelig datagrunnlag (Google Maps, reviews, priser, sanntidsdata). Gratis. Integrert med Gmail og Google Photos for personalisering. Massiv distribusjon. Direkte booking-funksjonalitet.

**Svakheter:** Generisk — optimalisert for "alle", ikke for deg personlig. Ingen preferanse-læring over tid. UX er funksjonell men ikke engasjerende. Personalisering krever Google-økosystem innlogging. Overveldet med informasjon — mange valg, lite veiledning.

**Trussel for oss:** Høy på lang sikt. Google kan implementere swipe-basert preferanselæring i morgen. Men de optimaliserer for annonseinntekter, ikke for brukerens smak.

### 2.2 TripAdvisor (tripadvisor.com)

**Hva de gjør:** Verdens største reise-anmeldelsesplattform. I 2026 har de lansert en AI-assistent for trip planning og en AI trip builder som gir personaliserte itineraries. Samarbeid med Best Western for AI-drevet reiseplanlegging for store events.

**Styrker:** Enormt innhold — millioner av anmeldelser og bilder. Sterk SEO/brand. AI trip builder som bruker anmeldelsesdata. Direkte booking-integrasjoner. Inntektsbevist (rapporterer 2-3x mer inntekt fra AI-brukere).

**Svakheter:** Anmeldelser er ofte utdaterte eller generiske. "Topp 10"-lister favoriserer populære steder over nisje-opplevelser. AI-assistenten er samtalebasert (treg) i stedet for behavior-basert (rask). Ingen swipe-interaksjon. Mye støy — annonser, sponsored listings, affiliate-lenker gjør det vanskelig å vite hva som er ekte anbefaling.

**Trussel for oss:** Middels. TripAdvisor har dataen men ikke UX-innovasjonen. De er fokusert på monetisering av eksisterende trafikk, ikke på nye interaksjonsmodeller.

### 2.3 Wanderlog (wanderlog.com)

**Hva de gjør:** Reiseplanleggingsapp fokusert på itinerary-bygging, samarbeid, og ruteoptimalisering. Karting av reiseruter, offline tilgang, budsjett-tracking, og deling med reisefølge.

**Styrker:** Veldig bra for organisering av eksisterende planer. God samarbeidsfunksjonalitet. Offline-støtte. Ruteoptimalisering for roadtrips. Rimelig premium ($4.99/mnd).

**Svakheter:** Fokusert på *planlegging*, ikke *oppdagelse*. Brukeren må allerede vite hva de vil — Wanderlog organiserer det bare. Ingen preferanse-læring. Ingen personalisert anbefaling av opplevelser. AI-funksjonalitet er begrenset.

**Trussel for oss:** Lav. Komplementært produkt. Travel-Swish oppdager hva du bør gjøre; Wanderlog organiserer det etter at du har bestemt deg.

### 2.4 Layla AI (layla.ai)

**Hva de gjør:** AI-drevet reiseplanlegger som bygger komplette itineraries gjennom chat-dialog. Dekker fly, hoteller, aktiviteter, og restauranter. Har kjøpt Roam Around (original AI itinerary builder med 10M+ itineraries).

**Styrker:** Best-in-class samtale-AI for reise. Husker kontekst, justerer planer basert på feedback. Bred dekning — fly, hotell, aktiviteter, mat. Stor brukerbase (Roam Around-oppkjøp).

**Svakheter:** Chat-first tilnærmingen er treg — en 10-dagers itinerary tar 20-30 minutter samtale vs. 5 minutter i et form-basert verktøy. Krever at brukeren vet hva de vil (eller i det minste kan artikulere det). Ingen behavior-basert læring — alt er eksplisitt gjennom samtale. Ingen visuell/swipe-basert oppdagelse.

**Trussel for oss:** Middels. Layla løser et lignende problem (personalisert reiseanbefaling) men med en helt annen interaksjonsmodell (chat vs. swipe).

### 2.5 Voyaige (voyaige.to)

**Hva de gjør:** AI-reiseplanlegger som genererer detaljerte itineraries med estimert budsjett, bookingtips, og daglige planer.

**Styrker:** Gode itineraries med praktisk informasjon (budsjett, transport, timing). Bruker AI for å tilpasse til preferanser oppgitt via form.

**Svakheter:** Form-basert input — brukeren velger kategorier eksplisitt, ikke gjennom atferd. Ingen kontinuerlig læring. Output er en statisk plan, ikke en dynamisk anbefaling som oppdateres.

**Trussel for oss:** Lav-middels. Annen tilnærming, annet bruksscenario (planlegging vs. oppdagelse).

---

## 3. Feature-matrise

| Funksjon | Travel-Swish | Google Travel | TripAdvisor | Wanderlog | Layla AI |
|:---------|:---:|:---:|:---:|:---:|:---:|
| **Preference-læring via atferd (swipe)** | ✅ Kjernefunksjon | ❌ | ❌ | ❌ | ❌ |
| **Personaliserte anbefalinger** | ✅ Dot-product scoring | ⚠️ Via Google-konto data | ⚠️ Via anmeldelser/saves | ❌ | ✅ Via chat-dialog |
| **Transparente forklaringer ("why")** | ✅ Facet-breakdown | ❌ | ❌ | ❌ | ⚠️ Implisitt i samtale |
| **Live web-resultater** | ✅ Brave Search | ✅ Google Search | ❌ Egen database | ❌ | ⚠️ Varierer |
| **Itinerary-bygging** | ❌ | ✅ AI Mode Canvas | ✅ Trip Builder | ✅ Kjernefunksjon | ✅ Kjernefunksjon |
| **Booking-integrasjon** | ❌ | ✅ Agentic booking | ✅ Hotels, restaurants | ❌ | ⚠️ Lenker |
| **Offline tilgang** | ❌ | ⚠️ Google Maps | ❌ | ✅ Premium-funksjon | ❌ |
| **Samarbeid/deling** | ❌ | ❌ | ✅ Trips | ✅ Kjernefunksjon | ❌ |
| **Restaurant-anbefalinger** | ✅ Eget modus | ✅ Via Maps | ✅ Kjernefunksjon | ❌ | ✅ |
| **Kart-integrasjon** | ❌ (planlagt) | ✅ Google Maps | ✅ | ✅ | ⚠️ |
| **Gratis versjon** | ✅ Helt gratis | ✅ | ✅ (med annonser) | ✅ (begrenset) | ✅ (begrenset) |
| **Budsjett-tracking** | ❌ | ⚠️ Prissammenligning | ❌ | ✅ | ⚠️ |
| **Separate preferanser per kategori** | ✅ Mat vs. opplevelser | ❌ | ❌ | ❌ | ❌ |
| **Fungerer uten konto/innlogging** | ✅ | ❌ | ❌ | ❌ | ❌ |

**Tegnforklaring:** ✅ = Fullt støttet | ⚠️ = Delvis/begrenset | ❌ = Ikke tilgjengelig

---

## 4. Hvor er vårt "wedge"?

### Den unike inngangen: "Show, don't tell" preferanse-oppdagelse

De fleste reise-verktøy ber deg *fortelle* hva du vil: fyll ut et skjema, skriv i en chat, velg kategorier. Travel-Swish lar deg *vise* det gjennom handling — swipe left, swipe right. Dette er fundamentalt annerledes fordi:

1. **Lavere kognitiv belastning.** "Liker du dette? Ja/nei" er enklere enn "Beskriv din ideelle reiseopplevelse."

2. **Implisitt vs. eksplisitt preferanse.** Folk er ofte dårlige til å artikulere hva de vil, men gode til å reagere på konkrete eksempler. Swipe fanger opp preferanser folk ikke visste de hadde.

3. **Engasjerende UX.** Tinder-formatet er beviselig engasjerende (høy session-lengde, lav mental motstand). Ingen annen reise-app bruker dette for preferanse-læring.

4. **Transparens.** "Her er anbefalingen, og her er *hvorfor* den matcher deg" — med faktiske facet-scores. Ingen annen reiseanbefaler viser arbeidet sitt.

### Posisjonering i én setning:

> **"Travel-Swish er den eneste reiseappen som lærer smaken din gjennom swipes og forklarer hvorfor den anbefaler det den gjør."**

### Wedge-strategi:

Vi går ikke inn mot Google, TripAdvisor, eller Layla på planlegging og booking. Vi eier **oppdagelsesfasen** — det øyeblikket der brukeren vet de vil reise, men ikke vet hva de vil gjøre. Etter at de har oppdaget via Travel-Swish, kan de planlegge i Wanderlog og booke på Booking.com. Vi er komplementære, ikke konkurrerende, med planleggingsverktøy.

---

## 5. Hva gjør konkurrentene bedre?

La oss være ærlige om hvor vi taper:

| Område | Hvem er bedre | Hvorfor de er bedre | Hva vi kan gjøre |
|--------|:---:|---------|---------|
| **Databredde** | Google, TripAdvisor | Millioner av datapunkter, anmeldelser, priser | Vi kan ikke konkurrere på data. Brave Search gir oss "good enough" dekning. Fokuser på *relevans*, ikke *mengde*. |
| **Booking** | Google, TripAdvisor | Direkte booking = fullstendig brukerreise | Ikke vår kamp. Lenk til booking-plattformer via affiliate. |
| **Itinerary** | Wanderlog, Layla | Dag-for-dag planer, logistikk, budsjett | Komplementært — vi finner opplevelsene, de organiserer dem. |
| **Brand/tillit** | Alle | De er etablerte, vi er ukjente | Bygg tillit gjennom transparens (vis algoritmen), community-engasjement, og reelle resultater. |
| **Mobilapp** | Wanderlog, TripAdvisor | Native app med push, offline, kamera | Vi er web-only. PWA er en mellomløsning. Native app er fase 3+. |
| **Sosial/samarbeid** | Wanderlog | Del planer med reisefølge | "Share your taste profile" kan være en unik sosial feature for oss. |

---

## 6. Strategiske implikasjoner

### 6.1 Ikke prøv å bli "alt-i-ett"

Den største feilen vi kan gjøre er å bygge itinerary-planning, booking, budsjett-tracking, og alt det andre. Vi er 1 person. Vi vinner ved å gjøre én ting bedre enn alle andre: **preferanse-basert oppdagelse av reiseopplevelser.**

### 6.2 Komplementær posisjonering

Bygg integrasjoner, ikke konkurrenter:
- "Eksporter til Wanderlog"-knapp
- "Book via Booking.com/GetYourGuide"-lenker
- "Se anmeldelser på TripAdvisor"-lenker

Hver integrasjon gjør oss mer nyttige uten å kreve at vi bygger alt selv.

### 6.3 Differensiering vi bør beskytte

1. **Swipe-basert preferanselæring** — Ingen annen reiseapp gjør dette. Hold dette som kjerne-UX.
2. **Transparente anbefalinger med "why"** — Alle andre er "black box". Vår transparens er en tillitsfaktor.
3. **Separate preferanseprofiler** — Du kan være eventyrlysten for opplevelser men komfort-fokusert for mat. Ingen andre fanger denne nyansen.
4. **Null innlogging for å komme i gang** — Lavest mulig friksjon. De fleste konkurrenter krever konto.

### 6.4 Potensielle trusler

| Trussel | Sannsynlighet | Hvordan forberede |
|---------|:---:|---------|
| Google legger til swipe-basert preferanselæring | Lav (ikke deres stil) | Bygg dypere preferansemodell + community |
| Layla legger til visuell/swipe-modus | Middels | Vår algoritme + transparens er dypere enn "legg til swipe" |
| Ny startup kopierer konseptet | Middels | Bygg brukerdata-moat og community raskt |
| Brave Search API endrer prising drastisk | Middels | Ha fallback-søkeleverandør (Serper, Google Custom Search) |
| AI-modeller gjør alle reiseanbefalere like gode | Høy (lang sikt) | UX og preferansedata er moaten, ikke AI-kvaliteten |

---

## 7. Konklusjon

Travel-Swish opererer i et crowded marked, men med en unik inngangsvinkel: behavior-basert preferanselæring gjennom swipe, med transparent forklaring av anbefalinger. Vi konkurrerer ikke på data, booking, eller planlegging — vi eier oppdagelsesfasen.

**Vår styrke er kombinasjonen av:**
- Engasjerende UX (swipe) som senker terskelen for preferanse-input
- Transparent scoring som bygger tillit
- Live web-resultater som gir oppdaterte anbefalinger
- Null friksjon (ingen konto, ingen skjemaer, bare swipe)

**Vår risiko er:**
- Tynn moat — lett å kopiere teknisk, men execution og brukerdata tar tid
- Solo-team — begrenset kapasitet til å iterere raskt
- Avhengighet av Brave Search API som eneste dataleverandør

**Neste steg:** Valider at brukere faktisk foretrekker swipe-oppdagelse over form/chat-basert input. Hvis ja, doble ned på UX og bygg datamoat. Hvis nei, pivoter interaksjonsmodellen.

---

*Dokument generert: 24. mars 2026 | Neste revisjon: etter bruker-validering (ca. uke 4-6)*
