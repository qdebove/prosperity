import { test, expect, type Page } from '@playwright/test';
import { openResearch, openNation } from './ui';
import { mkdirSync, writeFileSync } from 'node:fs';
import { BASE_CATALOG } from '../src/game/catalog';

async function enterActions(pages: Page[], active: number) {
  await pages[active].getByRole('button', { name: /^(Révéler la première tuile|Tour suivant)$/ }).click();
  await expect(pages[active].locator('.network-table')).not.toHaveAttribute('data-phase', 'draw');
  for (let step = 0; step < 6; step++) {
    if (await pages[active].locator('.network-table').getAttribute('data-phase') === 'actions') break;
    for (const page of pages) {
      const resolve = page.getByRole('button', { name: 'Valider', exact: true });
      if (await resolve.isVisible() && await resolve.isEnabled()) {
        const before = await page.locator('.network-table').getAttribute('data-revision');
        await resolve.click();
        await expect(page.locator('.network-table')).not.toHaveAttribute('data-revision', before!);
      }
    }
  }
  await expect(pages[active].locator('.network-table')).toHaveAttribute('data-phase', 'actions');
  await expect(pages[active].locator('.revealing')).toHaveCount(0);
  const publicTallies = await pages[active].locator('.decade-tracker').textContent();
  for (const page of pages) {
    await expect(page.locator('.decade-tracker')).toHaveText(publicTallies!);
    if (!await page.getByRole('dialog').isVisible()) await page.getByRole('button', { name: 'Consulter les décomptes' }).click();
    await expect(page.locator('.tally-scope')).toContainText('Toutes les nations');
    if (page !== pages[active]) await page.getByRole('dialog').getByRole('button', { name: 'Fermer', exact: true }).click();
  }
  const continueButton = pages[active].getByRole('button', { name: 'Continuer vers mes actions' });
  if (await continueButton.isVisible()) await continueButton.click();
  await expect(pages[active].getByRole('button', { name: /Revenus :/ })).toBeEnabled();
}

test('trois navigateurs : salon, préparation privée, annulation, commit et reconnexion', async ({ browser }) => {
  const contexts = await Promise.all([0, 1, 2].map(() => browser.newContext({ viewport: { width: 1440, height: 1000 } })));
  const pages = await Promise.all(contexts.map(c => c.newPage()));
  const errors: string[] = [];
  const sent = pages.map(() => [] as string[]);
  pages.forEach((page, i) => page.on('websocket', socket => socket.on('framesent', event => { if (typeof event.payload === 'string') sent[i].push(event.payload); })));
  for (const page of pages) page.on('pageerror', error => errors.push(error.message));
  const [a, b, c] = pages;
  try {
    await a.goto('/multiplayer');
    await a.getByLabel('Votre nom', { exact: true }).fill('Alice');
    await a.getByRole('button', { name: 'Créer une partie', exact: true }).click();
    await expect(a).toHaveURL(/\/game\//);
    const url = a.url();
    for (const [page, name] of [[b, 'Bob'], [c, 'Charlie']] as const) {
      await page.goto(url); await page.getByLabel('Votre nom', { exact: true }).fill(name);
      await page.getByRole('button', { name: 'Prendre place' }).click();
    }
    await expect(a.getByRole('list', { name: 'Joueurs du salon' }).getByRole('listitem')).toHaveCount(3);
    for (const page of pages) await page.getByRole('button', { name: 'Je suis prêt', exact: true }).click();
    await expect(a.getByRole('button', { name: 'Lancer la partie' })).toBeEnabled();
    await a.getByRole('button', { name: 'Lancer la partie' }).click();
    for (const page of pages) await expect(page.getByText('Connecté', { exact: true })).toBeVisible();
    let active = Number(await a.getByTestId('active-player').getAttribute('data-player-id'));
    await enterActions(pages, active);
    const actor = pages[active]; const observer = pages[(active + 1) % 3];
    const actorName = ['Alice', 'Bob', 'Charlie'][active];
    await actor.getByRole('navigation', { name: 'Vues de la partie' }).getByRole('button', { name: 'Comparaison', exact: true }).click();
    await expect(actor.locator('.nation-comparisons article')).toHaveCount(3);
    mkdirSync('.artifacts/guide', { recursive: true });
    for (const [id, width, height] of [['C22', 1366, 768], ['C23', 390, 844]] as const) {
      await actor.setViewportSize({ width, height });
      await actor.screenshot({ path: `.artifacts/guide/${id}-viewport.png` });
      const fullHeight = await actor.evaluate(() => document.documentElement.scrollHeight);
      await actor.setViewportSize({ width, height: fullHeight });
      await actor.evaluate(() => window.scrollTo(0, 0));
      await actor.screenshot({ path: `.artifacts/guide/${id}.png`, fullPage: true });
      writeFileSync(`.artifacts/guide/${id}.json`, JSON.stringify({ id, description: 'Comparaison de trois nations réelles : Alice, Bob et Charlie', viewport: { width, height: fullHeight }, referenceViewport: { width, height }, fullPage: true, source: 'tests/multiplayer.pw.ts', displayed: await actor.locator('.comparison-board').innerText() }, null, 2));
    }
    await actor.setViewportSize({ width: 1440, height: 1000 });
    await openNation(actor);

    await observer.getByRole('combobox', { name: 'Nation à consulter' }).selectOption(String(active));
    const officialMoney = await observer.getByTestId('money-preview').textContent();
    const revision = await observer.locator('.network-table').getAttribute('data-revision');
    const sentBefore = sent[active].filter(packet => packet.includes('"update"')).length;
    await openResearch(actor);
    await actor.getByRole('button', { name: 'Rechercher en énergie : avancer d’une case' }).click();
    await actor.getByRole('button', { name: /Revenus :/ }).click();
    await expect(observer.getByTestId('money-preview')).toHaveText(officialMoney!);
    await expect(observer.locator('.network-table')).toHaveAttribute('data-revision', revision!);
    await expect(observer.getByRole('button', { name: /Revenus :/ })).toHaveCount(0);
    await actor.reload();
    await expect(actor.getByRole('button', { name: 'Valider le tour', exact: true })).toBeEnabled();
    await actor.getByRole('button', { name: 'Annuler la dernière action', exact: true }).click();
    await expect(actor.getByRole('button', { name: 'Valider le tour', exact: true })).toHaveCount(0);
    await openResearch(actor);
    await actor.getByRole('button', { name: 'Centrale au fioul, 100 euros', exact: true }).click();
    await actor.getByRole('button', { name: 'Prévisualiser en B1' }).click();
    await actor.getByRole('button', { name: /^(Construire|Remplacer) en B1$/ }).click();
    await expect(actor.getByTestId('slot-b1')).toContainText('Centrale au fioul');
    await expect(observer.getByTestId('slot-b1')).not.toContainText('Centrale au fioul');
    await expect(observer.locator('.network-table')).toHaveAttribute('data-revision', revision!);
    expect(sent[active].filter(packet => packet.includes('"update"'))).toHaveLength(sentBefore);
    await actor.screenshot({ path: '.artifacts/multiplayer-private-draft.jpg' });
    await actor.getByRole('button', { name: 'Valider le tour', exact: true }).click();
    await expect(observer.getByTestId('slot-b1')).toContainText('Centrale au fioul');
    await expect(observer.getByRole('complementary', { name: 'Dernier tour validé' })).toContainText(`${actorName} a validé`);
    await expect(observer.locator('.committed-replay li.visible')).toHaveCount(2);
    await openResearch(observer);
    await expect(observer.getByTestId('marker-' + active + '-energy')).toHaveAttribute('aria-label', /case 2/);
    await openNation(observer);
    const next = (active + 1) % 3;
    await expect(observer.getByTestId('active-player')).toHaveAttribute('data-player-id', String(next));
    // Restore an obsolete local draft: reload must discard it, without replaying.
    await actor.evaluate(() => {
      const sessionKey = Object.keys(localStorage).find(k => k.startsWith('prosperity.session.v1.'))!;
      const s = JSON.parse(localStorage.getItem(sessionKey)!);
      localStorage.setItem(`prosperity.draft.v1.${s.gameId}.${s.playerId}`, JSON.stringify({ gameId: s.gameId, playerId: s.playerId, turnId: '1', baseRevision: 0, actions: [{ type: 'income' }, { type: 'income' }] }));
    });
    await observer.getByRole('combobox', { name: 'Nation à consulter' }).selectOption(String(next));
    await enterActions(pages, next);
    await contexts[active].setOffline(true);
    await observer.getByRole('button', { name: /Revenus :/ }).click();
    await observer.getByRole('button', { name: /Revenus :/ }).click();
    await observer.getByRole('button', { name: 'Valider le tour', exact: true }).click();
    await expect(observer.getByTestId('active-player')).toHaveAttribute('data-player-id', String((next + 1) % 3));
    await contexts[active].setOffline(false); await actor.reload();
    await expect(actor.getByText('Connecté', { exact: true })).toBeVisible();
    const latest = await observer.locator('.network-table').getAttribute('data-revision');
    await expect(actor.locator('.network-table')).toHaveAttribute('data-revision', latest!);
    expect(await actor.evaluate(() => Object.keys(localStorage).some(k => k.startsWith('prosperity.draft.v1.')))).toBe(false);
    await actor.getByRole('combobox', { name: 'Nation à consulter' }).selectOption(String(next));
    await expect(actor.getByTestId('money-preview')).toHaveText((await observer.getByTestId('money-preview').textContent())!);
    await actor.screenshot({ path: '.artifacts/multiplayer-reconnected.jpg' });
    await actor.setViewportSize({ width: 390, height: 844 });
    expect(await actor.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await actor.screenshot({ path: '.artifacts/multiplayer-mobile.jpg', fullPage: true });
    expect(errors).toEqual([]);
  } finally { await Promise.all(contexts.map(context => context.close())); }
});

test('deux navigateurs : catalogue commun et classement final autoritaire', async ({ browser }) => {
  const contexts = await Promise.all([0, 1].map(() => browser.newContext()));
  const pages = await Promise.all(contexts.map(c => c.newPage()));
  try {
    await pages[0].goto('/multiplayer');
    const catalog = [...BASE_CATALOG.filter(t => !t.decade), BASE_CATALOG.find(t => t.id === '1970-0')!];
    await pages[0].evaluate(value => localStorage.setItem('prosperity.catalog.v1', JSON.stringify(value)), catalog);
    await pages[0].getByLabel('Votre nom', { exact: true }).fill('Alice');
    await pages[0].getByLabel('Utiliser mon catalogue personnalisé').check();
    await pages[0].getByRole('button', { name: 'Créer une partie', exact: true }).click();
    await expect(pages[0]).toHaveURL(/\/game\//);
    await pages[1].goto(pages[0].url()); await pages[1].getByLabel('Votre nom', { exact: true }).fill('Bob');
    await pages[1].getByRole('button', { name: 'Prendre place' }).click();
    for (const page of pages) await page.getByRole('button', { name: 'Je suis prêt', exact: true }).click();
    await pages[0].getByRole('button', { name: 'Lancer la partie' }).click();
    for (const page of pages) await expect(page.getByText('Connecté', { exact: true })).toBeVisible();
    const active = Number(await pages[0].getByTestId('active-player').getAttribute('data-player-id'));
    await enterActions(pages, active);
    await pages[active].getByRole('button', { name: /Revenus :/ }).click();
    await pages[active].getByRole('button', { name: /Revenus :/ }).click();
    await pages[active].getByRole('button', { name: 'Valider le tour', exact: true }).click();
    for (let step = 0; step < 7; step++) {
      const before = await pages[active].locator('.network-table').getAttribute('data-revision');
      await pages[active].getByRole('button', { name: /^Décompter :/ }).click();
      await expect(pages[active].locator('.network-table')).not.toHaveAttribute('data-revision', before!);
    }
    for (const page of pages) await expect(page.getByRole('heading', { name: 'Classement final', exact: true })).toBeVisible();
    const final = await pages[active].locator('.network-ranking').innerText();
    for (const page of pages) await expect(page.locator('.network-ranking')).toHaveText(await pages[active].locator('.network-ranking').textContent() ?? '');
    expect(final).toContain('Alice'); expect(final).toContain('Bob');
    await pages[1].reload(); await expect(pages[1].locator('.network-ranking')).toHaveText(await pages[0].locator('.network-ranking').textContent() ?? '');
  } finally { await Promise.all(contexts.map(c => c.close())); }
});
