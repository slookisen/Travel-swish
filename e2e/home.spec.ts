import { test, expect, type Page } from '@playwright/test';
import dataset from '../src/dataset/cards/all.json' with { type: 'json' };
import { UI_COPY, type AppLanguage } from '../src/app/i18n';
import { readable } from './helpers/contrast';

async function home(page: Page, language: AppLanguage, theme: string, foodReady = true) {
  const reactions = Object.fromEntries(['experiences', 'restaurants'].map(mode => [mode,
    mode === 'restaurants' && !foodReady ? {} : Object.fromEntries(dataset.cards.filter(c => c.modes.includes(mode))
      .filter((c, i, all) => all.findIndex(other => other.cat === c.cat) === i).slice(0, 12)
      .map(c => [c.id, {cardId:c.id,reaction:'like',answeredAt:Date.now()}])),
  ]));
  await page.addInitScript(({ reactions, language, theme }) => {
    if (localStorage.getItem('home-qa-seeded')) return;
    localStorage.setItem('home-qa-seeded', '1');
    localStorage.setItem('travel_swish_language_v1', language);
    localStorage.setItem('travel_swipe_theme_v1', theme);
    localStorage.setItem('travel_swish_app_v3', JSON.stringify({
      version:3, profile:{version:2,reactions,corrections:{}},
      trip:{destination:'Málaga, Spain',mode:'experiences',context:{party:'couple',pace:'balanced',budget:'value',discovery:'mix'}},
      saved:{},feedback:{},recentRuns:[],
    }));
  }, {reactions,language,theme});
  await page.goto('/Travel-swish/');
}

for (const language of ['no', 'en'] as const) for (const theme of ['light', 'dark']) {
  test(`home switches category copy, artwork and actual search mode: ${language} ${theme}`, async ({ page, browserName }, info) => {
    const copy = UI_COPY[language];
    await page.setViewportSize({width:375,height:667});
    const requests: any[] = [];
    await page.route('**/recs/personalized', route => {
      requests.push(route.request().postDataJSON());
      return route.fulfill({json:{provider:'google_places',items:[{id:'p1',name:'Test place',cat:'nature',source:'google_places'}]}});
    });
    await home(page, language, theme);
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('travel_swish_app_v3')!).profile);
    for (const mode of ['experiences', 'restaurants'] as const) {
      const content = copy.home[mode];
      await page.getByRole('button', {name:copy.brief[mode],exact:true}).click();
      await expect(page.getByRole('heading', {name:`${content.title} ${content.accent}`})).toBeVisible();
      await expect(page.locator('.quick-home')).toHaveClass(new RegExp(`quick-home--${mode}`));
      await expect(page.locator('.home-hero__lead')).toHaveText(content.lead);
      await expect(page.getByRole('button', {name:copy.home.refine,exact:true})).toBeEnabled();
      expect(requests).toHaveLength(mode === 'experiences' ? 0 : 1);
      const actions = page.locator('.home-action');
      for (const action of await actions.all()) await expect(action).toBeInViewport({ratio:1});
      const [left, right] = await Promise.all([actions.nth(0).boundingBox(), actions.nth(1).boundingBox()]);
      expect(Math.abs(left!.width - right!.width)).toBeLessThan(1);
      expect(left!.height).toBe(right!.height);
      expect(left!.y).toBe(right!.y);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await readable(page);
      await page.screenshot({path:info.outputPath(`home-${mode}-${language}-${theme}-mobile.png`),fullPage:true});
      if (browserName === 'chromium' && language === 'no') {
        await page.setViewportSize({width:1365,height:900});
        await readable(page);
        await page.screenshot({path:info.outputPath(`home-${mode}-${theme}-desktop.png`),fullPage:true});
        await page.setViewportSize({width:375,height:667});
      }
      await page.getByRole('button', {name:content.find,exact:true}).click();
      await expect(page.locator('.result-card')).toHaveCount(1);
      expect(requests.at(-1).mode).toBe(mode);
      expect(requests.at(-1).search_kind).toBe(mode);
      expect(requests.at(-1).destination).toBe('Málaga, Spain');
      await page.getByRole('button', {name:copy.nav.home,exact:true}).click();
    }
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('travel_swish_app_v3')!).profile)).toEqual(before);
    await page.reload();
    await expect(page.getByRole('button', {name:copy.brief.restaurants,exact:true})).toHaveAttribute('aria-pressed','true');
    await expect(page.getByRole('heading', {name:`${copy.home.restaurants.title} ${copy.home.restaurants.accent}`})).toBeVisible();
    expect(requests).toHaveLength(2);
  });
}

test('unlearned food profile and missing destination have clear, separate actions', async ({ page }) => {
  await page.setViewportSize({width:320,height:640});
  await home(page, 'no', 'dark', false);
  await page.getByRole('button', {name:'Mat og drikke',exact:true}).click();
  await expect(page.getByRole('button', {name:'Finn mat og drikke',exact:true})).toBeDisabled();
  await expect(page.getByRole('button', {name:'Bygg profilen min',exact:true})).toBeEnabled();
  await expect(page.getByRole('status')).toContainText('egen profil');
  await readable(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel('Hvor vil du finne tips?').fill('');
  await expect(page.locator('.home-action--profile')).toBeDisabled();
  await expect(page.locator('.home-action--find')).toBeDisabled();
  await page.getByLabel('Hvor vil du finne tips?').fill('Oslo');
  await page.getByRole('button', {name:'Bygg profilen min',exact:true}).click();
  await expect(page.locator('.swipe-count')).toContainText('0');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('travel_swish_app_v3')!).profile);
  expect(Object.keys(stored.reactions.experiences)).toHaveLength(12);
  expect(stored.reactions.restaurants).toEqual({});
});

test('category choice works with keyboard and reduced motion', async ({ page }) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await home(page, 'en', 'light');
  const food = page.getByRole('button', {name:'Food and drink',exact:true});
  await food.focus();
  await page.keyboard.press('Space');
  await expect(food).toBeFocused();
  await expect(food).toHaveAttribute('aria-pressed','true');
  // The shared reduced-motion reset uses .01ms rather than exactly zero.
  expect(await page.locator('.home-action--profile').evaluate(el => parseFloat(getComputedStyle(el).transitionDuration))).toBeLessThan(.001);
  await page.getByRole('button', {name:'NO',exact:true}).click();
  await expect(page.getByRole('heading', {name:'Finn din neste favoritt.'})).toBeVisible();
  await expect(page.getByRole('button', {name:'Forbedre profilen min',exact:true})).toBeVisible();
});

test('profile cards stay available while live search is cooling down', async ({ page }) => {
  await page.route('**/recs/personalized', route => route.fulfill({status:429,headers:{'Retry-After':'60','Access-Control-Expose-Headers':'Retry-After'},json:{detail:'rate_limited'}}));
  await home(page, 'no', 'dark');
  await page.getByRole('button', {name:'Finn opplevelser',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Søket trenger en liten pause');
  await page.getByRole('button', {name:'Lukk',exact:true}).click();
  await expect(page.locator('.home-action--find')).toBeDisabled();
  await expect(page.locator('.home-action--profile')).toBeEnabled();
  await page.getByRole('button', {name:'Forbedre profilen min',exact:true}).click();
  await page.getByRole('button', {name:UI_COPY.no.swipe.keepSwiping,exact:true}).click();
  await expect(page.locator('.swipe-card__copy h1')).toBeVisible();
});
