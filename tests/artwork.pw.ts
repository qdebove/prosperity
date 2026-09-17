import { enterActions, navigate } from './ui';
import { expect, test, type Page } from '@playwright/test';

async function checkFrames(page: Page, selector: string) {
  await page.locator(`${selector} img`).evaluateAll(images => images.forEach(image => image.loading = 'eager'));
  await page.waitForFunction(selector => [...document.querySelectorAll<HTMLImageElement>(`${selector} img`)].every(image => image.complete && image.naturalWidth > 0), selector);
  return page.locator(selector).evaluateAll(frames => frames.map(frame => {
    const image = frame.querySelector('img')!;
    const box = frame.getBoundingClientRect();
    const source = image.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 48;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, (box.left - source.left) / source.width * image.naturalWidth, (box.top - source.top) / source.height * image.naturalHeight, box.width / source.width * image.naturalWidth, box.height / source.height * image.naturalHeight, 0, 0, 48, 48);
    const pixels = context.getImageData(0, 0, 48, 48).data;
    let foreground = 0;
    for (let i = 0; i < pixels.length; i += 4) if (Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 180) foreground++;
    return { source: image.getAttribute('src'), foreground, fingerprint: canvas.toDataURL() };
  }));
}

test('66 illustrations distinctes et non vides, aucun scan affiché', async ({ page }) => {
  const oldRequests: string[] = [];
  page.on('request', request => { if (/\/assets\/[^/]+\.jpg/.test(request.url())) oldRequests.push(request.url()); });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const starting = await checkFrames(page, '.play-board .atlas-frame');
  expect(starting).toHaveLength(6);
  await page.screenshot({ path: '.artifacts/illustrated-desktop.jpg' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.artifacts/illustrated-mobile.jpg' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.getByTestId('slot-a1').click();
  await expect(page.getByRole('region', { name: 'Détails de la technologie' }).locator('[data-symbol="energy"]')).toHaveText('+2');
  await expect(page.getByRole('region', { name: 'Détails de la technologie' }).locator('[data-symbol="ecology"]')).toHaveText('-1');
  await page.getByRole('button', { name: 'Fermer les détails', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await navigate(page, 'Atelier de tuiles');
  const technologies = await checkFrames(page, '.library-grid .atlas-frame');
  expect(technologies).toHaveLength(60);
  const all = [...starting, ...technologies];
  expect(new Set(all.map(frame => frame.source)).size).toBe(6);
  expect(new Set(all.map(frame => frame.fingerprint)).size).toBe(66);
  for (const frame of all) expect(frame.foreground, frame.source!).toBeGreaterThan(120);
  await expect(page.getByRole('checkbox', { name: 'Symboles sur l’illustration' })).toBeChecked();
  await page.screenshot({ path: '.artifacts/illustrated-editor.jpg' });
  await page.getByRole('button', { name: 'Bibliothèque', exact: true }).click();
  await expect(page.getByRole('dialog').locator('.atlas-frame')).toHaveCount(60);
  await expect(page.getByRole('dialog').locator('.art-symbol')).toHaveCount(0);
  await page.screenshot({ path: '.artifacts/illustrated-library.jpg' });
  await page.getByRole('dialog').getByRole('button', { name: 'Parc éolien', exact: true }).click();
  await expect(page.locator('.editor-preview .atlas-frame img')).toHaveAttribute('src', '/assets/tiles/nation-02.png');
  await expect(page.getByRole('spinbutton', { name: 'Valeur Écologie' })).toHaveValue('-2');
  await expect(page.locator('.editor-preview [data-symbol="ecology"]')).toHaveText('-2');
  expect(oldRequests).toEqual([]);
});

test('une sauvegarde existante reçoit les nouveaux visuels et garde son état', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Révéler la première tuile' }).click();
  await enterActions(page);
  await page.getByRole('button', { name: /Revenus/ }).click();
  const previous = await page.evaluate(() => {
    const game = JSON.parse(localStorage.getItem('prosperity.game.v1')!);
    for (const tile of game.catalog) tile.image = `/assets/${tile.id}.jpg`;
    for (const tile of Object.values(game.board) as ({ id: string; image: string } | null)[]) if (tile) tile.image = `/assets/${tile.id}.jpg`;
    localStorage.setItem('prosperity.game.v1', JSON.stringify(game));
    localStorage.setItem('prosperity.catalog.v1', JSON.stringify(game.catalog));
    return { turn: game.turn, money: game.money, plannedActions: game.plannedActions, pollution: game.pollution, research: game.research };
  });
  const oldRequests: string[] = [];
  page.on('request', request => { if (/\/assets\/[^/]+\.jpg/.test(request.url())) oldRequests.push(request.url()); });
  await page.reload();
  await expect(page.locator('.play-board .atlas-frame')).toHaveCount(6);
  const resumed = await page.evaluate(() => JSON.parse(localStorage.getItem('prosperity.game.v1')!));
  expect(resumed).toMatchObject(previous);
  expect(resumed.catalog.every((tile: { image: string }) => tile.image.startsWith('/assets/tiles/'))).toBe(true);
  await page.getByRole('button', { name: 'Annuler la dernière action', exact: true }).click();
  await expect(page.getByTestId('money-preview')).toHaveText(`${previous.money} €`);
  expect(oldRequests).toEqual([]);
});
