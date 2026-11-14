// RT-09, RT-10, RT-14: planos, simulador e leitura de números.
import { test, expect, localState } from '../helpers';

const ecoStats = (page) => page.getByTestId('plan-eco').locator('.stat').allInnerTexts();

test.describe('RT-09 planos', () => {
  test('salvar, reabrir e abrir no simulador', async ({ page }) => {
    await page.goto('/#/planejar');
    await page.getByLabel('Área (ha)', { exact: true }).fill('40');
    await page.getByRole('button', { name: 'Salvar planejamento' }).click();
    await expect(page.getByText('Planejamento salvo neste aparelho.')).toBeVisible();
    expect((await localState(page)).plans).toHaveLength(1);
    await page.getByRole('button', { name: 'Salvar e abrir no simulador' }).click();
    await expect(page).toHaveURL(/simulador\?cultura=soy&mun=5107925&plano=/);
    await expect(page.getByTestId('from-plan')).toContainText('não alteram esta simulação');
    await page.getByTestId('from-plan').getByRole('link', { name: 'Voltar ao plano' }).click();
    await expect(page.getByLabel('Área (ha)', { exact: true })).toHaveValue('40');
  });

  test('D-05: todos os planos acessíveis e o plano reaberto mantém o município', async ({ page }) => {
    await page.goto('/#/planejar?mun=3170206');
    for (let i = 1; i <= 7; i++) { await page.getByLabel('Área (ha)', { exact: true }).fill(String(i)); await page.getByRole('button', { name: 'Salvar planejamento' }).click(); }
    await page.goto('/#/planejar');
    await page.getByRole('button', { name: /Mostrar todos \(7\)/ }).click();
    await expect(page.locator('[data-testid=plans] li')).toHaveCount(7);
    await page.locator('[data-testid=plans] li button').first().click();
    await expect(page.locator('.page-head .pill').first()).toContainText('Uberlândia');
  });
});

test.describe('RT-10 simulador', () => {
  test('modos, ano, A/B na URL; cursor por teclado; reproduzir e pausar', async ({ page }) => {
    await page.goto('/#/simulador');
    await expect(page.getByRole('slider')).toBeVisible({ timeout: 20000 });
    await page.getByLabel('Previsão disponível').check();
    await expect(page).toHaveURL(/modo=previsao/);
    await page.getByLabel('Histórico').check();
    await page.getByLabel('Ano agrícola').selectOption('2018/2019');
    await expect(page).toHaveURL(/ano=2018-2019/);
    await page.getByRole('checkbox', { name: /Comparar A\/B/ }).check();
    await expect(page).toHaveURL(/ab=1/);
    await expect(page.getByRole('heading', { name: /Diferença B − A/ })).toBeVisible();
    const slider = page.getByRole('slider');
    await slider.focus(); await page.keyboard.press('PageUp');
    await expect(slider).toHaveAttribute('aria-valuenow', '7');
    await page.getByRole('button', { name: 'Reproduzir' }).click();
    await page.getByRole('button', { name: 'Pausar' }).click();
    await page.reload();
    await expect(page.getByRole('checkbox', { name: /Comparar A\/B/ })).toBeChecked();
  });

  test('D-27: o dia escolhido entra na URL e o link reabre no mesmo dia', async ({ page }) => {
    await page.goto('/#/simulador?dia=120');
    const slider = page.getByRole('slider');
    await expect(slider).toHaveAttribute('aria-valuenow', '119', { timeout: 20000 });
    await slider.focus(); await page.keyboard.press('PageUp');
    await expect(page).toHaveURL(/dia=127/);
    const before = await page.evaluate(() => history.length);
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/dia=129/);
    expect(await page.evaluate(() => history.length)).toBe(before);
  });
});

test.describe('RT-14 números', () => {
  const fill = async (page, area: string) => {
    await page.goto('/#/planejar');
    await page.getByLabel('Unidade do preço').selectOption('kg');
    await page.getByLabel('Rendimento esperado (kg/ha)').fill('3000');
    await page.getByLabel('Preço (R$ por kg)').fill('2');
    await page.getByLabel('Data do preço').fill('2026-11-14');
    await page.getByLabel('Custo total (R$/ha)').fill('0');
    await page.getByLabel('Área (ha)', { exact: true }).fill(area);
  };
  test('vírgula decimal em português', async ({ page }) => {
    await fill(page, '10,5');
    expect((await ecoStats(page))[0]).toContain('63.000,00');
  });
  test('D-03: ponto decimal em português é recusado com orientação, nunca multiplicado', async ({ page }) => {
    for (const area of ['10.5', '1.5', '10e2']) {
      await fill(page, area);
      const s = (await ecoStats(page)).join(' ');
      expect(s).not.toMatch(/630\.000|90\.000|6\.000\.000/);
      expect(s).toContain('Falta: área');
    }
    await fill(page, '10.5');
    await expect(page.getByText('Use vírgula para decimais, por exemplo 10,5.')).toBeVisible();
    await fill(page, '1.234,5');
    expect((await ecoStats(page))[0]).toContain('7.407.000,00');
  });
});
