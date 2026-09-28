import { expect, type Page } from '@playwright/test';

export async function openApp(page: Page, path = '/') {
  await page.goto(path);
  await page.locator('.app-shell, .multiplayer-lobby, .network-table').first().waitFor();
}

export async function reloadWithGame(page: Page, game: unknown) {
  await page.addInitScript(value => localStorage.setItem('prosperity.game.v1', JSON.stringify(value)), game);
  await page.reload();
  await page.locator('.app-shell').waitFor();
}

export async function navigate(page: Page, name: string) {
  const button = page.getByRole('button', { name, exact: true });
  if (!await button.isVisible()) await page.getByRole('button', { name: 'Menu de la partie', exact: true }).click();
  await button.click();
}

export async function enterActions(page: Page) {
  await expect(page.locator('.revealing')).toHaveCount(0);
  const resolve = page.getByRole('button', { name: 'Valider', exact: true });
  if (await resolve.isVisible()) await resolve.click();
  const proceed = page.getByRole('button', { name: 'Continuer vers mes actions' });
  if (await proceed.isVisible()) await proceed.click();
}

export async function openResearch(page: Page) {
  await page.getByRole('navigation', { name: 'Vues de la partie' }).getByRole('button', { name: 'Recherche', exact: true }).click();
}

export async function openNation(page: Page) {
  await page.getByRole('navigation', { name: 'Vues de la partie' }).getByRole('button', { name: 'Ma nation', exact: true }).click();
}
