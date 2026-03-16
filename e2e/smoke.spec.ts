import { test, expect } from '@playwright/test';

test('loads landing without blank screen', async ({ page }) => {
  await page.goto('/?mock=1');
  await expect(page.getByText('Swipe → plan → book')).toBeVisible();
  await expect(page.getByRole('button', { name: /Kom i gang|Get started|Kom igång/i })).toBeVisible();
});

test('home guard rails: cannot start without destination', async ({ page }) => {
  await page.goto('/?mock=1');
  await page.getByRole('button', { name: /Kom i gang|Get started|Kom igång/i }).click();

  // "Start Opplevelser" / "Start Restauranter" (localized)
  await page.getByRole('button', { name: /Start/i }).first().click();
  await expect(page.getByText(/Destinasjon mangler|Destination required|Destination krävs/i)).toBeVisible();
});

test('swipe -> find suggestions -> results render (mock mode)', async ({ page }) => {
  await page.goto('/?mock=1');
  await page.getByRole('button', { name: /Kom i gang|Get started|Kom igång/i }).click();

  // Destination (label isn't associated with input via for/id)
  await page.getByPlaceholder(/Barcelona|Stockholm|Tokyo/i).fill('Oslo');

  // Start selected mode
  await page.getByRole('button', { name: /Start/i }).first().click();

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
