// RT-27: places with data outside Brazil are on the map, not only in lists. Needs WebGL (software SwiftShader).
import { test, expect } from '../helpers';

test.use({ launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } });

test.describe('RT-27 mapa mostra os lugares com dados fora do Brasil', () => {
  test('condados dos EUA aparecem como marcadores e abrem o núcleo', async ({ page }) => {
    await page.goto('/#/explorar?pais=USA');
    const marker = page.locator('.map-marker', { hasText: 'Story County' });
    await expect(marker).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.map-marker', { hasText: 'Sumner County' })).toBeVisible();
    await expect(marker).toHaveAttribute('aria-label', /Story County/);
    await marker.click();
    await expect(page).toHaveURL(/#\/municipio\?id=US%3Afips%3A19169/);
    await expect(page.getByRole('heading', { level: 1, name: 'Story County, Iowa' })).toBeVisible();
  });
});
