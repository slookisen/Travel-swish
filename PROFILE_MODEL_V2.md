# Profilmodell V2
Dette dokumentet beskriver modellen som er implementert i `src/profile/engine.ts`.

## 1. To slags informasjon

### Langsiktig smak

Læres fra kort og kan korrigeres per akse. Den består av ni eksisterende dimensjoner:

`adv`, `soc`, `lux`, `act`, `cul`, `nat`, `food`, `night`, `spont`.

Hver dimensjon har:

- `value` i intervallet `[-1, 1]`;
- `confidence` i intervallet `[0, 1]`;
- `evidence`, den akkumulerte signalstyrken.

### Turkontekst

Gjelder den aktive turen og endrer ikke den langsiktige profilen:

- `party`: solo, par, venner eller familie;
- `pace`: rolig, balansert eller fullt program;
- `budget`: verdi, fleksibelt eller premium;
- `discovery`: klassikere, miks eller skjulte funn.

## 2. Reaksjoner

| Reaksjon | Vekt | Tolkning |
|---|---:|---|
| Elsker | `+1.20` | sterkt positivt signal |
| Ja | `+0.70` | moderat positivt signal |
| Usikker | `0.00` | eksponering uten smakskonklusjon |
| Ikke meg | `-0.55` | forsiktig negativt signal |

Negative reaksjoner påvirker bare kortets tre sterkeste akser. Dette reduserer risikoen for at ett avslag på et sammensatt kort inverterer hele profilen.

## 3. Oppdatering av dimensjoner

For hver relevant dimensjon `d` på et kort:

```text
numerator[d] += reactionWeight × cardDimension[d]
evidence[d]  += |reactionWeight| × |cardDimension[d]|
```

Verdien krympes mot nøytral når det finnes lite belegg:

```text
value[d] = clamp(numerator[d] / (evidence[d] + 1.8), -1, 1)
```

Sikkerhet vokser gradvis:

```text
confidence[d] = 1 - exp(-evidence[d] / 4.2)
```

Dette er ikke en full sannsynlighetsmodell, men gir ønsket egenskap for en forklarbar draft: få signaler skal aldri se sikre ut.

## 4. Manuell korrigering

En korreksjon legges inn som `4.5` evidensenheter. Den veier derfor mer enn ett kort, men sletter ikke historien. Brukeren kan fjerne korreksjonen og gå tilbake til den lærte verdien.

## 5. Kategorier

Kategorier beregnes separat med samme reaksjonsvekt og prior `1.2`. De brukes til mer presise søk og til å forklare smaken, mens de ni dimensjonene gir et stabilt felles språk mellom opplevelser og restauranter.

## 6. Profilklarhet

Klarhet er en produktscore, ikke en statistisk sannsynlighet:

```text
readiness =
  0.52 × gjennomsnittlig dimensjonssikkerhet
  + 0.28 × min(1, kategoridekning / 6)
  + 0.20 × min(1, tydelige_svar / 8)
```

Første anbefaling åpnes når:

- minst fem svar har positiv eller negativ retning; og
- `readiness >= 0.31`.

Brukeren kan alltid fortsette å svare.

## 7. Adaptivt kortvalg

Hvert usett kort får en forklarbar nyttescore fra:

1. dekning av dimensjoner med lav sikkerhet;
2. bonus for en kategori som ikke er utforsket;
3. diskriminerende styrke i kortets dimensjoner;
4. liten bonus for å teste allerede sterke preferanser;
5. deterministisk jitter for variasjon.

Kortet med høyest score vises neste gang. Dette er en lokal heuristikk; produksjonsversjonen bør logge eksponeringssannsynlighet før den erstattes av en lærende policy.

## 8. Backend-payload

Frontend sender nedkrympede `prefs` til eksisterende `/prefs` og følgende `taste` til `/recs/web`:

```json
{
  "version": 2,
  "cats": { "nature": 0.44, "culture": 0.21 },
  "confidence": { "nat": 0.62, "cul": 0.38 },
  "context": {
    "party": "couple",
    "pace": "slow",
    "budget": "value",
    "discovery": "hidden"
  },
  "totalSignals": 7,
  "readiness": 0.48
}
```

Backend bruker:

- `prefs` og `cats` for kandidater og personlig relevans;
- `context` for den aktive turen;
- ikke `confidence` direkte ennå, fordi `prefs` allerede er krympet mot nøytral.

## 9. Neste modellsteg

- Legg til eksplisitt feedback på anbefalinger.
- Skill «ikke interessert» fra «passer ikke nå».
- Legg inn tidsforfall for gamle signaler etter brukertesting.
- Modeller parvise trade-offs som «rolig natur» mot «aktiv natur».
- Kalibrer matchvisning mot observerte valg.
- Lag en egen gruppeprofil når flere reisende kan svare individuelt.
