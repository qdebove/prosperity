import { expect, test } from '@playwright/test';
import { enterActions, openApp, openResearch, openNation, reloadWithGame } from './ui';

test('progression du tour, actions répétables et retour local', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('.table-context')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Revenus :/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Révéler la première tuile' }).click();
  await enterActions(page);
  await expect(page.locator('.table-actions button')).toHaveCount(4);
  await page.getByRole('button', { name: /Revenus :/ }).click();
  await expect(page.locator('.action-feedback')).toContainText('+100 €');
  await expect(page.locator('.action-tokens .available')).toHaveCount(1);
  await page.getByRole('button', { name: /Revenus :/ }).click();
  await expect(page.locator('.action-tokens .spent')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Valider le tour' })).toHaveText('Terminer le tour');
  await page.getByRole('button', { name: 'Annuler la dernière action' }).click();
  await expect(page.locator('.action-tokens .available')).toHaveCount(1);
});

test('prix et achat inspectables avant les actions, contexte effaçable sans mutation', async ({ page }) => {
  await openApp(page);
  const before = await page.evaluate(() => localStorage.getItem('prosperity.game.v1'));
  await page.getByTestId('slot-c1').click();
  await page.getByRole('button', { name: 'Rechercher un remplacement' }).click();
  await page.getByRole('button', { name: 'Parc éolien, 200 euros', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Base 100 € + 100 € de surcoût');
  await expect(dialog).toContainText('Achat disponible pendant vos actions');
  await expect(dialog.locator('.purchase-confirm')).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Effacer le contexte de recherche' }).click();
  await expect(page.locator('.research-context')).toHaveCount(0);
  await openNation(page);
  expect(await page.evaluate(() => localStorage.getItem('prosperity.game.v1'))).toBe(before);
});

test('2030 compte deux prospérités ; dépollution identique depuis le bouton', async ({ page }) => {
  await openApp(page);
  const endgame = await page.evaluate(() => {
    const G = JSON.parse(localStorage.getItem('prosperity.game.v1')!);
    const cards = G.catalog.filter((t: { decade: number; tally: string }) => t.decade === 2030 && t.tally === 'prosperity');
    G.current = cards[0].id; G.turn = 31; G.phase = 'actions'; G.actions = 2; G.pollution = 15;
    G.deck = G.deck.filter((id: string) => id !== G.current).slice(-5);
    G.market = G.catalog.filter((t: { id: string }) => !G.deck.includes(t.id)).map((t: { id: string }) => t.id);
    G.log.push({ turn: 31, kind: 'event', revealedTileId: cards[0].id, text: 'Révélation publique' });
    return G;
  });
  await reloadWithGame(page, endgame); await enterActions(page);
  await expect(page.locator('.decade-tracker [aria-label="Prospérité : 1 passé, 1 restant"]')).toBeVisible();
  await expect(page.locator('.pollution-warning')).toContainText('Encore 1 pollution');
  await page.getByRole('button', { name: 'Dépolluer −1 disque', exact: true }).click();
  await expect(page.locator('.pollution-warning')).toHaveCount(0);
  await expect(page.getByTestId('pollution-preview')).toHaveText('14');
  await openResearch(page);
  await page.getByRole('button', { name: 'Rechercher en énergie : avancer d’une case' }).click();
  await expect(page.getByRole('button', { name: 'Rechercher en écologie : avancer d’une case' })).toBeDisabled();
});
