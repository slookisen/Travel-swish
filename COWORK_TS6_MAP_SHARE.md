# COWORK TS6 — Kart + Del-funksjon

## Mål
To funksjoner som gjør resultater mer nyttige og delbare:
1. **Kart** — se treffene plassert i verden. Umiddelbart nyttig: "Åh, de ligger faktisk like ved hverandre!"
2. **Del** — enkelt dele funnene med noen ("her er restaurantene vi bør prøve i Lisboa").

## Tone / vibe
Kartfunksjonen skal oppleves som et bonus-lag — ikke en full mapping-app. Del-knappen skal gjøre det lett å sende noe fint til noen, ikke føles som "eksporter til Excel".

---

## Del 1 — Kart-tab i results-viewet

### Leaflet.js via CDN

Legg til i `index.html` (i `<head>`):
```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV/XN/WLs=" crossorigin=""></script>
```

TypeScript-typer: legg til i `package.json` devDependencies: `"@types/leaflet": "^1.9.3"` og kjør `npm install --save-dev @types/leaflet`.
Alternativt: bruk `(window as any).L` og type med `any` der det trengs.

### Kart-tab i results

Legg til en tab-bar øverst i results-viewet med to tabs:
```
[ 📋 Liste ]   [ 🗺️ Kart ]
```
- Aktiv tab følger `.btnPillPrimary`-stil (som `ModeTabBar` i TS3)
- Standard: "Liste"-tab er aktiv

### `MapView`-komponent
Props: `{ items: RecItem[]; destination: string; lang: Lang }`

```ts
function MapView({ items, destination, lang }: { items: RecItem[]; destination: string; lang: Lang }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || typeof (window as any).L === 'undefined') return;
    const L = (window as any).L;
    
    // Init map
    if (leafletMap.current) {
      leafletMap.current.remove();
    }
    
    const validItems = items.filter(i => typeof i.lat === 'number' && typeof i.lng === 'number');
    
    if (validItems.length === 0) return;
    
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false });
    leafletMap.current = map;
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      maxZoom: 19,
    }).addTo(map);
    
    // Custom marker style
    const icon = L.divIcon({
      html: `<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#d4a574,#2dd4bf);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#0a0d1a;box-shadow:0 2px 8px rgba(0,0,0,0.5);">★</div>`,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    
    validItems.forEach((item, idx) => {
      const marker = L.marker([item.lat!, item.lng!], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:system-ui;color:#0a0d1a;min-width:180px">
            <div style="font-weight:900;font-size:14px">${item.name}</div>
            ${item.cat ? `<div style="font-size:11px;margin-top:2px;opacity:0.7">${item.cat}</div>` : ''}
            ${item.match ? `<div style="margin-top:4px;font-size:12px;font-weight:700">Match: ${item.match}%</div>` : ''}
            ${item.url ? `<a href="${item.url}" target="_blank" rel="noopener" style="display:block;margin-top:6px;font-size:12px;color:#0070f3">Åpne →</a>` : ''}
          </div>
        `);
    });
    
    // Fit bounds
    const group = L.featureGroup(validItems.map((i: any) => L.marker([i.lat, i.lng])));
    map.fitBounds(group.getBounds().pad(0.3));
    
    return () => {
      if (leafletMap.current) leafletMap.current.remove();
    };
  }, [items]);
  
  const noCoords = items.filter(i => !i.lat || !i.lng).length;
  
  return (
    <div>
      <div ref={mapRef} style={{ height: 420, borderRadius: R.lg, overflow: 'hidden', border: `1px solid ${T.borderSoft}` }} />
      {noCoords > 0 && (
        <div style={{ color: T.dim, fontSize: F.size.sm, marginTop: S.xs2, textAlign: 'center' }}>
          {/* i18n: noCoords items uten kartkoordinater */}
          {lang === 'no' ? `${noCoords} treff mangler koordinater og vises ikke på kartet.` : `${noCoords} results have no coordinates and aren't shown on the map.`}
        </div>
      )}
    </div>
  );
}
```

### Dark tile layer
Bruk CartoDB Dark Matter (gratis, ingen API-nøkkel):
```
https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
```

---

## Del 2 — Del-knapp

### Plassering
- I results-viewet, i headeren/topbaren, ved siden av "Finn flere"-knappen
- Ikon: 📤 (send-ikon) eller "Del 📤"
- På mobil: primært

### Del-logikk
```ts
async function shareResults(items: RecItem[], destination: string, lang: Lang) {
  const topItems = items.slice(0, 8);
  const lines = topItems.map((i, idx) => 
    `${idx + 1}. ${i.name}${i.match ? ` (${i.match}% match)` : ''}${i.url ? `\n   ${i.url}` : ''}`
  );
  
  const header = lang === 'no'
    ? `🗺️ Mine reisetreff i ${destination} (via Travel-Swish)\n\n`
    : `🗺️ My travel finds in ${destination} (via Travel-Swish)\n\n`;
  
  const footer = `\nhttps://slookisen.github.io/Travel-swish`;
  const text = header + lines.join('\n\n') + footer;
  
  if (navigator.share) {
    try {
      await navigator.share({ title: `Travel-Swish: ${destination}`, text });
      return;
    } catch (e) {
      // User cancelled or not supported — fall through to clipboard
    }
  }
  
  // Clipboard fallback
  try {
    await navigator.clipboard.writeText(text);
    // Vis toast: "Kopiert til utklippstavlen 📋"
    return 'copied';
  } catch {
    // Vis en textarea modal brukeren kan kopiere manuelt
    return 'manual';
  }
}
```

### Toast-meldinger ved deling
```ts
shareSuccess: { no: 'Delt! 🎉', en: 'Shared! 🎉', sv: 'Delat! 🎉' },
shareCopied: { no: 'Kopiert til utklippstavlen 📋', en: 'Copied to clipboard 📋', sv: 'Kopierat till urklipp 📋' },
shareButton: { no: 'Del 📤', en: 'Share 📤', sv: 'Dela 📤' },
```

### Fallback modal (når clipboard også feiler)
En enkel modal med en `<textarea>` (readonly) som viser teksten, med instruksjon:
> "Kopier teksten under og del den manuelt"

---

## Kart-tab i18n
```ts
viewList: { no: '📋 Liste', en: '📋 List', sv: '📋 Lista' },
viewMap: { no: '🗺️ Kart', en: '🗺️ Map', sv: '🗺️ Karta' },
mapNoCoordsAll: {
  no: 'Ingen av treffene har koordinater ennå. Prøv igjen og koordinater genereres automatisk.',
  en: 'None of the results have coordinates yet. Try again and they\'ll be generated automatically.',
  sv: 'Inga av träffarna har koordinater ännu. Prova igen så genereras de automatiskt.',
},
```

---

## Tekniske krav
- Leaflet via CDN i `index.html` (ingen `npm install leaflet`)
- `@types/leaflet` som devDependency er OK, men bruk `(window as any).L` som fallback
- Map container trenger eksplisitt `height` (Leaflet krever dette)
- Kart rendres kun når tabs === 'map' (unngå doble renders)
- `useEffect cleanup` fjerner Leaflet-instansen ved unmount
- TypeScript strict (bruk `any` kun der Leaflet-typer er kompliserte)
- Ingen andre nye npm-avhengigheter

## Ikke gjør
- Ikke bruk Google Maps (krever API-nøkkel)
- Ikke bruk Mapbox (krever API-nøkkel)
- Ikke lag egne tile-server eller proxy
- Ikke vis kart-tab hvis 0 items har koordinater — vis en vennlig melding i stedet
- Ikke autoflytt til kart-tab — brukeren velger selv
