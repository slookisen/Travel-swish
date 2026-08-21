# Travel Swish V0.2.2 — første testversjon

## Visuell balansering i V0.2.2

- Klar-statusen bruker den korte overskriften «Profilen er klar.» uten et klønete linjebrudd.
- Desktopkortet er lavere og litt smalere, slik at kontrollene får naturlig luft uten å havne ved skjermkanten.
- Emoji, spørsmål og forklaring er samlet som én sentrert innholdsgruppe.
- Bak-kortet er tonet ned med mindre forskyvning og rotasjon.
- Toppmenyen er sikret innenfor viewporten, og en egen test dekker 1577 × 937 med 14 svar.

## Swipe- og layoutforbedring i V0.2.1

- Kortet følger en mye lengre horisontal draakse og litt vertikal håndbevegelse.
- Et tydelig svar kaster kortet helt ut til høyre eller venstre før neste kort vises.
- Kortform, toppetiketter, tekst og kontrollknapper er tilpasset lave desktop- og mobilskjermer.
- Utkast-animasjonen lager ikke horisontal rulling, og neste kort starter stabilt i midten.
- Ny automatisert viewport-test dekker desktop, 390 × 667 mobil og selve utkastet.

## Nytt

- Adaptiv swiping med fire grader av respons og synlig profilklarhet.
- Turbrief er skilt fra varig smak.
- Kvalitativt «profiltreff» i stedet for et ubekreftet presisjonsløfte i prosent.
- Lagre/fjern tips, egen lagret-side og lokal persistens.
- Resultatfeedback: bra tips, ikke relevant, har vært og feil/stengt.
- Faktiske starttips med offisielle kilder og kartlenker for Lisboa, Oslo, Barcelona og Tokyo.
- Søkbare kartforslag for andre destinasjoner når live-backend ikke svarer.
- Versjonert V3-lokaltilstand med validering og migrering fra V2-nøkler.
- Frontend delt i app-, UI-, lagrings-, API- og katalogmoduler.
- Restaurantdekket redusert fra 100 til 80 aktive kort ved å fjerne 20 eksakte gjentakelser.
- Automatisk kortaudit for ID-er, oversettelser, duplikater, kategorier og dekkstørrelse.
- Nummererte SQLite-migreringer, WAL/busy-timeout, sesjoner, anbefalingskjøringer og resultatfeedback.
- FastAPI lifespan i stedet for utfaset startup-hook, utvidet health og kjørelogging.
- Ett oppsettskript og ett startskript for Windows.

## Ikke i denne versjonen

- Brukerkonto, delt profil eller sosial matching.
- Samarbeidsfiltrering eller kontekstuell bandit; feedbackgrunnlaget må først samles inn.
- Produkter og andre vertikaler i UI. Dataskillet mellom mode, profil, kontekst og resultater gjør dette til en kontrollert senere utvidelse.
- Produksjonskalibrert treffscore, booking og full redaksjonell verifisering av alle destinasjoner.
