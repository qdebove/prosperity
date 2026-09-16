import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173');
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `.artifacts/layout-${width}.jpg` });
    const overflow = await page.evaluate(() => [...document.querySelectorAll('body *')].flatMap(el => {
      if (el.matches('.atlas-frame > img')) return [];
      const rect = el.getBoundingClientRect();
      if (rect.width && (rect.right > innerWidth + 1 || rect.left < -1)) return [{ tag: el.tagName, class: el.className?.baseVal ?? el.className, left: Math.round(rect.left), right: Math.round(rect.right) }];
      return [];
    }));
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    console.log(JSON.stringify({ width, scrollWidth, overflow }));
  }
} finally {
  await browser.close();
}
