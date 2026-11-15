// Location core in the frontend: US counties and Brazilian municipalities with the same data core.
import { test, expect } from '../helpers';

const local = (id: string) => `/#/municipio?id=${encodeURIComponent(id)}&aba=agua`;

test.describe('RT-26 núcleo global (EUA)', () => {
  test('Story County abre com clima, água no solo e NDVI, sem nenhum dado de Sorriso', async ({ page, errors }) => {
    await page.goto(local('US:fips:19169'));
    await expect(page.getByRole('heading', { level: 1, name: 'Story County, Iowa' })).toBeVisible();
    for (const id of ['location-water', 'location-forecast', 'location-scope']) await expect(page.getByTestId(id)).toBeVisible();
    await page.getByRole('tab', { name: 'Clima' }).click();
    await expect(page.getByTestId('location-weather')).toBeVisible();
    await page.getByRole('tab', { name: 'Imagem orbital' }).click();
    await expect(page.getByTestId('location-ndvi')).toBeVisible();
    await expect(page.getByTestId('location-scope')).toContainText('não observado');
    await expect(page.locator('main')).not.toContainText('Sorriso');
    // Monthly ET0 is drawn as a line on its own scale (not the 0–1 NDVI default).
    await page.getByRole('tab', { name: 'Clima' }).click();
    expect(await page.getByTestId('location-weather').locator('svg path[d^="M"]').count()).toBeGreaterThan(0);
    await expect(page.getByTestId('location-scope')).toContainText('não é limite de propriedade');
    expect(errors).toEqual([]);
  });

  test('previsão: fora da safra nos EUA em novembro; em Sorriso mostra a data de emissão', async ({ page }) => {
    await page.goto(local('US:fips:31185'));
    await expect(page.getByTestId('location-forecast')).toContainText('Não há cultura no campo');
    await page.goto(local('BR:ibge:5107925'));
    await expect(page.getByTestId('forecast-issued')).toContainText('Emitida em');
  });

  // Desde "países primeiro" (PR #10) o atalho abre a lista de países; as regiões aparecem dentro de cada país.
  test('Regiões com dados: EUA e Brasil aparecem uma vez como países, Sorriso uma vez no Brasil; o país EUA lista os condados', async ({ page }) => {
    await page.goto('/#/explorar?semwebgl=1');
    await page.getByRole('button', { name: /Regiões com dados/ }).click();
    const countries = page.getByRole('list', { name: 'Países', exact: true });
    await expect(countries.getByRole('button', { name: /Estados Unidos/ })).toHaveCount(1);
    await expect(countries.getByRole('button', { name: /Brasil/ })).toHaveCount(1);
    await countries.getByRole('button', { name: /Brasil/ }).click();
    const list = page.getByTestId('with-data');
    await expect(list.getByText(/^Sorriso/)).toHaveCount(1);
    await expect(list).not.toContainText('Story County');
    await page.goto('/#/explorar?semwebgl=1&pais=USA');
    await expect(page.getByTestId('abroad-list').getByText('Sumner County', { exact: true })).toBeVisible();
    await expect(page.locator('main')).not.toContainText('sem análise nesta versão');
    await expect(page.getByTestId('country-detail')).not.toContainText('existem para alguns municípios do Brasil');
  });

  test('município brasileiro mostra o núcleo na própria tela; id malformado não inventa lugar', async ({ page }) => {
    await page.goto('/#/municipio?mun=5218805&aba=agua');
    await expect(page.getByTestId('location-water')).toBeVisible();
    await page.goto(local('US:fips:9169'));
    await expect(page.getByTestId('location-water')).toHaveCount(0);
  });

  for (const lang of ['de', 'fr']) {
    test(`${lang} a 320 px sem rolagem horizontal`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.addInitScript((l) => localStorage.setItem('gaiapus.prefs', JSON.stringify({ v: 1, locale: l })), lang);
      await page.goto(local('US:fips:20191'));
      await expect(page.getByTestId('location-water')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    });
  }
});
