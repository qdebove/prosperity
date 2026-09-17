import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage();
  page.on('pageerror', error => console.log('PAGE ERROR', error.message));
  await page.goto('http://127.0.0.1:5173');
  for (const [width, height] of [[1366, 768], [1440, 900], [1920, 1080], [2560, 1440]]) {
    await page.setViewportSize({ width, height });
    await page.screenshot({ path: `.artifacts/table-${width}.jpg` });
    console.log(JSON.stringify(await page.evaluate(() => ({
      viewport: [innerWidth, innerHeight], scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
      sizes: ['.table-surface', '.territory-frame', '.play-board', '.research-row', '.board-technology', '.board-technology > .tile-art'].map(selector => {
        const el = document.querySelector(selector); const r = el.getBoundingClientRect();
        return { selector, size: [r.width, r.height], css: [getComputedStyle(el).minHeight, getComputedStyle(el).aspectRatio] };
      }),
    }))));
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole('button', { name: 'Révéler la première tuile' }).click();
  await page.locator('.revealing').waitFor({ state: 'detached' });
  const resolve = page.getByRole('button', { name: 'Valider', exact: true });
  if (await resolve.isVisible()) await resolve.click();
  await page.getByRole('button', { name: 'Jouer mes deux actions' }).click();
  await page.getByRole('button', { name: 'Centrale au fioul, 100 euros' }).click();
  await page.getByTestId('slot-a1').hover();
  await page.screenshot({ path: '.artifacts/table-purchase.jpg' });
} finally { await browser.close(); }
