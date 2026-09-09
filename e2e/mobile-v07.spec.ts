import { test, expect, type Page } from '@playwright/test';
import dataset from '../src/dataset/cards/all.json' with { type: 'json' };

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

const answers = Object.fromEntries(dataset.cards.filter((card) => card.modes.includes('experiences'))
  .filter((card, index, cards) => cards.findIndex((other) => other.cat === card.cat) === index).slice(0, 12)
  .map((card) => [card.id, { cardId: card.id, reaction: 'like', answeredAt: Date.now() }]));

async function returningUser(page: Page, language = 'no') {
  await page.addInitScript(({ answers, language }) => {
    if (localStorage.getItem('test-seeded-v07')) return;
    localStorage.setItem('test-seeded-v07', '1');
    localStorage.setItem('travel_swish_language_v1', language);
    localStorage.setItem('travel_swish_app_v3', JSON.stringify({
      version: 3, profile: { version: 2, reactions: { experiences: answers, restaurants: {} }, corrections: {} },
      trip: { destination: 'Oslo, Norway', mode: 'experiences', context: { party: 'solo', pace: 'balanced', budget: 'value', discovery: 'mix' } },
      saved: {}, feedback: {}, recentRuns: [],
    }));
  }, { answers, language });
  await page.goto('/Travel-swish/');
}

const items = Array.from({ length: 9 }, (_, index) => ({ id: `place-${index}`, name: `Nature place ${index}`,
  cat: 'nature', match: 80 - index, why: 'Nature and a relaxed pace', source: 'google_places',
  maps_url: `https://example.test/map/${index}`, website_url: `https://example.test/place/${index}` }));

test('returning guest searches atomically and reveals more without another request', async ({ page }, testInfo) => {
  const bodies: any[] = [];
  const legacyCalls: string[] = [];
  await page.route('**/sessions', (route) => { legacyCalls.push('sessions'); return route.abort(); });
  await page.route('**/prefs', (route) => { legacyCalls.push('prefs'); return route.abort(); });
  await page.route('**/recs/personalized', (route) => {
    bodies.push(route.request().postDataJSON());
    return route.fulfill({ json: { run_id: 'run1', items, provider: 'google_places' } });
  });
  await returningUser(page);
  await expect(page.getByRole('heading', { name: 'Hva frister i dag?' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('quick-home.png'), fullPage: true });
  await page.getByRole('button', { name: 'Finn noe nå' }).click();
  await expect(page.locator('.result-card')).toHaveCount(3);
  await page.screenshot({ path: testInfo.outputPath('first-three-results.png'), fullPage: true });
  await page.getByRole('button', { name: 'Vis tre til' }).click();
  await expect(page.locator('.result-card')).toHaveCount(6);
  await page.getByRole('button', { name: 'Vis tre til' }).click();
  await expect(page.locator('.result-card')).toHaveCount(9);
  expect(bodies).toHaveLength(1);
  expect(Object.keys(bodies[0].current_prefs)).toHaveLength(9);
  expect(bodies[0].taste.version).toBe(3);
  expect(legacyCalls).toEqual([]);
  await expect(page.locator('.result-card').first().getByRole('link', { name: 'Hjemmeside' })).toHaveAttribute('href', 'https://example.test/place/0');
});

test('mode switch preserves separate memories and destination guard', async ({ page }) => {
  await returningUser(page);
  await page.getByRole('button', { name: 'Mat og drikke', exact: false }).click();
  await expect(page.getByRole('button', { name: 'Bli kjent med smaken min' })).toBeVisible();
  await page.getByRole('button', { name: 'Bli kjent med smaken min' }).click();
  await expect(page.locator('.swipe-count')).toContainText('0');
  await page.getByRole('button', { name: /Ja$/ }).click();
  await page.getByRole('button', { name: 'Gå til start' }).click();
  await page.getByRole('button', { name: /Opplevelser/ }).click();
  await expect(page.getByRole('button', { name: 'Finn noe nå' })).toBeVisible();
  await page.getByLabel('Hvor vil du finne tips?').fill('');
  await expect(page.getByRole('button', { name: 'Finn noe nå' })).toBeDisabled();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('travel_swish_app_v3')!));
  expect(Object.keys(state.profile.reactions.experiences)).toHaveLength(Object.keys(answers).length);
  expect(Object.keys(state.profile.reactions.restaurants)).toHaveLength(1);
});

test('diagonal touch swipe means like and undo restores the exact answer state', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP touch input is Chromium-only; WebKit uses the alternative controls test.');
  await page.goto('/Travel-swish/');
  await page.getByRole('button', { name: 'Finn min reisestil' }).tap();
  await page.getByPlaceholder('For eksempel Lisboa').fill('Oslo, Norway');
  await page.getByRole('button', { name: 'Start kortene' }).tap();
  const question = page.locator('.swipe-card__copy h1');
  const before = await question.innerText();
  const box = (await page.locator('.swipe-card:not(.swipe-card--behind)').boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const x = box.x + box.width * .35, y = box.y + box.height * .5;
  // Use the browser's complete touch gesture. Raw dispatchTouchEvent sequences
  // suppressed subsequent clicks even on a blank page without app handlers.
  await cdp.send('Input.synthesizeScrollGesture', { x, y, xDistance: 120, yDistance: -72, gestureSourceType: 'touch', preventFling: true, speed: 500 });
  await expect(question).not.toHaveText(before);
  let state = await page.evaluate(() => JSON.parse(localStorage.getItem('travel_swish_app_v3')!));
  expect(Object.values(state.profile.reactions.experiences).map((answer: any) => answer.reaction)).toEqual(['like']);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.getByRole('button', { name: 'Angre' }).tap();
  await expect(question).toHaveText(before);
  state = await page.evaluate(() => JSON.parse(localStorage.getItem('travel_swish_app_v3')!));
  expect(state.profile.reactions.experiences).toEqual({});
  await cdp.detach();
});

test('small screen, accessible reading mode, undo and language persistence', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await returningUser(page, 'en');
  await expect(page.getByRole('button', { name: 'Find something now' })).toBeInViewport({ ratio: 1 });
  await page.getByRole('button', { name: 'Refine my taste' }).tap();
  await page.getByRole('button', { name: 'Keep refining' }).tap();
  await expect(page.locator('.mobile-results-cta')).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('small-mobile-swipe.png'), fullPage: true });
  const question = page.locator('.swipe-card__copy h1');
  const before = await question.innerText();
  await page.getByRole('button', { name: /Yes$/ }).tap();
  await expect(question).not.toHaveText(before);
  await page.getByRole('button', { name: 'Undo' }).tap();
  await expect(question).toHaveText(before);
  await page.getByRole('button', { name: 'Larger text' }).tap();
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');
  await expect(page.locator('.app-shell')).toHaveClass(/app-shell--reading/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'What sounds good today?' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('rate limit keeps previous results and blocks retry until Retry-After', async ({ page }) => {
  let count = 0;
  await page.route('**/recs/personalized', (route) => {
    count++;
    return count === 1 ? route.fulfill({ json: { items } })
      : route.fulfill({ status: 429, headers: { 'Retry-After': '3', 'Access-Control-Expose-Headers': 'Retry-After' }, json: { detail: 'rate_limited' } });
  });
  await returningUser(page);
  await page.getByRole('button', { name: 'Finn noe nå' }).click();
  await expect(page.locator('.result-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'Nytt utvalg' }).click();
  await expect(page.getByRole('dialog')).toContainText('Søket trenger en liten pause');
  await expect(page.getByRole('button', { name: /Prøv igjen om/ })).toBeDisabled();
  expect(count).toBe(2);
  await expect(page.getByRole('button', { name: 'Prøv igjen', exact: true })).toBeEnabled({ timeout: 6000 });
  await page.getByRole('button', { name: 'Lukk', exact: true }).click();
  await expect(page.locator('.result-card').first()).toContainText('Nature place 0');
  expect(count).toBe(2);
});

test('outcome feedback survives reload and changes categories without leaking into other mode', async ({ page }) => {
  const bodies: any[] = [];
  await page.route('**/feedback', (route) => route.fulfill({ json: { ok: true } }));
  await page.route('**/recs/personalized', (route) => { bodies.push(route.request().postDataJSON()); return route.fulfill({ json: { items, run_id: `run${bodies.length}` } }); });
  await returningUser(page);
  await page.getByRole('button', { name: 'Finn noe nå' }).click();
  const first = page.locator('.result-card').first();
  await first.getByText('Mer om tipset', { exact: true }).click();
  await first.getByRole('button', { name: 'Prøvde og likte' }).tap();
  await expect(first.getByRole('button', { name: 'Prøvde og likte' })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await page.getByRole('button', { name: 'Finn noe nå' }).click();
  await expect(page.locator('.result-card')).toHaveCount(3);
  expect(bodies[1].taste.cats.nature).toBeGreaterThan(bodies[0].taste.cats.nature ?? 0);
  expect(bodies[1].current_prefs).toEqual(bodies[0].current_prefs);
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('travel_swish_app_v3')!));
  expect(Object.values(state.profile.outcomes).map((outcome: any) => outcome.feedback)).toEqual(['enjoyed']);
  expect(state.profile.reactions.restaurants).toEqual({});
});

test('cancelling a slow request keeps results and ignores a late response', async ({ page }) => {
  let count = 0;
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/recs/personalized', async (route) => {
    count++;
    if (count > 1) await held;
    await route.fulfill({ json: { items: count > 1 ? [{ ...items[0], name: 'Late result' }] : items } }).catch(() => {});
  });
  await returningUser(page);
  await page.getByRole('button', { name: 'Finn noe nå' }).click();
  await expect(page.locator('.result-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'Nytt utvalg' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Avbryt søket' }).tap();
  release();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('.result-card').first()).toContainText('Nature place 0');
  await expect(page.getByText('Late result', { exact: true })).toHaveCount(0);
  expect(count).toBe(2);
});

test('old backend fails visibly without silently replacing live results with starter ideas', async ({ page }) => {
  await page.route('**/recs/personalized', (route) => route.fulfill({ status: 404, json: { detail: 'Not Found' } }));
  await returningUser(page, 'en');
  await page.getByRole('button', { name: 'Find something now' }).click();
  await expect(page.getByRole('dialog')).toContainText('updated');
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toHaveCount(0);
  await expect(page.locator('.result-card')).toHaveCount(0);
});
