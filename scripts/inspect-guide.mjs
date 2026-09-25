import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
mkdirSync('.artifacts/guide', { recursive: true });
await page.goto('http://127.0.0.1:5173');
await page.locator('img').evaluateAll(imgs => Promise.all(imgs.map(img => { img.loading = 'eager'; return img.decode(); })));
await page.screenshot({ path: '.artifacts/guide/current-desktop.png' });
const manifest = JSON.parse(readFileSync('implementation_guide/manifest-images.json', 'utf8'));
for (let i = 0; i < manifest.length; i += 10) {
  await page.setViewportSize({ width: 1800, height: 1400 });
  await page.setContent(`<style>body{font:14px Arial;background:#eee;display:grid;grid-template-columns:repeat(5,1fr);gap:16px}figure{margin:0}img{width:100%;height:610px;object-fit:contain}figcaption{height:45px}</style>${manifest.slice(i, i + 10).map(x => `<figure><figcaption>${x.file}</figcaption><img src="http://127.0.0.1:5173/implementation_guide/${x.file}"></figure>`).join('')}`);
  await page.locator('img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
  await page.screenshot({ path: `.artifacts/guide/references-${i}.png`, fullPage: true });
}
const html = readFileSync('implementation_guide/prosperity-guide-illustre.html', 'utf8');
console.log('HTML reference read:', html.length, 'characters;', manifest.length, 'images reviewed.');
await browser.close();
