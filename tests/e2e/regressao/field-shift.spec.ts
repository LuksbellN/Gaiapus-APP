// Field Shift: três estratégias calculadas, prioridade do produtor, sensibilidade de chuva, inglês e celular.
import { test, expect, MOBILE } from '../helpers';

const prefsWith = (locale: string) => `localStorage.setItem('gaiapus.prefs', JSON.stringify({ v: 1, locale: ${JSON.stringify(locale)} }))`;
const cell = (page: import('../helpers').Page, metric: string, sel: string) => page.locator(`[data-testid="fs-strategy-table"] tr[data-metric="${metric}"] ${sel}`);

test.describe('Field Shift — A/B/C', () => {
  test('três estratégias com valores, milho de C como não cultivado e pacote identificado', async ({ page, errors }) => {
    await page.goto('/#/field-shift');
    const table = page.getByTestId('fs-strategy-table');
    for (const name of ['A · Pousio', 'B · Braquiária', 'C · Pousio prolongado', 'B − A', 'C − A']) await expect(table.getByRole('columnheader', { name, exact: true })).toBeVisible();
    await expect(cell(page, 'maize_deficit_mm', '[data-strategy="soy_long_fallow"]')).toHaveText('não cultivado');
    await expect(cell(page, 'maize_deficit_mm', '[data-strategy="reference_fallow"]')).toHaveText(/\d/);
    await expect(page.getByTestId('fs-package')).toContainText(/field-shift-v2-[0-9a-f]{12}/);
    await expect(page.getByTestId('fs-strategies')).toContainText('não é uma rotação diversificada');
    await expect(page.getByRole('img', { name: /Reserva de água nas três estratégias/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('trocar a referência e a prioridade muda diferenças e ordem, nunca os valores', async ({ page }) => {
    await page.goto('/#/field-shift');
    const value = cell(page, 'year_water_use_mm', '[data-strategy="soy_long_fallow"]');
    const before = await value.innerText();
    await page.getByRole('radio', { name: 'B · Braquiária' }).check();
    await expect(page).toHaveURL(/ref=B/);
    await expect(page.getByTestId('fs-strategy-table').getByRole('columnheader', { name: 'C − B', exact: true })).toBeVisible();
    await page.getByRole('radio', { name: 'Produção' }).check();
    await expect(page).toHaveURL(/prioridade=producao/);
    await expect(page.getByTestId('fs-strategy-table')).toHaveAttribute('data-groups', 'soy,maize,common,cover,own');
    expect(await value.innerText()).toBe(before);
    await expect(page.getByTestId('fs-cards').locator('[data-strategy="soy_long_fallow"] [data-line="maize"]')).toContainText('não é cultivado');
    await page.getByRole('radio', { name: 'Margem' }).check();
    await expect(page.getByTestId('fs-margin')).toContainText('a margem não é calculada aqui');
  });

  test('chuva −20% e +20% são pontos calculados, com aviso de que não é previsão; teclado alcança os três', async ({ page }) => {
    await page.goto('/#/field-shift');
    const rain = page.getByTestId('fs-rain');
    await expect(rain).toContainText('não é previsão climática');
    const base = await cell(page, 'year_drainage_mm', '[data-strategy="reference_fallow"]').innerText();
    await rain.getByRole('radio', { name: 'histórica' }).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(rain).toHaveAttribute('data-multiplier', '0.8');
    await expect(page).toHaveURL(/chuva=-20/);
    const dry = await cell(page, 'year_drainage_mm', '[data-strategy="reference_fallow"]').innerText();
    expect(dry).not.toBe(base);
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    await expect(rain).toHaveAttribute('data-multiplier', '1.2');
    await expect(page.getByText('O gráfico diário mostra o clima histórico, sem alteração.')).toBeVisible();
    await expect(page.locator('input[type="range"]')).toHaveCount(0);
  });

  test('chuva nos dias sem cultura nem cobertura: derivada do pacote, segue a referência e o ponto de chuva', async ({ page, errors }) => {
    await page.goto('/#/field-shift');
    const rain = (sel: string) => cell(page, 'rain_on_bare_days_mm', sel);
    await expect(page.locator('[data-testid="fs-strategy-table"] tbody[data-group="cover"] tr[data-metric="rain_on_bare_days_mm"]')).toBeVisible();
    await expect(rain('[data-strategy="reference_fallow"]')).toHaveText('114,8');
    await expect(rain('[data-strategy="brachiaria"]')).toHaveText('75,9');
    await expect(rain('[data-strategy="soy_long_fallow"]')).toHaveText('1.032,3');
    await expect(cell(page, 'bare_days_wet_months', '[data-strategy="reference_fallow"]')).toHaveText('0');
    await expect(cell(page, 'bare_days_wet_months', '[data-strategy="soy_long_fallow"]')).toHaveText('93,3');
    const note = page.getByTestId('fs-exposure-note');
    await expect(note).toContainText('convenção desta tela para a estação chuvosa em Sorriso: 85% da chuva das 6 safras caiu nesses meses');
    await expect(page.locator('[data-testid="fs-strategy-table"] tr[data-metric="rain_on_bare_days_mm"] td').first()).toContainText('derivado da série diária');
    await expect(note).toContainText('não perda de solo');
    await expect(page.getByTestId('fs-matrix')).toContainText('Erosão não é avaliada');
    await expect(page.getByTestId('fs-matrix').locator('tr[data-aspect="erosion"]')).toContainText('não avaliado');
    await page.getByRole('radio', { name: 'C · Pousio prolongado' }).check();
    await expect(rain('[data-delta="reference_fallow"]')).toContainText('−917,5');
    await expect(rain('[data-strategy="reference_fallow"]')).toHaveText('114,8');
    await page.getByTestId('fs-rain').getByRole('radio', { name: '−20%' }).check();
    await expect(rain('[data-strategy="reference_fallow"]')).toHaveText('91,8');
    await expect(cell(page, 'bare_days_wet_months', '[data-strategy="soy_long_fallow"]')).toHaveText('93,3');
    await expect(note).toContainText('Com a chuva multiplicada por 0,8, o calendário é o mesmo');
    await expect(page.locator('main')).not.toContainText(/solo nu/i);
    expect(errors).toEqual([]);
  });

  test('trocar o idioma na mesma tela, sem recarregar, traduz as linhas novas e o rodapé de fonte', async ({ page }) => {
    await page.goto('/#/field-shift');
    await expect(page.getByTestId('fs-strategy-table')).toContainText('Chuva nos dias sem cultura nem cobertura, no ano agrícola');
    await page.locator('[data-testid="language-select"]:visible').first().selectOption('en');
    await expect(page.getByTestId('fs-strategy-table')).toContainText('Rain on days without crop or cover, in the agricultural year');
    await expect(page.getByTestId('fs-exposure-note')).toContainText('not soil loss');
    await expect(page.getByTestId('fs-matrix')).toContainText('Erosion is not assessed.');
    for (const pt of ['Chuva nos dias', 'perda de solo', 'Erosão']) await expect(page.locator('main')).not.toContainText(pt);
    // A screen whose footer names a publication served by the API: the words follow the language without a new request.
    await page.goto('/#/visao-geral');
    const footer = page.locator('.source').filter({ hasText: /science-/ }).first();
    await expect(footer).toContainText(/Publication science-\S+ · .* · contract water_risk_projection/);
    await page.locator('[data-testid="language-select"]:visible').first().selectOption('pt-BR');
    await expect(footer).toContainText(/Publicação science-\S+ · .* · contrato water_risk_projection/);
    await expect(footer).not.toContainText('Publication science-');
  });

  test('em inglês a tela inteira das estratégias está traduzida', async ({ page }) => {
    await page.addInitScript(prefsWith('en'));
    await page.goto('/#/field-shift?prioridade=producao&chuva=20');
    const table = page.getByTestId('fs-strategy-table');
    await expect(table.getByRole('columnheader', { name: 'C · Long fallow', exact: true })).toBeVisible();
    await expect(cell(page, 'maize_deficit_mm', '[data-strategy="soy_long_fallow"]')).toHaveText('not grown');
    await expect(page.getByTestId('fs-rain')).toContainText('Sensitivity test on historical weather — not a climate forecast.');
    await expect(page.getByTestId('fs-priority')).toContainText('These are water indicators, not predicted production.');
    await expect(page.getByTestId('fs-cards')).toContainText('What the simulation shows');
    await expect(page.getByTestId('fs-matrix')).toContainText('not assessed');
    await expect(page.getByTestId('reading-guide')).toContainText('How to read these numbers');
    for (const pt of ['Pousio', 'não cultivado', 'Lacunas', 'Sua prioridade']) await expect(page.locator('main')).not.toContainText(pt);
  });
});

test.describe('Field Shift no celular', () => {
  test.use(MOBILE);
  test('cartões legíveis, tabela com rolagem contida e página sem rolagem horizontal', async ({ page }) => {
    await page.goto('/#/field-shift');
    await expect(page.getByTestId('fs-cards').locator('[data-strategy="soy_long_fallow"]')).toBeVisible();
    await expect(page.getByTestId('fs-rain').getByRole('radio', { name: '+20%' })).toBeVisible();
    await page.getByTestId('fs-rain').getByRole('radio', { name: '+20%' }).check();
    await expect(page.getByTestId('fs-rain')).toHaveAttribute('data-multiplier', '1.2');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  });
});
