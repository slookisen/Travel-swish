import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AppLanguage = 'no' | 'en';

const LANGUAGE_KEY = 'travel_swish_language_v1';

export const UI_COPY = {
  no: {
    language: { label: 'Språk', no: 'Norsk', en: 'English' },
    nav: { home: 'Gå til start', saved: 'Lagret', profile: 'Smaksprofil' },
    pwa: {
      install: 'Installer app', installed: 'Appen er installert', installDismissed: 'Installasjonen ble avbrutt',
      iosTitle: 'Legg Travel Swipe på hjemskjermen', iosHelp: 'Trykk Del i Safari og velg «Legg til på Hjem-skjerm». Profilen og lagrede tips blir på denne enheten.',
    },
    landing: {
      saved: 'Lagret', profile: 'Min profil', kicker: 'ADAPTIV PROFIL · FÆRRE, BEDRE SPØRSMÅL',
      title: 'Reiser som føles', titleEm: 'som deg.',
      lead: 'Sveip på små dilemmaer. Vi skiller den varige smaken din fra behovene for akkurat denne turen — og forklarer hvert tips.',
      start: 'Finn min reisestil', explain: 'Se hvordan profilen virker',
      trust: ['Ingen konto', 'Profil du kan justere', 'Fungerer også uten live-søk'],
      previewAria: 'Eksempel på profileringskort', previewCategory: 'OPPDAGELSE', previewAdaptive: '07 / ADAPTIV',
      previewQuestion: 'En stille padletur ved soloppgang?', previewDesc: 'Rolig, aktivt og litt utenfor allfarvei.',
      previewNo: '← ikke meg', previewSwipe: 'sveip', previewLove: 'elsker →', previewNature: 'NATUR', previewReady: 'PROFILKLAR',
      principles: [
        ['Turbrief først', 'Budsjett, følge og tempo hører til reisen — ikke nødvendigvis personligheten din.'],
        ['Spør der vi er usikre', 'Neste kort velges for å lære mest, i stedet for å kreve 20 tilfeldige sveip.'],
        ['Tips du kan bruke', 'Live steder når backend svarer; kildebelagte starttips og kartlenker når den ikke gjør det.'],
      ],
    },
    brief: {
      kicker: 'FØRST: DENNE TUREN', title: 'Hva skal anbefalingene passe til?',
      lead: 'Fire raske valg gir reisen kontekst. De lagres separat fra smaken vi lærer av kortene.',
      destination: 'Hvor vil du reise?', placeholder: 'For eksempel Lisboa', modeAria: 'Hva vil du finne?',
      experiences: 'Opplevelser', experiencesDesc: 'Steder, aktiviteter og øyeblikk',
      restaurants: 'Mat og drikke', restaurantsDesc: 'Smaker, atmosfære og anledninger',
      note: 'Turbriefen påvirker denne søken, men endrer ikke den langsiktige profilen din.',
      start: 'Start kortene', continue: 'Fortsett til kortene',
    },
    context: {
      party: { label: 'Hvem reiser?', options: [['solo', 'Bare meg'], ['couple', 'To personer'], ['friends', 'Venner'], ['family', 'Familie']] },
      pace: { label: 'Ønsket tempo', options: [['slow', 'God tid'], ['balanced', 'Litt av alt'], ['full', 'Fyll dagene']] },
      budget: { label: 'Budsjettfølelse', options: [['value', 'Mest for pengene'], ['balanced', 'Fleksibelt'], ['premium', 'Gjerne premium']] },
      discovery: { label: 'Hva vil du finne?', options: [['icons', 'Klassikerne'], ['mix', 'En god miks'], ['hidden', 'Skjulte funn']] },
    },
    swipe: {
      kicker: 'ADAPTIV PROFILERING', readyTitle: 'Profilen er klar.', questionTitle: 'Hva føles riktig for deg?',
      signals: 'tydelige signaler', readyProgress: 'Nok variasjon til å lage første anbefaling',
      learningProgress: 'Vi spør på tvers av områder til profilen har nok dekning',
      readyKicker: 'Første profil klar', needsVariety: 'Vi mangler litt variasjon',
      findIn: (destination: string) => `Finn treff i ${destination}`,
      answersLeft: (count: number) => `${count} tydelige svar til, omtrent`,
      searching: 'Leter…', seeMatches: 'Se mine treff', deckDone: 'Du har sett hele kortstokken.',
      deckDoneDesc: 'Profilen kan fortsatt justeres manuelt.', keyboard: 'Tastatur: ← ikke meg · ↓ usikker · ↑ ja · → elsker',
      dragHint: 'dra for å svare', verdictNo: 'IKKE MEG', verdictLove: 'ELSKER', answerAria: 'Svar på kortet',
      dislike: 'Ikke meg', unsure: 'Usikker', like: 'Ja', love: 'Elsker',
      promptKicker: 'PROFILEN ER KLAR NOK', promptTitle: 'Vil du se treffene dine nå?',
      promptLead: (destination: string) => `Du har gitt nok varierte svar til et godt første utvalg${destination ? ` i ${destination}` : ''}. Du kan alltid finjustere senere.`,
      keepSwiping: 'Fortsett å finjustere', promptAction: 'Vis treffene nå',
    },
    profile: {
      kicker: 'TRANSPARENT PROFIL', title: 'Din smak, med rom for å endre mening.',
      lead: 'Hver akse viser både retning og hvor mye belegg vi har. Manuelle justeringer veier tungt, men kan nullstilles.',
      readiness: 'PROFILKLARHET', goodStart: 'Godt første bilde', early: 'Fortsatt i startfasen',
      clearAnswers: 'tydelige svar', unsure: 'usikre', explored: 'områder utforsket', positive: 'positive smaksfelt', saved: 'lagrede tips',
      activeBrief: 'AKTIV TURBRIEF', noDestination: 'Ingen destinasjon valgt', changeBrief: 'Endre turbrief →',
      axes: 'PREFERANSEAKSER', adjust: 'Juster det vi har lært', neutral: 'Midten er nøytral. ↺ fjerner din manuelle justering.',
      delete: 'Slett alle lokale data', moreCards: 'Svar på flere kort', find: 'Finn treff',
      confirmDelete: 'Vil du slette profil, lagrede tips og tilbakemeldinger på denne enheten?',
      panelKicker: 'LEVENDE PROFIL', learning: 'Dette lærer vi', areas: 'områder', strongest: 'Sterkeste kategorier',
      open: 'Se og juster hele profilen →', privacy: 'Kort-svarene blir på enheten. Søkeprofil og frivillig tilbakemelding sendes når du ber om tips.',
      empty: 'Svar på noen kort, så vokser profilen frem her.', adjustAxis: 'Juster', learnedAxis: 'Bruk lærte data for', confidence: 'sikker',
      confidenceStrong: 'tydelig signal', confidenceGrowing: 'på vei', confidenceExploring: 'utforsker',
    },
    results: {
      personal: 'PERSONLIG UTVALG', food: 'MAT OG DRIKKE', experiences: 'OPPLEVELSER', hotels: 'HOTELLER', tours: 'ARRANGERTE TURER', custom: 'FRITT SØK',
      matchesFor: 'Treff for', lead: 'Rangert med både smak, modellsikkerhet og behovene for denne turen.', adjust: 'Juster profil',
      liveNotice: 'Live tips er hentet og rangert etter smaksprofilen og turbriefen. Sjekk alltid åpningstider før du drar.',
      prefetchedNotice: 'Neste utvalg var klart på forhånd og ble vist uten et nytt, langt søk. Vi klargjør nå enda et utvalg i bakgrunnen.',
      fallbackNotice: 'Livesøket svarte ikke. Du ser nå offline starttips: kuraterte forslag har en separat offisiell kilde, mens generiske forslag bare åpner et søk i kart. Sjekk ferske åpningstider før du drar.',
      discoveryUnavailable: 'Dette profilsøket svarte ikke akkurat nå. Dine forrige treff er beholdt, så du kan prøve igjen uten å miste dem.',
      another: 'Vil du ha et annet uttrykk?', everyAnswer: 'Hvert nytt svar oppdaterer profil og rangering.', refine: 'Finjuster med kort', newSelection: 'Nytt utvalg',
      nextReady: 'Neste utvalg er klart', nextPreparing: 'Neste utvalg klargjøres i bakgrunnen…', nextOnDemand: 'Neste utvalg lages når du ber om det', showNext: 'Vis neste utvalg',
      discoveryTitle: 'Finn mer med profilen din', discoverySummary: 'Hotell, arrangerte turer eller noe helt annet',
      discoveryLead: 'Vi bruker den samme smaksprofilen, men lar behovet for dette søket være midlertidig.', discoveryKindAria: 'Velg hva du vil søke etter',
      customLabel: 'Hva vil du finne?', optionalWish: 'Ekstra ønske (valgfritt)', hotelPlaceholder: 'For eksempel boutiquehotell med god frokost', tourPlaceholder: 'For eksempel aktiv gruppetur i Portugal', customPlaceholder: 'For eksempel vintagebutikker eller keramikkurs',
      ageBand: 'Aldersgruppe', duration: 'Varighet', anyOption: 'Spiller ingen rolle', weekend: 'Helg', oneWeek: 'Omtrent én uke', twoWeeks: '10–14 dager',
      requestOnly: 'Disse valgene brukes bare i dette søket og blir ikke del av den varige profilen.', searchWithProfile: 'Søk med profilen',
      shortlist: 'DIN KORTE LISTE', savedTitle: 'Lagrede tips', savedLead: 'Behold de beste ideene på denne enheten mens du planlegger.',
      back: 'Tilbake', emptySaved: 'Ingen lagrede tips ennå', emptySavedDesc: 'Trykk «Lagre» på et resultat, så dukker det opp her.', findTips: 'Finn tips',
      curated: 'Kurert starttips', google: 'Google Places', web: 'Webtreff', live: 'Live treff', suggestion: 'forslag',
      officialSource: 'Offisiell kilde ↗', officialWebsite: 'Hjemmeside ↗', mapsSearch: 'Søk i kart ↗', openPlace: 'Åpne i kart ↗', sourceLink: 'Åpne kilde ↗',
      saved: '♥ Lagret', save: '♡ Lagre', removeSave: 'Fjern lagring av', saveAria: 'Lagre', profileMatch: 'profiltreff',
      feedbackAria: 'Tilbakemelding på', helped: 'Hjalp tipset?', useful: 'Bra tips', irrelevant: 'Ikke relevant', visited: 'Har vært', wrong: 'Feil/stengt',
      shareResult: 'Del treff', shareResultAria: 'Del', shareList: 'Del mine treff', shareDialog: 'Del med venner',
      shareShared: 'Delingsvinduet er åpnet', shareCopied: 'Delingsteksten er kopiert',
      shareManualTitle: 'Del Travel Swipe', shareManualHelp: 'Kopier teksten og lim den inn der du vil dele.', copyShare: 'Kopier tekst', copied: 'Kopiert', close: 'Lukk',
      matchExcellent: 'Svært sterkt treff', matchStrong: 'Sterkt treff', matchGood: 'Godt alternativ', matchExplore: 'Verdt å utforske',
    },
  },
  en: {
    language: { label: 'Language', no: 'Norwegian', en: 'English' },
    nav: { home: 'Go to home', saved: 'Saved', profile: 'Taste profile' },
    pwa: {
      install: 'Install app', installed: 'The app is installed', installDismissed: 'Installation was dismissed',
      iosTitle: 'Add Travel Swipe to your Home Screen', iosHelp: 'Tap Share in Safari and choose “Add to Home Screen”. Your profile and saved tips stay on this device.',
    },
    landing: {
      saved: 'Saved', profile: 'My profile', kicker: 'ADAPTIVE PROFILE · FEWER, BETTER QUESTIONS',
      title: 'Trips that feel', titleEm: 'like you.',
      lead: 'Swipe on quick dilemmas. We separate your lasting taste from the needs of this particular trip — and explain every recommendation.',
      start: 'Find my travel style', explain: 'See how the profile works',
      trust: ['No account required', 'A profile you can adjust', 'Works without live search'],
      previewAria: 'Example profiling card', previewCategory: 'DISCOVERY', previewAdaptive: '07 / ADAPTIVE',
      previewQuestion: 'A quiet paddle at sunrise?', previewDesc: 'Calm, active and a little off the beaten path.',
      previewNo: '← not me', previewSwipe: 'swipe', previewLove: 'love it →', previewNature: 'NATURE', previewReady: 'PROFILE READY',
      principles: [
        ['Trip brief first', 'Budget, company and pace belong to this trip — not necessarily to your personality.'],
        ['Ask where we are uncertain', 'The next card is chosen to teach us the most instead of demanding 20 random swipes.'],
        ['Recommendations you can use', 'Live places when the service responds; sourced starter ideas and map links when it does not.'],
      ],
    },
    brief: {
      kicker: 'FIRST: THIS TRIP', title: 'What should the recommendations fit?',
      lead: 'Four quick choices give the trip context. They are stored separately from the taste learned from your cards.',
      destination: 'Where are you going?', placeholder: 'For example Lisbon', modeAria: 'What do you want to find?',
      experiences: 'Experiences', experiencesDesc: 'Places, activities and moments',
      restaurants: 'Food and drink', restaurantsDesc: 'Flavours, atmosphere and occasions',
      note: 'The trip brief affects this search but does not change your long-term profile.',
      start: 'Start the cards', continue: 'Continue to the cards',
    },
    context: {
      party: { label: 'Who is travelling?', options: [['solo', 'Just me'], ['couple', 'Two people'], ['friends', 'Friends'], ['family', 'Family']] },
      pace: { label: 'Preferred pace', options: [['slow', 'Take it easy'], ['balanced', 'A bit of everything'], ['full', 'Fill the days']] },
      budget: { label: 'Budget style', options: [['value', 'Best value'], ['balanced', 'Flexible'], ['premium', 'Happy to go premium']] },
      discovery: { label: 'What do you want to find?', options: [['icons', 'The classics'], ['mix', 'A good mix'], ['hidden', 'Hidden gems']] },
    },
    swipe: {
      kicker: 'ADAPTIVE PROFILING', readyTitle: 'Your profile is ready.', questionTitle: 'What feels right for you?',
      signals: 'clear signals', readyProgress: 'Enough variety for your first recommendations',
      learningProgress: 'We explore different areas until the profile has enough coverage',
      readyKicker: 'First profile ready', needsVariety: 'We need a little more variety',
      findIn: (destination: string) => `Find matches in ${destination}`,
      answersLeft: (count: number) => `About ${count} more clear answers`,
      searching: 'Searching…', seeMatches: 'See my matches', deckDone: 'You have seen the whole deck.',
      deckDoneDesc: 'You can still adjust the profile manually.', keyboard: 'Keyboard: ← not me · ↓ unsure · ↑ yes · → love it',
      dragHint: 'drag to answer', verdictNo: 'NOT ME', verdictLove: 'LOVE IT', answerAria: 'Answer the card',
      dislike: 'Not me', unsure: 'Unsure', like: 'Yes', love: 'Love it',
      promptKicker: 'YOUR PROFILE IS READY', promptTitle: 'See your matches now?',
      promptLead: (destination: string) => `You have given enough varied answers for a useful first selection${destination ? ` in ${destination}` : ''}. You can always refine it later.`,
      keepSwiping: 'Keep refining', promptAction: 'Show matches now',
    },
    profile: {
      kicker: 'TRANSPARENT PROFILE', title: 'Your taste, with room to change your mind.',
      lead: 'Each axis shows both direction and how much evidence we have. Manual adjustments count strongly and can be reset.',
      readiness: 'PROFILE READINESS', goodStart: 'A solid first picture', early: 'Still getting started',
      clearAnswers: 'clear answers', unsure: 'unsure', explored: 'areas explored', positive: 'positive taste fields', saved: 'saved tips',
      activeBrief: 'ACTIVE TRIP BRIEF', noDestination: 'No destination selected', changeBrief: 'Change trip brief →',
      axes: 'PREFERENCE AXES', adjust: 'Adjust what we have learned', neutral: 'The middle is neutral. ↺ removes your manual adjustment.',
      delete: 'Delete all local data', moreCards: 'Answer more cards', find: 'Find matches',
      confirmDelete: 'Delete the profile, saved tips and feedback stored on this device?',
      panelKicker: 'LIVE PROFILE', learning: 'What we are learning', areas: 'areas', strongest: 'Strongest categories',
      open: 'View and adjust the full profile →', privacy: 'Card answers stay on this device. Your search profile and optional feedback are sent when you request recommendations.',
      empty: 'Answer a few cards and your profile will grow here.', adjustAxis: 'Adjust', learnedAxis: 'Use learned data for', confidence: 'confidence',
      confidenceStrong: 'clear signal', confidenceGrowing: 'taking shape', confidenceExploring: 'exploring',
    },
    results: {
      personal: 'PERSONAL SELECTION', food: 'FOOD AND DRINK', experiences: 'EXPERIENCES', hotels: 'HOTELS', tours: 'ORGANIZED TOURS', custom: 'OPEN SEARCH',
      matchesFor: 'Matches for', lead: 'Ranked using your taste, model confidence and the needs of this trip.', adjust: 'Adjust profile',
      liveNotice: 'Live recommendations were retrieved and ranked using your taste profile and trip brief. Always check current opening hours before you go.',
      prefetchedNotice: 'Your next selection was prepared in advance and appeared without another long search. We are now preparing one more in the background.',
      fallbackNotice: 'Live search did not respond. You are seeing offline starter ideas: curated suggestions have a separate official source, while generic suggestions only open a map search. Check current opening hours before you go.',
      discoveryUnavailable: 'This profile search did not respond just now. Your previous results are still here, so you can retry without losing them.',
      another: 'Want a different angle?', everyAnswer: 'Every new answer updates your profile and ranking.', refine: 'Refine with cards', newSelection: 'New selection',
      nextReady: 'Your next selection is ready', nextPreparing: 'Preparing your next selection in the background…', nextOnDemand: 'The next selection will be made on demand', showNext: 'Show next selection',
      discoveryTitle: 'Find more with your profile', discoverySummary: 'Hotels, organized tours or anything else',
      discoveryLead: 'We reuse your taste profile while keeping the need for this search temporary.', discoveryKindAria: 'Choose what to search for',
      customLabel: 'What do you want to find?', optionalWish: 'Extra preference (optional)', hotelPlaceholder: 'For example a boutique hotel with a great breakfast', tourPlaceholder: 'For example an active group tour in Portugal', customPlaceholder: 'For example vintage shops or pottery classes',
      ageBand: 'Age band', duration: 'Duration', anyOption: 'No preference', weekend: 'Weekend', oneWeek: 'About one week', twoWeeks: '10–14 days',
      requestOnly: 'These choices are used only for this search and are not added to your lasting profile.', searchWithProfile: 'Search with my profile',
      shortlist: 'YOUR SHORTLIST', savedTitle: 'Saved tips', savedLead: 'Keep your best ideas on this device while you plan.',
      back: 'Back', emptySaved: 'No saved tips yet', emptySavedDesc: 'Select “Save” on a result and it will appear here.', findTips: 'Find tips',
      curated: 'Curated starter tip', google: 'Google Places', web: 'Web result', live: 'Live result', suggestion: 'suggestion',
      officialSource: 'Official source ↗', officialWebsite: 'Website ↗', mapsSearch: 'Search in Maps ↗', openPlace: 'Open in Maps ↗', sourceLink: 'Open source ↗',
      saved: '♥ Saved', save: '♡ Save', removeSave: 'Remove saved', saveAria: 'Save', profileMatch: 'profile match',
      feedbackAria: 'Feedback on', helped: 'Was this useful?', useful: 'Good tip', irrelevant: 'Not relevant', visited: 'Visited', wrong: 'Wrong/closed',
      shareResult: 'Share match', shareResultAria: 'Share', shareList: 'Share my matches', shareDialog: 'Share with friends',
      shareShared: 'The share sheet is open', shareCopied: 'Share text copied',
      shareManualTitle: 'Share Travel Swipe', shareManualHelp: 'Copy the text and paste it wherever you want to share.', copyShare: 'Copy text', copied: 'Copied', close: 'Close',
      matchExcellent: 'Excellent match', matchStrong: 'Strong match', matchGood: 'Good option', matchExplore: 'Worth exploring',
    },
  },
} as const;

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  copy: (typeof UI_COPY)[AppLanguage];
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function initialLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'no';
  const saved = window.localStorage.getItem(LANGUAGE_KEY);
  return saved === 'en' || saved === 'no' ? saved : 'no';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>(initialLanguage);
  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language === 'no' ? 'nb' : 'en';
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, copy: UI_COPY[language] }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider');
  return value;
}
