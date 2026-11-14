// RT-06, RT-07, RT-08, RT-11, RT-17, RT-26: contexto, município, culturas, Field Shift, ciência, sondas e alertas.
import { test, expect, seedFarm } from '../helpers';

test.describe('RT-06 contexto do talhão', () => {
  test('sem talhão: demonstração de Sorriso declarada', async ({ page }) => {
    await page.goto('/#/visao-geral');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Sorriso');
    await expect(page.getByText(/demonstração de Sorriso/)).toBeVisible();
  });

  test('D-02: talhão em Uberlândia não vê Sorriso como se fosse seu', async ({ page }) => {
    await seedFarm(page);
    await page.goto('/#/visao-geral');
    await expect(page.getByTestId('scope-strip')).toContainText('Uberlândia');
    await expect(page.getByRole('button', { name: /Ver a demonstração de Sorriso/ }).or(page.getByRole('link', { name: /Ver a demonstração de Sorriso/ }))).toBeVisible();
  });

  test('D-04: próxima atividade é do talhão em uso', async ({ page }) => {
    await seedFarm(page);
    await page.goto('/#/registros?novo=evento');
    await page.getByLabel('Data', { exact: true }).fill('2027-01-10');
    await page.getByRole('button', { name: /Salvar manejo/ }).click();
    await page.locator('.page-head select').selectOption({ label: 'Talhão B' });
    await page.goto('/#/visao-geral');
    await expect(page.locator('#h-prox').locator('..')).not.toContainText('10 jan 2027');
  });
});

test.describe('RT-07 município', () => {
  test('abas na URL, teclado e conteúdo por aba', async ({ page }) => {
    await page.goto('/#/municipio?mun=5107925');
    await page.getByRole('tab', { name: 'Clima' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/aba=agua/);
    await expect(page.getByRole('heading', { name: /Resumo por ano agrícola/ })).toBeVisible();
    await page.goto('/#/municipio?mun=3170206&aba=imagem');
    await expect(page.getByRole('heading', { name: 'NDVI e chuva alinhados por data' })).toBeVisible();
    await page.goto('/#/municipio?mun=5107925&aba=imagem');
    await expect(page.getByText(/Sem imagem orbital processada/)).toBeVisible();
  });

  test.fixme('D-08: recorte publicado de Rio Verde mostra NDVI do recorte', async ({ page }) => {
    await page.goto('/#/municipio?mun=5218805&aba=imagem');
    await expect(page.getByRole('heading', { name: /NDVI/ })).toBeVisible();
    await expect(page.getByText(/recorte/i).first()).toBeVisible();
  });
});

test.describe('RT-08 culturas e capacidades', () => {
  test('10 culturas no município; nenhuma curva de soja para café; café explica perene', async ({ page }) => {
    await page.goto('/#/municipio?mun=5107925&aba=safra');
    const crop = page.getByLabel('Cultura', { exact: true });
    await expect(crop.locator('option')).toHaveCount(10);
    await crop.selectOption('coffee_arabica');
    await expect(page).toHaveURL(/cultura=coffee_arabica/);
    await expect(page.getByTestId('safra')).toHaveAttribute('data-crop', 'coffee_arabica');
    await expect(page.getByTestId('capabilities').locator('[data-cap=cena3d]')).toHaveAttribute('data-status', 'sem_suporte');
    await page.goto('/#/simulador?cultura=coffee_arabica&mun=3170206');
    await expect(page.getByTestId('sim-unavailable')).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    await page.getByLabel('Implantação de cafezal novo').check();
    await expect(page).toHaveURL(/cafezal=implantacao/);
  });

  test('planejar oferece 9 plantáveis, sem a coorte agregada', async ({ page }) => {
    await page.goto('/#/planejar');
    const options = page.getByLabel('Cultura', { exact: true }).locator('option');
    await expect(options).toHaveCount(9);
    expect((await options.allTextContents()).join()).not.toContain('Café total MG');
  });
});

test.describe('RT-11 Field Shift', () => {
  test('comparação completa e rendimento não avaliado', async ({ page }) => {
    await page.goto('/#/field-shift');
    await expect(page.getByRole('columnheader', { name: 'A · Pousio' })).toBeVisible();
    await expect(page.getByText('Não avaliado — indisponível')).toBeVisible();
    await expect(page.getByText(/O benefício depende de uma hipótese/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sensibilidade às hipóteses' })).toBeVisible();
  });
});

test.describe('RT-17 ciência', () => {
  test('teste selado pertence ao modelo exibido; lacunas visíveis', async ({ page }) => {
    await page.goto('/#/visao-geral');
    await expect(page.getByText(/Foram servidos 6 dos 10 dias/)).toBeVisible();
    await expect(page.getByTestId('model-test').first()).toHaveAttribute('data-scope', 'national');
    await page.goto('/#/municipio?mun=5107925&aba=safra');
    await expect(page.locator('[data-testid=model-test][data-scope="MG+MT"]').first()).toBeVisible();
  });

  test('D-13: resposta da API rotulada como publicação, não como dado do pacote', async ({ page }) => {
    await page.goto('/#/explorar?pais=BR&uf=51&mun=5107925&semwebgl=1');
    await expect(page.getByTestId('mun-detail').locator('.source')).toContainText('Publicação da API');
  });
});

test.describe('RT-26 sondas e alertas', () => {
  test('sondas sintéticas identificadas; alerta com motivo e fonte; sem erro de console', async ({ page, errors }) => {
    await page.goto('/#/dispositivos');
    await expect(page.getByText('Dado sintético').first()).toBeVisible();
    await expect(page.getByText('Com falha')).toBeVisible();
    await page.goto('/#/alertas');
    await expect(page.getByText('Motivo', { exact: true })).toBeVisible();
    await expect(page.getByText('Incerteza', { exact: true })).toBeVisible();
    expect(errors.filter((e) => !/unique "key"/.test(e))).toEqual([]);
  });
});
