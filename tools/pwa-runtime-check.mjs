import { chromium } from 'playwright';

const appUrl = process.env.PWA_TEST_URL || 'http://127.0.0.1:5193/Travel-swish/';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

try {
  await page.goto(appUrl, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) throw new Error('Service workers are unavailable');
    await navigator.serviceWorker.ready;
  });
  await page.reload({ waitUntil: 'networkidle' });

  const installed = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const manifestUrl = document.querySelector('link[rel="manifest"]')?.getAttribute('href');
    return {
      controlled: Boolean(navigator.serviceWorker.controller),
      active: registration.active?.state,
      manifestUrl,
    };
  });
  if (!installed.controlled || installed.active !== 'activated' || !installed.manifestUrl) {
    throw new Error(`PWA registration incomplete: ${JSON.stringify(installed)}`);
  }

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Finn min reisestil' }).waitFor();
  console.log(`PWA runtime OK: service worker controls ${appUrl} and the app shell reloads offline.`);
} finally {
  await context.close();
  await browser.close();
}
