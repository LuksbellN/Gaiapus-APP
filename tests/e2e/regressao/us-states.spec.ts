import { test, expect } from '../helpers';

test.use({ launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } });

test('US states have boundaries, selections, county filtering and a working Brazil return', async ({ page }) => {
  await page.goto('/#/explorar?pais=USA');
  await expect(page.getByTestId('us-state-list').getByRole('button')).toHaveCount(51);
  await expect(page.locator('.map-marker', { hasText: 'Story County' })).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => {
    const map = (window as unknown as { __gaiapusMap?: { queryRenderedFeatures: (options: { layers: string[] }) => { properties: { code: string } }[] } }).__gaiapusMap;
    return new Set(map?.queryRenderedFeatures({ layers: ['states-fill'] }).map(f => f.properties.code)).size;
  })).toBeGreaterThan(20);
  await page.screenshot({ path: 'test-results/us-states-overview.png' });
  await page.getByTestId('us-state-list').getByRole('button', { name: /^Iowa IA/ }).click();
  await expect(page).toHaveURL(/pais=USA&uf=US-IA/);
  await expect(page.getByRole('heading', { level: 1, name: 'Iowa' })).toBeVisible();
  await expect(page.getByTestId('us-state-panel').getByRole('link', { name: /Story County/ })).toBeVisible();
  await expect(page.locator('.map-marker', { hasText: 'Sumner County' })).toHaveCount(0);
  await expect(page.getByTestId('us-state-panel')).not.toContainText('York County');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Iowa' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Você está em' }).getByRole('button', { name: /Estados Unidos/ }).click();
  await page.getByLabel('Buscar estado americano').fill('California');
  await page.getByTestId('us-state-list').getByRole('button', { name: /California CA/ }).click();
  await expect(page.getByText('Ainda não há dados agrícolas publicados para este estado.')).toBeVisible();
  await page.goto('/#/explorar?pais=BR');
  await expect(page.getByRole('button', { name: /^Minas Gerais MG/ })).toBeVisible();
  await expect(page.getByTestId('us-state-panel')).toHaveCount(0);
});

test('global search selects a US state instead of interpreting it as a Brazilian UF', async ({ page }) => {
  await page.goto('/#/explorar?semwebgl=1');
  const search = page.locator('#busca-local');
  await search.fill('Nebraska');
  await page.getByRole('option', { name: /Nebraska/ }).click();
  await expect(page).toHaveURL(/pais=USA&uf=US-NE/);
  await expect(page.getByRole('heading', { level: 1, name: 'Nebraska' })).toBeVisible();
  await expect(page.getByTestId('us-state-panel').getByRole('link', { name: /York County/ })).toBeVisible();
});

test('USA keeps state navigation when the county catalog fails', async ({ page }) => {
  await page.route('**/v1/locations?**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":{"code":"dependency_failure","message":"offline"}}' }));
  await page.goto('/#/explorar?pais=USA&uf=US-CA&semwebgl=1');
  await expect(page.getByText(/Não foi possível consultar os dados dos condados/)).toBeVisible();
  await expect(page.getByText('Ainda não há dados agrícolas publicados para este estado.')).toHaveCount(0);
});

test('clicking a US polygon selects that state and zooms in', async ({ page }) => {
  await page.goto('/#/explorar?pais=USA');
  await expect(page.locator('.map-marker', { hasText: 'Story County' })).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => {
    const map = (window as unknown as { __gaiapusMap: { loaded: () => boolean; isMoving: () => boolean } }).__gaiapusMap;
    return map.loaded() && !map.isMoving();
  })).toBe(true);
  const target = await page.evaluate(() => {
    const map = (window as unknown as { __gaiapusMap: { project: (p: [number, number]) => { x: number; y: number }; getZoom: () => number; getCanvas: () => HTMLCanvasElement; queryRenderedFeatures: (point: { x: number; y: number }, options: { layers: string[] }) => { properties: { code: string } }[] } }).__gaiapusMap;
    const pixel = map.project([-79, 37]);
    const rect = map.getCanvas().getBoundingClientRect();
    return { x: rect.left + pixel.x, y: rect.top + pixel.y, zoom: map.getZoom(), state: map.queryRenderedFeatures(pixel, { layers: ['states-fill'] })[0]?.properties.code };
  });
  expect(target.state).toBe('US-VA');
  await page.mouse.click(target.x, target.y);
  await expect(page).toHaveURL(/pais=USA&uf=US-VA/);
  await expect(page.getByRole('heading', { level: 1, name: 'Virginia' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __gaiapusMap: { getZoom: () => number } }).__gaiapusMap.getZoom())).toBeGreaterThan(target.zoom + 1);
});
