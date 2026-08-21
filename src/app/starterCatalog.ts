import { DIMS, type DimId, type Mode } from '../dataset';
import type { PreferenceProfile, TripContext } from '../profile/engine';
import { getDimLabels } from '../profile/labels';
import type { ResultItem } from './types';
import type { AppLanguage } from './i18n';

type StarterTip = {
  id: string;
  cities: string[];
  mode: Mode;
  name: string;
  cat: string;
  summary: string;
  sourceUrl: string;
  search: string;
  dims: Partial<Record<DimId, number>>;
  discovery?: TripContext['discovery'][];
  budget?: TripContext['budget'][];
  pace?: TripContext['pace'][];
};

// Stable places and neighbourhood-scale ideas from official destination guides.
// No opening hours or prices are copied: the link is the source of truth before a visit.
const TIPS: StarterTip[] = [
  { id: 'lisboa-alfama', cities: ['lisboa', 'lisbon'], mode: 'experiences', name: 'Alfama og Mouraria til fots', cat: 'culture', summary: 'Følg de historiske gatene, utsiktspunktene og sporene etter fado i Lisboas eldste nabolag.', sourceUrl: 'https://www.visitlisboa.com/en/lisbon-stories/1-route-fado/pois', search: 'Alfama Mouraria Lisbon', dims: { cul: 1, act: .45, spont: .65, soc: .25 }, discovery: ['mix', 'hidden'] },
  { id: 'lisboa-graca', cities: ['lisboa', 'lisbon'], mode: 'experiences', name: 'Graça og Miradouro Sophia', cat: 'nature', summary: 'En byvandring opp til en roligere utsikt over slottet og sentrum.', sourceUrl: 'https://www.visitlisboa.com/en/lisbon-stories/1-route-fado/pois', search: 'Miradouro Sophia de Mello Breyner Andresen Lisbon', dims: { nat: .65, act: .7, cul: .55, spont: .55 }, pace: ['slow', 'balanced'] },
  { id: 'lisboa-belem', cities: ['lisboa', 'lisbon'], mode: 'experiences', name: 'Belém som kulturhalvdag', cat: 'culture', summary: 'Sett av en halvdag til elvefronten, monumentene og nabolagets historie.', sourceUrl: 'https://www.visitlisboa.com/en/p/historic-neighbourhoods', search: 'Belem Lisbon attractions', dims: { cul: 1, act: .35, lux: .2, nat: .25 }, discovery: ['icons', 'mix'] },
  { id: 'lisboa-lx', cities: ['lisboa', 'lisbon'], mode: 'experiences', name: 'LX Factory og Alcântara', cat: 'shopping', summary: 'Industriarkitektur, små butikker, gatekunst og steder å ta en pause samlet i ett område.', sourceUrl: 'https://www.visitlisboa.com/en/lisbon-stories/5-rota-da-arquitectura-industrial/pois', search: 'LX Factory Lisbon', dims: { cul: .55, food: .45, spont: .8, soc: .45 }, discovery: ['mix', 'hidden'] },
  { id: 'lisboa-ribeira', cities: ['lisboa', 'lisbon'], mode: 'restaurants', name: 'Mercado da Ribeira', cat: 'local', summary: 'Bruk mathallen som en enkel smaksrunde med både portugisiske klassikere og nyere kjøkken.', sourceUrl: 'https://www.visitlisboa.com/en/lisbon-stories/1-route-fado/pois', search: 'Mercado da Ribeira Lisbon', dims: { food: 1, soc: .7, cul: .55, spont: .65 }, pace: ['balanced', 'full'] },
  { id: 'lisboa-nata', cities: ['lisboa', 'lisbon'], mode: 'restaurants', name: 'Pastel de nata og bica', cat: 'dessert', summary: 'Gjør kaffepausen til en liten sammenligning av varme pastéis de nata på tvers av byen.', sourceUrl: 'https://www.visitlisboa.com/en/p/Gastronomy-Flavours', search: 'pastel de nata Lisbon', dims: { food: .85, cul: .7, spont: .6, lux: -.35 }, budget: ['value', 'balanced'] },
  { id: 'lisboa-fado-dinner', cities: ['lisboa', 'lisbon'], mode: 'restaurants', name: 'Fadokveld i Alfama', cat: 'ambience', summary: 'Kombiner portugisisk mat med fado; sjekk program og bestilling hos stedet før du går.', sourceUrl: 'https://www.visitlisboa.com/en/lisbon-stories/1-rota-do-fado/pois', search: 'fado dinner Alfama Lisbon', dims: { food: .65, cul: 1, night: .8, soc: .55, lux: .35 }, pace: ['slow', 'balanced'] },
  { id: 'lisboa-local-flavours', cities: ['lisboa', 'lisbon'], mode: 'restaurants', name: 'Bacalhau, sjømat og lokale småretter', cat: 'cuisine', summary: 'Se etter en kort meny med portugisiske råvarer, og del flere retter hvis dere er flere.', sourceUrl: 'https://www.visitlisboa.com/en/p/Gastronomy-Flavours', search: 'traditional Portuguese restaurant Lisbon bacalhau seafood', dims: { food: 1, cul: .8, adv: .45, soc: .5 }, discovery: ['mix', 'hidden'] },

  { id: 'oslo-bjorvika', cities: ['oslo'], mode: 'experiences', name: 'Bjørvika: Operaen og havnepromenaden', cat: 'culture', summary: 'Kombiner arkitektur, fjordkant og en gåtur på Operataket i et kompakt område.', sourceUrl: 'https://www.visitoslo.com/en/', search: 'Oslo Opera House Bjorvika', dims: { cul: .8, act: .35, nat: .45, lux: .2 }, discovery: ['icons', 'mix'] },
  { id: 'oslo-munch', cities: ['oslo'], mode: 'experiences', name: 'MUNCH med utsikt over byen', cat: 'culture', summary: 'Et tydelig kulturanker som er lett å kombinere med resten av Bjørvika.', sourceUrl: 'https://www.visitoslo.com/en/', search: 'MUNCH museum Oslo', dims: { cul: 1, lux: .35, act: -.25, spont: -.15 } },
  { id: 'oslo-vigeland', cities: ['oslo'], mode: 'experiences', name: 'Vigelandsparken i eget tempo', cat: 'nature', summary: 'En utendørs kombinasjon av kunst, park og god plass til å senke tempoet.', sourceUrl: 'https://www.visitoslo.com/en/activities-and-attractions/activities/', search: 'Vigeland Sculpture Park Oslo', dims: { cul: .7, nat: .85, act: .45, soc: -.1 }, pace: ['slow', 'balanced'] },
  { id: 'oslo-forest', cities: ['oslo'], mode: 'experiences', name: 'En kort tur i Oslomarka', cat: 'nature', summary: 'Velg en kollektivvennlig rute og få skogsfølelse uten å bruke hele dagen på transport.', sourceUrl: 'https://www.visitoslo.com/en/activities-and-attractions/activities/', search: 'easy hike Oslomarka public transport', dims: { nat: 1, act: .8, adv: .45, spont: .4 }, discovery: ['mix', 'hidden'] },
  { id: 'oslo-mathallen', cities: ['oslo'], mode: 'restaurants', name: 'Mathallen Vulkan', cat: 'local', summary: 'Et lett startpunkt for å sammenligne lokale råvarer, småretter og ulike kjøkken.', sourceUrl: 'https://www.visitoslo.com/en/', search: 'Mathallen Oslo', dims: { food: 1, soc: .65, spont: .7, cul: .45 } },
  { id: 'oslo-bakery', cities: ['oslo'], mode: 'restaurants', name: 'Håndverksbakeri og kaffepause', cat: 'coffee', summary: 'Finn et lokalt bakeri og bruk frokosten som et roligere smaksstopp.', sourceUrl: 'https://www.visitoslo.com/en/', search: 'artisan bakery coffee Oslo', dims: { food: .75, lux: .15, soc: -.2, night: -.6, spont: .35 }, pace: ['slow', 'balanced'] },
  { id: 'oslo-fjord-food', cities: ['oslo'], mode: 'restaurants', name: 'Norsk sjømat nær fjorden', cat: 'seafood', summary: 'Se etter sesongbasert sjømat og en meny som viser hvor råvarene kommer fra.', sourceUrl: 'https://www.visitoslo.com/en/', search: 'Norwegian seafood restaurant Oslo fjord', dims: { food: 1, cul: .7, lux: .5, nat: .3 } },
  { id: 'oslo-grunerlokka', cities: ['oslo'], mode: 'restaurants', name: 'Uformell matrunde på Grünerløkka', cat: 'streetfood', summary: 'Velg to mindre stopp i stedet for én lang middag og la køen og stemningen styre litt.', sourceUrl: 'https://www.visitoslo.com/en/', search: 'local food Grunerlokka Oslo', dims: { food: .85, spont: .9, soc: .7, lux: -.45 }, discovery: ['mix', 'hidden'] },

  { id: 'barcelona-gaudi', cities: ['barcelona'], mode: 'experiences', name: 'Gaudí utover Sagrada Família', cat: 'culture', summary: 'Velg ett hovedverk og ett mindre kjent stopp for en mer sammenhengende arkitekturrunde.', sourceUrl: 'https://www.barcelonaturisme.com/wv3/en/page/5825/gaudi-beyond-the-sagrada-familia-.html', search: 'Gaudi architecture Barcelona', dims: { cul: 1, act: .4, lux: .35, spont: -.15 }, discovery: ['icons', 'mix'] },
  { id: 'barcelona-montjuic', cities: ['barcelona'], mode: 'experiences', name: 'Montjuïc: kunst, hager og utsikt', cat: 'nature', summary: 'En fleksibel halvdag der museer, hager og utsikt kan vektes etter energinivå.', sourceUrl: 'https://www.barcelonaturisme.com/files/11117-5-ficheroENG/Top_Experiences_Barcelona_ES_EN.pdf', search: 'Montjuic gardens museums Barcelona', dims: { cul: .75, nat: .7, act: .6, spont: .4 } },
  { id: 'barcelona-born', cities: ['barcelona'], mode: 'experiences', name: 'El Born til fots', cat: 'culture', summary: 'Smale gater, kulturstopp og små butikker gjør området godt egnet for å utforske uten fast program.', sourceUrl: 'https://www.barcelonaturisme.com/files/11117-5-ficheroENG/Top_Experiences_Barcelona_ES_EN.pdf', search: 'El Born Barcelona culture walk', dims: { cul: .8, spont: .85, act: .45, soc: .35 }, discovery: ['mix', 'hidden'] },
  { id: 'barcelona-boqueria', cities: ['barcelona'], mode: 'restaurants', name: 'Mercat de la Boqueria', cat: 'local', summary: 'Gå tidlig, se etter råvarer og bruk markedet som et kort smaksstopp fremfor bare en fotomulighet.', sourceUrl: 'https://bid.barcelonaturisme.com/wv3/es/page/101/mercados-de-barcelona.html', search: 'Mercat de la Boqueria Barcelona', dims: { food: 1, soc: .7, spont: .65, cul: .55 } },
  { id: 'barcelona-neighborhood-market', cities: ['barcelona'], mode: 'restaurants', name: 'Et nabolagsmarked utenfor La Rambla', cat: 'hidden', summary: 'Bruk Barcelonas markedsnettverk for et roligere, mer lokalt matstopp.', sourceUrl: 'https://bid.barcelonaturisme.com/wv3/es/page/101/mercados-de-barcelona.html', search: 'local neighborhood food market Barcelona Gracia', dims: { food: .85, cul: .7, spont: .9, soc: .25 }, discovery: ['hidden'] },

  { id: 'tokyo-asakusa', cities: ['tokyo'], mode: 'experiences', name: 'Asakusa, Sensō-ji og elvebredden', cat: 'culture', summary: 'Start tidlig ved Kaminarimon, gå gjennom tempelområdet og avslutt ved Sumida-elven.', sourceUrl: 'https://www.gotokyo.org/en/destinations/eastern-tokyo/asakusa/index.html', search: 'Sensoji Asakusa Tokyo', dims: { cul: 1, act: .45, soc: .4, spont: .25 }, discovery: ['icons', 'mix'] },
  { id: 'tokyo-meiji', cities: ['tokyo'], mode: 'experiences', name: 'Meiji Jingu tidlig på dagen', cat: 'nature', summary: 'En roligere skog- og kulturpause nær Harajuku før resten av byen våkner.', sourceUrl: 'https://www.gotokyo.org/en/see-and-do/attractions/', search: 'Meiji Jingu Tokyo', dims: { cul: .8, nat: .9, act: .35, soc: -.35 }, pace: ['slow', 'balanced'] },
  { id: 'tokyo-tsukiji', cities: ['tokyo'], mode: 'restaurants', name: 'Frokost i Tsukiji Outer Market', cat: 'seafood', summary: 'Kom tidlig for sushi, småmat og kjøkkenbutikker; den ytre delen av markedet er fortsatt aktiv.', sourceUrl: 'https://www.gotokyo.org/en/destinations/central-tokyo/tsukiji/index.html', search: 'Tsukiji Outer Market Tokyo', dims: { food: 1, act: .3, soc: .6, spont: .7, night: -.7 } },
  { id: 'tokyo-tsukishima', cities: ['tokyo'], mode: 'restaurants', name: 'Monjayaki på Tsukishima', cat: 'local', summary: 'Prøv Tokyos egen stekeplateklassiker i området som er spesielt kjent for retten.', sourceUrl: 'https://www.gotokyo.org/en/destinations/central-tokyo/tsukiji/index.html', search: 'monjayaki Tsukishima Tokyo', dims: { food: 1, cul: .8, adv: .55, soc: .75 }, discovery: ['mix', 'hidden'] },
  { id: 'tokyo-asakusa-food', cities: ['tokyo'], mode: 'restaurants', name: 'Soba eller tempura i Asakusa', cat: 'cuisine', summary: 'Se etter en spesialisert, familiedrevet restaurant i de tradisjonelle gatene rundt Asakusa.', sourceUrl: 'https://www.gotokyo.org/en/see-and-do/drinking-and-dining/index.html', search: 'traditional soba tempura Asakusa Tokyo', dims: { food: .9, cul: .9, lux: .05, spont: .45 } },
];

const TIP_EN: Record<string, { name: string; summary: string }> = {
  'lisboa-alfama': { name: 'Alfama and Mouraria on foot', summary: 'Follow historic streets, viewpoints and traces of fado through Lisbon’s oldest neighbourhoods.' },
  'lisboa-graca': { name: 'Graça and Miradouro Sophia', summary: 'Walk uphill to a quieter view across the castle and city centre.' },
  'lisboa-belem': { name: 'A cultural half-day in Belém', summary: 'Set aside half a day for the riverfront, monuments and the neighbourhood’s history.' },
  'lisboa-lx': { name: 'LX Factory and Alcântara', summary: 'Industrial architecture, independent shops, street art and relaxed stops in one area.' },
  'lisboa-ribeira': { name: 'Mercado da Ribeira', summary: 'Use the food hall as an easy tasting route through Portuguese classics and newer kitchens.' },
  'lisboa-nata': { name: 'Pastel de nata and bica', summary: 'Turn a coffee break into a small comparison of warm pastéis de nata across the city.' },
  'lisboa-fado-dinner': { name: 'A fado evening in Alfama', summary: 'Combine Portuguese food with fado; check the programme and booking details before you go.' },
  'lisboa-local-flavours': { name: 'Bacalhau, seafood and local small plates', summary: 'Look for a short menu built around Portuguese ingredients and share several dishes if you are travelling together.' },
  'oslo-bjorvika': { name: 'Bjørvika: the Opera and harbour promenade', summary: 'Combine architecture, the fjord edge and a walk on the Opera roof in one compact area.' },
  'oslo-munch': { name: 'MUNCH with a city view', summary: 'A strong cultural anchor that is easy to combine with the rest of Bjørvika.' },
  'oslo-vigeland': { name: 'Vigeland Park at your own pace', summary: 'An outdoor mix of art, parkland and room to slow down.' },
  'oslo-forest': { name: 'A short walk in Oslomarka', summary: 'Choose a route served by public transport and get a real forest experience without losing the whole day to travel.' },
  'oslo-mathallen': { name: 'Mathallen Vulkan', summary: 'An easy starting point for comparing local ingredients, small plates and different cuisines.' },
  'oslo-bakery': { name: 'Artisan bakery and coffee break', summary: 'Find a local bakery and make breakfast a slower tasting stop.' },
  'oslo-fjord-food': { name: 'Norwegian seafood by the fjord', summary: 'Look for seasonal seafood and a menu that explains where its ingredients come from.' },
  'oslo-grunerlokka': { name: 'A casual food crawl in Grünerløkka', summary: 'Choose two smaller stops instead of one long dinner and let the queues and atmosphere guide you.' },
  'barcelona-gaudi': { name: 'Gaudí beyond Sagrada Família', summary: 'Choose one landmark and one lesser-known stop for a more coherent architecture route.' },
  'barcelona-montjuic': { name: 'Montjuïc: art, gardens and views', summary: 'A flexible half-day where museums, gardens and viewpoints can match your energy level.' },
  'barcelona-born': { name: 'El Born on foot', summary: 'Narrow streets, cultural stops and small shops make the area ideal for exploring without a fixed plan.' },
  'barcelona-boqueria': { name: 'Mercat de la Boqueria', summary: 'Go early, look at the produce and use the market as a short tasting stop rather than only a photo opportunity.' },
  'barcelona-neighborhood-market': { name: 'A neighbourhood market beyond La Rambla', summary: 'Use Barcelona’s market network for a calmer and more local food stop.' },
  'tokyo-asakusa': { name: 'Asakusa, Sensō-ji and the riverfront', summary: 'Start early at Kaminarimon, walk through the temple grounds and finish beside the Sumida River.' },
  'tokyo-meiji': { name: 'Meiji Jingu early in the day', summary: 'A calm forest and culture break near Harajuku before the rest of the city wakes up.' },
  'tokyo-tsukiji': { name: 'Breakfast at Tsukiji Outer Market', summary: 'Arrive early for sushi, snacks and kitchen shops; the outer market is still active.' },
  'tokyo-tsukishima': { name: 'Monjayaki in Tsukishima', summary: 'Try Tokyo’s own griddle speciality in the neighbourhood best known for it.' },
  'tokyo-asakusa-food': { name: 'Soba or tempura in Asakusa', summary: 'Look for a specialised family-run restaurant in the traditional streets around Asakusa.' },
};

function tipText(tip: StarterTip, language: AppLanguage) {
  return language === 'en' && TIP_EN[tip.id] ? TIP_EN[tip.id] : { name: tip.name, summary: tip.summary };
}

function normalizeDestination(destination: string): string {
  return destination.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function mapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function scoreTip(tip: StarterTip, profile: PreferenceProfile, context: TripContext): number {
  let weighted = 0;
  let magnitude = 0;
  for (const dim of DIMS) {
    const value = tip.dims[dim] ?? 0;
    const signal = profile.dims[dim];
    weighted += value * signal.value * (.35 + .65 * signal.confidence);
    magnitude += Math.abs(value);
  }
  const contextFit = (tip.discovery?.includes(context.discovery) ? .09 : 0)
    + (tip.budget?.includes(context.budget) ? .06 : 0)
    + (tip.pace?.includes(context.pace) ? .06 : 0);
  const normalized = magnitude ? weighted / magnitude : 0;
  return Math.max(52, Math.min(94, Math.round(72 + normalized * 24 + contextFit * 100)));
}

function whyTip(tip: StarterTip, profile: PreferenceProfile, context: TripContext, language: AppLanguage): string {
  const labels = getDimLabels(language);
  const aligned = DIMS
    .map((dim) => ({ dim, score: (tip.dims[dim] ?? 0) * profile.dims[dim].value * profile.dims[dim].confidence }))
    .filter((item) => item.score > .005)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => labels[item.dim].label.toLowerCase());
  const text = tipText(tip, language);
  if (language === 'en') {
    const taste = aligned.length ? `Especially aligned with ${aligned.join(' and ')}` : 'A varied starting point for your profile';
    const brief = context.discovery === 'hidden' ? 'with room for local discoveries' : context.pace === 'slow' ? 'without filling the whole day' : 'adapted to your trip brief';
    return `${taste}, ${brief}. ${text.summary}`;
  }
  const taste = aligned.length ? `Treffer særlig ${aligned.join(' og ')}` : 'Gir profilen din et godt, variert startpunkt';
  const brief = context.discovery === 'hidden' ? 'med rom for lokale funn' : context.pace === 'slow' ? 'uten å fylle hele dagen' : 'tilpasset turbriefen din';
  return `${taste}, ${brief}. ${text.summary}`;
}

function genericTips(destination: string, mode: Mode, profile: PreferenceProfile, context: TripContext, language: AppLanguage): ResultItem[] {
  const labels = getDimLabels(language);
  const axes = DIMS.map((dim) => ({ dim, score: profile.dims[dim].value * profile.dims[dim].confidence }))
    .sort((a, b) => b.score - a.score);
  const first = labels[axes[0]?.dim ?? (mode === 'restaurants' ? 'food' : 'cul')].label.toLowerCase();
  const definitions = language === 'en' ? (mode === 'restaurants'
    ? [
        ['Local food market', 'local', 'local food market'], ['Neighbourhood favourite with a short menu', 'hidden', 'local neighborhood restaurant'],
        ['Regional speciality', 'cuisine', 'traditional regional food'], ['Artisan bakery or café', 'coffee', 'artisan bakery coffee'],
        ['Small plates to share', 'sharing', 'small plates local restaurant'], ['Seasonal dinner', 'fine', 'seasonal restaurant'],
      ]
    : [
        ['Historic neighbourhood walk', 'culture', 'historic neighborhood walking route'], ['Local viewpoint', 'nature', 'local viewpoint'],
        ['Museum of local history', 'culture', 'local history museum'], ['Market and independent shops', 'shopping', 'local market independent shops'],
        ['Short nature walk near the city', 'nature', 'easy nature walk public transport'], ['Evening experience with local culture', 'nightlife', 'local evening culture'],
      ]) : (mode === 'restaurants'
    ? [
        ['Lokalt matmarked', 'local', 'local food market'],
        ['Nabolagsfavoritt med kort meny', 'hidden', 'local neighborhood restaurant'],
        ['Regional spesialitet', 'cuisine', 'traditional regional food'],
        ['Håndverksbakeri eller kafé', 'coffee', 'artisan bakery coffee'],
        ['Småretter å dele', 'sharing', 'small plates local restaurant'],
        ['Sesongbasert middag', 'fine', 'seasonal restaurant'],
      ]
    : [
        ['Historisk nabolagsvandring', 'culture', 'historic neighborhood walking route'],
        ['Lokalt utsiktspunkt', 'nature', 'local viewpoint'],
        ['Museum med lokal historie', 'culture', 'local history museum'],
        ['Marked og småbutikker', 'shopping', 'local market independent shops'],
        ['Kort naturtur nær byen', 'nature', 'easy nature walk public transport'],
        ['Kveldsopplevelse med lokal kultur', 'nightlife', 'local evening culture'],
      ]);
  return definitions.map(([name, cat, query], index) => ({
    id: `starter-generic-${mode}-${index}`,
    name: `${name} · ${destination}`,
    cat,
    match: Math.max(56, 78 - index * 3),
    why: language === 'en'
      ? `A searchable starter idea prioritising ${first} and ${context.discovery === 'hidden' ? 'places beyond the main tourist route' : 'a good mix for your trip brief'}. Check current opening hours and reviews before you go.`
      : `Et søkbart starttips som prioriterer ${first} og ${context.discovery === 'hidden' ? 'steder litt utenfor hovedløypa' : 'en god miks for turbriefen din'}. Sjekk ferske åpningstider og omtaler før du drar.`,
    url: mapsUrl(`${query} ${destination}`),
    source: 'starter',
  }));
}

export function buildStarterResults(destination: string, mode: Mode, profile: PreferenceProfile, context: TripContext, language: AppLanguage = 'no'): ResultItem[] {
  const normalized = normalizeDestination(destination);
  const candidates = TIPS.filter((tip) => tip.mode === mode && tip.cities.some((city) => normalized.includes(city)));
  if (!candidates.length) return genericTips(destination, mode, profile, context, language);
  return candidates
    .map((tip) => ({
      id: tip.id,
      name: tipText(tip, language).name,
      cat: tip.cat,
      match: scoreTip(tip, profile, context),
      why: whyTip(tip, profile, context, language),
      url: mapsUrl(`${tip.search} ${destination}`),
      sourceUrl: tip.sourceUrl,
      source: 'starter' as const,
    }))
    .sort((a, b) => b.match - a.match);
}
