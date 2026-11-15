// RT-23: optional tutorials never start by themselves, have no side effects and every anchor exists.
import { test, expect, seedFarm, localState } from '../helpers';

const tours = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('gaiapus.tours') ?? '{"tours":{}}').tours);

test.describe('RT-23 primeira abertura', () => {
  test('abre sozinho na primeira vez; "Pular" pula todos e não volta', async ({ browser }) => {
    const ctx = await browser.newContext({ locale: 'pt-BR' }); const page = await ctx.newPage();
    await page.goto('/#/visao-geral');
    const pop = page.getByTestId('tour-pop');
    await expect(pop).toBeVisible();
    await expect(pop.getByText('Passo 1 de 4', { exact: true })).toBeVisible();
    await pop.getByRole('button', { name: 'Pular' }).click();
    await expect(pop).toHaveCount(0);
    const t = await tours(page);
    expect(t['overview@1'].state).toBe('dismissed');
    expect(t['plan@1'].state).toBe('dismissed');
    for (const r of ['/planejar', '/visao-geral']) {
      await page.goto('/#' + r); await page.reload();
      await expect(page.getByRole('button', { name: 'Como usar esta tela' })).toBeVisible();
      await page.waitForTimeout(1200);
      await expect(pop).toHaveCount(0);
    }
    await ctx.close();
  });

  test('tela sem tutorial espera a próxima; concluído não reabre', async ({ browser }) => {
    const ctx = await browser.newContext({ locale: 'pt-BR' }); const page = await ctx.newPage();
    await page.goto('/#/mais');
    await page.waitForTimeout(1200);
    await expect(page.getByTestId('tour-pop')).toHaveCount(0);
    await page.goto('/#/field-shift');
    const pop = page.getByTestId('tour-pop');
    await expect(pop).toBeVisible();
    for (let i = 0; i < 3; i++) await pop.getByRole('button', { name: 'Avançar' }).click();
    await pop.getByRole('button', { name: 'Concluir' }).click();
    await page.reload(); await page.waitForTimeout(1200);
    await expect(pop).toHaveCount(0);
    // Other screens keep the discreet invite.
    await page.goto('/#/planejar');
    await expect(page.getByRole('button', { name: 'Conhecer esta tela' })).toBeVisible();
    await page.waitForTimeout(1200);
    await expect(pop).toHaveCount(0);
    await ctx.close();
  });
});

test.describe('RT-23 tutoriais', () => {
  test('convite discreto, nunca abre sozinho; "Agora não" vira botão de ajuda', async ({ page }) => {
    await page.goto('/#/visao-geral');
    await expect(page.getByTestId('tour-bar')).toBeVisible();
    await expect(page.getByTestId('tour-pop')).toHaveCount(0);
    await page.getByRole('button', { name: 'Agora não' }).click();
    await expect(page.getByRole('button', { name: 'Como usar esta tela' })).toBeVisible();
    expect((await tours(page))['overview@1'].state).toBe('dismissed');
  });

  test('roteiro completo da visão geral: foco, contador, teclado e conclusão sem gravar dados', async ({ page, errors }) => {
    await seedFarm(page);
    const before = await localState(page);
    await page.goto('/#/visao-geral');
    await page.getByRole('button', { name: 'Conhecer esta tela' }).click();
    const pop = page.getByTestId('tour-pop');
    await expect(pop).toBeVisible();
    await expect(pop).toHaveAttribute('aria-modal', 'false');
    await expect(pop.getByText('Passo 1 de 4', { exact: true })).toBeVisible();
    await expect(page.locator('#tour-title')).toBeFocused();
    await expect(page.locator('[data-tour="scope-strip"]')).toHaveClass(/tour-target/);
    await page.keyboard.press('Alt+ArrowRight');
    await expect(pop.getByText('Passo 2 de 4', { exact: true })).toBeVisible();
    await pop.getByRole('button', { name: 'Avançar' }).click();
    await pop.getByRole('button', { name: 'Avançar' }).click();
    await pop.getByRole('button', { name: 'Concluir' }).click();
    await expect(pop).toHaveCount(0);
    expect((await tours(page))['overview@1'].state).toBe('done');
    expect(await localState(page)).toEqual(before);
    expect(errors).toEqual([]);
  });

  test('Esc fecha guardando o passo; trocar de tela fecha sem abrir outro', async ({ page }) => {
    await page.goto('/#/field-shift');
    await page.getByRole('button', { name: 'Conhecer esta tela' }).click();
    await page.getByTestId('tour-pop').getByRole('button', { name: 'Avançar' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('tour-pop')).toHaveCount(0);
    expect((await tours(page))['fieldShift@1']).toMatchObject({ state: 'in_progress', step: 1 });
    await page.getByRole('button', { name: 'Como usar esta tela' }).click();
    await expect(page.getByTestId('tour-pop').getByText('Passo 2 de 4', { exact: true })).toBeVisible();
    await page.locator('nav.rail a', { hasText: 'Simulador' }).first().click();
    await expect(page.getByTestId('tour-pop')).toHaveCount(0);
  });

  test('Ajuda lista os roteiros e abre o de outra tela; roteiro entre telas segue o usuário', async ({ page }) => {
    await seedFarm(page);
    await page.goto('/#/ajuda');
    await page.getByRole('button', { name: 'Abrir: Propriedades e registros' }).click();
    await expect(page).toHaveURL(/#\/propriedades/);
    const pop = page.getByTestId('tour-pop');
    await expect(pop.getByText('Passo 1 de 5', { exact: true })).toBeVisible();
    await pop.getByRole('button', { name: 'Avançar' }).click();
    await pop.getByRole('button', { name: 'Avançar' }).click();
    await expect(page).toHaveURL(/#\/registros/);
    await expect(page.locator('[data-tour="records-kinds"]')).toHaveClass(/tour-target/);
    // Form closed: the draft and save steps are skipped and the tour ends as done.
    await pop.getByRole('button', { name: 'Avançar' }).click();
    await expect(pop).toHaveCount(0, { timeout: 10_000 });
    expect((await tours(page))['farm@1'].state).toBe('done');
  });

  test('troca de idioma redesenha o passo atual', async ({ page }) => {
    await page.goto('/#/planejar');
    await page.getByRole('button', { name: 'Conhecer esta tela' }).click();
    await expect(page.locator('#tour-title')).toHaveText('Para onde é o plano');
    await page.locator('[data-testid="language-select"]:visible').first().selectOption('en');
    await expect(page.locator('#tour-title')).toHaveText('Where the plan applies');
    await expect(page.getByTestId('tour-pop').getByText('Step 1 of 5', { exact: true })).toBeVisible();
  });

  for (const [route, ids] of [
    ['/explorar?semwebgl=1', ['explore-search', 'explore-country-list', 'explore-with-data', 'explore-lists']],
    ['/visao-geral', ['scope-strip', 'overview-alert', 'overview-days', 'overview-actions']],
    ['/municipio?mun=5107925', ['mun-tabs']],
    ['/municipio?mun=5107925&aba=safra&cultura=soy', ['mun-crop', 'yield-card']],
    ['/planejar', ['plan-place', 'plan-form', 'plan-dates', 'plan-eco', 'plan-save']],
    ['/simulador', ['sim-mode', 'sim-year', 'sim-timeline', 'sim-ab', 'sim-limits']],
    ['/field-shift', ['fs-question', 'fs-year', 'fs-table', 'fs-limits']],
    ['/dispositivos', ['devices-synthetic', 'device-card']],
    ['/alertas?mun=5107925', ['alert-card']],
    ['/conta', ['account-sign']],
  ] as const) {
    test(`âncoras presentes em ${route}`, async ({ page }) => {
      await page.goto('/#' + route);
      for (const id of ids) await expect(page.locator(`[data-tour="${id}"]`).first()).toBeAttached({ timeout: 10_000 });
    });
  }
});
