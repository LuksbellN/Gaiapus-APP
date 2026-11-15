// RT-28: one place screen for every country, chosen by country → state → place (or search), same tabs everywhere.
import { test, expect } from '../helpers';

test.describe('RT-28 tela do lugar', () => {
  test('seletor em cascata leva de país a condado e mantém o lugar na URL', async ({ page, errors }) => {
    await page.goto('/#/municipio');
    await expect(page.getByRole('radio')).toHaveCount(0);
    await page.getByLabel('País', { exact: true }).selectOption({ label: 'Estados Unidos (3)' });
    await expect(page.getByLabel('Estado', { exact: true }).locator('option')).toHaveText(['Iowa (1)', 'Kansas (1)', 'Nebraska (1)']);
    await page.getByLabel('Estado', { exact: true }).selectOption({ label: 'Kansas (1)' });
    await expect(page.getByRole('heading', { level: 1, name: 'Sumner County, Kansas' })).toBeVisible();
    await expect(page).toHaveURL(/#\/municipio\?id=US%3Afips%3A20191/);
    await expect(page.getByTestId('location-weather')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('busca por nome ou código oficial', async ({ page }) => {
    await page.goto('/#/municipio');
    await page.getByLabel('Buscar lugar com dados').fill('19169');
    await page.getByRole('option', { name: /Story County/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Story County, Iowa' })).toBeVisible();
  });

  test('mesmas abas nos EUA: água com previsão, safra explica que não há rendimento, imagem com NDVI', async ({ page }) => {
    await page.goto(`/#/municipio?id=${encodeURIComponent('US:fips:20191')}&aba=agua`);
    await expect(page.getByTestId('location-water')).toBeVisible();
    await expect(page.getByTestId('location-forecast')).toBeVisible();
    await page.getByRole('tab', { name: 'Safra' }).click();
    await expect(page.getByTestId('no-yield')).toContainText('rendimento');
    await page.getByRole('tab', { name: 'Imagem orbital' }).click();
    await expect(page.getByTestId('location-ndvi')).toBeVisible();
  });

  test('Brasil: núcleo em cima, conteúdo v7 de Sorriso preservado embaixo; sem aviso contraditório em Uberlândia', async ({ page }) => {
    await page.goto('/#/municipio?mun=5107925');
    await expect(page.getByTestId('location-weather')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Chuva e demanda da atmosfera por ano agrícola' })).toBeVisible();
    await page.goto('/#/municipio?mun=3170206&aba=agua');
    await expect(page.getByTestId('location-water')).toBeVisible();
    await expect(page.locator('main')).not.toContainText('Sem balanço hídrico publicado');
  });

  test('o endereço antigo #/local redireciona para a tela do lugar', async ({ page }) => {
    await page.goto(`/#/local?id=${encodeURIComponent('US:fips:31185')}`);
    await expect(page).toHaveURL(/#\/municipio\?id=US%3Afips%3A31185/);
    await expect(page.getByRole('heading', { level: 1, name: 'York County, Nebraska' })).toBeVisible();
  });
});
