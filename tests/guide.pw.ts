import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { BASE_CATALOG } from '../src/game/catalog';
const LEVEL_STARTS = [0, 2, 5, 9, 14, 20], MAX_RESEARCH = 26;
import type { GameState } from '../src/game/types';
import { openNation, openResearch } from './ui';

const out = '.artifacts/guide';
mkdirSync(out, { recursive: true });
async function fixture(page: Page, patch: Partial<GameState> = {}) {
  await page.goto('/');
  const G: GameState = await page.evaluate(async () => { const engine = await import('/src/game/engine.ts'); return engine.initialState(undefined, 'guide-2026'); });
  Object.assign(G, { turn: 1, phase: 'actions', actions: 2, lastMove: 'action', money: 400, score: 12, research: { energy: 4, ecology: 4 }, current: '1970-0' }, patch);
  if (!patch.deck) G.deck = G.deck.filter(id => id !== G.current);
  if (!patch.market) G.market.push(G.current!);
  G.totalTurns = G.turn + G.deck.length;
  await page.goto('/');
  await page.evaluate(g => localStorage.setItem('prosperity.game.v1', JSON.stringify(g)), G);
  await page.reload();
  await expect(page.getByTestId('money-preview')).toHaveText(`${G.money} €`);
  return G;
}
async function state(page: Page) {
  return page.evaluate(async () => { const engine = await import('/src/game/engine.ts'); return engine.previewState(JSON.parse(localStorage.getItem('prosperity.game.v1')!)); }) as Promise<GameState>;
}
async function capture(page: Page, id: string, description: string, fullPage = false) {
  await page.locator('img').evaluateAll(imgs => Promise.all(imgs.map(img => { img.loading = 'eager'; return img.decode(); })));
  await page.evaluate(() => document.fonts.ready);
  const scroll = await page.evaluate(() => scrollY);
  const referenceViewport = page.viewportSize()!;
  if (fullPage) {
    // Keep an untouched capture of the requested viewport, plus a genuinely taller
    // browser viewport for the complete page: sticky controls cannot mask the board.
    await page.screenshot({ path: `${out}/${id}-viewport.png`, animations: 'disabled' });
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: referenceViewport.width, height });
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await page.screenshot({ path: `${out}/${id}.png`, fullPage, animations: 'disabled' });
  const captureViewport = page.viewportSize();
  if (fullPage) { await page.setViewportSize(referenceViewport); await page.evaluate(y => window.scrollTo(0, y), scroll); }
  const G = await state(page);
  writeFileSync(`${out}/${id}.json`, JSON.stringify({ id, description, viewport: captureViewport, referenceViewport, fullPage, fixture: 'guide-2026; état reproductible dans tests/guide.pw.ts', state: { turn: G.turn, money: G.money, score: G.score, pollution: G.pollution, research: G.research, actions: G.actions, board: Object.fromEntries(Object.entries(G.board).map(([id, tile]) => [id, tile?.name ?? null])) } }, null, 2));
}
const close = (page: Page) => page.getByRole('dialog').getByRole('button', { name: 'Fermer', exact: true }).click();

test('guide : nation, dépendance C1, remplacement atomique et annulation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1366, height: 768 });
  await fixture(page);
  await capture(page, 'C01', 'Nation complète : construites, libres et bloquées', true);
  await page.setViewportSize({ width: 360, height: 800 });
  await capture(page, 'C02', 'Nation mobile', true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId('slot-a1').click();
  await capture(page, 'C03', 'Tuile installée');
  await close(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByTestId('slot-a2').click();
  await capture(page, 'C04', 'Case libre');
  await close(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId('slot-d1').click();
  await expect(page.getByRole('dialog')).toContainText('Transport requis en C1');
  await capture(page, 'C05', 'D1 bloquée, prérequis C1');
  await page.getByRole('button', { name: 'Trouver un transport en C1' }).click();
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.locator('.research-context')).toContainText('C1');
  await capture(page, 'C06', 'Recherche ciblée sur C1');
  const rail = page.getByRole('button', { name: 'Réseau ferroviaire, 100 euros', exact: true });
  await rail.scrollIntoViewIfNeeded();
  await expect(rail).toHaveClass(/availability-now/);
  await expect(page.locator('.board-technology[data-compatible=false]')).not.toHaveCount(0);
  await capture(page, 'C15', 'Transport compatible et abordable');
  await rail.click();
  const before = await state(page);
  await expect(page.getByRole('dialog')).toContainText('Retrait : Ceinture verte');
  await expect(page.getByRole('dialog')).toContainText('300 €');
  await capture(page, 'C17', 'Prévisualisation du remplacement de C1');
  await close(page);
  expect(await state(page)).toEqual(before);
  await rail.click();
  await page.getByRole('button', { name: 'Remplacer en C1' }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect(page.getByTestId('slot-c1')).toContainText('Réseau ferroviaire');
  await expect(page.getByTestId('slot-d1')).not.toHaveClass(/(?:^| )locked(?: |$)/);
  await expect(page.getByTestId('slot-d2')).not.toHaveClass(/(?:^| )locked(?: |$)/);
  const after = await state(page);
  expect(after.money).toBe(300); expect(after.actions).toBe(1);
  await capture(page, 'C18', 'Transport posé ; deux cases débloquées', true);
  await page.reload();
  expect((await state(page)).board.c1?.name).toBe('Réseau ferroviaire');
  await page.getByRole('button', { name: 'Annuler la dernière action' }).click();
  await expect(page.getByTestId('slot-d1')).toHaveClass(/locked/);
  expect((await state(page)).money).toBe(400);
});

test('guide : volumes du catalogue, alignement et 54 sous-étapes', async ({ page }) => {
  const G = { catalog: BASE_CATALOG };
  await page.setViewportSize({ width: 1920, height: 1080 });
  await fixture(page, { market: G.catalog.map(t => t.id), deck: [], turn: 36 });
  await openResearch(page);
  await expect(page.locator('.board-technology')).toHaveCount(60);
  await expect(page.locator('.research-step')).toHaveCount(54);
  await capture(page, 'C07', 'Catalogue complet ; six niveaux', true);
  const group = G.catalog.filter(t => t.track === 'ecology' && t.level === 3);
  expect(group.length).toBeGreaterThanOrEqual(5);
  for (const n of [0, 1, 2, 3, 5]) {
    await fixture(page, { market: [...G.catalog.filter(t => t.track !== 'ecology' || t.level !== 3), ...group.slice(0, n)].map(t => t.id), deck: [], turn: 36 });
    await openResearch(page);
    const row = page.locator('.research-row[data-level="3"]');
    await expect(row.locator('.ecology .board-technology')).toHaveCount(n);
    for (const width of [390, 768, 1366]) {
      await page.setViewportSize({ width, height: width === 768 ? 1024 : width === 390 ? 844 : 768 });
      const layout = await row.evaluate(el => {
        const left = el.querySelector('.technology-row.energy')!.getBoundingClientRect();
        const right = el.querySelector('.technology-row.ecology')!.getBoundingClientRect();
        const grids = [...el.querySelectorAll('.technology-fan')].map(e => getComputedStyle(e).gridTemplateColumns.split(' ').length);
        const cards = [...el.querySelectorAll('.board-technology')].map(e => e.getBoundingClientRect());
        const overlaps = cards.some((a, i) => cards.slice(i + 1).some(b => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top));
        return { aligned: left.top === right.top && left.bottom === right.bottom, grids, overlaps };
      });
      expect(layout.aligned).toBe(true); expect(layout.grids.every(c => c <= 2)).toBe(true); expect(layout.overlaps).toBe(false);
      if ((n === 3 && width === 1366) || (n === 5 && width === 390) || (n === 5 && width === 768)) {
        await row.scrollIntoViewIfNeeded();
        await capture(page, n === 3 ? 'C08' : width === 390 ? 'C09' : 'C10', `Groupe écologie 3 : ${n} cartes ; groupes asymétriques`, true);
      }
    }
  }
});

test('guide : frontières de recherche, jetons distincts et fin de piste', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await fixture(page, { research: { energy: 5, ecology: 4 } });
  await openResearch(page);
  await page.locator('.research-row[data-level="2"]').scrollIntoViewIfNeeded();
  await capture(page, 'C11', 'Énergie niveau 3 ; écologie niveau 2');
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await openResearch(page);
  await page.getByTestId('marker-nation-energy').click();
  await expect(page.getByRole('dialog')).toContainText('Niveau 2 · case 3/3');
  await capture(page, 'C12', 'Dernière case du niveau 2');
  await page.getByRole('button', { name: 'Avancer d’une case · 1 action' }).click();
  expect((await state(page)).research).toEqual({ energy: 5, ecology: 4 });
  expect((await state(page)).actions).toBe(1);
  await page.getByTestId('marker-nation-energy').click();
  await expect(page.getByRole('dialog')).toContainText('Niveau 3 · case 1/4');
  await capture(page, 'C13', 'Première case du niveau 3 après une action');
  await close(page);
  // Check every boundary against the model, including the final position.
  for (const position of [...LEVEL_STARTS, ...LEVEL_STARTS.slice(1).map(n => n - 1), MAX_RESEARCH]) {
    await fixture(page, { research: { energy: position, ecology: 0 } });
    await openResearch(page);
    const token = page.getByTestId('marker-nation-energy');
    await expect(token).toHaveAttribute('data-position', String(position));
    expect(await token.evaluate(el => el.closest('.research-step')?.getAttribute('data-position'))).toBe(String(position));
    if (position < MAX_RESEARCH) {
      await page.getByRole('button', { name: 'Rechercher en énergie : avancer d’une case' }).click();
      expect((await state(page)).research.energy).toBe(position + 1);
      expect((await state(page)).actions).toBe(1);
    }
  }
  await expect(page.getByRole('button', { name: 'Rechercher en énergie : avancer d’une case' })).toBeDisabled();
  await page.getByTestId('marker-nation-energy').click();
  await expect(page.getByRole('button', { name: 'Fin de piste atteinte' })).toBeDisabled();
  await capture(page, 'C14', 'Dernière case, avancement indisponible');
});

test('guide : financement, seuils PP, accessibilité et responsive', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page, { money: 0 });
  await page.getByTestId('slot-c1').click();
  await page.getByRole('button', { name: 'Rechercher un remplacement' }).click();
  await page.getByRole('button', { name: 'Réseau ferroviaire, 100 euros', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Fonds insuffisants');
  await expect(page.getByRole('button', { name: 'Remplacer en C1' })).toBeDisabled();
  await capture(page, 'C16', 'Compatible, mais trésorerie insuffisante');
  await close(page);
  await fixture(page, { pollution: 6 });
  await page.locator('.physical-pollution').scrollIntoViewIfNeeded();
  await expect(page.locator('.covered-pp')).toHaveCount(2);
  await capture(page, 'C19', 'Six pollutions ; PP en case 6 couvert');
  await page.getByRole('button', { name: 'Dépolluer : retirer une pollution (case 3)', exact: true }).click();
  const G = await state(page);
  expect(G.pollution).toBe(5); expect(G.actions).toBe(1); expect(G.score).toBe(12);
  await expect(page.locator('.pollution-space.covered')).toHaveCount(5);
  await expect(page.locator('.pollution-space').nth(2)).toHaveClass(/covered/);
  await expect(page.locator('.covered-pp')).toHaveCount(1);
  await capture(page, 'C20', 'Seuil 6 découvert ; aucun PP crédité avant décompte');
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByTestId('slot-c1').click();
  await capture(page, 'C21', 'Fenêtre sur écran étroit');
  await close(page);
  for (const width of [360, 390, 768, 1366, 1920]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1080 });
    for (const name of ['Ma nation', 'Recherche', 'Comparaison']) {
      await page.getByRole('navigation', { name: 'Vues de la partie' }).getByRole('button', { name, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `${name} à ${width}`).toBe(true);
    }
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await openNation(page);
  const trigger = page.getByTestId('slot-d1');
  await trigger.focus();
  await page.keyboard.press('Enter');
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
  }
  await capture(page, 'C25', 'Focus clavier contenu dans la fenêtre');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.mouse.click(2, 2);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    const elements = [...document.querySelectorAll<HTMLElement>('.play-table *')].filter(el => [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()));
    const sizes = elements.map(el => parseFloat(getComputedStyle(el).fontSize) * 1.3);
    elements.forEach((el, i) => el.style.fontSize = sizes[i] + 'px');
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await capture(page, 'C26', 'Textes agrandis à 130 %', true);
});

test('guide : décompte, contexte, navigation et comparaison solo réelle', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Révéler la première tuile' }).click();
  const resolve = page.getByRole('button', { name: 'Valider', exact: true });
  if (await resolve.isVisible()) await resolve.click();
  await expect(page.getByRole('dialog')).toContainText('Décompte résolu');
  await capture(page, 'C24', 'Nouvelle tuile et résultat du décompte');
  await page.getByRole('button', { name: 'Continuer vers mes actions' }).click();
  const before = await state(page);
  await openResearch(page);
  await page.locator('.research-row[data-level="2"]').scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => scrollY);
  await openNation(page);
  await openResearch(page);
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(scroll, 0);
  expect(await state(page)).toEqual(before);
  await page.getByRole('navigation', { name: 'Vues de la partie' }).getByRole('button', { name: 'Comparaison', exact: true }).click();
  await expect(page.locator('.nation-comparisons article')).toHaveCount(1);
  await expect(page.locator('.solo-comparison')).toContainText('Partie solo');
  await page.getByLabel('Indicateur comparé').selectOption('pollution');
  await expect(page.locator('.comparison-bars')).toContainText(`${before.pollution} disques`);
  await capture(page, 'comparison-solo', 'Comparaison solo sans adversaires inventés', true);
});

