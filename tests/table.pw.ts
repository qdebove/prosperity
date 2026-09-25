import { expect, test, type Page } from '@playwright/test';
import { enterActions, openResearch, openNation } from './ui';

async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Révéler la première tuile' }).click();
  await enterActions(page);
}

test('deux recherches déplacent le pion, changent les prix et restent annulables', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await start(page);
  await openResearch(page);
  const marker = page.getByTestId('marker-nation-energy');
  const original = await marker.getAttribute('data-position');
  await page.getByRole('button', { name: 'Recherche +1 case', exact: true }).click();
  await expect(page.locator('.play-table')).toHaveClass(/view-research/);
  await page.getByRole('button', { name: 'Rechercher en énergie : avancer d’une case' }).click();
  await expect(marker).not.toHaveAttribute('data-position', original!);
  await expect(page.locator('.action-tokens .available')).toHaveCount(1);
  await page.getByRole('button', { name: 'Rechercher en énergie : avancer d’une case' }).click();
  await expect(page.locator('.action-tokens .available')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Centrale au fioul, 50 euros', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Annuler les deux actions' }).click();
  await expect(marker).toHaveAttribute('data-position', original!);
  await expect(page.locator('.action-tokens .available')).toHaveCount(2);
});

test('remplacement et transport : aperçu exact, ouverture des accès et annulation', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const G = JSON.parse(localStorage.getItem('prosperity.game.v1')!);
    G.money = 2000;
    localStorage.setItem('prosperity.game.v1', JSON.stringify(G));
  });
  await page.reload();
  await enterActions(page);
  await openResearch(page);
  await page.getByRole('button', { name: 'Centrale au fioul, 100 euros', exact: true }).click();
  await page.getByRole('button', { name: 'Prévisualiser en A1' }).click();
  const details = page.getByRole('region', { name: 'Détails de la technologie' });
  await expect(details).toContainText('Centrale à charbon');
  await expect(details).toContainText('Même niveau que votre recherche');
  await expect(details.locator('tr').filter({ hasText: 'Énergie' })).toContainText('3');
  await page.getByRole('button', { name: 'Prévisualiser en A1' }).click();
  await page.getByRole('button', { name: /^(Construire|Remplacer) en A1$/ }).click();
  await expect(page.getByTestId('slot-a1')).toContainText('Centrale au fioul');
  await page.getByRole('button', { name: 'Annuler la dernière action' }).click();
  await expect(page.getByTestId('slot-a1')).toContainText('Centrale à charbon');
  await expect(page.getByTestId('slot-d1')).toHaveClass(/locked/);
  await openResearch(page);
  await page.getByRole('button', { name: 'Transports intégrés, 500 euros', exact: true }).click();
  await page.getByRole('button', { name: 'Prévisualiser en C1' }).click();
  await page.getByRole('button', { name: /^(Construire|Remplacer) en C1$/ }).click();
  await expect(page.getByTestId('slot-d1')).toHaveClass(/newly-unlocked/);
  await page.getByRole('button', { name: 'Annuler la dernière action' }).click();
  await expect(page.getByTestId('slot-d1')).toHaveClass(/locked/);
});

test('pollution au-delà de la piste et symbole découvert sans plafonner les règles', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const G = JSON.parse(localStorage.getItem('prosperity.game.v1')!);
    G.pollution = 17;
    localStorage.setItem('prosperity.game.v1', JSON.stringify(G));
  });
  await page.reload();
  await enterActions(page);
  await expect(page.getByRole('region', { name: 'Piste de pollution' })).toContainText('Prospérité bloquée');
  await expect(page.getByRole('region', { name: 'Piste de pollution' })).toContainText('1 jeton au-delà');
  await page.getByRole('button', { name: /Dépolluer : retirer/ }).first().click();
  await expect(page.getByTestId('pollution-preview')).toHaveText('16');
  await page.getByRole('button', { name: /Dépolluer : retirer/ }).first().click();
  await expect(page.locator('.pollution-space.covered')).toHaveCount(15);
  await expect(page.getByRole('region', { name: 'Piste de pollution' })).not.toContainText('Prospérité bloquée');
  await page.getByRole('button', { name: 'Annuler les deux actions' }).click();
  await expect(page.getByTestId('pollution-preview')).toHaveText('17');
});

test('catalogue complet : défilement naturel et cartes lisibles aux quatre résolutions', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const G = JSON.parse(localStorage.getItem('prosperity.game.v1')!);
    G.market = G.catalog.map((t: { id: string }) => t.id);
    G.deck = []; G.turn = 36; G.current = '2030-5'; G.phase = 'actions'; G.actions = 2;
    localStorage.setItem('prosperity.game.v1', JSON.stringify(G));
  });
  await page.reload(); await enterActions(page); await openResearch(page);
  for (const [width, height] of [[1366, 768], [1440, 900], [1920, 1080], [2560, 1440]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('.board-technology')).toHaveCount(60);
    expect(await page.locator('.board-technology').evaluateAll(tiles => tiles.every(tile => { const r = tile.getBoundingClientRect(); return r.width >= 100 && r.height >= 100; }))).toBe(true);
    await page.locator('.board-technology').last().scrollIntoViewIfNeeded();
    await expect(page.locator('.board-technology').last()).toBeInViewport();
    await page.screenshot({ path: `.artifacts/table-late-${width}.jpg`, fullPage: true });
  }
});
