# Mobilbygg: PWA først, deretter Capacitor

## 1. PWA

Produksjonsbygget inneholder web app manifest, 192/512 px ikoner, maskable-ikon, Apple touch-ikon og service worker. Service worker brukes bare i webversjonen, ikke inne i den native Capacitor-containeren.

```powershell
npm install
npm run build
.\start-pwa-test.ps1
```

For installasjon på telefon må `docs/` publiseres på HTTPS, for eksempel til den eksisterende GitHub Pages-adressen. Oppdater `PUBLIC_APP_URL`, canonical/OG-adresse og backend-CORS dersom produksjonsadressen endres.

## 2. Synkroniser native prosjekter

```powershell
npm install
npm run assets:generate
npm run cap:sync
```

`cap:sync` retter også Windows-genererte Swift Package Manager-stier til portable `/`-stier, slik at ZIP-en kan åpnes på macOS.

Capacitor-app-ID er `com.travelswish.app`. Native versjon er `0.4.0` med Android versionCode 4 og iOS build 1.

### Android

Krever Node 22+, Java 21, Android Studio og Android SDK 36. Prosjektets minSdk er 24.

```powershell
npm run cap:android
```

Velg en emulator eller fysisk enhet i Android Studio. Bruk `assembleDebug`/Run for test og en signert Android App Bundle for Play Store senere.

### iOS

Krever macOS, Xcode og en Apple-utviklerkonto for enhetsbygg/signering.

```bash
npm install
npm run cap:ios
```

Velg team og bundle-ID i Xcode, og test først i simulator og deretter på fysisk iPhone. Swift Package Manager kobler inn Capacitor Share-pluginen.

## Deling som vekstmekanisme

- **Del treff** deler navn, begrunnelse, eventuell stedlenke og Travel Swipe-lenken.
- **Del mine treff** deler inntil seks navn og Travel Swipe-lenken.
- Lenken bruker `utm_source=user_share`, `utm_medium=social` og egen campaign for enkeltresultat/kortliste.
- På iOS/Android åpnes systemets delingsark. Bare apper brukeren har installert og som godtar innholdet vises.
- Web Share brukes i støttede nettlesere; ellers kopieres teksten, med manuell kopi som siste sikkerhetsnett.
- Appen forhåndsvelger aldri mottaker og publiserer aldri automatisk.

Før offentlig lansering bør analyseplattformen registrere landing med disse UTM-verdiene, og delingslenken bør peke til en egen offentlig landingsside med App Store-/Google Play-lenker.
