import { expect, test, type Page } from '@playwright/test';
import { enterActions } from './ui';

async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Révéler la première tuile' }).click();
  await enterActions(page);
}

test('deux recherches déplacent le pion, changent les prix et restent annulables', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await start(page);
  const marker = page.getByTestId('marker-nation-energy');
  const original = await marker.getAttribute('style');
  await page.getByRole('button', { name: 'Recherche +1 case', exact: true }).click();
  await expect(page.locator('.play-table')).toHaveClass(/focus-research/);
  await page.getByRole('button', { name: 'Rechercher en énergie : avancer d’une case' }).click();
  await expect(marker).not.toHaveAttribute('style', original!);
  await expect(page.locator('.action-tokens .available')).toHaveCount(1);
  await page.getByRole('button', { name: 'Rechercher en énergie : avancer d’une case' }).click();
  await expect(page.locator('.action-tokens .available')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Centrale au fioul, 50 euros', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Annuler les deux actions' }).click();
  await expect(marker).toHaveAttribute('style', original!);
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
  await page.getByRole('button', { name: 'Centrale au fioul, 100 euros', exact: true }).click();
  await page.getByTestId('slot-a1').hover();
  const details = page.getByRole('region', { name: 'Détails de la technologie' });
  await expect(details).toContainText('Centrale à charbon');
  await expect(details).toContainText('Même niveau que votre recherche');
  await expect(details.locator('tr').filter({ hasText: 'Énergie' })).toContainText('3');
  await page.getByTestId('slot-a1').click();
  await expect(page.getByTestId('slot-a1')).toContainText('Centrale au fioul');
  await page.getByRole('button', { name: 'Annuler la dernière action' }).click();
  await expect(page.getByTestId('slot-a1')).toContainText('Centrale à charbon');
  await expect(page.getByTestId('slot-d1')).toHaveClass(/locked/);
  await page.getByRole('button', { name: 'Transports intégrés, 500 euros', exact: true }).click();
  await page.getByTestId('slot-c1').click();
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

test('la table reste dans le viewport aux quatre résolutions, même en fin de partie', async ({ page }) => {
  await page.goto('/');
  // A valid late-game state with all revealed technologies exercises crowded levels.
  await page.evaluate(() => {
    const G = JSON.parse(localStorage.getItem('prosperity.game.v1')!);
    G.market = G.catalog.map((t: { id: string }) => t.id);
    G.deck = []; G.turn = 36; G.current = '2030-5'; G.phase = 'actions'; G.actions = 2;
    localStorage.setItem('prosperity.game.v1', JSON.stringify(G));
  });
  await page.reload();
  await enterActions(page);
  for (const [width, height] of [[1366, 768], [1440, 900], [1920, 1080], [2560, 1440]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    await expect(page.locator('.board-technology')).toHaveCount(60);
    const inaccessible = await page.locator('.board-technology').evaluateAll(tiles => tiles.some(tile => {
      const r = tile.getBoundingClientRect();
      return r.width < 16 || r.height < 16 || r.bottom > innerHeight || r.top < 0;
    }));
    expect(inaccessible, `${width} × ${height}`).toBe(false);
    await page.screenshot({ path: `.artifacts/table-late-${width}.jpg` });
  }
});
