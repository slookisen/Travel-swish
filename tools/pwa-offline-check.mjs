import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

// Test the built artifact and real service worker, never the production backend.
const root = path.resolve('docs');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!pathname.startsWith('/Travel-swish/')) { res.writeHead(404).end(); return; }
    const file = path.resolve(root, pathname.slice('/Travel-swish/'.length) || 'index.html');
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  const origin = `http://127.0.0.1:${server.address().port}`;
  const appUrl = `${origin}/Travel-swish/`;
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(`${appUrl}privacy.html`);
  await page.evaluate(async () => { await caches.open('other-app-cache'); await caches.open('travel-swipe-v0.6.1'); });
  await page.goto(appUrl);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const keys = await page.evaluate(() => caches.keys());
  assert(keys.includes('other-app-cache'), 'activation must preserve other apps');
  assert(!keys.includes('travel-swipe-v0.6.1'), 'old app cache should be retired');
  const cachedAssets = await page.evaluate(async () => (await (await caches.open('travel-swipe-v0.7.1')).keys()).map((request) => request.url));
  assert(cachedAssets.some((url) => /\/assets\/.+\.js$/.test(url)), 'hashed app JS must be ready before activating');
  assert(cachedAssets.some((url) => /\/assets\/.+\.css$/.test(url)), 'hashed app CSS must be ready before activating');
  for (const file of ['theme.js', 'theme.css']) assert(cachedAssets.some(url => url.endsWith('/' + file)), `${file} must be available offline`);
  await page.getByLabel('Fargetema').selectOption('dark');
  await page.getByRole('button', { name: 'Finn min reisestil' }).click();
  await page.getByPlaceholder('For eksempel Lisboa').fill('Oslo, Norway');
  await page.getByRole('button', { name: 'Start kortene' }).click();
  await page.getByRole('button', { name: /Ja$/ }).click();
  const saved = await page.evaluate(() => localStorage.getItem('travel_swish_app_v3'));
  await page.goto(`${appUrl}privacy.html`);
  await context.setOffline(true);
  await page.goto(appUrl);
  await page.getByRole('heading', { name: 'Hva frister i dag?' }).waitFor();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark', 'offline theme persists');
  assert.equal(await page.evaluate(() => localStorage.getItem('travel_swish_app_v3')), saved);
  await page.goto(`${appUrl}privacy.html`);
  await page.getByRole('heading', { name: 'Your taste should help your trip—not follow you around.' }).waitFor();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark', 'offline legal page follows theme');
  await page.goto(appUrl);
  await page.getByRole('heading', { name: 'Hva frister i dag?' }).waitFor();
  console.log('pwa-offline-check: build assets, isolated cache cleanup, offline profile and legal navigation passed');
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
