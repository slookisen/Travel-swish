import { test, expect } from '@playwright/test';

async function openBrief(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Finn min reisestil' }).click();
}

async function buildReadyProfile(page: import('@playwright/test').Page) {
  await page.getByPlaceholder('For eksempel Lisboa').fill('Lisboa');
  await page.getByRole('button', { name: /Start kortene/ }).click();
  for (let index = 0; index < 12; index += 1) {
    const ready = page.getByRole('button', { name: /Se mine treff/ });
    if (await ready.isEnabled().catch(() => false)) return;
    await page.keyboard.press('ArrowRight');
  }
}

test('landing presents the V2 value proposition', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Reiser som føles')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Finn min reisestil' })).toBeVisible();
  await expect(page.getByText('Turbrief først')).toBeVisible();
});

test('trip brief keeps destination as a guard rail', async ({ page }) => {
  await openBrief(page);
  await expect(page.getByPlaceholder('For eksempel Lisboa')).toBeVisible();
  await expect(page.getByRole('button', { name: /Start kortene/ })).toBeDisabled();
  await page.getByPlaceholder('For eksempel Lisboa').fill('Oslo');
  await expect(page.getByRole('button', { name: /Start kortene/ })).toBeEnabled();
});

test('swipe card fits the viewport and is visibly thrown aside', async ({ page }, testInfo) => {
  await openBrief(page);
  await page.getByPlaceholder('For eksempel Lisboa').fill('Lisboa');
  await page.getByRole('button', { name: /Start kortene/ }).click();

  const card = page.locator('.swipe-card:not(.swipe-card--behind)');
  const firstQuestion = await card.locator('.swipe-card__copy h1').innerText();
  const cardBox = await card.boundingBox();
  const viewport = page.viewportSize();
  expect(cardBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(cardBox!.x).toBeGreaterThanOrEqual(0);
  expect(cardBox!.x + cardBox!.width).toBeLessThanOrEqual(viewport!.width);
  expect(cardBox!.y + cardBox!.height).toBeLessThanOrEqual(viewport!.height);

  const meta = card.locator('.swipe-card__meta');
  const metaBox = await meta.boundingBox();
  expect(metaBox!.x).toBeGreaterThan(cardBox!.x + 20);
  expect(metaBox!.x + metaBox!.width).toBeLessThan(cardBox!.x + cardBox!.width - 20);

  await page.screenshot({ path: testInfo.outputPath('swipe-desktop.png'), fullPage: true });
  await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(cardBox!.x + cardBox!.width / 2 + 260, cardBox!.y + cardBox!.height / 2 + 24, { steps: 8 });
  await expect(card).toHaveClass(/is-dragging/);
  await page.mouse.up();
  await expect(card).toHaveClass(/is-exiting/);
  await page.waitForTimeout(140);
  const exitBox = await card.boundingBox();
  expect(exitBox!.x).toBeGreaterThan(cardBox!.x + 250);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport!.width);
  await page.screenshot({ path: testInfo.outputPath('swipe-throw.png'), fullPage: true });
  await expect.poll(() => card.locator('.swipe-card__copy h1').innerText()).not.toBe(firstQuestion);
  await expect(card).not.toHaveClass(/is-exiting/);

  await page.setViewportSize({ width: 390, height: 667 });
  const mobileBox = await card.boundingBox();
  expect(mobileBox!.x).toBeGreaterThanOrEqual(0);
  expect(mobileBox!.x + mobileBox!.width).toBeLessThanOrEqual(390);
  expect(mobileBox!.y + mobileBox!.height).toBeLessThanOrEqual(667);
  const mobileControls = await page.locator('.reaction-controls').boundingBox();
  expect(mobileControls!.y + mobileControls!.height).toBeLessThanOrEqual(667);
  await page.screenshot({ path: testInfo.outputPath('swipe-mobile.png'), fullPage: true });
});

test('mobile swipe locks to the intended axis and surfaces results without scrolling', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openBrief(page);
  await page.getByPlaceholder('For eksempel Lisboa').fill('Malaga');
  await page.getByRole('button', { name: /Start kortene/ }).click();

  const card = page.locator('.swipe-card:not(.swipe-card--behind)');
  const firstQuestion = await card.locator('.swipe-card__copy h1').innerText();
  const cardBox = await card.boundingBox();
  const centerX = cardBox!.x + cardBox!.width / 2;
  const centerY = cardBox!.y + cardBox!.height / 2;

  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + 5, centerY + 110, { steps: 6 });
  await page.mouse.up();
  await expect(card.locator('.swipe-card__copy h1')).toHaveText(firstQuestion);
  await expect(card).not.toHaveClass(/is-dragging/);

  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + 145, centerY + 10, { steps: 7 });
  await page.mouse.up();
  await expect.poll(() => card.locator('.swipe-card__copy h1').innerText()).not.toBe(firstQuestion);

  for (let index = 0; index < 4; index += 1) await page.getByRole('button', { name: 'Ja' }).click();
  const resultsButton = page.locator('.mobile-results-cta');
  await expect(resultsButton).toBeVisible();
  const controlsBox = await page.locator('.reaction-controls').boundingBox();
  const resultsBox = await resultsButton.boundingBox();
  expect(controlsBox!.y + controlsBox!.height).toBeLessThanOrEqual(844);
  expect(resultsBox!.y + resultsBox!.height).toBeLessThanOrEqual(844);
  expect(await page.evaluate(() => ({ scrollY: window.scrollY, overflow: getComputedStyle(document.body).overflow }))).toEqual({ scrollY: 0, overflow: 'hidden' });

  await page.getByRole('button', { name: 'Ja' }).click();
  await expect(page.getByRole('heading', { name: 'Vil du se treffene dine nå?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Vis treffene nå' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('swipe-mobile-ready-prompt.png'), fullPage: true });
});

test('ready profile remains balanced on a tall desktop', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1577, height: 937 });
  await openBrief(page);
  await page.getByPlaceholder('For eksempel Lisboa').fill('Malaga');
  await page.getByRole('button', { name: /Start kortene/ }).click();
  for (let index = 0; index < 14; index += 1) await page.keyboard.press('ArrowRight');

  const heading = page.getByRole('heading', { name: 'Profilen er klar.' });
  await expect(heading).toBeVisible();
  const headingBox = await heading.boundingBox();
  expect(headingBox!.height).toBeLessThan(70);

  const card = page.locator('.swipe-card:not(.swipe-card--behind)');
  const cardBox = await card.boundingBox();
  const controlsBox = await page.locator('.reaction-controls').boundingBox();
  const emojiBox = await card.locator('.swipe-card__emoji').boundingBox();
  const copyBox = await card.locator('.swipe-card__copy').boundingBox();
  expect(cardBox!.y + cardBox!.height).toBeLessThan(827);
  expect(controlsBox!.y + controlsBox!.height).toBeLessThanOrEqual(920);
  expect(copyBox!.y - (emojiBox!.y + emojiBox!.height)).toBeLessThan(55);

  const lastHeaderAction = page.locator('.app-header__right').locator('button').last();
  const lastHeaderBox = await lastHeaderAction.boundingBox();
  expect(lastHeaderBox!.x + lastHeaderBox!.width).toBeLessThanOrEqual(1577);
  expect(await page.evaluate(() => ({ scrollX: window.scrollX, width: document.documentElement.scrollWidth }))).toEqual({ scrollX: 0, width: 1577 });
  await page.screenshot({ path: testInfo.outputPath('swipe-ready-desktop.png'), fullPage: true });
});

test('adaptive profiling sends V2 taste and renders live results', async ({ page }) => {
  let recsBody: Record<string, unknown> | null = null;
  await page.route('**/sessions', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
  await page.route('**/prefs', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
  await page.route('**/recs/web', async (route) => {
    recsBody = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [{
          id: 'live-1',
          name: 'Live: Alfama morning walk',
          cat: 'culture',
          match: 91,
          why: 'Culture · fits your hidden-gem brief',
          url: 'https://example.com/alfama',
        }],
      }),
    });
  });

  await openBrief(page);
  await page.getByRole('button', { name: 'Skjulte funn' }).click();
  await buildReadyProfile(page);
  const findButton = page.getByRole('button', { name: /Se mine treff/ });
  await expect(findButton).toBeEnabled();
  await findButton.click();

  await expect(page.getByText('Live: Alfama morning walk')).toBeVisible();
  expect(recsBody).not.toBeNull();
  const taste = recsBody?.taste as Record<string, unknown>;
  expect(taste.version).toBe(2);
  expect((taste.context as Record<string, unknown>).discovery).toBe('hidden');
});

test('failed live search falls back to sourced, actionable starter tips', async ({ page }) => {
  await page.route('**/sessions', async (route) => route.abort());
  await page.route('**/prefs', async (route) => route.abort());
  await page.route('**/recs/web', async (route) => route.abort());
  await openBrief(page);
  await buildReadyProfile(page);
  await page.getByRole('button', { name: /Se mine treff/ }).click();

  await expect(page.getByText(/Livesøket svarte ikke/)).toBeVisible();
  await expect(page.getByText('Kurert starttips').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Søk i kart/ }).first()).toHaveAttribute('href', /google\.com\/maps/);
});

test('English changes the full interface and persists after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('group', { name: 'Språk' }).getByRole('button', { name: 'EN' }).click();
  await expect(page.getByRole('button', { name: 'Find my travel style' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  await page.reload();
  await expect(page.getByRole('button', { name: 'Find my travel style' })).toBeVisible();
  await page.getByRole('button', { name: 'Find my travel style' }).click();
  await expect(page.getByPlaceholder('For example Lisbon')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start the cards' })).toBeDisabled();
  await page.getByPlaceholder('For example Lisbon').fill('Lisbon');
  await page.getByRole('button', { name: 'Start the cards' }).click();
  await expect(page.getByText('ADAPTIVE PROFILING')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Love it' })).toBeVisible();
  await expect(page.locator('.swipe-card__copy h1')).not.toContainText(/[æøå]/i);
});

test('saved result and explicit feedback survive a reload', async ({ page }) => {
  await page.route('**/sessions', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route('**/prefs', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route('**/feedback', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route('**/recs/web', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ run_id: 'run-save', provider: 'google_places', items: [{ id: 'save-1', name: 'Teststed i Oslo', cat: 'culture', match: 84, why: 'Passer kulturprofilen.', url: 'https://example.com/place', source: 'google_places' }] }),
  }));
  await openBrief(page);
  await buildReadyProfile(page);
  await page.getByRole('button', { name: /Se mine treff/ }).click();
  await page.getByRole('button', { name: 'Lagre Teststed i Oslo' }).click();
  await page.getByRole('button', { name: 'Bra tips' }).click();
  await expect(page.getByRole('button', { name: 'Bra tips' })).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await page.getByRole('button', { name: /Lagret \(1\)/ }).click();
  await expect(page.getByText('Teststed i Oslo')).toBeVisible();
});

test('a result is shared with a trackable marketing link', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (payload: ShareData) => { (window as typeof window & { __shared?: ShareData }).__shared = payload; },
    });
  });
  await page.route('**/sessions', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route('**/prefs', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route('**/recs/web', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [{ id: 'share-1', name: 'Solnedgang over Alfama', cat: 'culture', match: 93, why: 'Passer oppdagelsesprofilen din.', url: 'https://example.com/alfama', source: 'google_places' }] }),
  }));

  await openBrief(page);
  await buildReadyProfile(page);
  await page.getByRole('button', { name: /Se mine treff/ }).click();
  await page.getByRole('button', { name: 'Del Solnedgang over Alfama' }).click();

  await expect(page.getByText(/Delingsvinduet er åpnet/)).toBeVisible();
  const shared = await page.evaluate(() => (window as typeof window & { __shared?: ShareData }).__shared);
  expect(shared?.title).toContain('Travel Swipe');
  expect(shared?.text).toContain('Solnedgang over Alfama');
  expect(shared?.text).toContain('Sveip deg frem');
  expect(shared?.url).toContain('utm_source=user_share');
  expect(shared?.url).toContain('utm_campaign=shared_result');
});

test('the PWA install action uses the browser install prompt', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const installEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted'; platform: string }>;
    };
    installEvent.prompt = async () => { (window as typeof window & { __installPrompted?: boolean }).__installPrompted = true; };
    installEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
    window.dispatchEvent(installEvent);
  });

  const installButton = page.getByRole('button', { name: /Installer app/ });
  await expect(installButton).toBeVisible();
  await installButton.click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __installPrompted?: boolean }).__installPrompted)).toBe(true);
});
