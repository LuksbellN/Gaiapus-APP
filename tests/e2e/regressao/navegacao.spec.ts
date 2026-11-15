// RT-16, RT-18, RT-19, RT-24: falhas, navegação, acessibilidade e carregamento.
import { test, expect, MOBILE, seriousViolations } from '../helpers';
import { NO_FIRST_RUN } from '../helpers';

const ROUTES = ['/explorar?semwebgl=1', '/visao-geral', '/municipio', '/planejar', '/simulador', '/field-shift', '/propriedades', '/registros', '/dispositivos', '/minha-area', '/alertas', '/conta', '/mais', '/design-preview'];

test.describe('RT-16 falhas', () => {
  test('API fora: telas de dado mostram erro com nova tentativa e nenhum número', async ({ page }) => {
    await page.route('**/v1/**', (r) => r.abort());
    for (const url of ['/visao-geral', '/field-shift', '/alertas']) {
      await page.goto('/#' + url);
      await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
      await expect(page.locator('.stat__value')).toHaveCount(0);
    }
  });

  test('falha ao baixar uma tela vira estado recuperável', async ({ page }) => {
    await page.goto('/#/explorar?semwebgl=1');
    await page.route('**/src/teammate/pages/FieldShift.tsx*', (r) => r.abort());
    await page.locator('nav.rail a', { hasText: 'Field Shift' }).click();
    await expect(page.getByText('Não foi possível abrir esta tela')).toBeVisible();
    await page.unroute('**/src/teammate/pages/FieldShift.tsx*');
    await page.getByRole('button', { name: 'Tentar de novo' }).click();
    await expect(page.getByRole('heading', { name: /Field Shift/ }).first()).toBeVisible();
  });
});

test.describe('RT-18 navegação', () => {
  test('todas as rotas abrem com h1 e sem erro', async ({ page, errors }) => {
    for (const r of ROUTES) { await page.goto('/#' + r); await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible(); }
    expect(errors.filter((e) => !/unique "key"/.test(e))).toEqual([]);
  });

  test('celular: Mais leva aos destinos fora da barra', async ({ browser }) => {
    const ctx = await browser.newContext(MOBILE); await ctx.addInitScript(NO_FIRST_RUN); const page = await ctx.newPage();
    await page.goto('/#/mais');
    for (const n of ['Município', 'Planejar', 'Field Shift', 'Sondas', 'Alertas', 'Propriedades e talhões', 'Minha área', 'Conta']) await expect(page.getByRole('link', { name: new RegExp(n) })).toBeVisible();
    await ctx.close();
  });

  test('D-12: título do documento e foco acompanham a tela', async ({ page }) => {
    await page.goto('/#/visao-geral');
    await page.locator('nav.rail a', { hasText: 'Planejar' }).click();
    await expect(page).toHaveTitle(/Planejar plantio/);
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  });

  test('D-15: Propriedades e Ajuda na navegação do desktop', async ({ page }) => {
    await page.goto('/#/visao-geral');
    await expect(page.locator('nav.rail').getByRole('link', { name: /Propriedades/ })).toBeVisible();
    await expect(page.locator('nav.rail').getByRole('link', { name: /Ajuda/ })).toBeVisible();
  });
});

test.describe('RT-19 acessibilidade', () => {
  for (const r of ['/explorar?pais=BR&uf=51&mun=5107925&semwebgl=1', '/visao-geral', '/planejar', '/conta']) {
    test(`sem violação séria do axe em ${r}`, async ({ page }) => {
      await page.goto('/#' + r);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await page.waitForTimeout(800);
      expect(await seriousViolations(page)).toEqual([]);
    });
  }
});

test.describe('RT-24 carregamento', () => {
  test('mapa e 3D não são baixados na Visão geral', async ({ page }) => {
    const urls: string[] = [];
    page.on('request', (r) => urls.push(r.url()));
    await page.goto('/#/visao-geral');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForTimeout(1500);
    expect(urls.some((u) => /maplibre-gl|ExplorerMap/.test(u))).toBe(false);
    expect(urls.some((u) => /Field3D|\/three\//.test(u))).toBe(false);
  });
});
