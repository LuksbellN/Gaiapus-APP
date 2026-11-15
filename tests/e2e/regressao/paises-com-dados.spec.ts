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
