# Research: profilsøk, hotell, arrangerte turer og raskere resultater

Dato: 24. august 2026
Beslutningsnivå: V0.6-produktvalg og videre produksjonsretning

## Konklusjon

Profilen kan gi betydelig verdi utenfor opplevelser og restauranter, men den bør være et rangeringslag — ikke en antakelse om at samme preferanse betyr det samme i alle kategorier. V0.6 bruker derfor den etablerte smaksprofilen sammen med midlertidige, søkespesifikke valg. Dette gir en enkel opplevelse nå og et ryddig grunnlag for strukturerte leverandør-API-er senere.

Automatisk klargjøring av neste utvalg er teknisk riktig for brukeropplevelsen, men leverandørvilkårene avgjør hva som kan hentes og lagres. Implementasjonen forhåndslaster derfor kun Brave-resultater i flyktig prosessminne. Google Places brukes på forespørsel og lagres ikke.

## 1. Neste utvalg uten venting

### Vurdering

Den viktigste opplevde ytelsen er tiden fra «Nytt utvalg» til nye kort. Flere søk er uavhengige og kan kjøres parallelt, mens et påfølgende utvalg kan lages så snart første er vist. Et forhåndslastet utvalg må samtidig være knyttet til nøyaktig samme reisemål, profil og søkebehov, ellers kan det serveres utdaterte treff.

### Implementert

- Bounded fan-out med maksimalt fire parallelle provider-spørringer.
- Kortlivet prefetch-token bundet til en SHA-256-signatur av bruker, reisemål, søketype, fritekst, turkontekst, preferanser og smaksprofil.
- Tokenet utløper etter tre minutter, kan bare brukes én gang og lagres ikke i SQLite.
- Eksisterende resultat-ID-er sendes som eksklusjoner for å redusere gjentakelser.
- Klienten poller kun lett status og viser «Neste utvalg er klart» når det kan åpnes umiddelbart.

### Leverandørhensyn

Google Maps Platforms retningslinjer begrenser prefetch, caching og lagring av Places-innhold; Place ID er det sentrale lagringsunntaket. Brave Search API oppgir også at lagring/caching av resultater krever en plan som gir slike rettigheter. Derfor er Google-prefetch slått av, Brave-diskcache deaktivert som standard, og den nye køen er transient.

Kilder: [Google Places policy](https://developers.google.com/maps/documentation/places/web-service/policies), [Brave Search API](https://brave.com/search/api/), [Brave Search API terms](https://api-dashboard.search.brave.com/terms-of-service).

## 2. Offisiell hjemmeside direkte fra resultatkortet

Google Places Text Search kan returnere både `websiteUri` og `googleMapsUri` gjennom feltmasken. De dekker to forskjellige behov: hjemmesiden forklarer stedet og kan gi booking, meny eller program; kartlenken gir navigasjon, vurderinger og åpningstider.

V0.6 beholder derfor feltene separat gjennom hele backend- og klientkjeden. URL-er godtas bare som HTTP/HTTPS i klienten. Hvis Google ikke har en hjemmeside, vises bare kartknappen. Brave-webtreff betegnes som kilde og utgis ikke for å være verifisert offisiell hjemmeside.

Kilder: [Google Places Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search), [Google Places types](https://developers.google.com/maps/documentation/places/web-service/place-types).

## 3. Hotell med den eksisterende profilen

### Hva profilen kan bidra med

- natur → naturnær beliggenhet, utsikt, eco lodge;
- mat → sterk frokost eller gastronomiprofil;
- sosial → sosiale fellesområder og mindre overnattingssteder;
- luksus/ro → boutique, spa og premium;
- aktivitet → base nær tur- og aktivitetsmuligheter;
- oppdagelse → lokale, uavhengige eller særpregede steder.

Dette er nyttige rangeringssignaler, men live pris, romtilgjengelighet, avbestillingsvilkår og skatt kan ikke utledes fra generelt web- eller Places-søk. Betaversjonen omtaler derfor treffene som hotellforslag, ikke bestillbar tilgjengelighet.

For produksjon anbefales Booking.com Demand API eller Expedia Rapid. Begge tilbyr strukturert overnattingsinnhold og tilgjengelighet/pris innenfor partnerprogram; partnerkrav og kommersielle vilkår må avklares før integrasjon.

Kilder: [Booking.com Demand – search accommodations](https://developers.booking.com/demand/docs/accommodations/search-for-available-properties), [Booking.com accommodation API](https://developers.booking.com/demand/docs/accommodations/about-accommodation), [Expedia Rapid Lodging](https://developers.expediagroup.com/rapid/lodging).

## 4. Arrangerte turer

### Anbefalt modell

Bruk varig smaksprofil til rangering, og be om få, midlertidige valg:

- reisemål/region;
- omtrentlig varighet;
- budsjettstil;
- reisefølge;
- frivillig aldersgruppe dersom operatøren faktisk har aldersspesifikke avganger;
- et kort fritekstønske.

Yrke og forholdsstatus bør ikke gjøres til generelle profilfelt. De gir ofte svak relevans, øker personvernrisikoen og kan produsere stereotype anbefalinger. Dersom en konkret arrangør tilbyr en dokumentert tematur, kan brukeren uttrykkelig velge temaet for akkurat det søket.

TourRadar er den mest treffende videre integrasjonen for organiserte flerdagsturer: deres Distribution API beskriver strukturert innhold, søk og partnernivåer fra affiliate til full booking. Viator passer bedre som supplement for dagsturer og aktiviteter.

Kilder: [TourRadar Distribution API](https://www.tourradar.com/distribution-api), [TourRadar partner solutions](https://www.tourradar.com/partner-solutions), [Viator Partner API](https://docs.viator.com/partner-api/).

## 5. Personvern og læring

V0.6 viderefører dataminimering: rå kortsveip lagres lokalt; beregnet søkeprofil og turbrief sendes når brukeren ber om treff; søkekjøring og eksplisitt resultatfeedback kan lagres for kvalitetsmåling. Aldersgruppe og varighet i tursøk er forespørselskontekst, ikke varige profildata.

Før analyse eller konto-synk bygges videre bør produktet ha et tydelig frivillig samtykke, formål per datakategori, enkel eksport/sletting, lagringsfrister og en separat anonymisert evalueringspipeline. Dette følger prinsippene om formålsbegrensning, dataminimering, lagringsbegrensning, transparens og privacy by design.

Kilder: [EU-kommisjonen – GDPR-prinsipper](https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/principles-gdpr/overview-principles/what-data-can-we-process-and-under-which-conditions_en), [EDPB – be compliant](https://www.edpb.europa.eu/sme/be-compliant/be-compliant_en).

## Anbefalt videre rekkefølge

1. Mål treffkvalitet med eksisterende «Bra tips», «Ikke relevant», «Har vært» og «Feil/stengt» før flere profilfelt legges til.
2. Skaff TourRadar-partnertilgang og bygg strukturert turfilter med faktiske avganger og regler.
3. Velg Booking.com eller Expedia etter kommersielle vilkår og målmarked; legg deretter til tilgjengelighet og pris.
4. Flytt prefetch til delt, kortlivet lagring først når backend faktisk kjøres med flere prosesser.
5. Innfør konto/synk og frivillig analyse først sammen med komplett personvern- og slettelivsløp.
