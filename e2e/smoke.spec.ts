import { test, expect } from '@playwright/test';

test('loads landing without blank screen', async ({ page }) => {
  await page.goto('/?mock=1');
  await expect(page.getByText('Swipe → plan → book')).toBeVisible();
  await expect(page.getByRole('button', { name: /Kom i gang|Get started|Kom igång/i })).toBeVisible();
});

test('home guard rails: cannot start without destination', async ({ page }) => {
  await page.goto('/?mock=1');
  await page.getByRole('button', { name: /Kom i gang|Get started|Kom igång/i }).click();

  await expect(page.getByPlaceholder(/Barcelona|Stockholm|Tokyo/i)).toBeVisible();

  // Start button is disabled until destination is provided; verify the guard message appears.
  const startBtn = page.getByRole('button', { name: /^Start\b/i }).first();
  await expect(startBtn).toBeDisabled();

  // App shows an inline validation hint.
  await expect(
    page.getByText(/Destinasjon mangler|Destination required|Destination krävs|Enter a destination to get started/i)
  ).toBeVisible();
});

test('swipe -> find suggestions -> results render (mock mode)', async ({ page }) => {
  await page.goto('/?mock=1');
  await page.getByRole('button', { name: /Kom i gang|Get started|Kom igång/i }).click();

  // Destination (label isn't associated with input via for/id)
  await expect(page.getByPlaceholder(/Barcelona|Stockholm|Tokyo/i)).toBeVisible();
  await page.getByPlaceholder(/Barcelona|Stockholm|Tokyo/i).fill('Oslo');

  // Start selected mode (avoid matching "Get started")
  await page.getByRole('button', { name: /^Start\b/i }).first().click();

  // Swipe 10 cards quickly (keyboard is more reliable than clicking during animations)
  await page.getByText(/Dra ←\/→|Drag ←\/→/i).click();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(350);
  }

  const findBtn = page.getByRole('button', { name: /Finn forslag|Find suggestions|Hitta förslag/i });
  await expect(findBtn).toBeEnabled({ timeout: 30_000 });
  await findBtn.click();

  // Results page should contain mock items and "Hvorfor" expandable.
  await expect(page.getByText(/Mock mode/i).first()).toBeVisible();
  await expect(page.getByText(/Mock:/i).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Finn flere|Find more|Hitta fler/i })).toBeVisible();
  await expect(page.getByText(/Hvorfor|Why|Varför/i).first()).toBeVisible();
});

test('backend timeout -> cold-start notice + retry recovers', async ({ page }) => {
  // App default BACKEND_URL on localhost is http://127.0.0.1:8787.
  // We mock CORS + responses here so we can deterministically hit the client-side "timeout" path.
  const backendHostRe = /\/\/(127\.0\.0\.1|localhost):8787\//;

  const corsHeaders = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': '*',
  };

  let prefsPosts = 0;
  await page.route('**/prefs', async (route) => {
    const req = route.request();
    const url = req.url();
    if (!backendHostRe.test(url)) return route.continue();

    if (req.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: corsHeaders, body: '' });
    }

    prefsPosts += 1;

    // First /prefs POST: return an explicit "Timeout" error so the app treats it as cold-start.
    if (prefsPosts === 1) {
      return route.fulfill({
        status: 504,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
        body: JSON.stringify({ detail: 'Timeout' }),
      });
    }

    // Retry /prefs: succeed.
    return route.fulfill({
      status: 200,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    });
  });

  let recsPosts = 0;
  await page.route('**/recs/web', async (route) => {
    const req = route.request();
    const url = req.url();
    if (!backendHostRe.test(url)) return route.continue();

    if (req.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: corsHeaders, body: '' });
    }

    recsPosts += 1;
    return route.fulfill({
      status: 200,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({
        items: [
          {
            id: 'live_1',
            name: 'Live: Backend suggestion',
            url: 'https://example.com/live',
            cat: 'Experience',
            match: 91,
            why: 'Injected by Playwright route (retry success).',
            source: 'e2e',
            snippet: 'Live payload from mocked backend.',
            domain: 'example.com',
            query_source: 'playwright',
          },
        ],
      }),
    });
  });

  // Run the real (non-mock) flow to trigger backend calls.
  await page.goto('/');
  await page.getByRole('button', { name: /Kom i gang|Get started|Kom igång/i }).click();

  await expect(page.getByPlaceholder(/Barcelona|Stockholm|Tokyo/i)).toBeVisible();
  await page.getByPlaceholder(/Barcelona|Stockholm|Tokyo/i).fill('Oslo');
  await page.getByRole('button', { name: /^Start\b/i }).first().click();

  await page.getByText(/Dra ←\/→|Drag ←\/→/i).click();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(350);
  }

  const findBtn = page.getByRole('button', { name: /Finn forslag|Find suggestions|Hitta förslag/i });
  await expect(findBtn).toBeEnabled({ timeout: 30_000 });
  await findBtn.click();

  // After the forced timeout, the app should show a cold-start notice and still render demo results.
  await expect(page.getByText(/cold start/i)).toBeVisible({ timeout: 30_000 });
  const tryAgainBtn = page.getByRole('button', { name: /Prøv igjen|Try again|Försök igen/i });
  await expect(tryAgainBtn).toBeVisible();

  // Retry should succeed and show the mocked live item, with the notice cleared.
  await tryAgainBtn.click();
  await expect(page.getByText('Live: Backend suggestion')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/cold start/i)).toHaveCount(0);

  expect(prefsPosts).toBeGreaterThanOrEqual(2);
  expect(recsPosts).toBe(1);
});
