# Travel Swipe V0.6.0

Denne versjonen reduserer venting mellom resultatutvalg og utvider den eksisterende profilen til flere, tydelig avgrensede søkebehov.

## Nytt

- Etter et vellykket søk lager backend automatisk neste Brave-baserte utvalg i bakgrunnen. Et tilfeldig token er bundet til bruker, reisemål, profil og søketype, kan bare brukes én gang og utløper etter tre minutter.
- Resultatsiden viser om neste utvalg klargjøres eller er klart. Det ferdige utvalget åpnes uten en ny lang leverandørrunde.
- Google Places-resultater viser «Hjemmeside» når leverandøren har en offisiell `websiteUri`, og en egen «Åpne i kart»-lenke.
- Et sammenleggbart profilsøk finner hotell, arrangerte turer eller frie behov uten å gjøre hovedflyten tyngre.
- Hotell bruker Google Places når nøkkelen er konfigurert. Arrangerte turer og fritekst bruker Brave og rangeres med brukerens eksisterende smaksprofil.
- Alder og varighet for arrangerte turer gjelder bare det aktuelle søket. Yrke og forholdsstatus er bevisst ikke lagt inn som varige profileringsfelt.
- Uavhengige leverandørspørringer kjøres parallelt med maksimalt fire arbeidere for kortere total ventetid.
- Google Places-data lagres ikke i lokal cache. Brave-diskcache er av som standard og krever eksplisitt `TS_BRAVE_STORAGE_RIGHTS=1` dersom valgt avtale gir lagringsrett.

## Kvalitetskontroll

- 67 backendtester: profilspørringer, stedstypefilter, direkte lenker, transient og engangs prefetch, sesjon og feedback.
- 12 Playwright-flyttester: mobilgest, resultatsignal, offisiell hjemmeside/kart, hotell-/tursøk, forberedt neste utvalg, språk, lagring, deling og PWA-installasjon.
- TypeScript typekontroll, 180-korts innholdsaudit, profilkontroll, produksjonsbygg, PWA-kontroll og npm-audit.

## Kjente avgrensninger

- Hotellresultater er relevante overnattingssteder, men viser ikke garantert live pris eller tilgjengelighet. Produksjonsbooking bør bruke en partner-API fra Booking.com Demand eller Expedia Rapid.
- Arrangerte turer er i denne betaen kildebelagte webtreff. Strukturert avreise, tilgjengelighet, aldersregler og booking bør hentes fra TourRadar Distribution API; Viator er mest relevant for dagsturer og aktiviteter.
- Prefetch ligger i minnet til én backendprosess. Flere serverprosesser krever en delt, kortlivet kø før horisontal skalering.
- Google Places-resultater forhåndslastes ikke på grunn av leverandørvilkårene. Når Google leverer første uttrekk, brukes Brave til det forberedte neste uttrekket.
