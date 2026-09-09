import { expect, type Page } from '@playwright/test';

// DOM text check with ancestor alpha compositing; screenshots also verify the
// gradients/emoji/native controls that a computed-colour check cannot assess.
export async function readable(page: Page) {
  const failures = await page.evaluate(() => {
    const rgba = (s: string) => (s.match(/[\d.]+/g) || []).map(Number);
    const blend = (fg: number[], bg: number[]) => fg.slice(0, 3).map((v, i) => v * (fg[3] ?? 1) + bg[i] * (1 - (fg[3] ?? 1)));
    const luminance = (c: number[]) => c.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
    const ratio = (a: number[], b: number[]) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
    return [...document.querySelectorAll<HTMLElement>('body *')].flatMap(el => {
      const text = [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('').trim();
      if (!/[a-zæøå0-9]/i.test(text) || ['SCRIPT', 'STYLE', 'OPTION'].includes(el.tagName)) return [];
      const style = getComputedStyle(el);
      if (!el.getClientRects().length || style.visibility !== 'visible' || style.opacity === '0') return [];
      const parents = []; let parent: HTMLElement | null = el;
      while (parent) { parents.unshift(parent); parent = parent.parentElement; }
      if (parents.some(p => getComputedStyle(p).opacity === '0' || getComputedStyle(p).visibility === 'hidden')) return [];
      let bg = [255, 255, 255];
      for (const p of parents) bg = blend(rgba(getComputedStyle(p).backgroundColor), bg);
      // Evaluate card text against the brightest stop too (worst dark gradient).
      if (el.closest('.swipe-card:not(.swipe-card--behind), .preview-card:not(.preview-card--back)')) bg = [34, 62, 67];
      const contrast = ratio(blend(rgba(style.color), bg), bg);
      const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700);
      return contrast + .01 < (large ? 3 : 4.5) ? [{ text: text.slice(0, 50), contrast: contrast.toFixed(2), class: el.className }] : [];
    });
  });
  expect(failures, 'Visible text must meet WCAG AA contrast (including disabled labels)').toEqual([]);
}
