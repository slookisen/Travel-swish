# Travel Swish — V0.4.0 PWA + Capacitor

En forskningsinformert videreutvikling av Travel Swish. Konseptet er fortsatt kortbasert reiseoppdagelse, men profileringen er bygget om rundt tre separate lag:

1. **Turbrief** — følge, tempo, budsjett og ønsket grad av oppdagelse for akkurat denne turen.
2. **Smaksprofil** — preferanser lært over tid, med usikkerhet per akse og asymmetrisk behandling av positive og negative signaler.
3. **Kandidatvalg og rangering** — adaptive kort velges der modellen vet minst; anbefalinger bruker både smak og turkontekst.

Testbygget inkluderer responsiv frontend, lagret norsk/engelsk språkvalg, migrerbar lokal profil, lagrede tips, eksplisitt resultatfeedback, Google Places-/Brave-integrasjon og kuraterte starttips med kilder og kartlenker når livesøk ikke svarer.

V0.4 legger til en installasjonsklar PWA med offline appskall, appikoner og mobiltilpassede safe areas. Det samme webbygget er konfigurert som native iOS- og Android-prosjekter med Capacitor. En bruker kan dele ett treff eller hele kortlisten gjennom telefonens delingsmeny. Delingen inneholder en markedsføringstekst, offentlig applenke med UTM-parametere og en egen sosial forhåndsvisning. Ingenting publiseres uten at brukeren selv velger app og bekrefter delingen.

## Kjør lokalt

Krever Node.js 20+. Standard teststart bruker den hostede live-tjenesten og krever ikke Python:

```powershell
.\setup-test.ps1   # kun første gang
.\start-test.ps1
```

Åpne `http://127.0.0.1:5173/Travel-swish/`. Hvis live-tjenesten ikke svarer, går resultatsiden automatisk over til kildebelagte starttips. Se [TEST_TOMORROW.md](TEST_TOMORROW.md) for en kort testplan.

Test installasjon og offline PWA lokalt i Chrome/Edge med:

```powershell
.\start-pwa-test.ps1
```

Åpne `http://127.0.0.1:4173/Travel-swish/`. Lokale profiler blir liggende i nettleseren på samme enhet.

Valgfri lokal backend krever Python 3.12 eller nyere, inkludert Python 3.14:

```powershell
.\setup-test.ps1 -WithLocalBackend
.\start-test.ps1 -UseLocalBackend
```

## Verifisering

```powershell
npm run check
npm run test:e2e
npm run cap:sync
npm audit
```

Backend kan verifiseres med miljøet som oppsettskriptet lager:

```powershell
cd backend
.\.venv-local\Scripts\python.exe -m pytest -q
```

## Viktige dokumenter

- [PROJECT_REVIEW_V2.md](PROJECT_REVIEW_V2.md) — helhetlig gjennomgang, beslutninger, forskningsgrunnlag og veikart.
- [PROFILE_MODEL_V2.md](PROFILE_MODEL_V2.md) — profilmodell, signalvekter, usikkerhet, adaptivt kortvalg og API-format.
- [API_CONTRACT_V2.md](API_CONTRACT_V2.md) — eksisterende API-kontrakt; bør oppdateres før produksjonslansering.
- [MOBILE_BUILD.md](MOBILE_BUILD.md) — PWA-, Android- og iOS-flyt, krav og kommandoer.
- [RELEASE_NOTES_V0.4.md](RELEASE_NOTES_V0.4.md) — endringer og kjente avgrensninger i denne leveransen.

## Status og avgrensning

Dette er en fungerende testversjon, ikke en ferdig App Store-/Google Play-lansering. Live-resultater avhenger av konfigurert backend og søkeleverandør. Når de ikke svarer, brukes faktiske, kildebelagte starttips for Lisboa, Oslo, Barcelona og Tokyo, eller direkte kart-søk for andre destinasjoner. Appen viser ikke åpningstider eller priser som om de var garantert ferske. Android-kildeprosjektet krever Android Studio/SDK for å lage APK, mens iOS krever macOS, Xcode og en Apple-utviklerkonto for signering.
