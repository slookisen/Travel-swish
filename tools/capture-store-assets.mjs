import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = String(process.env.TRAVEL_SWIPE_CAPTURE_URL || 'http://127.0.0.1:5173/Travel-swish/').replace(/\/$/, '');
const outputDir = path.resolve('store-assets');
await mkdir(outputDir, { recursive: true });

const recommendations = [
  { id: 'store-maat', name: 'MAAT and the Belém riverfront', cat: 'culture', match: 94, why: 'A strong match for architecture, culture and an unhurried walk by the river.', source: 'google_places', rating: 4.4, rating_count: 8200, maps_url: 'https://www.google.com/maps/search/?api=1&query=MAAT+Lisbon', website_url: 'https://maat.pt/en' },
  { id: 'store-alfama', name: 'Alfama and its hidden viewpoints', cat: 'culture', match: 91, why: 'Fits your taste for local atmosphere, walking and discoveries beyond the main route.', source: 'google_places', rating: 4.8, rating_count: 3100, maps_url: 'https://www.google.com/maps/search/?api=1&query=Alfama+Lisbon', website_url: 'https://www.visitlisboa.com/en/places/alfama' },
  { id: 'store-sintra', name: 'Sintra-Cascais Natural Park', cat: 'nature', match: 88, why: 'Balances active nature, dramatic scenery and a memorable day outside the city.', source: 'google_places', rating: 4.7, rating_count: 6900, maps_url: 'https://www.google.com/maps/search/?api=1&query=Sintra-Cascais+Natural+Park', website_url: 'https://natural.pt/protected-areas/parque-natural-sintra-cascais' },
  { id: 'store-azulejo', name: 'National Tile Museum', cat: 'culture', match: 86, why: 'A focused cultural stop with distinctive local craft and room to explore at your own pace.', source: 'google_places', rating: 4.6, rating_count: 7400, maps_url: 'https://www.google.com/maps/search/?api=1&query=National+Tile+Museum+Lisbon', website_url: 'https://www.museusemonumentos.pt/en/museus-e-monumentos/museu-nacional-do-azulejo' },
];

async function prepare(page) {
  await page.route('**/sessions', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await page.route('**/prefs', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await page.route('**/recs/prefetch/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"status":"ready"}' }));
  await page.route('**/recs/web', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ run_id: 'store-preview', provider: 'google_places', next_token: 'store-next', next_status: 'ready', next_seed: 42, items: recommendations }),
  }));
  await page.goto(`${baseUrl}/`);
  await page.getByRole('group', { name: 'Språk' }).getByRole('button', { name: 'EN' }).click();
}

const browser = await chromium.launch();
try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await desktop.newPage();
  await prepare(page);
  await page.screenshot({ path: path.join(outputDir, '01-landing-1440x900.png') });

  await page.getByRole('button', { name: 'Find my travel style' }).click();
  await page.getByLabel('Where are you going?').fill('Lisbon');
  await page.getByRole('button', { name: 'Hidden gems' }).click();
  await page.getByRole('button', { name: 'Start the cards' }).click();
  for (let index = 0; index < 6; index += 1) {
    await page.getByRole('button', { name: index % 3 === 0 ? 'Love it' : 'Yes' }).click();
  }
  await page.getByRole('heading', { name: 'See your matches now?' }).waitFor();
  await page.screenshot({ path: path.join(outputDir, '02-profile-ready-1440x900.png') });
  await page.getByRole('button', { name: 'Show matches now' }).click();
  await page.getByText('MAAT and the Belém riverfront').waitFor();
  await page.screenshot({ path: path.join(outputDir, '03-personal-results-1440x900.png') });
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const mobilePage = await mobile.newPage();
  await prepare(mobilePage);
  await mobilePage.getByRole('button', { name: 'Find my travel style' }).click();
  await mobilePage.getByLabel('Where are you going?').fill('Lisbon');
  await mobilePage.getByRole('button', { name: 'Start the cards' }).click();
  await mobilePage.screenshot({ path: path.join(outputDir, '04-mobile-swipe-390x844.png') });
  await mobile.close();
} finally {
  await browser.close();
}

console.log(`Store assets written to ${outputDir}`);
