import { test, expect } from '../../apps/web/node_modules/@playwright/test/index.mjs';
import path from 'node:path';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
// Screenshots go to test-results, never over the versioned evidence in design/verification.
const evidence = path.resolve(process.cwd(), 'test-results/screens');

test('approved visual sources are unchanged or their change is recorded', async () => {
  const manifest = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'design/teammate-source-manifest.json'), 'utf8'));
  const history = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'design/teammate-source-history.json'), 'utf8'));
  const imported = path.resolve(process.cwd(), 'src/teammate');
  const sha = (text) => createHash('sha256').update(text).digest('hex');
  for (const [file, original] of Object.entries(manifest.sha256)) {
    // Line endings are normalized: the handoff hashes were taken from CRLF files, the repository stores LF.
    const lf = fs.readFileSync(path.join(imported, file), 'utf8').replace(/\r\n/g, '\n');
    const recorded = history.entries.filter((e) => e.file === file).at(-1)?.sha256;
    expect([original, recorded].filter(Boolean), `${file}: record deliberate changes in design/teammate-source-history.json`).toContain(recorded && sha(lf) === recorded ? recorded : sha(lf.replace(/\n/g, '\r\n')));
  }
});

test('overview uses actual API publications and preserves the approved desktop layout', async ({ page }) => {
  const errors = []; const calls = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if(response.url().includes('/v1/')) calls.push({ url: response.url(), status: response.status() }); });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/visao-geral');
  await expect(page.getByRole('heading', { name: 'Hoje em Sorriso, MT' })).toBeVisible();
  await expect(page.locator('.stat').first()).toBeVisible();
  await expect.poll(() => calls.some(call => call.url.includes('/examples/water-soy') && call.status === 200)).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(evidence, 'teammate-overview-desktop.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('map, coverage, search and WebGL fallback keep the teammate interactions', async ({ page }) => {
  await page.goto('/#/explorar?semwebgl=1');
  await expect(page.getByText('Mapa indisponível neste aparelho.')).toBeVisible();
  await page.getByRole('button', { name: 'Sorriso, MT', exact: true }).click();
  await expect(page.getByTestId('mun-detail')).toContainText('Field Shift');
  await page.getByRole('button', { name: 'Uberlândia, MG', exact: true }).click();
  await expect(page.getByTestId('mun-detail')).toContainText('NDVI');
  await expect(page.getByTestId('mun-detail')).not.toContainText('Field Shift');
  await page.locator('#busca-local').fill('sorriso');
  await expect(page.locator('#busca-lista')).toContainText('Sorriso');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('mun-detail')).toHaveAttribute('data-code', '5107925');
  await page.goBack();
  await expect(page.getByTestId('mun-detail')).toHaveAttribute('data-code', '3170206');
});

test('mobile theme, local property flow, planning and records remain available without auth', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/propriedades');
  await expect(page.getByRole('heading', { name: 'Propriedades e talhões' })).toBeVisible();
  await page.getByRole('button', { name: 'Mudar para tema claro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.goto('/#/planejar');
  await expect(page.getByRole('heading', { name: 'Planejar plantio' })).toBeVisible();
  await expect(page.getByTestId('plan-eco')).toBeVisible();
  await page.screenshot({ path: path.join(evidence, 'teammate-plan-mobile-light.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.goto('/#/registros');
  await expect(page.getByText('Cadastre um talhão para começar')).toBeVisible();
});

test('imagery and historical simulation load through the adapted project', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#/municipio?mun=3170206&aba=imagem');
  await expect(page.getByRole('heading', { name: /Uberlândia/ }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'NDVI e chuva alinhados por data' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Imagem de satélite/ })).toBeVisible();
  await page.goto('/#/field-shift');
  await expect(page.getByRole('heading', { name: /Field Shift/ }).first()).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'A · Pousio' })).toBeVisible();
  await page.goto('/#/simulador');
  await expect(page.getByRole('heading', { name: /Simulador de safra/ })).toBeAttached();
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20000 });
  await page.screenshot({ path: path.join(evidence, 'teammate-simulator.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('real account screens and native email callbacks use the imported design system', async ({ page }) => {
  await page.goto('/#/conta');
  await expect(page.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible();
  await expect(page.getByLabel('Senha', { exact: true })).toBeVisible();
  await expect(page.locator('.card')).toBeVisible();
  await page.getByRole('link', { name: 'Criar conta', exact: true }).click();
  await expect(page.getByLabel('Seu nome')).toBeVisible();
  await page.getByRole('link', { name: 'Entrar', exact: true }).click();
  await page.getByRole('link', { name: 'Recuperar acesso', exact: true }).click();
  await expect(page.getByLabel('E-mail da conta')).toBeVisible();
  for (const route of ['/auth/callback', '/auth/recovery']) {
    await page.goto(route + '?error=access_denied');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByLabel('Nova senha', { exact: true })).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(route + '$'));
    await page.getByRole('link', { name: 'Visão geral', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Hoje em Sorriso, MT' })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/');
  }
});
