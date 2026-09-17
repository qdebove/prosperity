import { expect, type Page } from '@playwright/test';

export async function navigate(page: Page, name: string) {
  const button = page.getByRole('button', { name, exact: true });
  if (!await button.isVisible()) await page.getByRole('button', { name: 'Menu de la partie', exact: true }).click();
  await button.click();
}

export async function enterActions(page: Page) {
  await expect(page.locator('.revealing')).toHaveCount(0);
  const resolve = page.getByRole('button', { name: 'Valider', exact: true });
  if (await resolve.isVisible()) await resolve.click();
  const proceed = page.getByRole('button', { name: 'Jouer mes deux actions' });
  if (await proceed.isVisible()) await proceed.click();
}
