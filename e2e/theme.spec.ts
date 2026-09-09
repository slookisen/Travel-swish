import { test, expect, type Page } from '@playwright/test';
import dataset from '../src/dataset/cards/all.json' with { type: 'json' };
import { UI_COPY } from '../src/app/i18n';

async function returningGuest(page: Page) {
  const answers = Object.fromEntries(dataset.cards.filter(c => c.modes.includes('experiences'))
    .filter((c, i, all) => all.findIndex(other => other.cat === c.cat) === i).slice(0, 12)
    .map(c => [c.id, { cardId: c.id, reaction: 'like', answeredAt: Date.now() }]));
  await page.addInitScript(answers => {
    if (localStorage.getItem('theme-test-seeded')) return;
    localStorage.setItem('theme-test-seeded', '1');
    localStorage.setItem('travel_swish_language_v1', 'en');
    localStorage.setItem('travel_swipe_theme_v1', 'dark');
    localStorage.setItem('travel_swish_app_v3', JSON.stringify({
      version: 3, profile: { version: 2, reactions: { experiences: answers, restaurants: {} }, corrections: {} },
      trip: { destination: 'Oslo, Norway', mode: 'experiences', context: { party: 'solo', pace: 'balanced', budget: 'value', discovery: 'mix' } },
      saved: {}, feedback: {}, recentRuns: [],
    }));
  }, answers);
  await page.goto('/Travel-swish/');
}

import { readable } from './helpers/contrast';
test('system theme follows OS, manual choice persists, and Norwegian/English labels work', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/Travel-swish/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await readable(page);
  await page.getByLabel('Fargetema').selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await page.getByLabel('Colour theme').selectOption('dark');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0c171c');
  await page.getByLabel('Colour theme').selectOption('system');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('dark mobile home, swipe, profile, results and discovery remain readable', async ({ page }, info) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.route('**/recs/personalized', r => r.fulfill({ json: { items: [{ id: 'place-1', name: 'A walk by the fjord', cat: 'nature', match: 85, why: 'Nature at your own pace', source: 'google_places', website_url: 'https://example.test/website', maps_url: 'https://example.test/maps' }] } }));
  await page.route('**/feedback', r => r.fulfill({ json: { ok: true } }));
  await returningGuest(page);
  const initialProfile = await page.evaluate(() => JSON.parse(localStorage.getItem('travel_swish_app_v3')!).profile);
  await readable(page);
  await expect(page.getByLabel('Colour theme')).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: info.outputPath('dark-home.png'), fullPage: true });
  await page.getByRole('button', { name: 'Improve my profile' }).click();
  await page.getByRole('button', { name: 'Keep refining' }).click();
  await readable(page);
  await expect(page.locator('.mobile-results-cta')).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: info.outputPath('dark-swipe.png'), fullPage: true });
  await page.getByRole('button', { name: UI_COPY.en.nav.home }).click();
  await page.getByRole('button', { name: 'See my profile' }).click();
  await readable(page);
  await page.screenshot({ path: info.outputPath('dark-profile.png'), fullPage: true });
  await page.getByRole('button', { name: UI_COPY.en.nav.home }).click();
  await page.getByRole('button', { name: 'Find experiences' }).click();
  await expect(page.locator('.result-card')).toHaveCount(1);
  await page.getByText('More about this idea', { exact: true }).click();
  await page.locator('.save-button').click();
  await readable(page);
  await page.screenshot({ path: info.outputPath('dark-results.png'), fullPage: true });
  await page.locator('.discovery-search summary').click();
  await page.getByRole('button', { name: /^Organized tours$/i }).click();
  await readable(page);
  await page.getByLabel('Colour theme').selectOption('light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('travel_swish_app_v3')!).profile)).toEqual(initialProfile);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByLabel('Colour theme').selectOption('dark');
  await page.getByRole('button', { name: 'Improve my profile' }).click();
  await page.getByRole('button', { name: 'Keep refining' }).click();
  await readable(page);
  await page.screenshot({ path: info.outputPath('dark-desktop-swipe.png'), fullPage: true });
});

test('dark network and outdated API dialogs explain the real failure', async ({ page }, info) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await returningGuest(page);
  await page.route('**/recs/personalized', route => route.abort('failed'));
  await page.getByRole('button', { name: 'Find experiences' }).click();
  await expect(page.getByRole('dialog')).toContainText('Local preview:');
  await expect(page.getByRole('dialog')).not.toContainText('wake up');
  await readable(page);
  await page.screenshot({ path: info.outputPath('dark-network-error.png'), fullPage: true });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.unroute('**/recs/personalized');
  await page.route('**/recs/personalized', route => route.fulfill({ status: 404, json: { detail: 'Not Found' } }));
  await page.getByRole('button', { name: 'Find experiences' }).click();
  await expect(page.getByRole('dialog')).toContainText('server must be updated');
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toHaveCount(0);
  await readable(page);
});

test('timeout and offline are distinct, and disabled dark controls stay readable', async ({ page, context }) => {
  await returningGuest(page);
  await page.getByLabel('Where would you like ideas?').fill('');
  await expect(page.getByRole('button', { name: 'Find experiences' })).toBeDisabled();
  await readable(page);
  await page.getByLabel('Where would you like ideas?').fill('Oslo, Norway');
  await page.clock.install();
  await page.route('**/recs/personalized', () => {});
  await page.getByRole('button', { name: 'Find experiences' }).click();
  await expect(page.getByRole('dialog')).toContainText('Finding places');
  await page.clock.fastForward(60000);
  await expect(page.getByRole('dialog')).toContainText('Finding places');
  await page.clock.fastForward(30001);
  await expect(page.getByRole('dialog')).toContainText('did not respond in time');
  await readable(page);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.unroute('**/recs/personalized');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Find experiences' }).click();
  await expect(page.getByRole('dialog')).toContainText('You are offline');
  await context.setOffline(false);
});
