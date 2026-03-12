import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";

// ============================================================================
// PREFERENCE CARDS - INLINED FROM preference-cards.js
// ============================================================================

const PREFERENCE_CARDS = {
  no: [
    {id:'p1', emoji:'🪂', q:'Vil du hoppe i fallskjerm over reisemålet ditt?', desc:'Adrenalin fra høyder og fritt fall.', cat:'adrenalin', dims:{adv:1,soc:.2,lux:.1,act:.9,cul:-.2,nat:.5,food:-.3,night:-.2,spont:.6}},
    {id:'p2', emoji:'🧗', q:'Foretrekker du å klatre opp en fjellvegg fremfor å ta heisen?', desc:'Fysisk utfordring gir deg energi.', cat:'adrenalin', dims:{adv:.9,soc:.1,lux:-.4,act:1,cul:-.1,nat:.8,food:-.2,night:-.3,spont:.3}},
    {id:'p3', emoji:'🏄', q:'Vil du prøve surfing selv om du aldri har stått på et brett?', desc:'Nye ferdigheter og bølger.', cat:'adrenalin', dims:{adv:.8,soc:.4,lux:-.1,act:.9,cul:-.1,nat:.7,food:-.1,night:-.1,spont:.5}},
    {id:'p4', emoji:'🤿', q:'Vil du dykke ned til et korallrev eller et skipsvrak?', desc:'En verden under overflaten.', cat:'adrenalin', dims:{adv:.9,soc:.3,lux:.2,act:.7,cul:.1,nat:.9,food:-.2,night:-.3,spont:.3}},
    {id:'p5', emoji:'🏍️', q:'Er en tur på motorsykkel gjennom ukjente veier noe for deg?', desc:'Frihet og fart uten plan.', cat:'adrenalin', dims:{adv:.8,soc:.1,lux:-.2,act:.6,cul:.2,nat:.6,food:-.1,night:-.2,spont:.8}},
    {id:'p6', emoji:'🧖', q:'Høres en hel dag på spa med massasje og badstue perfekt ut?', desc:'Total avslapning for kropp og sinn.', cat:'avslapning', dims:{adv:-.6,soc:.1,lux:.8,act:-.7,cul:.1,nat:-.1,food:.1,night:-.4,spont:-.3}},
    {id:'p7', emoji:'🧘', q:'Vil du starte dagen med yoga ved soloppgang?', desc:'Mindfulness og indre ro.', cat:'avslapning', dims:{adv:-.3,soc:-.1,lux:.3,act:.3,cul:.3,nat:.4,food:-.1,night:-.6,spont:-.2}},
    {id:'p8', emoji:'🏖️', q:'Er din drømmedag en hengekøy på stranden med en bok?', desc:'Ingenting å gjøre, ingen plan.', cat:'avslapning', dims:{adv:-.7,soc:-.3,lux:.2,act:-.8,cul:-.3,nat:.5,food:.1,night:-.3,spont:.1}},
    {id:'p9', emoji:'🌊', q:'Vil du tilbringe timer ved å bare se på bølgene?', desc:'Naturens meditasjon.', cat:'avslapning', dims:{adv:-.5,soc:-.4,lux:0,act:-.6,cul:-.2,nat:.8,food:-.1,night:-.5,spont:.1}},
    {id:'p10', emoji:'♨️', q:'Tiltrekkes du av varme kilder og tradisjonelle bad?', desc:'Helbredende vann med historie.', cat:'avslapning', dims:{adv:-.2,soc:.2,lux:.5,act:-.4,cul:.5,nat:.4,food:-.1,night:-.3,spont:-.1}},
    {id:'p11', emoji:'🏛️', q:'Kan du tilbringe en hel dag på et museum uten å kjede deg?', desc:'Kunst og historie fascinerer deg.', cat:'kultur', dims:{adv:-.2,soc:.1,lux:.3,act:-.3,cul:1,nat:-.2,food:-.1,night:-.2,spont:-.4}},
    {id:'p12', emoji:'🎭', q:'Vil du se en lokal teaterforestilling selv om den er på et annet språk?', desc:'Kultur transcenderer språk.', cat:'kultur', dims:{adv:.2,soc:.4,lux:.4,act:-.2,cul:.9,nat:-.3,food:-.1,night:.3,spont:.1}},
    {id:'p13', emoji:'📜', q:'Fascineres du av ruiner og arkeologiske utgravninger?', desc:'Fortidens mysterier trekker deg inn.', cat:'kultur', dims:{adv:.3,soc:.1,lux:-.2,act:.4,cul:1,nat:.3,food:-.2,night:-.4,spont:-.1}},
    {id:'p14', emoji:'🕌', q:'Vil du besøke religiøse og spirituelle steder uansett egen tro?', desc:'Arkitektur og åndelighet møtes.', cat:'kultur', dims:{adv:.1,soc:.1,lux:0,act:.2,cul:.9,nat:-.1,food:-.2,night:-.4,spont:-.2}},
    {id:'p15', emoji:'🎨', q:'Tiltrekkes du av street art og alternative kunstuttrykk?', desc:'Byens kreative puls.', cat:'kultur', dims:{adv:.4,soc:.3,lux:-.3,act:.4,cul:.8,nat:-.2,food:-.1,night:.3,spont:.5}},
    {id:'p16', emoji:'📸', q:'Er du den som alltid tar bilder av arkitektur og detaljer?', desc:'Skjønnhet i konstruksjon.', cat:'kultur', dims:{adv:.1,soc:-.1,lux:.2,act:.3,cul:.8,nat:.1,food:-.1,night:-.1,spont:.1}},
    {id:'p17', emoji:'🍜', q:'Vil du spise street food fra en bod du aldri har hørt om?', desc:'De beste smakene er ofte de mest uventede.', cat:'mat', dims:{adv:.6,soc:.4,lux:-.5,act:.2,cul:.6,nat:-.1,food:1,night:.1,spont:.7}},
    {id:'p18', emoji:'👨‍🍳', q:'Vil du ta et kokekurs med en lokal kokk?', desc:'Lær hemmelighetene bak lokal mat.', cat:'mat', dims:{adv:.3,soc:.6,lux:.3,act:.4,cul:.7,nat:-.1,food:.9,night:-.1,spont:-.1}},
    {id:'p19', emoji:'🍷', q:'Er vinsmakinger og lokale bryggerier noe du prioriterer?', desc:'Drikkekultur forteller historien om et sted.', cat:'mat', dims:{adv:.2,soc:.6,lux:.6,act:-.1,cul:.5,nat:.1,food:.8,night:.4,spont:.2}},
    {id:'p20', emoji:'🌶️', q:'Bestiller du alltid den mest eksotiske retten på menyen?', desc:'Smaksløkene dine er eventyrlystne.', cat:'mat', dims:{adv:.7,soc:.3,lux:0,act:.1,cul:.5,nat:-.1,food:1,night:.1,spont:.6}},
    {id:'p21', emoji:'🍽️', q:'Er en Michelin-restaurant verdt å bruke reisebudsjettet på?', desc:'Gastronomi som kunstopplevelse.', cat:'mat', dims:{adv:.1,soc:.4,lux:1,act:-.2,cul:.4,nat:-.2,food:.9,night:.2,spont:-.4}},
    {id:'p22', emoji:'☕', q:'Leter du alltid etter den beste lokale kafeen?', desc:'Kaffekultur og slow mornings.', cat:'mat', dims:{adv:.1,soc:.2,lux:.2,act:-.2,cul:.4,nat:-.1,food:.6,night:-.3,spont:.2}},
    {id:'p23', emoji:'🥾', q:'Ville du gått en 6-timers fjelltur for utsikten?', desc:'Fortjen panoramaet med egne føtter.', cat:'natur', dims:{adv:.7,soc:.2,lux:-.5,act:1,cul:-.1,nat:1,food:-.2,night:-.5,spont:.1}},
    {id:'p24', emoji:'🏕️', q:'Vil du sove under stjernene i naturen?', desc:'Bort fra alt, nær alt.', cat:'natur', dims:{adv:.8,soc:.2,lux:-.8,act:.6,cul:-.2,nat:1,food:-.3,night:-.4,spont:.4}},
    {id:'p25', emoji:'🌅', q:'Er soloppgang fra et fjelltopp verdt å stå opp klokka 4 for?', desc:'Tidlige morgener med magisk lys.', cat:'natur', dims:{adv:.5,soc:.1,lux:-.2,act:.7,cul:-.1,nat:.9,food:-.2,night:-.7,spont:-.1}},
    {id:'p26', emoji:'🐋', q:'Vil du dra på hvalsafari eller se ville dyr i naturlig habitat?', desc:'Møter med vill natur.', cat:'natur', dims:{adv:.6,soc:.3,lux:.2,act:.4,cul:.1,nat:1,food:-.2,night:-.3,spont:.2}},
    {id:'p27', emoji:'🛶', q:'Høres kajakkpadling gjennom stille fjorder ut som drømmen?', desc:'Glid gjennom uberørt natur.', cat:'natur', dims:{adv:.6,soc:.1,lux:-.1,act:.8,cul:-.1,nat:.9,food:-.2,night:-.4,spont:.3}},
    {id:'p28', emoji:'🎉', q:'Vil du delta på en lokal festival eller feiring?', desc:'Bli en del av fellesskapet.', cat:'sosial', dims:{adv:.5,soc:1,lux:-.1,act:.5,cul:.7,nat:-.1,food:.4,night:.6,spont:.6}},
    {id:'p29', emoji:'🍻', q:'Foretrekker du å møte lokale folk på en bar fremfor å besøke et monument?', desc:'Mennesker er den beste opplevelsen.', cat:'sosial', dims:{adv:.4,soc:1,lux:-.2,act:.1,cul:.3,nat:-.3,food:.5,night:.7,spont:.7}},
    {id:'p30', emoji:'🏠', q:'Vil du bo hos en lokal vertsfamilie fremfor hotell?', desc:'Autentisk innblikk i hverdagslivet.', cat:'sosial', dims:{adv:.6,soc:.9,lux:-.6,act:.2,cul:.8,nat:-.1,food:.5,night:-.1,spont:.3}},
    {id:'p31', emoji:'👥', q:'Foretrekker du gruppeturer fremfor å utforske alene?', desc:'Delt glede er dobbel glede.', cat:'sosial', dims:{adv:.2,soc:.9,lux:.1,act:.3,cul:.2,nat:.1,food:.2,night:.3,spont:-.2}},
    {id:'p32', emoji:'🎵', q:'Vil du oppsøke live-musikk uansett sjanger?', desc:'Musikk er universelt.', cat:'uteliv', dims:{adv:.4,soc:.7,lux:.1,act:.2,cul:.6,nat:-.3,food:.1,night:.9,spont:.5}},
    {id:'p33', emoji:'🍸', q:'Tiltrekkes du av cocktailbarer og speakeasies?', desc:'Hemmelige steder med atmosfære.', cat:'uteliv', dims:{adv:.3,soc:.6,lux:.7,act:-.1,cul:.2,nat:-.3,food:.3,night:.9,spont:.4}},
    {id:'p34', emoji:'💃', q:'Vil du danse hele natten på en lokal klubb?', desc:'Musikk, energi og bevegelse.', cat:'uteliv', dims:{adv:.5,soc:.9,lux:.1,act:.6,cul:.2,nat:-.4,food:-.1,night:1,spont:.7}},
    {id:'p35', emoji:'🎪', q:'Vil du oppleve en unik forestilling — sirkus, kabaret eller performance?', desc:'Underholdning som utfordrer.', cat:'uteliv', dims:{adv:.4,soc:.5,lux:.5,act:-.1,cul:.7,nat:-.3,food:.1,night:.7,spont:.3}},
    {id:'p36', emoji:'🏨', q:'Er et luksushotell med utsikt en viktig del av reisen?', desc:'Komfort og estetikk betyr noe.', cat:'luksus', dims:{adv:-.3,soc:.2,lux:1,act:-.4,cul:.1,nat:.2,food:.3,night:.1,spont:-.4}},
    {id:'p37', emoji:'🚁', q:'Vil du ta en helikoptertur for å se landskapet ovenfra?', desc:'Eksklusivt perspektiv.', cat:'luksus', dims:{adv:.6,soc:.3,lux:.9,act:.2,cul:-.1,nat:.6,food:-.2,night:-.2,spont:.1}},
    {id:'p38', emoji:'🛥️', q:'Høres en privat båttur langs kysten fristende ut?', desc:'Hav, sol og frihet.', cat:'luksus', dims:{adv:.4,soc:.4,lux:.9,act:.2,cul:-.1,nat:.7,food:.2,night:-.1,spont:.2}},
    {id:'p39', emoji:'🗺️', q:'Vil du kaste kartet og bare gå i en tilfeldig retning?', desc:'De beste opplevelsene er uplanlagte.', cat:'spontan', dims:{adv:.8,soc:.2,lux:-.3,act:.5,cul:.3,nat:.3,food:.2,night:.1,spont:1}},
    {id:'p40', emoji:'🚌', q:'Vil du ta en tilfeldig buss og se hvor den ender?', desc:'Transport som eventyr.', cat:'spontan', dims:{adv:.7,soc:.4,lux:-.5,act:.3,cul:.4,nat:.1,food:.1,night:-.1,spont:1}},
    {id:'p41', emoji:'🏘️', q:'Tiltrekkes du av nabolag turistene aldri besøker?', desc:'Det ekte livet skjuler seg utenfor sentrum.', cat:'spontan', dims:{adv:.6,soc:.5,lux:-.4,act:.4,cul:.6,nat:-.1,food:.4,night:.1,spont:.8}},
    {id:'p42', emoji:'🎲', q:'Liker du å la tilfeldigheter bestemme hva du gjør i dag?', desc:'Overraskelser er undervurdert.', cat:'spontan', dims:{adv:.7,soc:.4,lux:-.1,act:.3,cul:.2,nat:.1,food:.2,night:.3,spont:1}},
    {id:'p43', emoji:'🎓', q:'Vil du ta en workshop i noe du aldri har prøvd — keramikk, dans, språk?', desc:'Nye ferdigheter som souvenir.', cat:'læring', dims:{adv:.4,soc:.5,lux:.1,act:.4,cul:.7,nat:-.2,food:-.1,night:-.2,spont:-.1}},
    {id:'p44', emoji:'📚', q:'Besøker du bokhandlere og biblioteker når du reiser?', desc:'Kunnskap finnes overalt.', cat:'læring', dims:{adv:-.1,soc:-.2,lux:.1,act:-.3,cul:.9,nat:-.2,food:-.1,night:-.4,spont:-.1}},
    {id:'p45', emoji:'🗣️', q:'Prøver du å lære noen ord på det lokale språket?', desc:'Respekt gjennom kommunikasjon.', cat:'læring', dims:{adv:.3,soc:.6,lux:-.1,act:.1,cul:.8,nat:-.1,food:.2,night:.1,spont:.2}},
    {id:'p46', emoji:'🛍️', q:'Er lokale markeder og loppemarkeder en viktig del av reisen?', desc:'Skatter og autentiske ting.', cat:'shopping', dims:{adv:.3,soc:.5,lux:.2,act:.3,cul:.5,nat:-.2,food:.3,night:-.1,spont:.4}},
    {id:'p47', emoji:'🎁', q:'Kjøper du alltid håndlagde suvenirer fra lokale kunstnere?', desc:'Støtt lokal kunst og håndverk.', cat:'shopping', dims:{adv:.2,soc:.4,lux:.3,act:.2,cul:.7,nat:-.1,food:-.1,night:-.2,spont:.2}},
    {id:'p48', emoji:'⚡', q:'Vil du fylle hver dag med aktiviteter fra morgen til kveld?', desc:'Maksimer hver time.', cat:'tempo', dims:{adv:.6,soc:.4,lux:.1,act:.8,cul:.3,nat:.2,food:.3,night:.4,spont:-.2}},
    {id:'p49', emoji:'🐢', q:'Foretrekker du å bli lenge på ett sted fremfor å se alt?', desc:'Dybde over bredde.', cat:'tempo', dims:{adv:-.2,soc:.3,lux:.2,act:-.4,cul:.5,nat:.2,food:.4,night:-.1,spont:-.3}},
    {id:'p50', emoji:'🌙', q:'Er du mest aktiv etter at solen har gått ned?', desc:'Natten har sin egen magi.', cat:'tempo', dims:{adv:.4,soc:.6,lux:.3,act:.2,cul:.1,nat:-.3,food:.3,night:1,spont:.5}},
  ],
  en: [
    {id:'p1', emoji:'🪂', q:'Would you go skydiving over your travel destination?', desc:'Adrenaline from heights and freefall.', cat:'adrenaline', dims:{adv:1,soc:.2,lux:.1,act:.9,cul:-.2,nat:.5,food:-.3,night:-.2,spont:.6}},
    {id:'p2', emoji:'🧗', q:'Would you rather climb a cliff face than take the elevator?', desc:'Physical challenge energizes you.', cat:'adrenaline', dims:{adv:.9,soc:.1,lux:-.4,act:1,cul:-.1,nat:.8,food:-.2,night:-.3,spont:.3}},
    {id:'p3', emoji:'🏄', q:'Would you try surfing even if you have never stood on a board?', desc:'New skills and waves.', cat:'adrenaline', dims:{adv:.8,soc:.4,lux:-.1,act:.9,cul:-.1,nat:.7,food:-.1,night:-.1,spont:.5}},
    {id:'p4', emoji:'🤿', q:'Would you dive down to a coral reef or a shipwreck?', desc:'A world beneath the surface.', cat:'adrenaline', dims:{adv:.9,soc:.3,lux:.2,act:.7,cul:.1,nat:.9,food:-.2,night:-.3,spont:.3}},
    {id:'p5', emoji:'🏍️', q:'Is a motorcycle ride through unknown roads your kind of thing?', desc:'Freedom and speed without a plan.', cat:'adrenaline', dims:{adv:.8,soc:.1,lux:-.2,act:.6,cul:.2,nat:.6,food:-.1,night:-.2,spont:.8}},
    {id:'p6', emoji:'🧖', q:'Does a full day at the spa with massage and sauna sound perfect?', desc:'Total relaxation for body and mind.', cat:'relaxation', dims:{adv:-.6,soc:.1,lux:.8,act:-.7,cul:.1,nat:-.1,food:.1,night:-.4,spont:-.3}},
    {id:'p7', emoji:'🧘', q:'Would you start your day with yoga at sunrise?', desc:'Mindfulness and inner peace.', cat:'relaxation', dims:{adv:-.3,soc:-.1,lux:.3,act:.3,cul:.3,nat:.4,food:-.1,night:-.6,spont:-.2}},
    {id:'p8', emoji:'🏖️', q:'Is your dream day a hammock on the beach with a book?', desc:'Nothing to do, no plan.', cat:'relaxation', dims:{adv:-.7,soc:-.3,lux:.2,act:-.8,cul:-.3,nat:.5,food:.1,night:-.3,spont:.1}},
    {id:'p9', emoji:'🌊', q:'Would you spend hours just watching the waves?', desc:'Nature as meditation.', cat:'relaxation', dims:{adv:-.5,soc:-.4,lux:0,act:-.6,cul:-.2,nat:.8,food:-.1,night:-.5,spont:.1}},
    {id:'p10', emoji:'♨️', q:'Are you drawn to hot springs and traditional baths?', desc:'Healing waters with history.', cat:'relaxation', dims:{adv:-.2,soc:.2,lux:.5,act:-.4,cul:.5,nat:.4,food:-.1,night:-.3,spont:-.1}},
    {id:'p11', emoji:'🏛️', q:'Could you spend an entire day in a museum without getting bored?', desc:'Art and history fascinate you.', cat:'culture', dims:{adv:-.2,soc:.1,lux:.3,act:-.3,cul:1,nat:-.2,food:-.1,night:-.2,spont:-.4}},
    {id:'p12', emoji:'🎭', q:'Would you watch a local theatre performance even in another language?', desc:'Culture transcends language.', cat:'culture', dims:{adv:.2,soc:.4,lux:.4,act:-.2,cul:.9,nat:-.3,food:-.1,night:.3,spont:.1}},
    {id:'p13', emoji:'📜', q:'Are you fascinated by ruins and archaeological excavations?', desc:'The mysteries of the past pull you in.', cat:'culture', dims:{adv:.3,soc:.1,lux:-.2,act:.4,cul:1,nat:.3,food:-.2,night:-.4,spont:-.1}},
    {id:'p14', emoji:'🕌', q:'Would you visit religious and spiritual sites regardless of your own beliefs?', desc:'Architecture and spirituality meet.', cat:'culture', dims:{adv:.1,soc:.1,lux:0,act:.2,cul:.9,nat:-.1,food:-.2,night:-.4,spont:-.2}},
    {id:'p15', emoji:'🎨', q:'Are you drawn to street art and alternative artistic expressions?', desc:'The creative pulse of the city.', cat:'culture', dims:{adv:.4,soc:.3,lux:-.3,act:.4,cul:.8,nat:-.2,food:-.1,night:.3,spont:.5}},
    {id:'p16', emoji:'📸', q:'Are you the one always photographing architecture and details?', desc:'Beauty in construction.', cat:'culture', dims:{adv:.1,soc:-.1,lux:.2,act:.3,cul:.8,nat:.1,food:-.1,night:-.1,spont:.1}},
    {id:'p17', emoji:'🍜', q:'Would you eat street food from a stall you have never heard of?', desc:'The best flavours are often the most unexpected.', cat:'food', dims:{adv:.6,soc:.4,lux:-.5,act:.2,cul:.6,nat:-.1,food:1,night:.1,spont:.7}},
    {id:'p18', emoji:'👨‍🍳', q:'Would you take a cooking class with a local chef?', desc:'Learn the secrets behind local food.', cat:'food', dims:{adv:.3,soc:.6,lux:.3,act:.4,cul:.7,nat:-.1,food:.9,night:-.1,spont:-.1}},
    {id:'p19', emoji:'🍷', q:'Are wine tastings and local breweries something you prioritize?', desc:'Drinking culture tells the story of a place.', cat:'food', dims:{adv:.2,soc:.6,lux:.6,act:-.1,cul:.5,nat:.1,food:.8,night:.4,spont:.2}},
    {id:'p20', emoji:'🌶️', q:'Do you always order the most exotic dish on the menu?', desc:'Your taste buds are adventurous.', cat:'food', dims:{adv:.7,soc:.3,lux:0,act:.1,cul:.5,nat:-.1,food:1,night:.1,spont:.6}},
    {id:'p21', emoji:'🍽️', q:'Is a Michelin restaurant worth spending your travel budget on?', desc:'Gastronomy as an art experience.', cat:'food', dims:{adv:.1,soc:.4,lux:1,act:-.2,cul:.4,nat:-.2,food:.9,night:.2,spont:-.4}},
    {id:'p22', emoji:'☕', q:'Do you always search for the best local coffee shop?', desc:'Coffee culture and slow mornings.', cat:'food', dims:{adv:.1,soc:.2,lux:.2,act:-.2,cul:.4,nat:-.1,food:.6,night:-.3,spont:.2}},
    {id:'p23', emoji:'🥾', q:'Would you hike 6 hours for the view?', desc:'Earn the panorama with your own feet.', cat:'nature', dims:{adv:.7,soc:.2,lux:-.5,act:1,cul:-.1,nat:1,food:-.2,night:-.5,spont:.1}},
    {id:'p24', emoji:'🏕️', q:'Would you sleep under the stars in the wild?', desc:'Away from everything, close to everything.', cat:'nature', dims:{adv:.8,soc:.2,lux:-.8,act:.6,cul:-.2,nat:1,food:-.3,night:-.4,spont:.4}},
    {id:'p25', emoji:'🌅', q:'Is a mountaintop sunrise worth waking up at 4am for?', desc:'Early mornings with magical light.', cat:'nature', dims:{adv:.5,soc:.1,lux:-.2,act:.7,cul:-.1,nat:.9,food:-.2,night:-.7,spont:-.1}},
    {id:'p26', emoji:'🐋', q:'Would you go whale watching or see wild animals in their natural habitat?', desc:'Encounters with wild nature.', cat:'nature', dims:{adv:.6,soc:.3,lux:.2,act:.4,cul:.1,nat:1,food:-.2,night:-.3,spont:.2}},
    {id:'p27', emoji:'🛶', q:'Does kayaking through silent fjords sound like a dream?', desc:'Glide through untouched nature.', cat:'nature', dims:{adv:.6,soc:.1,lux:-.1,act:.8,cul:-.1,nat:.9,food:-.2,night:-.4,spont:.3}},
    {id:'p28', emoji:'🎉', q:'Would you join a local festival or celebration?', desc:'Become part of the community.', cat:'social', dims:{adv:.5,soc:1,lux:-.1,act:.5,cul:.7,nat:-.1,food:.4,night:.6,spont:.6}},
    {id:'p29', emoji:'🍻', q:'Would you rather meet locals at a bar than visit a monument?', desc:'People are the best experience.', cat:'social', dims:{adv:.4,soc:1,lux:-.2,act:.1,cul:.3,nat:-.3,food:.5,night:.7,spont:.7}},
    {id:'p30', emoji:'🏠', q:'Would you stay with a local host family instead of a hotel?', desc:'Authentic insight into everyday life.', cat:'social', dims:{adv:.6,soc:.9,lux:-.6,act:.2,cul:.8,nat:-.1,food:.5,night:-.1,spont:.3}},
    {id:'p31', emoji:'👥', q:'Do you prefer group tours over exploring alone?', desc:'Shared joy is double joy.', cat:'social', dims:{adv:.2,soc:.9,lux:.1,act:.3,cul:.2,nat:.1,food:.2,night:.3,spont:-.2}},
    {id:'p32', emoji:'🎵', q:'Would you seek out live music regardless of genre?', desc:'Music is universal.', cat:'nightlife', dims:{adv:.4,soc:.7,lux:.1,act:.2,cul:.6,nat:-.3,food:.1,night:.9,spont:.5}},
    {id:'p33', emoji:'🍸', q:'Are you drawn to cocktail bars and speakeasies?', desc:'Hidden places with atmosphere.', cat:'nightlife', dims:{adv:.3,soc:.6,lux:.7,act:-.1,cul:.2,nat:-.3,food:.3,night:.9,spont:.4}},
    {id:'p34', emoji:'💃', q:'Would you dance all night at a local club?', desc:'Music, energy, and movement.', cat:'nightlife', dims:{adv:.5,soc:.9,lux:.1,act:.6,cul:.2,nat:-.4,food:-.1,night:1,spont:.7}},
    {id:'p35', emoji:'🎪', q:'Would you see a unique show — circus, cabaret, or performance art?', desc:'Entertainment that challenges.', cat:'nightlife', dims:{adv:.4,soc:.5,lux:.5,act:-.1,cul:.7,nat:-.3,food:.1,night:.7,spont:.3}},
    {id:'p36', emoji:'🏨', q:'Is a luxury hotel with a view an important part of your trip?', desc:'Comfort and aesthetics matter.', cat:'luxury', dims:{adv:-.3,soc:.2,lux:1,act:-.4,cul:.1,nat:.2,food:.3,night:.1,spont:-.4}},
    {id:'p37', emoji:'🚁', q:'Would you take a helicopter tour to see the landscape from above?', desc:'An exclusive perspective.', cat:'luxury', dims:{adv:.6,soc:.3,lux:.9,act:.2,cul:-.1,nat:.6,food:-.2,night:-.2,spont:.1}},
    {id:'p38', emoji:'🛥️', q:'Does a private boat trip along the coast sound tempting?', desc:'Ocean, sun, and freedom.', cat:'luxury', dims:{adv:.4,soc:.4,lux:.9,act:.2,cul:-.1,nat:.7,food:.2,night:-.1,spont:.2}},
    {id:'p39', emoji:'🗺️', q:'Would you throw away the map and walk in a random direction?', desc:'The best experiences are unplanned.', cat:'spontaneous', dims:{adv:.8,soc:.2,lux:-.3,act:.5,cul:.3,nat:.3,food:.2,night:.1,spont:1}},
    {id:'p40', emoji:'🚌', q:'Would you take a random bus and see where it ends up?', desc:'Transport as adventure.', cat:'spontaneous', dims:{adv:.7,soc:.4,lux:-.5,act:.3,cul:.4,nat:.1,food:.1,night:-.1,spont:1}},
    {id:'p41', emoji:'🏘️', q:'Are you drawn to neighbourhoods tourists never visit?', desc:'Real life hides outside the city centre.', cat:'spontaneous', dims:{adv:.6,soc:.5,lux:-.4,act:.4,cul:.6,nat:-.1,food:.4,night:.1,spont:.8}},
    {id:'p42', emoji:'🎲', q:'Do you like letting chance decide what you do today?', desc:'Surprises are underrated.', cat:'spontaneous', dims:{adv:.7,soc:.4,lux:-.1,act:.3,cul:.2,nat:.1,food:.2,night:.3,spont:1}},
    {id:'p43', emoji:'🎓', q:'Would you take a workshop in something new — ceramics, dance, language?', desc:'New skills as souvenirs.', cat:'learning', dims:{adv:.4,soc:.5,lux:.1,act:.4,cul:.7,nat:-.2,food:-.1,night:-.2,spont:-.1}},
    {id:'p44', emoji:'📚', q:'Do you visit bookshops and libraries when you travel?', desc:'Knowledge is everywhere.', cat:'learning', dims:{adv:-.1,soc:-.2,lux:.1,act:-.3,cul:.9,nat:-.2,food:-.1,night:-.4,spont:-.1}},
    {id:'p45', emoji:'🗣️', q:'Do you try to learn a few words in the local language?', desc:'Respect through communication.', cat:'learning', dims:{adv:.3,soc:.6,lux:-.1,act:.1,cul:.8,nat:-.1,food:.2,night:.1,spont:.2}},
    {id:'p46', emoji:'🛍️', q:'Are local markets and flea markets an important part of travel?', desc:'Treasures and authentic finds.', cat:'shopping', dims:{adv:.3,soc:.5,lux:.2,act:.3,cul:.5,nat:-.2,food:.3,night:-.1,spont:.4}},
    {id:'p47', emoji:'🎁', q:'Do you always buy handmade souvenirs from local artisans?', desc:'Support local art and craft.', cat:'shopping', dims:{adv:.2,soc:.4,lux:.3,act:.2,cul:.7,nat:-.1,food:-.1,night:-.2,spont:.2}},
    {id:'p48', emoji:'⚡', q:'Would you fill every day with activities from morning to night?', desc:'Maximize every hour.', cat:'pace', dims:{adv:.6,soc:.4,lux:.1,act:.8,cul:.3,nat:.2,food:.3,night:.4,spont:-.2}},
    {id:'p49', emoji:'🐢', q:'Do you prefer staying longer in one place over seeing everything?', desc:'Depth over breadth.', cat:'pace', dims:{adv:-.2,soc:.3,lux:.2,act:-.4,cul:.5,nat:.2,food:.4,night:-.1,spont:-.3}},
    {id:'p50', emoji:'🌙', q:'Are you most active after the sun goes down?', desc:'The night has its own magic.', cat:'pace', dims:{adv:.4,soc:.6,lux:.3,act:.2,cul:.1,nat:-.3,food:.3,night:1,spont:.5}},
  ]
};

const PREF_CAT_GRAD = {
  adrenalin:['#7f1d1d','#ef4444'], adrenaline:['#7f1d1d','#ef4444'],
  avslapning:['#134e4a','#14b8a6'], relaxation:['#134e4a','#14b8a6'],
  kultur:['#312e81','#7c3aed'], culture:['#312e81','#7c3aed'],
  mat:['#78350f','#d97706'], food:['#78350f','#d97706'],
  natur:['#064e3b','#0d9488'], nature:['#064e3b','#0d9488'],
  sosial:['#4c1d95','#a78bfa'], social:['#4c1d95','#a78bfa'],
  uteliv:['#831843','#db2777'], nightlife:['#831843','#db2777'],
  luksus:['#713f12','#f59e0b'], luxury:['#713f12','#f59e0b'],
  spontan:['#1e3a5f','#3b82f6'], spontaneous:['#1e3a5f','#3b82f6'],
  læring:['#3b0764','#c084fc'], learning:['#3b0764','#c084fc'],
  shopping:['#581c87','#e879f9'],
  tempo:['#1e1b4b','#4338ca'],
  pace:['#1e1b4b','#4338ca'],
  default:['#1e1b4b','#4338ca']
};

const PREF_CAT_LABELS = {
  no: { adrenalin:'Adrenalin', avslapning:'Avslapning', kultur:'Kultur', mat:'Mat & Drikke', natur:'Natur', sosial:'Sosial', uteliv:'Uteliv', luksus:'Luksus', spontan:'Spontan', læring:'Læring', shopping:'Shopping', tempo:'Tempo' },
  en: { adrenaline:'Adrenaline', relaxation:'Relaxation', culture:'Culture', food:'Food & Drink', nature:'Nature', social:'Social', nightlife:'Nightlife', luxury:'Luxury', spontaneous:'Spontaneous', learning:'Learning', shopping:'Shopping', pace:'Pace' }
};

const DEST_DB_COORDS = {"barcelona": {"lat": 41.3874, "lng": 2.1686, "name": "Barcelona"}, "paris": {"lat": 48.8566, "lng": 2.3522, "name": "Paris"}, "roma": {"lat": 41.9028, "lng": 12.4964, "name": "Roma"}, "rome": {"lat": 41.9028, "lng": 12.4964, "name": "Rome"}, "london": {"lat": 51.5074, "lng": -0.1278, "name": "London"}, "istanbul": {"lat": 41.0082, "lng": 28.9784, "name": "Istanbul"}, "amsterdam": {"lat": 52.3676, "lng": 4.9041, "name": "Amsterdam"}, "berlin": {"lat": 52.52, "lng": 13.405, "name": "Berlin"}, "prague": {"lat": 50.0755, "lng": 14.4378, "name": "Praha"}, "vienna": {"lat": 48.2082, "lng": 16.3738, "name": "Wien"}, "lisbon": {"lat": 38.7223, "lng": -9.1393, "name": "Lisboa"}, "athens": {"lat": 37.9838, "lng": 23.7275, "name": "Athen"}, "dublin": {"lat": 53.3498, "lng": -6.2603, "name": "Dublin"}, "edinburgh": {"lat": 55.9533, "lng": -3.1883, "name": "Edinburgh"}, "budapest": {"lat": 47.4979, "lng": 19.0402, "name": "Budapest"}, "copenhagen": {"lat": 55.6761, "lng": 12.5683, "name": "København"}, "stockholm": {"lat": 59.3293, "lng": 18.0686, "name": "Stockholm"}, "oslo": {"lat": 59.9139, "lng": 10.7522, "name": "Oslo"}, "helsinki": {"lat": 60.1699, "lng": 24.9384, "name": "Helsinki"}, "reykjavik": {"lat": 64.1466, "lng": -21.9426, "name": "Reykjavik"}, "dubrovnik": {"lat": 42.6507, "lng": 18.0944, "name": "Dubrovnik"}, "santorini": {"lat": 36.3932, "lng": 25.4615, "name": "Santorini"}, "florence": {"lat": 43.7696, "lng": 11.2558, "name": "Firenze"}, "venice": {"lat": 45.4408, "lng": 12.3155, "name": "Venezia"}, "seville": {"lat": 37.3891, "lng": -5.9845, "name": "Sevilla"}, "munich": {"lat": 48.1351, "lng": 11.582, "name": "München"}, "krakow": {"lat": 50.0647, "lng": 19.945, "name": "Kraków"}, "bruges": {"lat": 51.2093, "lng": 3.2247, "name": "Brugge"}, "porto": {"lat": 41.1579, "lng": -8.6291, "name": "Porto"}, "nice": {"lat": 43.7102, "lng": 7.262, "name": "Nice"}, "zurich": {"lat": 47.3769, "lng": 8.5417, "name": "Zürich"}, "bergen": {"lat": 60.3913, "lng": 5.3221, "name": "Bergen"}, "tromsø": {"lat": 69.6492, "lng": 18.9553, "name": "Tromsø"}, "goa": {"lat": 15.3, "lng": 73.8333, "name": "Goa"}, "bali": {"lat": -8.3405, "lng": 115.2605, "name": "Bali"}, "bangkok": {"lat": 13.7563, "lng": 100.5018, "name": "Bangkok"}, "tokyo": {"lat": 35.6762, "lng": 139.6503, "name": "Tokyo"}, "singapore": {"lat": 1.3521, "lng": 103.8198, "name": "Singapore"}, "auckland": {"lat": -37.0882, "lng": 174.8853, "name": "Auckland"}, "dubai": {"lat": 25.2048, "lng": 55.2708, "name": "Dubai"}, "kyoto": {"lat": 35.0116, "lng": 135.7681, "name": "Kyoto"}, "seoul": {"lat": 37.5665, "lng": 126.978, "name": "Seoul"}, "hong kong": {"lat": 22.2783, "lng": 114.1747, "name": "Hong Kong"}, "mexico city": {"lat": 19.4326, "lng": -99.1332, "name": "Mexico City"}, "buenos aires": {"lat": -34.6037, "lng": -58.3816, "name": "Buenos Aires"}, "rio de janeiro": {"lat": -22.9068, "lng": -43.1729, "name": "Rio de Janeiro"}, "lima": {"lat": -12.0464, "lng": -77.0428, "name": "Lima"}, "cartagena": {"lat": 10.3906, "lng": -75.5, "name": "Cartagena"}, "vancouver": {"lat": 49.2827, "lng": -123.1207, "name": "Vancouver"}, "new york": {"lat": 40.7128, "lng": -74.006, "name": "New York"}, "miami": {"lat": 25.7617, "lng": -80.1918, "name": "Miami"}, "los angeles": {"lat": 34.0522, "lng": -118.2437, "name": "Los Angeles"}};

// ============================================================================
// THEME & STRINGS
// ============================================================================

const T = {
  bg: '#0a0d1a',
  card: 'rgba(20,24,42,0.88)',
  gold: '#d4a574',
  teal: '#2dd4bf',
  txt: '#e8e2d8',
  dim: '#7a7b8e',
  red: '#f87171',
  green: '#34d399',
  border: 'rgba(255,255,255,0.06)',
};

const POPULAR_DESTS = Object.keys(DEST_DB_COORDS).map(k => DEST_DB_COORDS[k].name).slice(0, 15);

const STRINGS = {
  no: {
    title: 'Travel Swish',
    landing: {
      hero: 'Finn opplevelser som handler om DEG',
      tagline: 'Sveip gjennom kort for å vise oss hvem du er. Få AI-drevne opplevelser perfekt personalisert.',
      cta: 'Kom i gang',
      features: [
        { title: 'Sveip personlighet', desc: 'Fortell oss hva du liker gjennom intuitive kort' },
        { title: 'AI matching', desc: 'Vår agent matcher din stil med skjulte perler' },
        { title: 'Reelle bookinger', desc: 'Alt er faktisk bookbart, ingen fiktive opplevelser' },
        { title: 'Lærer over tid', desc: 'Jo mer du sveiper, jo bedre blir matchene' }
      ],
      howitworks: 'Slik fungerer det',
      step1: 'Velg destinasjon',
      step1desc: 'Fortell oss hvor du skal reise',
      step2: 'Sveip preferanser',
      step2desc: '30 kort som avslører hvem du er',
      step3: 'Få resultater',
      step3desc: 'AI finner dine perfekte opplevelser',
      about: 'Om Travel Swish',
      aboutdesc: 'Travel Swish bruker kunstig intelligens og personlighetsanalyse for å finne opplevelser som virkelig passer DEG. Vi tror reiser handler om å bli kjent med seg selv gjennom nye opplevelser.',
      cta2: 'Start din reise nå',
    },
    home: {
      compass: '🧭',
      heading: 'Hvor skal du?',
      destLabel: 'Destinasjon',
      destPlaceholder: 'Barcelona, Paris, Tokyo...',
      apiLabel: 'Anthropic API-nøkkel',
      apiDesc: 'Din nøkkel lagres kun i nettleseren og sendes bare til Anthropic.',
      apiGuide: 'Hvordan får du API-nøkkelen din?',
      apiStep1: 'Gå til console.anthropic.com',
      apiStep2: 'Opprett en gratis konto',
      apiStep3: 'Klikk "API Keys" og lag en ny nøkkel',
      apiStep4: 'Kopier nøkkelen og lim inn den her',
      confirmBtn: 'Bekreft og start →',
      keySaved: '✅ Nøkkel lagret',
      changeKey: 'Endre nøkkel',
      required: 'Destinasjon er påkrevd',
      apiRequired: 'API-nøkkel er påkrevd',
      popularDests: 'Populære destinasjoner',
    },
    swipe: {
      heading: 'Hva slags reisende er du?',
      progress: 'Kort {current} av {total}',
      yes: 'JA ❤️',
      no: 'NEI 👋',
      swipeHint: '← sveip for å velge →',
      profileBuilt: 'Profil bygget!',
      summary: 'Din profil er bygget. La AI-en finne dine perfekte opplevelser.',
      findBtn: '🔍 Finn opplevelser for meg',
      minSwipes: 'Minst 20 sveiper kreves',
      choiceTitle: 'Du er godt i gang!',
      choiceDesc: 'Du har sveipt gjennom 30 kort. Vil du fortsette for enda bedre matching, eller la AI-en finne opplevelser nå?',
      continueBtn: '🃏 Fortsett å sveipe',
      findNowBtn: '✨ Finn opplevelser nå',
    },
    results: {
      heading: 'Dine personaliserte opplevelser i',
      mapTitle: '📍',
      whyThisFits: 'Hvorfor passer denne deg?',
      bookBtn: 'Book nå →',
      exploreBtn: '🧭 Utforsk ny destinasjon',
      noExp: 'Ingen opplevelser funnet',
      all: 'Alle',
      loadMore: '🔄 Hent flere opplevelser',
      loadingMore: 'Henter flere...',
    },
    memory: {
      totalSwipes: 'Totalt sveipet',
      level: 'Nivå',
      resetTitle: 'Nullstill minne',
      resetDesc: 'Vil du slette alle preferanser og starte på nytt?',
      resetBtn: '🗑️ Nullstill alt',
      resetCancel: 'Avbryt',
      skipTitle: 'Vi kjenner deg allerede!',
      skipDesc: 'Du har sveipt {count} kort. Vi kan finne opplevelser direkte basert på profilen din.',
      skipBtn: '✨ Finn opplevelser direkte',
      orSwipe: 'Eller fortsett å sveipe for enda bedre treff',
      keepGoing: '🃏 Fortsett å sveipe',
      newCards: 'Nye kort genereres...',
      allCardsDone: 'Du har sveipt alle {count} kort! La oss finne noe fantastisk.',
      tryNewDest: '🌍 Prøv en ny destinasjon for å oppdage flere opplevelser!',
    },
    loading: {
      searching: 'AI-agenten søker etter opplevelser som passer din profil i',
      scanning: 'Skanner verden etter skjulte perler...',
      analyzing: 'Analyserer din reiseprofil...',
      curating: 'Kuraterer perfekte opplevelser...',
    },
    nav: {
      lang: 'EN',
      back: '← Tilbake',
    }
  },
  en: {
    title: 'Travel Swish',
    landing: {
      hero: 'Find experiences that are about YOU',
      tagline: 'Swipe through cards to show us who you are. Get AI-powered experiences perfectly personalized.',
      cta: 'Get started',
      features: [
        { title: 'Swipe personality', desc: 'Tell us what you like through intuitive cards' },
        { title: 'AI matching', desc: 'Our agent matches your style with hidden gems' },
        { title: 'Real bookings', desc: 'Everything is actually bookable, no fiction' },
        { title: 'Learns over time', desc: 'The more you swipe, the better the matches' }
      ],
      howitworks: 'How it works',
      step1: 'Choose destination',
      step1desc: 'Tell us where you\'re traveling',
      step2: 'Swipe preferences',
      step2desc: '30 cards that reveal who you are',
      step3: 'Get results',
      step3desc: 'AI finds your perfect experiences',
      about: 'About Travel Swish',
      aboutdesc: 'Travel Swish uses artificial intelligence and personality analysis to find experiences that truly fit YOU. We believe travel is about discovering yourself through new experiences.',
      cta2: 'Start your journey now',
    },
    home: {
      compass: '🧭',
      heading: 'Where are you traveling?',
      destLabel: 'Destination',
      destPlaceholder: 'Barcelona, Paris, Tokyo...',
      apiLabel: 'Anthropic API key',
      apiDesc: 'Your key is stored only in your browser and sent only to Anthropic.',
      apiGuide: 'How to get your API key?',
      apiStep1: 'Go to console.anthropic.com',
      apiStep2: 'Create a free account',
      apiStep3: 'Click "API Keys" and create a new key',
      apiStep4: 'Copy the key and paste it below',
      confirmBtn: 'Confirm and start →',
      keySaved: '✅ Key saved',
      changeKey: 'Change key',
      required: 'Destination is required',
      apiRequired: 'API key is required',
      popularDests: 'Popular destinations',
    },
    swipe: {
      heading: 'What kind of traveler are you?',
      progress: 'Card {current} of {total}',
      yes: 'YES ❤️',
      no: 'NO 👋',
      swipeHint: '← swipe to choose →',
      profileBuilt: 'Profile built!',
      summary: 'Your profile is built. Let our AI find your perfect experiences.',
      findBtn: '🔍 Find experiences for me',
      minSwipes: 'At least 20 swipes required',
      choiceTitle: 'You\'re on a roll!',
      choiceDesc: 'You\'ve swiped through 30 cards. Want to continue for even better matching, or let the AI find experiences now?',
      continueBtn: '🃏 Keep swiping',
      findNowBtn: '✨ Find experiences now',
    },
    results: {
      heading: 'Your personalized experiences in',
      mapTitle: '📍',
      whyThisFits: 'Why this fits you?',
      bookBtn: 'Book now →',
      exploreBtn: '🧭 Explore new destination',
      noExp: 'No experiences found',
      all: 'All',
      loadMore: '🔄 Load more experiences',
      loadingMore: 'Loading more...',
    },
    memory: {
      totalSwipes: 'Total swipes',
      level: 'Level',
      resetTitle: 'Reset memory',
      resetDesc: 'Do you want to delete all preferences and start over?',
      resetBtn: '🗑️ Reset everything',
      resetCancel: 'Cancel',
      skipTitle: 'We already know you!',
      skipDesc: 'You\'ve swiped {count} cards. We can find experiences directly based on your profile.',
      skipBtn: '✨ Find experiences directly',
      orSwipe: 'Or keep swiping for even better matches',
      keepGoing: '🃏 Keep swiping',
      newCards: 'Generating new cards...',
      allCardsDone: 'You\'ve swiped all {count} cards! Let\'s find something amazing.',
      tryNewDest: '🌍 Try a new destination to discover more experiences!',
    },
    loading: {
      searching: 'Our AI agent is searching for experiences matching your profile in',
      scanning: 'Scanning the world for hidden gems...',
      analyzing: 'Analyzing your travel profile...',
      curating: 'Curating perfect experiences...',
    },
    nav: {
      lang: 'NO',
      back: '← Back',
    }
  }
};

// ============================================================================
// MEMORY & PERSISTENCE (localStorage)
// ============================================================================

const STORAGE_KEYS = {
  swipes: 'ts_swipes',
  totalSwipes: 'ts_totalSwipes',
  seenExperiences: 'ts_seenExperiences',
  apiKey: 'apiKey',
};

function loadMemory() {
  try {
    const swipes = JSON.parse(localStorage.getItem(STORAGE_KEYS.swipes) || '{}');
    const totalSwipes = parseInt(localStorage.getItem(STORAGE_KEYS.totalSwipes) || '0', 10);
    const seenExperiences = JSON.parse(localStorage.getItem(STORAGE_KEYS.seenExperiences) || '[]');
    return { swipes, totalSwipes, seenExperiences };
  } catch { return { swipes: {}, totalSwipes: 0, seenExperiences: [] }; }
}

function saveSwipes(swipes, totalSwipes) {
  try {
    localStorage.setItem(STORAGE_KEYS.swipes, JSON.stringify(swipes));
    localStorage.setItem(STORAGE_KEYS.totalSwipes, String(totalSwipes));
  } catch {}
}

function saveSeenExperiences(seen) {
  try { localStorage.setItem(STORAGE_KEYS.seenExperiences, JSON.stringify(seen)); } catch {}
}

function clearMemory() {
  try {
    localStorage.removeItem(STORAGE_KEYS.swipes);
    localStorage.removeItem(STORAGE_KEYS.totalSwipes);
    localStorage.removeItem(STORAGE_KEYS.seenExperiences);
  } catch {}
}

// ============================================================================
// LEVEL SYSTEM
// ============================================================================

const LEVELS = {
  no: [
    { min: 0,   label: 'Nysgjerrig reisende', emoji: '🌱', desc: 'Vi vet lite om deg enn\u00e5 \u2014 sveip videre!' },
    { min: 30,  label: 'Vi begynner \u00e5 bli kjent', emoji: '🌿', desc: 'Profilen din tar form.' },
    { min: 60,  label: 'God forst\u00e5else', emoji: '🌳', desc: 'Vi kjenner stilen din godt.' },
    { min: 90,  label: 'Dine preferanser er klare', emoji: '⭐', desc: 'Matchene er nå treffsikre.' },
    { min: 120, label: 'Ekspert-match', emoji: '🏆', desc: 'Vi finner skjulte perler for deg.' },
    { min: 150, label: 'Perfekt personalisering', emoji: '💎', desc: 'Vi kjenner deg som en bok.' },
  ],
  en: [
    { min: 0,   label: 'Curious traveler', emoji: '🌱', desc: 'We know little about you yet \u2014 keep swiping!' },
    { min: 30,  label: 'Getting to know you', emoji: '🌿', desc: 'Your profile is taking shape.' },
    { min: 60,  label: 'Good understanding', emoji: '🌳', desc: 'We know your style well.' },
    { min: 90,  label: 'Preferences are clear', emoji: '⭐', desc: 'Matches are accurate now.' },
    { min: 120, label: 'Expert match', emoji: '🏆', desc: 'We find hidden gems for you.' },
    { min: 150, label: 'Perfect personalization', emoji: '💎', desc: 'We know you like a book.' },
  ],
};

function getLevel(totalSwipes, lang) {
  const levels = LEVELS[lang] || LEVELS.en;
  let current = levels[0];
  for (const lv of levels) {
    if (totalSwipes >= lv.min) current = lv;
  }
  const idx = levels.indexOf(current);
  const next = levels[idx + 1] || null;
  const progressInLevel = next ? (totalSwipes - current.min) / (next.min - current.min) : 1;
  return { ...current, idx, next, progressInLevel: Math.min(1, progressInLevel), totalSwipes };
}

// ============================================================================
// UTILITIES
// ============================================================================

function shuffleArray(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function parseJSON(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

async function askClaude(prompt, apiKey) {
  // Robust key handling: state can be lost on mobile; fall back to localStorage.
  const key = apiKey || (typeof window !== 'undefined' ? (window.localStorage?.getItem('apiKey') || '') : '');
  if (!key) throw new Error('API-nøkkel er påkrevd / API key is required');

  const timeoutMs = 90000;
  const fetchPromise = fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: 'You are a world-class travel expert. Use web_search to find REAL, current, bookable experiences. After searching, respond with ONLY a raw JSON array (no markdown, no backticks, no extra text). Each object: {name, why (2-3 sentences explaining fit), quote (short real reviewer quote or empty string), cat, url, price, duration, match (0-100), lat, lng}. Sort by match descending.',
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Tidsavbrudd (90s). Prøv igjen. / Request timed out. Try again.')), timeoutMs)
  );

  const res = await Promise.race([fetchPromise, timeoutPromise]);

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('Ugyldig API-nøkkel / Invalid API key');
    if (res.status === 429) throw new Error('For mange forespørsler, prøv igjen / Rate limited, try again');
    throw new Error(errBody.error?.message || 'API-feil ' + res.status);
  }

  const data = await res.json();
  const textBlocks = (data.content || []).filter(b => b.type === 'text').map(b => b.text);
  return textBlocks.join('\n');
}

function calcProfile(swipes, cards) {
  const dims = { adv: 0, soc: 0, lux: 0, act: 0, cul: 0, nat: 0, food: 0, night: 0, spont: 0 };
  const dimNames = Object.keys(dims);

  cards.forEach(card => {
    const swipe = swipes[card.id];
    if (swipe) {
      const weight = swipe > 0 ? 1.0 : -0.3;
      dimNames.forEach(dim => {
        dims[dim] += (card.dims[dim] || 0) * weight;
      });
    }
  });

  const counts = { adv: 0, soc: 0, lux: 0, act: 0, cul: 0, nat: 0, food: 0, night: 0, spont: 0 };
  cards.forEach(card => {
    if (swipes[card.id]) {
      dimNames.forEach(dim => {
        counts[dim] += Math.abs(card.dims[dim] || 0);
      });
    }
  });

  dimNames.forEach(dim => {
    if (counts[dim] > 0) dims[dim] = (dims[dim] / counts[dim]) * 100;
  });

  dimNames.forEach(dim => {
    dims[dim] = Math.max(-100, Math.min(100, dims[dim]));
  });

  return dims;
}

function describeProfile(dims, lang) {
  const labels = lang === 'no'
    ? { adv: 'Aventyrlyst', soc: 'Sosial', lux: 'Luksus', act: 'Aktiv', cul: 'Kultur', nat: 'Natur', food: 'Mat', night: 'Uteliv', spont: 'Spontan' }
    : { adv: 'Adventurous', soc: 'Social', lux: 'Luxury', act: 'Active', cul: 'Cultural', nat: 'Nature', food: 'Food', night: 'Nightlife', spont: 'Spontaneous' };

  const parts = [];
  Object.entries(dims).forEach(([k, v]) => {
    if (Math.abs(v) > 10) {
      const level = Math.abs(v) > 70 ? 'very' : Math.abs(v) > 40 ? 'moderately' : 'somewhat';
      const dir = v > 0 ? '' : ' not';
      parts.push(`${level}${dir} ${labels[k].toLowerCase()} (${k}:${Math.round(v)})`);
    }
  });
  return parts.join(', ') || (lang === 'no' ? 'balansert reisende' : 'balanced traveler');
}

function buildExperiencePrompt(dest, profileText, lang, excludeNames) {
  const excludeStr = excludeNames && excludeNames.length > 0
    ? (lang === 'no'
        ? `\nUNNGÅ disse opplevelsene som allerede er vist: ${excludeNames.join(', ')}.`
        : `\nEXCLUDE these already-shown experiences: ${excludeNames.join(', ')}.`)
    : '';
  return lang === 'no'
    ? `Søk etter opplevelser i ${dest} for denne profilen: ${profileText}.${excludeStr}\nReturner en JSON-array med 8-10 opplevelser sortert etter match (høyest først). Hvert objekt: {"name":"...","why":"2-3 setninger om hvorfor denne passer brukerens profil","quote":"en kort anmeldelse/sitat fra en ekte anmelder hvis mulig, ellers tom streng","cat":"kategori","url":"booking-url","price":"ca pris","duration":"varighet","match":0-100,"lat":0.0,"lng":0.0}. Fokus på hidden gems og ekte bookbare opplevelser. KUN JSON-array, ingen annen tekst.`
    : `Search for experiences in ${dest} for this profile: ${profileText}.${excludeStr}\nReturn a JSON array of 8-10 experiences sorted by match (highest first). Each object: {"name":"...","why":"2-3 sentences on why this fits the user profile","quote":"a short real reviewer quote if available, otherwise empty string","cat":"category","url":"booking-url","price":"approx","duration":"duration","match":0-100,"lat":0.0,"lng":0.0}. Focus on hidden gems and real bookable experiences. ONLY JSON array, no other text.`;
}

// ============================================================================
// LANDING PAGE
// ============================================================================

// Animated floating cards for landing page background
function FloatingCards() {
  const cards = [
    { emoji: '🪂', x: 8, y: 15, delay: 0, size: 52, rot: -12 },
    { emoji: '🍜', x: 82, y: 10, delay: 1.2, size: 44, rot: 8 },
    { emoji: '🏛️', x: 15, y: 70, delay: 2.5, size: 40, rot: -6 },
    { emoji: '🌅', x: 88, y: 65, delay: 0.8, size: 48, rot: 15 },
    { emoji: '🎵', x: 50, y: 85, delay: 3.2, size: 38, rot: -10 },
    { emoji: '🧘', x: 72, y: 40, delay: 1.8, size: 36, rot: 5 },
    { emoji: '🍸', x: 25, y: 42, delay: 2.8, size: 34, rot: -8 },
  ];
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {cards.map((c, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${c.x}%`, top: `${c.y}%`,
          fontSize: c.size, opacity: 0.12,
          transform: `rotate(${c.rot}deg)`,
          animation: `landingFloat ${6 + i}s ease-in-out ${c.delay}s infinite`,
          filter: 'blur(0.5px)',
        }}>{c.emoji}</div>
      ))}
    </div>
  );
}

// Animated demo phone with auto-swiping cards
function DemoPhone({ lang }) {
  const [demoIdx, setDemoIdx] = useState(0);
  const [demoDir, setDemoDir] = useState(null); // 'left' | 'right'
  const demoCards = [
    { emoji: '🪂', q: lang === 'no' ? 'Fallskjerm?' : 'Skydiving?', grad: PREF_CAT_GRAD.adrenaline },
    { emoji: '🍜', q: lang === 'no' ? 'Street food?' : 'Street food?', grad: PREF_CAT_GRAD.food },
    { emoji: '🧘', q: 'Yoga?', grad: PREF_CAT_GRAD.relaxation },
    { emoji: '🏛️', q: lang === 'no' ? 'Museer?' : 'Museums?', grad: PREF_CAT_GRAD.culture },
    { emoji: '💃', q: lang === 'no' ? 'Dans?' : 'Dancing?', grad: PREF_CAT_GRAD.nightlife },
  ];
  useEffect(() => {
    const timer = setInterval(() => {
      const dir = Math.random() > 0.4 ? 'right' : 'left';
      setDemoDir(dir);
      setTimeout(() => {
        setDemoDir(null);
        setDemoIdx(i => (i + 1) % demoCards.length);
      }, 500);
    }, 2200);
    return () => clearInterval(timer);
  }, []);
  const dc = demoCards[demoIdx];
  const tx = demoDir === 'right' ? 160 : demoDir === 'left' ? -160 : 0;
  const rot = demoDir === 'right' ? 15 : demoDir === 'left' ? -15 : 0;
  const opac = demoDir ? 0.3 : 1;
  return (
    <div style={{
      width: 'clamp(200px, 55vw, 260px)', height: 'clamp(380px, 90vw, 480px)',
      background: T.card, borderRadius: '1.8rem', padding: '10px',
      border: `1px solid ${T.border}`, boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 0 60px rgba(212,165,116,0.08)`,
      position: 'relative', flexShrink: 0,
    }}>
      {/* Notch */}
      <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 60, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 4, zIndex: 2 }}/>
      {/* Demo card */}
      <div style={{
        width: '100%', height: '100%',
        background: `linear-gradient(135deg, ${dc.grad[0]}, ${dc.grad[1]})`,
        borderRadius: '1.3rem', padding: '1.5rem',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: '#fff',
        transform: `translateX(${tx}px) rotate(${rot}deg) scale(${demoDir ? 0.95 : 1})`,
        opacity: opac,
        transition: demoDir ? 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1)' : 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {/* Stamps */}
        {demoDir === 'right' && <div style={{ position: 'absolute', top: 16, left: 16, border: `2px solid ${T.green}`, color: T.green, fontWeight: 800, fontSize: 14, padding: '4px 10px', borderRadius: 6, transform: 'rotate(-12deg)', opacity: 0.9 }}>YES</div>}
        {demoDir === 'left' && <div style={{ position: 'absolute', top: 16, right: 16, border: `2px solid ${T.red}`, color: T.red, fontWeight: 800, fontSize: 14, padding: '4px 10px', borderRadius: 6, transform: 'rotate(12deg)', opacity: 0.9 }}>NO</div>}
        <div style={{ fontSize: 'clamp(2.5rem, 12vw, 3.5rem)', marginBottom: 12 }}>{dc.emoji}</div>
        <div style={{ fontSize: 'clamp(1rem, 4vw, 1.2rem)', fontFamily: 'Playfair Display, serif', fontWeight: 'bold' }}>{dc.q}</div>
      </div>
    </div>
  );
}

function LandingPage({ onStart, lang, onLangChange }) {
  const S = STRINGS[lang];
  const [scrollY, setScrollY] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = () => setScrollY(el.scrollTop);
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', background: T.bg, overflow: 'auto', fontFamily: 'DM Sans, sans-serif', scrollBehavior: 'smooth' }}>
      {/* Sticky Nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: scrollY > 50 ? 'rgba(10, 13, 26, 0.97)' : 'transparent', backdropFilter: scrollY > 50 ? 'blur(12px)' : 'none', borderBottom: scrollY > 50 ? `1px solid ${T.border}` : '1px solid transparent', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.4s' }}>
        <div style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', fontWeight: 'bold', color: T.gold, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: 'clamp(1.2rem, 5vw, 1.6rem)' }}>✈️</span> {S.title}
        </div>
        <button onClick={() => onLangChange(lang === 'no' ? 'en' : 'no')} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.border}`, color: T.txt, padding: '0.4rem 0.9rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s' }}>
          🌐 {S.nav.lang}
        </button>
      </div>

      {/* ===== HERO ===== */}
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        padding: 'clamp(2rem, 6vh, 5rem) clamp(1rem, 4vw, 2.5rem)', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <FloatingCards />

        {/* Ambient blobs */}
        <div style={{ position: 'absolute', top: '-15%', right: '-8%', width: 'clamp(250px, 50vw, 500px)', height: 'clamp(250px, 50vw, 500px)', background: 'radial-gradient(circle, rgba(212,165,116,0.12), transparent 70%)', borderRadius: '50%', pointerEvents: 'none', animation: 'blobPulse 8s ease-in-out infinite' }}/>
        <div style={{ position: 'absolute', bottom: '-10%', left: '-8%', width: 'clamp(200px, 45vw, 400px)', height: 'clamp(200px, 45vw, 400px)', background: 'radial-gradient(circle, rgba(45,212,191,0.1), transparent 70%)', borderRadius: '50%', pointerEvents: 'none', animation: 'blobPulse 10s ease-in-out 2s infinite' }}/>

        {/* Hero content + phone side by side on desktop, stacked on mobile */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(2rem, 5vw, 5rem)',
          maxWidth: 1100, width: '100%', flexWrap: 'wrap', position: 'relative', zIndex: 1,
        }}>
          {/* Text */}
          <div style={{ flex: '1 1 340px', textAlign: 'left', maxWidth: 540, animation: 'heroSlideIn 0.8s ease-out' }}>
            <div style={{ display: 'inline-block', background: 'rgba(212,165,116,0.1)', border: `1px solid rgba(212,165,116,0.2)`, borderRadius: '2rem', padding: '0.35rem 1rem', marginBottom: '1.2rem', fontSize: 'clamp(0.75rem, 2vw, 0.85rem)', color: T.gold, fontWeight: 600 }}>
              ✨ {lang === 'no' ? 'AI-drevet reiseplanlegger' : 'AI-powered travel planner'}
            </div>
            <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontFamily: 'Playfair Display, serif', color: T.txt, marginBottom: '1rem', lineHeight: 1.15, fontWeight: 700, letterSpacing: '-0.5px' }}>
              {S.landing.hero}
            </h1>
            <p style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)', color: T.dim, marginBottom: '2rem', lineHeight: 1.7 }}>
              {S.landing.tagline}
            </p>
            <button onClick={onStart} style={{
              padding: 'clamp(0.8rem, 2vw, 1rem) clamp(1.5rem, 4vw, 2.5rem)', fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
              background: `linear-gradient(135deg, ${T.gold}, ${T.teal})`, color: T.bg, border: 'none', borderRadius: '2rem',
              cursor: 'pointer', fontWeight: 'bold', boxShadow: `0 16px 50px rgba(212,165,116,0.25)`,
              transition: 'all 0.3s', position: 'relative', overflow: 'hidden',
            }}>
              {S.landing.cta} →
            </button>
          </div>

          {/* Demo Phone */}
          <div style={{ flex: '0 0 auto', animation: 'heroPhoneIn 1s ease-out 0.2s both' }}>
            <DemoPhone lang={lang} />
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{ position: 'absolute', bottom: 'clamp(1rem, 3vh, 2rem)', animation: 'scrollBounce 2s ease-in-out infinite', opacity: scrollY > 80 ? 0 : 0.5, transition: 'opacity 0.5s' }}>
          <div style={{ width: 24, height: 40, border: `2px solid ${T.dim}`, borderRadius: 12, position: 'relative' }}>
            <div style={{ width: 4, height: 8, background: T.gold, borderRadius: 2, position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', animation: 'scrollDot 2s ease-in-out infinite' }}/>
          </div>
        </div>
      </div>

      {/* ===== HOW IT WORKS ===== */}
      <div style={{ padding: 'clamp(3rem, 8vh, 5rem) clamp(1rem, 4vw, 2.5rem)', background: `linear-gradient(180deg, ${T.bg}, rgba(20,24,42,1))` }}>
        <h2 style={{ fontSize: 'clamp(1.6rem, 5vw, 2.3rem)', fontFamily: 'Playfair Display, serif', color: T.txt, textAlign: 'center', marginBottom: 'clamp(2rem, 5vh, 3.5rem)' }}>
          {S.landing.howitworks}
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(1.5rem, 4vw, 3rem)', maxWidth: 900, margin: '0 auto', flexWrap: 'wrap' }}>
          {[
            { num: '1', title: S.landing.step1, desc: S.landing.step1desc, emoji: '🗺️', grad: ['#1e3a5f','#3b82f6'] },
            { num: '2', title: S.landing.step2, desc: S.landing.step2desc, emoji: '👆', grad: [PREF_CAT_GRAD.adrenaline[0], PREF_CAT_GRAD.adrenaline[1]] },
            { num: '3', title: S.landing.step3, desc: S.landing.step3desc, emoji: '✨', grad: ['#064e3b','#0d9488'] }
          ].map((step, i) => (
            <div key={i} style={{
              flex: '1 1 220px', maxWidth: 280, textAlign: 'center',
              background: T.card, border: `1px solid ${T.border}`, borderRadius: '1.2rem',
              padding: 'clamp(1.5rem, 3vw, 2rem)', position: 'relative', overflow: 'hidden',
              animation: `fadeUp 0.6s ease-out ${0.15 * i}s both`,
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${step.grad[0]}, ${step.grad[1]})` }}/>
              <div style={{
                width: 44, height: 44, background: `linear-gradient(135deg, ${step.grad[0]}, ${step.grad[1]})`,
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem', fontSize: '1rem', fontWeight: 'bold', color: '#fff',
              }}>{step.num}</div>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{step.emoji}</div>
              <h3 style={{ color: T.txt, marginBottom: '0.4rem', fontWeight: 'bold', fontSize: 'clamp(0.95rem, 2.5vw, 1.05rem)' }}>{step.title}</h3>
              <p style={{ color: T.dim, fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== FEATURES ===== */}
      <div style={{ padding: 'clamp(3rem, 8vh, 5rem) clamp(1rem, 4vw, 2.5rem)', background: 'rgba(20,24,42,1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(200px, 40vw, 250px), 1fr))', gap: 'clamp(1rem, 2vw, 1.5rem)', maxWidth: 1000, margin: '0 auto' }}>
          {S.landing.features.map((feat, i) => {
            const emojis = ['🎯', '🤖', '✅', '⏰'];
            const grads = [['#713f12','#f59e0b'], ['#312e81','#7c3aed'], ['#064e3b','#0d9488'], ['#4c1d95','#a78bfa']];
            return (
              <div key={i} style={{
                background: T.card, border: `1px solid ${T.border}`, borderRadius: '1rem',
                padding: 'clamp(1.2rem, 3vw, 1.8rem)', display: 'flex', gap: '1rem', alignItems: 'flex-start',
                animation: `fadeUp 0.5s ease-out ${0.1 * i}s both`,
              }}>
                <div style={{
                  width: 42, height: 42, minWidth: 42, borderRadius: '0.75rem',
                  background: `linear-gradient(135deg, ${grads[i][0]}, ${grads[i][1]})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
                }}>{emojis[i]}</div>
                <div>
                  <h3 style={{ color: T.txt, marginBottom: '0.3rem', fontWeight: 'bold', fontSize: 'clamp(0.9rem, 2vw, 1rem)', marginTop: 0 }}>{feat.title}</h3>
                  <p style={{ color: T.dim, fontSize: 'clamp(0.8rem, 2vw, 0.88rem)', lineHeight: 1.6, margin: 0 }}>{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== CTA BANNER ===== */}
      <div style={{
        padding: 'clamp(3rem, 8vh, 4rem) clamp(1rem, 4vw, 2.5rem)', textAlign: 'center',
        background: `linear-gradient(135deg, rgba(212,165,116,0.06), rgba(45,212,191,0.06))`,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'clamp(300px, 60vw, 600px)', height: 'clamp(300px, 60vw, 600px)', background: 'radial-gradient(circle, rgba(212,165,116,0.06), transparent 60%)', borderRadius: '50%', pointerEvents: 'none' }}/>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', color: T.txt, marginBottom: '0.8rem', position: 'relative' }}>
          {S.landing.about}
        </h2>
        <p style={{ color: T.dim, maxWidth: 600, margin: '0 auto clamp(1.5rem, 3vh, 2rem)', lineHeight: 1.7, fontSize: 'clamp(0.88rem, 2vw, 1rem)', position: 'relative' }}>
          {S.landing.aboutdesc}
        </p>
        <button onClick={onStart} style={{
          padding: 'clamp(0.8rem, 2vw, 1rem) clamp(1.5rem, 4vw, 2.5rem)', fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
          background: `linear-gradient(135deg, ${T.gold}, ${T.teal})`, color: T.bg, border: 'none', borderRadius: '2rem',
          cursor: 'pointer', fontWeight: 'bold', position: 'relative',
          boxShadow: `0 16px 50px rgba(212,165,116,0.2)`,
        }}>
          {S.landing.cta2} →
        </button>
      </div>

      {/* Footer */}
      <div style={{ padding: 'clamp(1rem, 3vh, 1.5rem)', textAlign: 'center', borderTop: `1px solid ${T.border}`, color: T.dim, fontSize: '0.8rem' }}>
        Made with ❤️ by Travel Swish
      </div>
    </div>
  );
}

// ============================================================================
// HOME PAGE
// ============================================================================

function HomePage({ lang, onStart, onBack }) {
  const S = STRINGS[lang];
  const [dest, setDest] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [forceKeyEntry, setForceKeyEntry] = useState(false);
  const [showApiGuide, setShowApiGuide] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const savedKey = typeof window !== 'undefined' ? (window.localStorage?.getItem('apiKey') || '') : '';

  function handleDestChange(val) {
    setDest(val);
    setError('');
    if (val.trim()) {
      const matches = POPULAR_DESTS.filter(d => d.toLowerCase().includes(val.toLowerCase())).slice(0, 5);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  }

  function handleStart() {
    if (!dest.trim()) {
      setError(S.home.required);
      return;
    }

    const key = (forceKeyEntry ? apiKey : (apiKey || savedKey));
    if (!key) {
      setError(S.home.apiRequired);
      return;
    }

    // Save/update key when user typed one explicitly (or when forcing entry)
    if (apiKey || forceKeyEntry) {
      try { window.localStorage?.setItem('apiKey', key.trim()); } catch { }
    }

    onStart({ destination: dest.trim(), apiKey: key.trim() });
  }

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: T.bg, padding: '2rem', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.gold, fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold' }}>
          {S.nav.back}
        </button>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: T.gold }}>✈️ {S.title}</div>
        <div style={{ width: '80px' }}/>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{S.home.compass}</div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.5rem', color: T.txt, marginBottom: '0.5rem' }}>{S.home.heading}</h1>
          <p style={{ color: T.dim, fontSize: '0.95rem' }}>{S.landing.step1desc}</p>
        </div>

        {/* Destination Input */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', color: T.txt, marginBottom: '0.5rem', fontSize: '0.95rem', fontWeight: '500' }}>{S.home.destLabel}</label>
          <input
            type="text"
            placeholder={S.home.destPlaceholder}
            value={dest}
            onChange={(e) => handleDestChange(e.target.value)}
            style={{ width: '100%', padding: '1rem', background: T.card, border: `1px solid ${T.border}`, borderRadius: '0.75rem', color: T.txt, fontSize: '1rem', boxSizing: 'border-box', fontFamily: 'DM Sans, sans-serif' }}
          />
          {suggestions.length > 0 && (
            <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {suggestions.map(s => (
                <button key={s} onClick={() => { setDest(s); setSuggestions([]); }} style={{ padding: '0.5rem 1rem', background: T.card, border: `1px solid ${T.border}`, color: T.gold, borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* API Key Section */}
        <div style={{ marginBottom: '2rem', background: T.card, border: `1px solid ${T.border}`, borderRadius: '1rem', padding: '1.5rem' }}>
          {(!savedKey || forceKeyEntry) && (
            <>
              <label style={{ display: 'block', color: T.txt, marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: '500' }}>{S.home.apiLabel}</label>
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setError(''); }}
                style={{ width: '100%', padding: '1rem', background: T.bg, border: `1px solid ${T.border}`, borderRadius: '0.5rem', color: T.txt, fontSize: '1rem', boxSizing: 'border-box', marginBottom: '0.5rem', fontFamily: 'monospace' }}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                style={{ fontSize: '0.8rem', background: 'none', border: 'none', color: T.gold, cursor: 'pointer', marginBottom: '1rem' }}
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
              <p style={{ fontSize: '0.8rem', color: T.dim, marginBottom: '1rem' }}>{S.home.apiDesc}</p>
            </>
          )}

          {savedKey && !forceKeyEntry && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ color: T.green, fontWeight: 'bold', marginBottom: '0.5rem' }}>{S.home.keySaved}</p>
              <button
                onClick={() => {
                  setForceKeyEntry(true);
                  setApiKey('');
                  setError('');
                }}
                style={{ fontSize: '0.85rem', background: T.bg, border: `1px solid ${T.border}`, color: T.txt, padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer' }}
              >
                {S.home.changeKey}
              </button>
            </div>
          )}

          {/* API Guide Toggle */}
          <button
            onClick={() => setShowApiGuide(!showApiGuide)}
            style={{ fontSize: '0.9rem', background: 'none', border: 'none', color: T.gold, cursor: 'pointer', fontWeight: 'bold', marginBottom: '1rem', textDecoration: 'underline' }}
          >
            {showApiGuide ? '▼' : '▶'} {S.home.apiGuide}
          </button>

          {showApiGuide && (
            <div style={{ background: T.bg, borderRadius: '0.5rem', padding: '1rem', marginTop: '1rem' }}>
              <ol style={{ color: T.txt, paddingLeft: '1.5rem', lineHeight: '1.8', margin: 0 }}>
                <li style={{ marginBottom: '0.75rem' }}>
                  {S.home.apiStep1}: <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style={{ color: T.teal, textDecoration: 'underline' }}>console.anthropic.com</a>
                </li>
                <li style={{ marginBottom: '0.75rem' }}>{S.home.apiStep2}</li>
                <li style={{ marginBottom: '0.75rem' }}>{S.home.apiStep3}</li>
                <li>{S.home.apiStep4}</li>
              </ol>
            </div>
          )}
        </div>

        {error && <p style={{ color: T.red, marginBottom: '1rem', fontSize: '0.9rem' }}>⚠️ {error}</p>}

        <button
          onClick={handleStart}
          style={{ width: '100%', padding: '1rem', background: `linear-gradient(135deg, ${T.gold}, ${T.teal})`, color: T.bg, border: 'none', borderRadius: '0.75rem', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s' }}
        >
          {S.home.confirmBtn}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SWIPE PAGE
// ============================================================================

function SwipeCard({ card, lang, onSwipe, isTop }) {
  const grad = PREF_CAT_GRAD[card.cat] || PREF_CAT_GRAD.default;
  const catLabels = PREF_CAT_LABELS[lang] || PREF_CAT_LABELS.en;
  const S = STRINGS[lang];
  const [offset, setOffset] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [flyAway, setFlyAway] = useState(null); // 'left' | 'right' | null
  const startX = useRef(0);
  const startY = useRef(0);
  const velocity = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);

  // Threshold to trigger swipe
  const SWIPE_THRESHOLD = 70;
  const VELOCITY_THRESHOLD = 0.5;

  function onDS(e) {
    if (!isTop || flyAway) return;
    setDragging(true);
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    startX.current = cx;
    startY.current = cy;
    lastX.current = cx;
    lastTime.current = Date.now();
    velocity.current = 0;
  }

  function onDM(e) {
    if (!dragging || !isTop || flyAway) return;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const now = Date.now();
    const dt = Math.max(1, now - lastTime.current);
    velocity.current = (cx - lastX.current) / dt;
    lastX.current = cx;
    lastTime.current = now;
    setOffset(cx - startX.current);
    setOffsetY((cy - startY.current) * 0.3);
  }

  function onDE() {
    if (!dragging || !isTop || flyAway) return;
    setDragging(false);
    const swipedFar = Math.abs(offset) > SWIPE_THRESHOLD;
    const swipedFast = Math.abs(velocity.current) > VELOCITY_THRESHOLD;
    if (swipedFar || swipedFast) {
      const dir = offset > 0 ? 'right' : 'left';
      setFlyAway(dir);
      setTimeout(() => onSwipe(dir === 'right' ? 1 : -1), 350);
    } else {
      // Spring back
      setOffset(0);
      setOffsetY(0);
    }
  }

  // Compute derived values
  const absOff = Math.abs(offset);
  const pct = Math.min(1, absOff / 140);
  const rotation = offset * 0.08;
  const isYes = offset > 0;
  const glowColor = isYes ? T.green : T.red;
  const glowOpacity = pct * 0.5;
  const scaleVal = flyAway ? 0.92 : (1 - pct * 0.03);

  // Fly away transform
  let tx = offset, ty = offsetY, rot = rotation, opac = 1, scale = scaleVal;
  if (flyAway) {
    tx = flyAway === 'right' ? 600 : -600;
    ty = -80;
    rot = flyAway === 'right' ? 25 : -25;
    opac = 0;
    scale = 0.85;
  }

  return (
    <div
      onMouseDown={onDS}
      onMouseMove={onDM}
      onMouseUp={onDE}
      onMouseLeave={() => { if (dragging) onDE(); }}
      onTouchStart={onDS}
      onTouchMove={onDM}
      onTouchEnd={onDE}
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`,
        borderRadius: '1.5rem',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        textAlign: 'center',
        color: '#fff',
        cursor: isTop ? (dragging ? 'grabbing' : 'grab') : 'default',
        userSelect: 'none',
        transform: `translateX(${tx}px) translateY(${ty}px) rotate(${rot}deg) scale(${scale})`,
        transition: dragging ? 'none' : flyAway
          ? 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease-out'
          : 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s',
        opacity: opac,
        boxShadow: absOff > 20
          ? `0 0 ${30 + pct * 40}px ${glowColor}${Math.round(glowOpacity * 255).toString(16).padStart(2,'0')}, 0 20px 60px rgba(0,0,0,0.4)`
          : '0 20px 60px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        zIndex: isTop ? 2 : 1,
        willChange: 'transform, opacity',
      }}
    >
      {/* Direction overlay glow */}
      {absOff > 10 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: '1.5rem',
          background: `radial-gradient(circle at ${isYes ? '80%' : '20%'} 30%, ${glowColor}${Math.round(pct * 30).toString(16).padStart(2,'0')}, transparent 70%)`,
          pointerEvents: 'none', transition: dragging ? 'none' : 'all 0.3s',
        }}/>
      )}

      {/* YES stamp */}
      <div style={{
        position: 'absolute', top: 28, left: 28, padding: '10px 24px', borderRadius: 12,
        border: `3px solid ${T.green}`, color: T.green, fontWeight: 800, fontSize: 24,
        opacity: Math.min(1, Math.max(0, offset / 100)),
        transform: `rotate(-15deg) scale(${0.8 + Math.min(0.4, offset / 250)})`,
        letterSpacing: 3, textShadow: `0 0 20px ${T.green}60`,
        transition: dragging ? 'none' : 'all 0.2s',
      }}>
        {S.swipe.yes}
      </div>
      {/* NO stamp */}
      <div style={{
        position: 'absolute', top: 28, right: 28, padding: '10px 24px', borderRadius: 12,
        border: `3px solid ${T.red}`, color: T.red, fontWeight: 800, fontSize: 24,
        opacity: Math.min(1, Math.max(0, -offset / 100)),
        transform: `rotate(15deg) scale(${0.8 + Math.min(0.4, -offset / 250)})`,
        letterSpacing: 3, textShadow: `0 0 20px ${T.red}60`,
        transition: dragging ? 'none' : 'all 0.2s',
      }}>
        {S.swipe.no}
      </div>

      <div>
        <span style={{ fontSize: 13, background: 'rgba(0,0,0,0.25)', padding: '4px 14px', borderRadius: 20, color: 'rgba(255,255,255,0.7)' }}>
          {catLabels[card.cat] || card.cat}
        </span>
      </div>

      <div>
        <div style={{
          fontSize: 72, marginBottom: 20, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
          transform: `rotate(${offset * -0.04}deg) scale(${1 + pct * 0.05})`,
          transition: dragging ? 'none' : 'transform 0.3s',
        }}>
          {card.emoji}
        </div>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, marginBottom: 12, lineHeight: 1.3, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          {card.q}
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.5 }}>
          {card.desc}
        </p>
      </div>

      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, transition: 'opacity 0.3s', opacity: absOff > 30 ? 0 : 1 }}>
        {S.swipe.swipeHint}
      </span>
    </div>
  );
}

function LevelBadge({ lang, totalSwipes }) {
  const lv = getLevel(totalSwipes, lang);
  const S = STRINGS[lang];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: T.card, border: `1px solid ${T.border}`, borderRadius: '1rem', padding: '0.6rem 1rem' }}>
      <div style={{ fontSize: 24 }}>{lv.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
          <span style={{ color: T.gold, fontSize: '0.8rem', fontWeight: 'bold' }}>{lv.label}</span>
          <span style={{ color: T.dim, fontSize: '0.7rem' }}>{totalSwipes} {S.memory.totalSwipes.toLowerCase()}</span>
        </div>
        <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${lv.progressInLevel * 100}%`, background: `linear-gradient(90deg, ${T.gold}, ${T.teal})`, borderRadius: 2, transition: 'width 0.5s' }}/>
        </div>
        {lv.next && <div style={{ color: T.dim, fontSize: '0.65rem', marginTop: 2 }}>{lv.next.emoji} {lv.next.label} ({lv.next.min - totalSwipes} {lang === 'no' ? 'sveip igjen' : 'swipes to go'})</div>}
      </div>
    </div>
  );
}

function SwipePage({ lang, destination, apiKey, onResults, onBack }) {
  const S = STRINGS[lang];
  const mem = useRef(loadMemory()).current;
  const [swipes, setSwipes] = useState(mem.swipes);
  const [totalSwipesAll, setTotalSwipesAll] = useState(mem.totalSwipes);
  const [cardIdx, setCardIdx] = useState(0);
  const [showChoice, setShowChoice] = useState(false);
  const [showSkip, setShowSkip] = useState(totalSwipesAll >= 60);
  const [showReset, setShowReset] = useState(false);
  const [phase, setPhase] = useState(1);

  const cards = PREFERENCE_CARDS[lang];
  // Only show cards that haven't been swiped in memory
  const unswipedCards = useRef(
    shuffleArray(cards.filter(c => !mem.swipes[c.id]))
  ).current;
  const allSwiped = unswipedCards.length === 0;

  const phase1Cards = unswipedCards.slice(0, Math.min(30, unswipedCards.length));
  const phase2Cards = unswipedCards.slice(30);
  const cardsToShow = phase === 1 ? phase1Cards : phase2Cards;
  const sessionSwiped = Object.keys(swipes).length - Object.keys(mem.swipes).length;
  const canSearch = totalSwipesAll >= 20 || Object.keys(swipes).length >= 20;
  const totalCards = phase === 1 ? phase1Cards.length : phase1Cards.length + phase2Cards.length;
  const displayIdx = phase === 1 ? Math.min(cardIdx, phase1Cards.length - 1) : phase1Cards.length + cardIdx;

  function handleCardSwipe(val) {
    if (cardIdx >= cardsToShow.length) return;
    const card = cardsToShow[cardIdx];
    const newSwipes = { ...swipes, [card.id]: val };
    const newTotal = totalSwipesAll + 1;
    setSwipes(newSwipes);
    setTotalSwipesAll(newTotal);
    saveSwipes(newSwipes, newTotal);

    if (phase === 1 && cardIdx >= cardsToShow.length - 1 && phase2Cards.length > 0) {
      setShowChoice(true);
    } else {
      setCardIdx(prev => prev + 1);
    }
  }

  function handleContinueSwiping() {
    setShowChoice(false);
    setShowSkip(false);
    setPhase(2);
    setCardIdx(0);
  }

  function handleFindExperiences() {
    const profile = calcProfile(swipes, cards);
    onResults(profile);
  }

  function handleReset() {
    clearMemory();
    setSwipes({});
    setTotalSwipesAll(0);
    setShowReset(false);
    setShowSkip(false);
    window.location.reload();
  }

  const progressPct = totalCards > 0
    ? (Math.min(displayIdx + (showChoice ? 1 : 0), totalCards) / totalCards) * 100
    : 100;

  // Reset confirmation overlay
  if (showReset) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: T.bg, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: '1.5rem', padding: '2.5rem', textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
          <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', color: T.txt, marginBottom: '0.75rem' }}>{S.memory.resetTitle}</h3>
          <p style={{ color: T.dim, marginBottom: '2rem', lineHeight: 1.6 }}>{S.memory.resetDesc}</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleReset} style={{ padding: '0.75rem 1.5rem', background: T.red, color: '#fff', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>{S.memory.resetBtn}</button>
            <button onClick={() => setShowReset(false)} style={{ padding: '0.75rem 1.5rem', background: 'transparent', color: T.txt, border: `1px solid ${T.border}`, borderRadius: '0.75rem', cursor: 'pointer' }}>{S.memory.resetCancel}</button>
          </div>
        </div>
      </div>
    );
  }

  // Smart skip — if user has swiped 60+ cards total, offer to go directly to experiences
  if (showSkip && !allSwiped) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: 500, width: '100%', textAlign: 'center' }}>
          <LevelBadge lang={lang} totalSwipes={totalSwipesAll} />
          <div style={{ marginTop: '2rem', background: T.card, border: `1px solid ${T.border}`, borderRadius: '1.5rem', padding: '2.5rem', animation: 'fadeUp 0.5s ease-out' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🧠</div>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', color: T.txt, marginBottom: '0.75rem' }}>{S.memory.skipTitle}</h3>
            <p style={{ color: T.dim, marginBottom: '2rem', lineHeight: 1.6 }}>
              {S.memory.skipDesc.replace('{count}', totalSwipesAll)}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button onClick={handleFindExperiences} style={{ padding: '1rem 2rem', background: `linear-gradient(135deg, ${T.gold}, ${T.teal})`, color: T.bg, border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>{S.memory.skipBtn}</button>
              <p style={{ color: T.dim, fontSize: '0.85rem', margin: '0.5rem 0' }}>{S.memory.orSwipe}</p>
              <button onClick={() => setShowSkip(false)} style={{ padding: '0.75rem 1.5rem', background: 'transparent', color: T.txt, border: `1px solid ${T.border}`, borderRadius: '0.75rem', cursor: 'pointer' }}>
                {S.memory.keepGoing} ({unswipedCards.length} {lang === 'no' ? 'nye kort' : 'new cards'})
              </button>
            </div>
          </div>
          <button onClick={() => setShowReset(true)} style={{ marginTop: '1.5rem', background: 'none', border: 'none', color: T.dim, fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
            {S.memory.resetTitle}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', padding: '2rem', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.gold, fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold' }}>
            {S.nav.back}
          </button>
          <button onClick={() => setShowReset(true)} style={{ background: 'none', border: 'none', color: T.dim, fontSize: '0.75rem', cursor: 'pointer' }}>⚙️</button>
        </div>

        <LevelBadge lang={lang} totalSwipes={totalSwipesAll} />

        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', color: T.txt, marginBottom: '0.5rem', marginTop: '0.75rem' }}>
          {S.swipe.heading}
        </h2>
        <p style={{ color: T.dim, fontSize: '0.9rem', marginBottom: '1rem' }}>📍 {destination}</p>

        {/* Progress Bar */}
        {!allSwiped && totalCards > 0 && (
          <>
            <div style={{ height: 3, background: T.border, borderRadius: 2, marginBottom: '0.5rem', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(progressPct, 100)}%`, background: `linear-gradient(90deg, ${T.gold}, ${T.teal})`, borderRadius: 2, transition: 'width 0.3s' }} />
            </div>
            <p style={{ color: T.dim, fontSize: '0.85rem' }}>
              {S.swipe.progress.replace('{current}', Math.min(displayIdx + 1, totalCards)).replace('{total}', totalCards)}
            </p>
          </>
        )}
      </div>

      {/* All cards swiped state */}
      {allSwiped ? (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: '1.5rem', padding: '2.5rem', textAlign: 'center', maxWidth: 500 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', color: T.txt, marginBottom: '0.75rem' }}>
              {S.memory.allCardsDone.replace('{count}', totalSwipesAll)}
            </h3>
            <p style={{ color: T.dim, marginBottom: '1rem', lineHeight: 1.6 }}>{S.memory.tryNewDest}</p>
            <button onClick={handleFindExperiences} style={{ padding: '1rem 2rem', background: `linear-gradient(135deg, ${T.gold}, ${T.teal})`, color: T.bg, border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>
              {S.swipe.findNowBtn}
            </button>
          </div>
        </div>
      ) : showChoice ? (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: '1.5rem', padding: '2.5rem', textAlign: 'center', maxWidth: '500px', width: '100%', animation: 'fadeUp 0.5s ease-out' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎯</div>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.6rem', color: T.txt, marginBottom: '0.75rem' }}>
              {S.swipe.choiceTitle}
            </h3>
            <p style={{ color: T.dim, marginBottom: '2rem', fontSize: '1rem', lineHeight: 1.6 }}>
              {S.swipe.choiceDesc}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button onClick={handleFindExperiences} style={{ padding: '1rem 2rem', background: `linear-gradient(135deg, ${T.gold}, ${T.teal})`, color: T.bg, border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', transition: 'transform 0.2s' }}>
                {S.swipe.findNowBtn}
              </button>
              <button onClick={handleContinueSwiping} style={{ padding: '1rem 2rem', background: 'transparent', color: T.txt, border: `1px solid ${T.border}`, borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '500', fontSize: '1rem', transition: 'all 0.2s' }}>
                {S.swipe.continueBtn} ({phase2Cards.length} {lang === 'no' ? 'kort igjen' : 'cards left'})
              </button>
            </div>
          </div>
        </div>
      ) : cardIdx < cardsToShow.length ? (
        <>
          {/* Swipe Area */}
          <div style={{ flex: 1, position: 'relative', minHeight: '400px', marginBottom: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '100%', height: '100%', maxWidth: '500px' }}>
              {/* Next card (behind) */}
              {cardIdx + 1 < cardsToShow.length && (
                <SwipeCard card={cardsToShow[cardIdx + 1]} lang={lang} onSwipe={() => {}} isTop={false} />
              )}
              {/* Current card (top) */}
              <SwipeCard key={cardsToShow[cardIdx].id} card={cardsToShow[cardIdx]} lang={lang} onSwipe={handleCardSwipe} isTop={true} />
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center' }}>
            <button onClick={() => handleCardSwipe(-1)} style={{ width: 56, height: 56, borderRadius: '50%', background: T.card, border: `2px solid ${T.red}`, color: T.red, fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              👋
            </button>
            {canSearch && (
              <button onClick={handleFindExperiences} style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${T.gold}, ${T.teal})`, border: 'none', color: T.bg, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                🔍
              </button>
            )}
            <button onClick={() => handleCardSwipe(1)} style={{ width: 56, height: 56, borderRadius: '50%', background: T.card, border: `2px solid ${T.green}`, color: T.green, fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              ❤️
            </button>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: '1rem', padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', color: T.txt, marginBottom: '0.5rem' }}>
              {S.swipe.profileBuilt}
            </h3>
            <p style={{ color: T.dim, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              {S.swipe.summary}
            </p>
            <button onClick={handleFindExperiences} style={{ padding: '1rem 2rem', background: `linear-gradient(135deg, ${T.gold}, ${T.teal})`, color: T.bg, border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
              {S.swipe.findBtn}
            </button>
          </div>
        </div>
      )}

      {!canSearch && sessionSwiped > 0 && !showChoice && !allSwiped && (
        <p style={{ color: T.dim, fontSize: '0.85rem', textAlign: 'center', marginTop: '1rem' }}>
          {S.swipe.minSwipes} ({Object.keys(swipes).length}/20)
        </p>
      )}
    </div>
  );
}

// ============================================================================
// RESULTS PAGE
// ============================================================================

function ResultsPage({ lang, destination, experiences, onBack, onLoadMore, loadingMore, totalSwipes }) {
  const S = STRINGS[lang];
  const [filter, setFilter] = useState('');
  // Sort by match% descending
  const sorted = [...experiences].sort((a, b) => (b.match || 0) - (a.match || 0));
  const filtered = filter ? sorted.filter(e => e.cat === filter) : sorted;
  const cats = [...new Set(experiences.map(e => e.cat))];

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: T.bg, padding: '2rem', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.gold, fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold', marginBottom: '1.5rem', alignSelf: 'flex-start' }}>
        {S.nav.back}
      </button>

      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', color: T.txt, marginBottom: '2rem' }}>
        {S.results.heading} {destination}
      </h1>

      {/* Filters */}
      {cats.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          <button
            onClick={() => setFilter('')}
            style={{ padding: '0.5rem 1.5rem', background: filter === '' ? `linear-gradient(135deg, ${T.gold}, ${T.teal})` : T.card, color: filter === '' ? T.bg : T.txt, border: `1px solid ${T.border}`, borderRadius: '2rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500', whiteSpace: 'nowrap' }}
          >
            {S.results.all}
          </button>
          {cats.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{ padding: '0.5rem 1.5rem', background: filter === cat ? `linear-gradient(135deg, ${T.gold}, ${T.teal})` : T.card, color: filter === cat ? T.bg : T.txt, border: `1px solid ${T.border}`, borderRadius: '2rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500', whiteSpace: 'nowrap' }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Experience List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <p style={{ color: T.dim, textAlign: 'center', padding: '2rem' }}>{S.results.noExp}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '700px' }}>
            {filtered.map((exp, i) => {
              const match = Math.round(exp.match || 0);
              const matchColor = match >= 85 ? T.green : match >= 70 ? T.gold : T.dim;
              return (
                <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: '1rem', overflow: 'hidden' }}>
                  <div style={{ height: 4, background: `linear-gradient(90deg, ${matchColor}, ${matchColor}80)` }}/>
                  <div style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
                      <div>
                        <h3 style={{ color: T.txt, fontSize: '1.2rem', marginBottom: '0.25rem', lineHeight: 1.3 }}>
                          {exp.name}
                        </h3>
                        {exp.cat && <span style={{ fontSize: '0.8rem', color: T.dim }}>{exp.cat}</span>}
                      </div>
                      <div style={{ background: `${matchColor}20`, color: matchColor, padding: '0.5rem 1rem', borderRadius: '1rem', fontSize: '0.9rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        {match}%
                      </div>
                    </div>

                    {exp.why && (
                      <p style={{ color: T.dim, fontSize: '0.95rem', marginBottom: '0.75rem', lineHeight: 1.6 }}>
                        <strong style={{ color: T.gold }}>{S.results.whyThisFits}</strong> {exp.why}
                      </p>
                    )}

                    {exp.quote && (
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`, borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '0.75rem', fontStyle: 'italic' }}>
                        <p style={{ color: T.dim, fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                          &ldquo;{exp.quote}&rdquo;
                        </p>
                        <span style={{ color: T.gold, fontSize: '0.75rem' }}>— {lang === 'no' ? 'Anmelder' : 'Reviewer'}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem', fontSize: '0.9rem' }}>
                      {exp.price && <span style={{ color: T.dim }}>💰 {exp.price}</span>}
                      {exp.duration && <span style={{ color: T.dim }}>⏱️ {exp.duration}</span>}
                    </div>

                    {exp.url && (
                      <a
                        href={exp.url.startsWith('http') ? exp.url : `https://www.google.com/search?q=${encodeURIComponent(exp.name + ' ' + destination)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-block', padding: '0.75rem 1.5rem', background: `linear-gradient(135deg, ${T.gold}, ${T.teal})`, color: T.bg, borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        {S.results.bookBtn}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Map */}
        {(() => {
          const dn = destination.toLowerCase().trim();
          const coords = DEST_DB_COORDS[dn];
          if (!coords) return null;
          const iframeUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.1},${coords.lat - 0.1},${coords.lng + 0.1},${coords.lat + 0.1}&layer=mapnik&marker=${coords.lat},${coords.lng}`;
          return (
            <div style={{ marginTop: '3rem', background: T.card, border: `1px solid ${T.border}`, borderRadius: '1rem', overflow: 'hidden', maxWidth: '700px' }}>
              <div style={{ padding: '1rem', borderBottom: `1px solid ${T.border}` }}>
                <h3 style={{ color: T.txt, fontSize: '1.1rem', margin: 0 }}>
                  {S.results.mapTitle} {destination}
                </h3>
              </div>
              <iframe width="100%" height="350" frameBorder="0" src={iframeUrl} style={{ display: 'block' }}/>
            </div>
          );
        })()}

        {/* Load More */}
        {onLoadMore && (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button onClick={onLoadMore} disabled={loadingMore} style={{
              padding: '0.85rem 2rem', background: loadingMore ? T.card : `linear-gradient(135deg, ${T.gold}40, ${T.teal}40)`,
              color: T.txt, border: `1px solid ${T.border}`, borderRadius: '0.75rem', cursor: loadingMore ? 'wait' : 'pointer',
              fontSize: '1rem', fontWeight: 'bold', transition: 'all 0.3s',
            }}>
              {loadingMore ? S.results.loadingMore : S.results.loadMore}
            </button>
          </div>
        )}

        {/* Level badge */}
        {totalSwipes > 0 && (
          <div style={{ maxWidth: 400, margin: '2rem auto 0' }}>
            <LevelBadge lang={lang} totalSwipes={totalSwipes} />
          </div>
        )}

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: '2rem', paddingBottom: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onBack} style={{ padding: '1rem 2rem', background: T.card, color: T.txt, border: `1px solid ${T.border}`, borderRadius: '0.75rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>
            {S.results.exploreBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LOADING GLOBE — Airplane flying over spinning Earth
// ============================================================================

const CITIES = [
  { name: 'Paris', x: 50, y: 38 }, { name: 'Tokyo', x: 82, y: 40 },
  { name: 'New York', x: 25, y: 42 }, { name: 'Sydney', x: 85, y: 72 },
  { name: 'Dubai', x: 60, y: 46 }, { name: 'Rio', x: 32, y: 68 },
  { name: 'Bangkok', x: 74, y: 50 }, { name: 'London', x: 48, y: 35 },
  { name: 'Cape Town', x: 55, y: 75 }, { name: 'Barcelona', x: 48, y: 42 },
  { name: 'Bali', x: 78, y: 58 }, { name: 'Reykjavik', x: 42, y: 26 },
];

function LoadingGlobe({ lang, destination }) {
  const S = STRINGS[lang];
  const [msgIdx, setMsgIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const msgs = [S.loading.analyzing, S.loading.scanning, S.loading.curating, S.loading.searching + ' ' + destination + '...'];

  useEffect(() => {
    const t1 = setInterval(() => setMsgIdx(i => (i + 1) % msgs.length), 4000);
    const t2 = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(5,8,22,0.95)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
      {/* Globe + Airplane SVG */}
      <div style={{ position: 'relative', width: 320, height: 320, marginBottom: '2rem' }}>
        <svg viewBox="0 0 320 320" width="320" height="320" style={{ overflow: 'visible' }}>
          <defs>
            <radialGradient id="globeGrad" cx="40%" cy="35%" r="50%">
              <stop offset="0%" stopColor="#1a4a6e" />
              <stop offset="50%" stopColor="#0d2d4a" />
              <stop offset="100%" stopColor="#061525" />
            </radialGradient>
            <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(45,212,191,0.15)" />
              <stop offset="100%" stopColor="rgba(45,212,191,0)" />
            </radialGradient>
            <clipPath id="globeClip"><circle cx="160" cy="160" r="120" /></clipPath>
          </defs>

          {/* Outer glow */}
          <circle cx="160" cy="160" r="160" fill="url(#glowGrad)" />

          {/* Globe sphere */}
          <circle cx="160" cy="160" r="120" fill="url(#globeGrad)" stroke="rgba(45,212,191,0.3)" strokeWidth="1.5" />

          {/* Rotating land masses (simplified continents) */}
          <g clipPath="url(#globeClip)" style={{ animation: 'globeRotate 20s linear infinite' }}>
            {/* Grid lines */}
            {[-60,-30,0,30,60].map(lat => (
              <ellipse key={'lat'+lat} cx={160} cy={160 - lat * 1.5} rx={120 * Math.cos(lat * Math.PI / 180)} ry={8} fill="none" stroke="rgba(45,212,191,0.08)" strokeWidth="0.5" />
            ))}
            {[0,40,80,120,160,200,240,280,320].map(x => (
              <line key={'lng'+x} x1={x} y1={40} x2={x} y2={280} stroke="rgba(45,212,191,0.06)" strokeWidth="0.5" />
            ))}

            {/* Simplified continent shapes */}
            <g opacity="0.6">
              {/* Europe/Africa */}
              <path d="M140,100 Q155,95 160,100 L165,115 Q170,125 165,140 L160,160 Q155,175 150,190 L145,210 Q140,220 135,215 L130,195 Q125,175 130,155 L135,135 Q130,120 135,110 Z" fill="rgba(45,212,191,0.2)" stroke="rgba(45,212,191,0.15)" strokeWidth="0.5"/>
              {/* Americas */}
              <path d="M60,90 Q70,85 80,95 L85,110 Q90,125 85,140 L80,155 Q75,170 70,180 L65,195 Q55,210 50,200 L45,180 Q40,160 45,140 L50,120 Q55,105 60,95 Z" fill="rgba(45,212,191,0.2)" stroke="rgba(45,212,191,0.15)" strokeWidth="0.5"/>
              {/* Asia */}
              <path d="M190,85 Q210,80 230,90 L240,100 Q250,115 245,130 L235,145 Q225,155 215,150 L200,140 Q190,130 185,120 L180,105 Q185,90 190,88 Z" fill="rgba(45,212,191,0.2)" stroke="rgba(45,212,191,0.15)" strokeWidth="0.5"/>
              {/* Australia */}
              <path d="M230,195 Q245,190 255,200 L258,210 Q255,225 245,228 L232,225 Q225,215 228,200 Z" fill="rgba(45,212,191,0.15)" stroke="rgba(45,212,191,0.1)" strokeWidth="0.5"/>
            </g>

            {/* City dots */}
            {CITIES.map((c, i) => {
              const cx = (c.x / 100) * 240 + 40;
              const cy = (c.y / 100) * 240 + 40;
              return (
                <g key={i}>
                  <circle cx={cx} cy={cy} r="2.5" fill={T.gold} opacity="0.8">
                    <animate attributeName="opacity" values="0.4;1;0.4" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                  </circle>
                  <circle cx={cx} cy={cy} r="6" fill="none" stroke={T.gold} strokeWidth="0.5" opacity="0.3">
                    <animate attributeName="r" values="3;8;3" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0;0.5" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                  </circle>
                </g>
              );
            })}
          </g>

          {/* Atmosphere rim */}
          <circle cx="160" cy="160" r="121" fill="none" stroke="rgba(45,212,191,0.15)" strokeWidth="2" />
          <circle cx="160" cy="160" r="125" fill="none" stroke="rgba(212,165,116,0.08)" strokeWidth="1" />

          {/* Airplane flying in orbit */}
          <g style={{ animation: 'planeOrbit 6s linear infinite' }}>
            <g transform="translate(160, 30)">
              {/* Contrail */}
              <line x1="0" y1="0" x2="-30" y2="0" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round">
                <animate attributeName="x2" values="-20;-40;-20" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
              </line>
              {/* Plane body */}
              <polygon points="12,0 -4,-4 -8,0 -4,4" fill={T.gold} />
              {/* Wings */}
              <polygon points="2,-1 -2,-7 -4,-7 0,-1" fill={T.gold} opacity="0.8" />
              <polygon points="2,1 -2,7 -4,7 0,1" fill={T.gold} opacity="0.8" />
            </g>
          </g>
        </svg>
      </div>

      {/* Status text */}
      <div style={{ textAlign: 'center', maxWidth: 400, padding: '0 2rem' }}>
        <p style={{ color: T.txt, fontSize: '1.15rem', marginBottom: '1rem', lineHeight: 1.6, animation: 'fadeIn 0.5s ease-out', fontWeight: '500' }}>
          {msgs[msgIdx]}
        </p>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: '1.5rem' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: T.gold, animation: `dotPulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
        <p style={{ color: T.dim, fontSize: '0.85rem' }}>
          {elapsed}s
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================

export default function TravelSwish() {
  const [page, setPage] = useState('landing');
  const [lang, setLang] = useState('no');
  const [destination, setDestination] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const seenNames = useRef([]);
  const S = STRINGS[lang];

  // Load seen experiences from memory on mount
  useEffect(() => {
    const mem = loadMemory();
    seenNames.current = mem.seenExperiences;
  }, []);

  function handleSwipeStart(data) {
    setDestination(data.destination);
    setApiKey(data.apiKey);
    setPage('swipe');
  }

  function parseExperiencesFromResult(result) {
    let exps = [];
    const jsonMatch = result.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      let parsed = parseJSON(jsonMatch[0]);
      if (!parsed) {
        const greedyMatch = result.match(/\[[\s\S]*\]/);
        if (greedyMatch) parsed = parseJSON(greedyMatch[0]);
      }
      if (Array.isArray(parsed)) exps = parsed;
    }
    if (exps.length === 0) {
      exps = [{ name: lang === 'no' ? 'AI-svar mottatt' : 'AI response received', why: result.substring(0, 500), cat: 'info', url: '', price: '', duration: '', match: 50, lat: 0, lng: 0 }];
    }
    // Sort by match descending
    exps.sort((a, b) => (b.match || 0) - (a.match || 0));
    return exps;
  }

  async function handleFindExperiences(prof) {
    setLoading(true);
    setError('');
    try {
      const mem = loadMemory();
      const swipes = prof ? null : mem.swipes;
      const cards = PREFERENCE_CARDS[lang];
      const profile = prof || calcProfile(mem.swipes, cards);
      const profileText = describeProfile(profile, lang);
      const prompt = buildExperiencePrompt(destination, profileText, lang, seenNames.current);
      const result = await askClaude(prompt, apiKey);
      const exps = parseExperiencesFromResult(result);

      // Track seen experiences
      const newNames = exps.map(e => e.name).filter(Boolean);
      seenNames.current = [...seenNames.current, ...newNames];
      saveSeenExperiences(seenNames.current);

      setLoading(false);
      setExperiences(exps);
      setPage('results');
    } catch (err) {
      setError(err.message || 'Unknown error');
      setLoading(false);
    }
  }

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const mem = loadMemory();
      const cards = PREFERENCE_CARDS[lang];
      const profile = calcProfile(mem.swipes, cards);
      const profileText = describeProfile(profile, lang);
      const allSeen = [...seenNames.current, ...experiences.map(e => e.name)];
      const prompt = buildExperiencePrompt(destination, profileText, lang, allSeen);
      const result = await askClaude(prompt, apiKey);
      const newExps = parseExperiencesFromResult(result);

      // Filter out any duplicates by name
      const existingNames = new Set(experiences.map(e => e.name.toLowerCase()));
      const unique = newExps.filter(e => !existingNames.has(e.name.toLowerCase()));

      const combined = [...experiences, ...unique].sort((a, b) => (b.match || 0) - (a.match || 0));

      // Track seen
      const newNames = unique.map(e => e.name).filter(Boolean);
      seenNames.current = [...seenNames.current, ...newNames];
      saveSeenExperiences(seenNames.current);

      setExperiences(combined);
      setLoadingMore(false);
    } catch (err) {
      setError(err.message || 'Unknown error');
      setLoadingMore(false);
    }
  }

  const totalSwipes = parseInt(typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEYS.totalSwipes) || '0') : '0', 10);

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: T.bg, fontFamily: 'DM Sans, sans-serif', color: T.txt, overflow: 'hidden' }}>
      {page === 'landing' && <LandingPage onStart={() => setPage('home')} lang={lang} onLangChange={setLang} />}
      {page === 'home' && <HomePage lang={lang} onStart={handleSwipeStart} onBack={() => setPage('landing')} />}
      {page === 'swipe' && <SwipePage lang={lang} destination={destination} apiKey={apiKey} onResults={handleFindExperiences} onBack={() => setPage('home')} />}
      {page === 'results' && <ResultsPage lang={lang} destination={destination} experiences={experiences} onBack={() => setPage('home')} onLoadMore={handleLoadMore} loadingMore={loadingMore} totalSwipes={totalSwipes} />}

      {/* Loading Overlay — Airplane over Globe */}
      {loading && <LoadingGlobe lang={lang} destination={destination} />}

      {/* Error Overlay */}
      {error && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(5,8,22,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: T.card, border: `1px solid ${T.red}`, borderRadius: '1.5rem', padding: '2.5rem', textAlign: 'center', maxWidth: '450px', margin: '0 1rem' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ color: T.txt, fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', marginBottom: '1rem' }}>
              {lang === 'no' ? 'Noe gikk galt' : 'Something went wrong'}
            </h3>
            <p style={{ color: T.dim, fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6, wordBreak: 'break-word' }}>
              {error}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setError('')} style={{ padding: '0.75rem 2rem', background: `linear-gradient(135deg, ${T.gold}, ${T.teal})`, color: T.bg, border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem' }}>
                {lang === 'no' ? 'Prøv igjen' : 'Try again'}
              </button>
              <button onClick={() => { setError(''); setPage('home'); }} style={{ padding: '0.75rem 2rem', background: 'transparent', color: T.txt, border: `1px solid ${T.border}`, borderRadius: '0.75rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                {lang === 'no' ? 'Tilbake' : 'Go back'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@400;500;700&display=swap');

        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes globeRotate {
          from { transform: translateX(0); }
          to { transform: translateX(-40px); }
        }

        @keyframes planeOrbit {
          0% { transform: rotate(0deg); transform-origin: 160px 160px; }
          100% { transform: rotate(360deg); transform-origin: 160px 160px; }
        }

        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes landingFloat {
          0%, 100% { transform: translateY(0) rotate(var(--rot, 0deg)); }
          50% { transform: translateY(-18px) rotate(calc(var(--rot, 0deg) + 4deg)); }
        }

        @keyframes blobPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.7; }
        }

        @keyframes heroSlideIn {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes heroPhoneIn {
          from { opacity: 0; transform: translateY(40px) scale(0.92); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes scrollBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }

        @keyframes scrollDot {
          0% { top: 6px; opacity: 1; }
          100% { top: 22px; opacity: 0; }
        }

        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(212,165,116,0.3);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(212,165,116,0.5);
        }
      `}</style>
    </div>
  );
}
