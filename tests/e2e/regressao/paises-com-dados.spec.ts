// Países com dados ficam em destaque e no topo da lista do mundo, derivados dos catálogos (Brasil e núcleos publicados no exterior).
import { test, expect } from '../helpers';

test('no celular os dois países com dados cabem no painel ao abrir o atalho', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/explorar?dados=1&semwebgl=1');
  const countries = page.getByRole('list', { name: 'Países', exact: true });
  await expect(countries.getByRole('listitem')).toHaveCount(2);
  await expect.poll(() => countries.evaluate((list) => {
    const panel = list.closest('.explore__panel-body')!.getBoundingClientRect();
    const rows = Array.from(list.children).map((row) => row.getBoundingClientRect());
    return rows.every((row) => row.top >= panel.top && row.bottom <= panel.bottom);
  })).toBe(true);
});

test('regiões com dados começa pelos países e mantém o padrão visual das regiões', async ({ page }) => {
  await page.goto('/#/explorar?pais=ARG&semwebgl=1');
  await page.getByRole('button', { name: 'Ver regiões com dados', exact: true }).click();
  await expect(page.locator('.crumbs [aria-current]')).toHaveText('Mundo');
  const countries = page.getByRole('list', { name: 'Países', exact: true });
  await expect(countries.getByRole('listitem')).toHaveCount(2);
  await expect(countries).toContainText('Brasil');
  await expect(countries).toContainText('Estados Unidos');
  await expect(page.getByTestId('abroad-list')).toHaveCount(0);
  await countries.getByRole('button', { name: /Brasil/ }).click();
  const brazilianRegion = page.getByTestId('with-data').getByRole('button', { name: /Sorriso/ });
  await expect(brazilianRegion).toBeVisible();
  await expect(page.getByTestId('with-data')).not.toContainText('Story County');
  const stylesOf = (element: HTMLElement) => {
    const style = getComputedStyle(element);
    return { display: style.display, padding: style.padding, minHeight: style.minHeight, color: style.color, textDecoration: style.textDecorationLine };
  };
  const brazilianStyle = await brazilianRegion.evaluate(stylesOf);
  await page.getByRole('button', { name: 'Mundo', exact: true }).click();
  await countries.getByRole('button', { name: /Estados Unidos/ }).click();
  const county = page.getByTestId('abroad-list').getByRole('link', { name: /Story County/ });
  await expect(county).toBeVisible();
  expect(await county.evaluate(stylesOf)).toEqual(brazilianStyle);
  await expect(county).toHaveAttribute('href', '#/municipio?id=US%3Afips%3A19169');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(county).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  await county.click();
  await expect(page).toHaveURL(/municipio\?id=US%3Afips%3A19169/);
});

test('Brasil e Estados Unidos aparecem no topo com o selo "Com dados" e os estados com dados', async ({ page }) => {
  await page.goto('/#/explorar');
  const list = page.getByRole('list', { name: /Países/i });
  const rows = list.getByRole('listitem');
  await expect(rows.nth(0)).toContainText('Brasil');
  await expect(rows.nth(0)).toContainText('Com dados');
  await expect(rows.nth(1)).toContainText('Estados Unidos');
  await expect(rows.nth(1)).toContainText('Com dados');
  await expect(rows.nth(1)).toContainText('IA, KS, NE');
  await expect(rows.nth(2)).not.toContainText('Com dados');
});

test('EUA têm o mesmo nível do Brasil: estado → todos os condados (Census), com dados primeiro; condado sem dados explica', async ({ page }) => {
  await page.goto('/#/explorar');
  const us = page.getByRole('list', { name: /Países/i }).getByRole('listitem').nth(1);
  await expect(us).toContainText('50 estados e DC');
  await page.goto('/#/explorar?pais=USA&uf=US-IA');
  const counties = page.getByTestId('us-county-list').getByRole('listitem');
  await expect(counties).toHaveCount(99);
  await expect(counties.first()).toContainText('Story');
  await expect(counties.first()).toContainText('Dados agrícolas');
  await page.getByLabel('Buscar condado').fill('Polk');
  await page.getByTestId('us-county-list').getByRole('button', { name: /Polk/ }).click();
  await expect(page).toHaveURL(/mun=US%3Afips%3A19153|mun=US:fips:19153/);
  await expect(page.getByTestId('us-county-detail')).toContainText('Ainda não há dados agrícolas publicados para este condado');
  // A county is not a Brazilian municipality: no IBGE card, no /v1/coverage lookup; the title is the county name.
  await expect(page.locator('[data-tour="explore-coverage"]')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: 'Polk' })).toBeVisible();
});
