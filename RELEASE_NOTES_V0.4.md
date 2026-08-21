# Travel Swish V0.4.0

## Nytt

- Installerbar PWA med manifest, merkevareikoner, standalone-visning og offline appskall.
- Capacitor 8-prosjekter for Android og iOS, synkronisert fra samme React/Vite-kode.
- Native/web deling av enkeltresultat og personlig kortliste.
- Sporbare markedsføringslenker med UTM-parametere.
- Sosial forhåndsvisning i Travel Swish-profil for delte lenker.
- Automatisk kopi-/manuell fallback når delings-API ikke finnes.
- Mobil safe-area-støtte for skjermhakk og hjemindikator.
- Egne app- og splash-ressurser for PWA, Android og iOS.

## Kvalitet

- Statisk PWA-kontroll av manifest, metadata og alle nødvendige ressurser.
- Runtime-test av service worker og offline gjenåpning.
- E2E-tester av swipe-kast, mobiltilpasning, profilering, fallback, språk, lagring, deling og PWA-installasjon.
- Capacitor Share er eneste native plugin i V0.4.

## Avgrensninger

- Profilen er fortsatt lokal på én enhet; konto og sikker synkronisering er neste store produktsteg.
- PWA-oppdateringen må publiseres på HTTPS før telefoninstallasjon kan testes av eksterne brukere.
- Android-prosjektet er generert, men APK krever lokalt installert Java/Android Studio/SDK.
- iOS-prosjektet må kompileres og signeres på macOS med Xcode.
- Deling åpner brukerens delingsark; den poster aldri automatisk til Instagram, Facebook eller andre tjenester.
