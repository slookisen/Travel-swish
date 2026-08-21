# Test Travel Swish V0.4.0

## Start appen

Første gang:

```powershell
.\setup-test.ps1
```

Deretter:

```powershell
.\start-test.ps1
```

Åpne `http://127.0.0.1:5173/Travel-swish/`. Ctrl+C stopper frontend. Standard oppsett bruker hostet livesøk og krever ikke Python.

## Anbefalt 20-minutters test

1. Velg **Lisboa**, **Opplevelser**, rolig tempo og skjulte funn.
2. Sveip med alle fire svarene. Legg merke til om neste kort varierer kategori.
3. Fortsett til knappen **Se mine treff** blir aktiv, normalt etter 5–10 tydelige svar.
4. Les begrunnelsene. Sjekk at de henger sammen med svar og turbrief.
5. Åpne kilde og kart for minst to tips. Appen skal aldri finne på åpningstider.
6. Lagre to tips og gi ett «Bra tips» og ett «Ikke relevant».
7. Åpne **Lagret**, last siden på nytt, og sjekk at profil og lagrede tips fortsatt finnes.
8. Bytt til **Oslo** og **Mat og drikke**. Svar på noen kort og vurder om resultatene faktisk endrer karakter.
9. Åpne **Smaksprofil**, flytt én akse manuelt, og lag et nytt utvalg.
10. Bytt til **EN**. Kontroller landing, turbrief, kort, profil og resultater, og last siden på nytt for å sjekke at English huskes.
11. Trykk **Del treff** på ett resultat. Kontroller at telefonens/nettleserens delingsvindu åpnes, og at teksten inneholder treffet og en Travel Swish-lenke.
12. Trykk **Del mine treff** og kontroller at inntil seks resultater er med. Avbryt delingen og sjekk at ingenting blir publisert automatisk.
13. Trykk **Delete all local data** til slutt dersom du vil starte neste test helt rent.

## Test PWA-installasjon

Kjør `./start-pwa-test.ps1` og åpne `http://127.0.0.1:4173/Travel-swish/` i Chrome eller Edge på PC-en. Bruk nettleserens installeringsvalg eller knappen **Installer app** når den vises. Start den installerte appen, sveip noen kort, slå av nettverket og last appen på nytt. Appskallet skal starte offline; live-søk trenger fremdeles nett.

PWA-installasjon på en fysisk telefon krever en HTTPS-adresse, for eksempel publisert GitHub Pages. En vanlig `http://192.168...`-adresse fra PC-en er egnet til visuell testing, men regnes ikke som sikker opprinnelse for installasjon/service worker.

## Det viktigste å notere

- Hvilket kort føltes uklart, gjentakende eller kjedelig?
- Når føltes profilen riktig eller feil?
- Hvilket tips ville du faktisk brukt, og hvorfor?
- Hvilket tips var irrelevant, feil eller for generisk?
- Var fem–ti tydelige svar passe før første resultat?
- Var «Elsker / Ja / Usikker / Ikke meg» lett å forstå?

## Live eller fallback?

En grønn/informativ melding om at live tips er hentet betyr at Google Places eller Brave svarte. Meldingen «Livesøket svarte ikke» betyr at du ser offline starttips. Kuraterte tips har både offisiell kilde og kartlenke; generiske tips har bare én kart-søkelenke. Appen skal aldri presentere fallback som live.

Vil du teste helt lokalt, kjør `.\setup-test.ps1 -WithLocalBackend` og deretter `.\start-test.ps1 -UseLocalBackend`. Uten lokale søkenøkler vil denne varianten bruke fallback.

## Kjente avgrensninger

- Ingen konto eller synkronisering mellom enheter.
- Ingen direkte innlogging eller autopublisering til sosiale medier. Deling bruker operativsystemets delingsmeny.
- Den native Android-versjonen må bygges i Android Studio. iOS-versjonen må bygges og signeres på en Mac med Xcode.
- Ingen booking, ruteplan eller verifiserte sanntidspriser.
- Norsk og engelsk UI er med. Svensk korttekst finnes delvis i datasettet, men svensk UI er ikke aktivert.
- Resultatfeedback lagres lokalt og sendes til backend bare når den er tilgjengelig.
- Katalogen er et sikkerhetsnett, ikke en erstatning for live stedssøk i produksjon.
