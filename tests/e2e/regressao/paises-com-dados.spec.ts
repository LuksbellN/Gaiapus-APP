// Países com dados ficam em destaque e no topo da lista do mundo, derivados dos catálogos (Brasil e núcleos publicados no exterior).
import { test, expect } from '../helpers';

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
