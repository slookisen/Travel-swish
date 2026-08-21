# Travel Swish V0.3.0 — språk, livesøk og Windows-oppsett

## Nytt og rettet

- Norsk/English kan velges på alle skjermer; valget lagres på enheten og bytter også hele kortstokken.
- Windows-standardstart bruker hostet livesøk og trenger ikke Python.
- Valgfri lokal backend finner automatisk Python 3.12, 3.13 eller 3.14 og stopper tydelig dersom en installasjon feiler.
- Backend-avhengighetene er oppdatert og verifisert med Python 3.14.
- Et tregt eller mislykket profil-synkroniseringskall blokkerer ikke lenger selve anbefalingssøkingen.
- Google Places får valgt språk og returnerer separat nettside- og kartinformasjon når begge finnes.
- Offline-forslag viser ikke lenger to identiske kartlenker som «kilde» og «kart».
- Fallback-meldingen forklarer nå tydelig om et forslag er kuratert med offisiell kilde eller bare et søkbart kartforslag.
- Frontend-avhengighetene er sikkerhetsoppdatert; `npm audit` rapporterer 0 kjente sårbarheter.

## Verifisert

- TypeScript, kortaudit, profilmodell og produksjonsbygg.
- 100 aktive opplevelseskort og 80 aktive matkort uten eksakte duplikater.
- 56 backendtester på Python 3.14.
- 8 nettlesertester, inkludert desktop/mobil-layout, swipe-utkast, live/fallback, lagring og vedvarende English-valg.

## Fortsatt testversjon

Profilen lagres foreløpig bare på én enhet. Live-søk krever at hostet backend og Google Places/Brave svarer. Åpningstider, priser og tilgjengelighet skal alltid kontrolleres hos stedet før avreise.
