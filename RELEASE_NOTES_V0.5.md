# Travel Swipe V0.5.0

Denne versjonen prioriterer en enkel mobilflyt og mer presise resultater.

## Nytt

- Appnavnet er endret fra **Travel Swish** til **Travel Swipe** i PWA, deling, iOS og Android.
- Swipegesten låser først retning etter at brukerens bevegelse er tydelig. Vertikale bevegelser blir ikke tolket som svar, mens horisontale kast reagerer på både avstand og hastighet.
- På telefon fyller profileringsflyten én skjerm. Kort, svar og treffknapp er synlige uten at brukeren må lete nederst på siden.
- Etter seks tydelige svar spør en enkel bunnflate om brukeren vil se treff nå eller finjustere videre. Den maser ikke igjen før seks nye svar.
- Live-anbefalinger bruker nå harde moderegler før smakspoeng: bakerier, kafeer og restauranter kan ikke falle tilbake som «opplevelser».
- Resultatlisten begrenser gjentakelse av samme stedstype og fordeler utvalget på flere kategorier.
- Opplevelsessøk bruker matinteresse til aktiviteter som matmarked, mattur og kokkekurs — ikke til en liste over serveringssteder.

## Data i denne versjonen

- Det enkelte kortsvaret lagres lokalt på brukerens enhet.
- Når brukeren ber om anbefalinger, sendes en beregnet søkeprofil, turbrief og pseudonym bruker-/sesjons-ID til backend. Backend lagrer søkekjøringen og resultat-ID-ene.
- Tilbakemelding som «Bra tips» eller «Ikke relevant» sendes og lagres når brukeren selv velger den.
- Appen sender ikke fortløpende alle swipes til en sentral database.

Vi har bevisst ikke slått på skjult analyseinnsamling. En senere analysefunksjon bør være av som standard, ha et tydelig frivillig samtykke, bruke minst mulig data og tilby stopp og sletting.

## Kvalitetskontroll

- 60 backendtester
- 11 Playwright-flyttester, inkludert 390 × 844 mobilvisning og gestens akselås
- TypeScript typekontroll, kortaudit, profilkontroll, produksjonsbygg og PWA-kontroll
