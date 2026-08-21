# Travel Swish V2 — prosjektgjennomgang og anbefalt retning

> Oppfølgingsstatus 19. august 2026: De releasekritiske punktene om kildebelagt
> fallback, resultatfeedback, frontend-moduler, versjonert lokaltilstand, FastAPI
> lifespan og database-migreringer er implementert i V0.2. Se
> `RELEASE_NOTES_V0.2.md` for fasit.

Dato: 19. august 2026
Grunnlag: GitHub-ZIP-en og den lokale arbeidskopien i `C:\Users\dafre\Travel-Swish`. Den lokale mappen ble kun lest og er ikke endret.

## Kort konklusjon

Travel Swish har et godt, lettforklarlig konsept og mer teknisk substans enn en vanlig prototype: et kuratert kortdatasett, React/Vite-frontend, FastAPI-backend, Google Places-/Brave-søk, resultatdiversitet og testdekning. Den viktigste svakheten lå ikke lenger i søket, men i hvordan brukeren ble forstått.

Den gamle flyten reduserte brukerens svar til ni akser, behandlet alt som binære sveip og krevde 20 kort før første verdi. Budsjett, følge og tempo manglet som egen reisekontekst. Profilen viste heller ikke hvor sikker modellen var, og avansert `taste`-støtte i backend ble i praksis ikke sendt fra frontend.

V2-utkastet løser dette med:

- kort turbrief separat fra varig smak;
- fire svarnivåer: «ikke meg», «usikker», «ja» og «elsker»;
- adaptiv kortrekkefølge basert på usikkerhet og manglende kategoridekning;
- Bayesian-lignende krymping mot nøytral ved lite data;
- synlig sikkerhet per preferanseakse;
- manuell korrigering og sletting av profil;
- dynamisk klarhet i stedet for en hard 20-kortsgrense;
- `taste`, kontekst og profilverdier sendt til backend;
- kontekstbevisst kandidatinnhenting i både Google Places- og Brave-sporet;
- egne konsepttreff når live-søket ikke svarer, tydelig merket som demo.

## Hva som var bra i eksisterende prosjekt

### Produkt

- Swipe-mekanismen senker terskelen for å uttrykke preferanser.
- Opplevelser og restauranter har separate kortstokker med 100 kort hver.
- Treff har forklaring, kartstøtte og variasjonslogikk.
- Lokal historikk og en enkel «slett alt»-flyt finnes allerede.

### Teknikk

- Datasettene valideres med Zod ved oppstart.
- Backend har rene funksjoner for scoring og egne tester.
- Query builder og scorer er allerede skilt ut fra API-laget.
- Google Places bruker strukturerte typer og har Brave som fallback.
- Seed-basert variasjon og deduplisering er implementert.
- GitHub Pages- og Render-oppsett finnes.

Disse delene er bevart i stedet for å starte helt på nytt.

## Viktigste funn og risikoer

### 1. Profilen var for flat

Ni dimensjoner er et nyttig komprimert språk, men én verdi per akse skjulte tre avgjørende ting: mengden belegg, motstridende signaler og om behovet gjelder personen generelt eller bare én tur.

Eksempel: En person kan like høy komfort generelt, men planlegge en rimelig vennetur nå. I den gamle modellen risikerte «luksus» å dominere søket. I V2 kan turbriefens budsjett overstyre kandidatfiltre uten å skrive om den varige komfortpreferansen.

### 2. Fast 20-kortsgrense ga tregere tid til verdi

Alle brukere fikk samme antall spørsmål uansett hvor informative svarene var. Forskning på conversational recommendation viser at aktivt valgte spørsmål kan forbedre personalisering markant med svært få spørsmål; ett studie rapporterte 25 prosent forbedring etter bare to aktivt valgte spørsmål. Det betyr ikke at Travel Swish skal stoppe etter to, men at spørsmålsvalg er viktigere enn et fast antall. [Towards Conversational Recommender Systems](https://research.google/pubs/towards-conversational-recommender-systems/)

V2 avslutter ikke læringen, men åpner første treff når modellen har minst fem tydelige svar, tilstrekkelig kategoridekning og samlet klarhet over terskelen.

### 3. Binære avslag ble overtolket

Et «nei» til et sammensatt kort kan skyldes én detalj. Å invertere alle kortets attributter gjør profilen ustabil. V2 gir negative svar lavere vekt enn sterke positive svar og begrenser negative bidrag til kortets tre sterkeste akser. «Usikker» registreres som eksponering, men endrer ikke smaken.

Dette er også en påminnelse om at observerte handlinger ikke uten videre kan tolkes som direkte preferanser; produksjonslogger er påvirket av hva systemet valgte å vise. [On Evaluating Session-Based Recommendation with Implicit Feedback](https://research.google/pubs/on-evaluating-session-based-recommendation-with-implicit-feedback/)

### 4. Kortrekkefølgen var tilfeldig, ikke læringsdrevet

Popularitets- eller relevansstyrt preferanseinnhenting kan forsterke skjevheter allerede før rangering. Forskning viser at diversitet ved selve preferanseinnhentingen gir bredere forståelse av brukeren og bedre diversitet og serendipitet. [Diverse User Preference Elicitation with Multi-Armed Bandits](https://research.google/pubs/diverse-user-preference-elicitation-with-multi-armed-bandits/)

V2 scorer usette kort på:

- lav sikkerhet på aksene kortet dekker;
- kategorier som ikke er prøvd;
- hvor tydelig kortet skiller mellom preferanser;
- en liten deterministisk variasjon.

Dette er en forklarbar heuristikk for draften. Senere kan den erstattes av en kontekstuell bandit, men først etter at eksponering og resultatmålinger logges korrekt.

### 5. Backend-støtte var ikke koblet helt frem

Backend hadde støtte for `taste.cats` og flerlaget query-bygging, men frontend sendte bare de ni `prefs`-verdiene. Dermed ble kategorier og kombinasjoner ikke brukt i normalflyten. V2 sender både nedkrympede akseverdier, kategorier, sikkerhet, turkontekst, antall signaler og profilklarhet.

### 6. Profilen var synlig, men ikke fullt kontrollerbar

Et radardiagram ga en fin oppsummering, men brukeren kunne ikke rette en feilaktig tolkning per akse. Forskning på transparente og «scrutable» user models viser at en forståelig og redigerbar profil kan gjøre det enklere å forbedre anbefalingene og bygge tillit. [Transparent, Scrutable and Explainable User Models](https://research.google/pubs/transparent-scrutable-and-explainable-user-models-for-personalized-recommendation/)

V2 viser verdi og sikkerhet separat, lar brukeren justere alle akser og gjør det tydelig når en verdi er manuelt påvirket.

### 7. Kontekst må velges, ikke bare samles

POI-forskning viser at geografisk, tidsmessig, sosial og kategorisk kontekst kan påvirke kvalitet, men også at «alt på én gang» kan gjøre modellen dårligere. [A Systematic Analysis on the Impact of Contextual Information on Point-of-Interest Recommendation](https://arxiv.org/abs/2201.08150)

Draften bruker derfor bare fire forståelige kontekstfelt med klar produkteffekt. Dato, vær, reiselengde, avstand og tilgjengelighet bør legges til når reelle kandidater har pålitelige data for dem — ikke som pynt i onboarding.

### 8. Match-prosenten trenger kalibrering

Eksisterende backend klemmer resultater inn i et intervall og kombinerer flere heuristikker. En verdi som «92 % match» ser statistisk kalibrert ut uten å være det. I draften beholdes prosentformatet av hensyn til konseptet, men før lansering bør det enten:

- kalibreres mot faktisk positiv respons på anbefalinger; eller
- endres til nivåer som «svært godt treff», «godt treff» og «utforsk».

### 9. Datasettet har duplikat- og kvalitetsgjeld

Restaurantkortene har flere repeterte mønstre i siste del av kortstokken. Kortene bruker gode, rike akseverdier, men kategoriene har varierende presisjon. Før ML eller samarbeidssignaler bygges på toppen bør datasettet ha:

- unik semantisk intensjon per kort;
- balansert dekning per akse og kategori;
- eksplisitt «discriminative power» per kort;
- versjonert QA med duplikatkontroll;
- egne kort for parvise trade-offs, ikke bare enkeltideer.

### 10. Frontend var blitt en monolitt

Den tidligere `src/App.tsx` var omtrent 105 kB og samlet tekster, lagring, profil, nettverk, swipe, kart og resultater. V2-draften er visuelt og funksjonelt ny, og profilmotoren er skilt ut i `src/profile/engine.ts`. Neste refaktorering bør dele resten i ruter eller feature-moduler før mer funksjonalitet legges til.

## Forskningsprinsipper brukt i V2

1. **Aktiv preferanseinnhenting:** velg neste spørsmål for informasjonsverdi, ikke bare tilfeldig variasjon.
2. **Utforskning som bruker verdi:** utforskning kan forbedre diversitet, nyhet og serendipitet — ikke bare fremtidig modellkvalitet. [Values of Exploration in Recommender Systems](https://research.google/pubs/values-of-exploration-in-recommender-systems/)
3. **Kontekst separat fra identitet:** turens rammer skal kunne endres uten å omdefinere personen.
4. **Usikkerhet som førsteklasses data:** lite belegg skal gi en verdi nær nøytral og lav sikkerhet.
5. **Brukerkontroll:** profil og forklaringer skal kunne inspiseres, korrigeres og slettes.
6. **Dataminimering:** draften bruker ikke sensitive kjennetegn, og profil lagres lokalt. Profilering må ha tydelig formål, informasjon og kontroll før produksjonslogging utvides. [EDPBs retningslinjer for automatiserte avgjørelser og profilering](https://www.edpb.europa.eu/documents/guideline/automated-decision-making-and-profiling_en)

## Ny arkitektur i draften

```text
Turbrief ───────────────┐
                       ├─> kandidatspørringer ─> Google Places / Brave
Adaptive kort ─> profil├─> rangering + kontekstjustering ─> forklarte treff
                 + tillit
                       └─> synlig/redigerbar profil i frontend
```

### Frontend

- `src/profile/engine.ts`: signalvekter, usikkerhet, klarhet, adaptivt kortvalg og API-payload.
- `src/profile/labels.ts`: menneskelige navn på akser og kategorier.
- `src/App.tsx`: komplett V2-produktflyt.
- `src/styles.css`: responsivt designsystem uten ny UI-avhengighet.
- `tools/profile-engine-check.mjs`: kjørbar enhetssjekk av profilkjernen.

### Backend

- `query_builder.py`: bruker turbrief som søkekontekst og lar turbudsjett overstyre generell luksuspreferanse.
- `scorer.py`: små, avgrensede kontekstjusteringer og forklaring.
- `web_recs.py`: kontekst i Brave-spørringer og cache key.
- `places_recs.py`: ny modellversjon `v5-context-profile`.
- `test_profile_v2.py`: tester budsjett-overstyring, hidden-gem-score og kontekst i webspørringer.

## Hva som bør måles i pilot

Primære produktmål:

- andel som åpner eller lagrer minst ett treff;
- tid og antall kort til første treff;
- andel som sier «ikke relevant» på resultater;
- andel som korrigerer profilen, og om det forbedrer neste utvalg;
- gjenbruk på en ny destinasjon eller senere tur.

Modellmål:

- kalibrering mellom oppgitt match og faktisk positiv handling;
- nDCG eller ranking loss på eksplisitt resultatfeedback;
- kategoridekning, intra-list diversity og serendipitet;
- eksponeringsskjevhet per kategori og kort;
- stabilitet når like svar gis i ulik rekkefølge.

Operasjonelle mål:

- API-suksessrate og kaldstartstid;
- andel fallback til konsepttreff;
- kostnad per fullført anbefalingsøkt;
- feilrate for ugyldige eller stengte steder.

## Anbefalt veikart

### Fase 1 — brukertest draften

- Test 5–8 personer på hele flyten uten forklaring fra teamet.
- Mål om de forstår skillet mellom turbrief og smak.
- Sjekk om fire reaksjoner føles naturlig, eller om «ja» og «elsker» blir for like.
- Gå gjennom profilkorrigering og sletteflyt.

### Fase 2 — datakvalitet og resultatsløyfe

- Rydd duplikater i kortsettet.
- Legg til eksplisitt resultatfeedback: lagre, ikke relevant, allerede besøkt og feil informasjon.
- Logg alltid hvilken kortpolicy og kandidatpolicy som skapte en eksponering.
- Kalibrer eller erstatt match-prosenten.

### Fase 3 — produksjonsarkitektur

- Del frontend i feature-moduler og legg til komponenttester.
- Flytt profilhistorikk til versjonert backend kun etter tydelig samtykke og personverntekst.
- Bytt FastAPI `on_event` til lifespan-handler.
- Legg til observability, leverandørkvoter, retry-policy og stedsfriskhet.
- Fullfør norsk og engelsk copy; den gamle svenske oversettelsen er ufullstendig.

### Fase 4 — lærende anbefalinger

- Start med en offline evaluert kontekstuell bandit for kortvalg.
- Bruk eksplisitte resultatreaksjoner som hovedsignal.
- Introduser samarbeidssignaler først når datamengde, samtykke og eksponeringsbias kan håndteres.
- A/B-test mot den forklarbare heuristikken, ikke bare mot tilfeldig kortrekkefølge.

## Avgrensninger i denne leveransen

- Ingen produksjonsdeploy eller endring av den lokale originalmappen.
- Ingen migrering av gamle lokale profiler til V2-format; V2 bruker egne storage keys.
- Konsepttreff er ikke faktiske steder og er tydelig merket.
- Turdato, vær, avstand, åpningstider, universell utforming og reiselengde er ikke modellert ennå.
- Gruppeprofilering for flere personer er ikke implementert; «hvem reiser» er foreløpig kontekst, ikke preferanseaggregering.
