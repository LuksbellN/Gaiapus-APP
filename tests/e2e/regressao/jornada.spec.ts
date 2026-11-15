// Jornada: escolher a região → ver os dados → simular a safra futura → trocar cultura → comparar; sem editar o endereço.
import { test, expect, MOBILE } from '../helpers';

test.describe('Jornada região → dados → simulação', () => {
  test('o Simulador abre no planejamento da safra futura e as safras passadas ficam a um clique', async ({ page, errors }) => {
    await page.goto('/#/simulador');
    await expect(page.getByRole('heading', { level: 1, name: /Planejamento da safra — Soja em Sorriso/ })).toBeVisible();
    await expect(page.getByTestId('planning-day')).toBeVisible();
    await page.getByRole('link', { name: 'Safras passadas' }).click();
    await expect(page).toHaveURL(/modo=historico/);
    await expect(page.getByRole('heading', { name: /Simulador de safra/ })).toBeAttached();
    await page.getByRole('link', { name: 'Safra futura' }).click();
    await expect(page.getByTestId('planning-day')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('Município leva à simulação do próprio lugar; lugar e cultura trocam na tela', async ({ page, errors }) => {
    await page.goto('/#/municipio?mun=3170206');
    await page.getByTestId('simulate-here').click();
    await expect(page).toHaveURL(/modo=planejamento&local=BR:ibge:3170206/);
    await expect(page.getByRole('heading', { level: 1, name: /Soja em Uberlândia/ })).toBeVisible();
    await page.getByLabel('Cultura').selectOption('maize2');
    await expect(page.getByRole('heading', { level: 1, name: /Milho 2ª safra \(safrinha\) em Uberlândia/ })).toBeVisible();
    await expect(page.getByTestId('planning-compare').getByText('Maior atendimento hídrico')).toHaveCount(1);
    await page.getByLabel('Estado').selectOption('MT');
    await expect(page.getByRole('heading', { level: 1, name: /em Sorriso/ })).toBeVisible();
    await expect(page.getByTestId('planning-day')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('abre na janela da safra e explica a trajetória climática; avançar o dia não empilha histórico', async ({ page }) => {
    await page.goto('/#/simulador?modo=planejamento&mun=3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1');
    const period = page.getByTestId('planning-period');
    await expect(period).toHaveAttribute('data-from', '2026-10-06');
    await expect(page.getByTestId('planning-member-help')).toContainText('22 anos reais');
    const before = await page.evaluate(() => history.length);
    for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Avançar 1 dia' }).click();
    await expect(page.getByTestId('profile-2d')).toHaveAttribute('data-date', '2026-11-10');
    expect(await page.evaluate(() => history.length)).toBe(before);
    await page.getByRole('radio', { name: 'Execução inteira' }).check();
    await expect(period).toHaveAttribute('data-from', '2025-01-01');
    await expect(page.getByTestId('planning-warmup')).toContainText('solo exposto');
  });

  test('Explorar oferece simular a safra futura do município escolhido', async ({ page }) => {
    await page.goto('/#/explorar?pais=BR&uf=31&mun=3170206&semwebgl=1');
    await page.getByRole('link', { name: 'Simular safra futura' }).click();
    await expect(page).toHaveURL(/modo=planejamento&local=BR:ibge:3170206/);
    await expect(page.getByRole('heading', { level: 1, name: /em Uberlândia/ })).toBeVisible();
  });
});

test.describe('Jornada no celular', () => {
  test.use(MOBILE);
  test('configurar e indicadores ficam em abas; nada estoura a largura', async ({ page }) => {
    await page.goto('/#/simulador?modo=planejamento&mun=3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1');
    await expect(page.getByTestId('profile-2d')).toBeVisible();
    await page.getByRole('tab', { name: 'Configurar' }).click();
    await expect(page.getByLabel('Cultura')).toBeVisible();
    await page.getByRole('radio', { name: '2028' }).check();
    await page.getByRole('tab', { name: 'Indicadores' }).click();
    await expect(page.getByTestId('planning-season')).toContainText('2027/2028');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  });
});

test.describe('Identidade da execução com rede lenta', () => {
  test('trocar de lugar não mostra a execução anterior sob o título novo', async ({ page }) => {
    await page.goto('/#/simulador?modo=planejamento&mun=3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1');
    const runId = page.getByTestId('planning-run').locator('code').first();
    await expect(runId).toBeVisible();
    const uberlandia = await runId.innerText();
    await page.route('**/v1/simulations/**', async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue(); });
    await page.getByLabel('Estado').selectOption('MT');
    await expect(page.getByRole('heading', { level: 1, name: /em Sorriso/ })).toBeVisible();
    await expect(page.getByTestId('planning-run')).toHaveCount(0);
    await expect(page.getByTestId('planning-day')).toHaveCount(0);
    await expect(runId).toBeVisible({ timeout: 15000 });
    expect(await runId.innerText()).not.toBe(uberlandia);
    await expect(page.getByRole('heading', { level: 1, name: /em Sorriso/ })).toBeVisible();
  });
});
