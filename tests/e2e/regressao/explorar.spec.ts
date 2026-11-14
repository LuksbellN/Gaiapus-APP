// RT-01 a RT-05: navegação geográfica, cobertura, mapa indisponível e busca.
import { test, expect, MOBILE } from '../helpers';

const crumb = (page) => page.locator('.crumbs [aria-current]');
const title = (page) => page.locator('.explore__panel h1');

test.describe('RT-01 navegação geográfica', () => {
  test('lista de países, país, estado e município pela URL e pelas listas, com voltar e avançar', async ({ page, errors }) => {
    await page.goto('/#/explorar?semwebgl=1');
    const countries = page.getByRole('list', { name: 'Países' }).getByRole('button');
    await expect(countries.first()).toContainText('Brasil');
    expect(await countries.count()).toBeGreaterThan(200);
    await page.locator('#filtro-pais').fill('argent');
    await page.getByRole('list', { name: 'Países' }).getByRole('button', { name: /Argentina/ }).click();
    await expect(page).toHaveURL(/pais=ARG/);
    await expect(title(page)).toHaveText('Argentina');
    await expect(page.getByTestId('country-detail')).not.toContainText(/\d/);
    await page.goBack();
    await expect(crumb(page)).toHaveText('Mundo');
    await page.goForward();
    await expect(crumb(page)).toHaveText('Argentina');
    await page.goto('/#/explorar?pais=BR&semwebgl=1');
    await page.getByRole('list', { name: 'Estados' }).getByRole('button', { name: /Mato Grosso\s+MT/ }).click();
    await expect(page).toHaveURL(/uf=51/);
    await page.locator('#filtro-mun').fill('sorriso');
    await page.getByRole('list', { name: 'Municípios' }).getByRole('button', { name: /Sorriso/ }).click();
    await expect(page.getByTestId('mun-detail')).toHaveAttribute('data-code', '5107925');
    expect(errors).toEqual([]);
  });

  test('links antigos continuam abrindo o mesmo lugar', async ({ page }) => {
    for (const [url, expected] of [['pais=BRA', 'Brasil'], ['pais=BR&uf=31', 'Minas Gerais'], ['mun=5107925', 'Sorriso'], ['pais=ARG', 'Argentina']] as const) {
      await page.goto(`/#/explorar?${url}&semwebgl=1`);
      await expect(title(page)).toHaveText(expected);
    }
    await page.goto('/#/explorar?pais=XYZ&semwebgl=1');
    await expect(page.getByText('País não encontrado.', { exact: true })).toBeVisible();
  });

  test('globo: clique em país seleciona sem redirecionar ao Brasil; câmera enquadra', async ({ page }) => {
    await page.goto('/#/explorar');
    await page.waitForFunction(() => (window as any).__gaiapusMap?.loaded(), null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    const pt = await page.evaluate(() => { const m = (window as any).__gaiapusMap; const q = m.project([-65, -36]); const r = m.getCanvas().getBoundingClientRect(); return { x: r.left + q.x, y: r.top + q.y }; });
    await page.mouse.click(pt.x, pt.y);
    await expect(page).toHaveURL(/pais=ARG/);
    await expect(title(page)).toHaveText('Argentina');
  });

  test('D-26: minha posição fora do Brasil seleciona o país', async ({ browser }) => {
    const ctx = await browser.newContext({ geolocation: { latitude: -34.6, longitude: -58.4 }, permissions: ['geolocation'], viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage();
    await page.goto('/#/explorar');
    await page.waitForFunction(() => (window as any).__gaiapusMap?.loaded(), null, { timeout: 30000 });
    await page.getByRole('button', { name: 'Usar minha localização' }).click();
    await expect(page).toHaveURL(/pais=ARG/, { timeout: 10000 });
    await expect(page.getByText(/Selecionamos o país da sua posição/)).toBeVisible();
    await ctx.close();
  });

  test('celular sem rolagem horizontal', async ({ browser }) => {
    const ctx = await browser.newContext(MOBILE); const page = await ctx.newPage();
    await page.goto('/#/explorar?pais=BR&uf=51&mun=5107925&semwebgl=1');
    await expect(page.getByTestId('mun-detail')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    await ctx.close();
  });
});

test.describe('RT-02 cobertura', () => {
  test('Sorriso tem produtos; Belo Horizonte é lugar sem análise, sem número inventado', async ({ page }) => {
    await page.goto('/#/explorar?pais=BR&uf=51&mun=5107925&semwebgl=1');
    await expect(page.getByTestId('mun-detail')).toContainText('Field Shift');
    await page.goto('/#/explorar?pais=BR&uf=31&mun=3106200&semwebgl=1');
    const d = page.getByTestId('mun-detail');
    await expect(d).toContainText('Sem análise');
    await expect(d.getByRole('link', { name: 'Cadastrar propriedade aqui' })).toBeVisible();
  });

  test('D-07: município do catálogo fora de MG/MT mostra geografia não carregada, não "não encontrado"', async ({ page }) => {
    await page.goto('/#/explorar?pais=BR&uf=52&mun=5218805&semwebgl=1');
    await expect(title(page)).toHaveText('Rio Verde');
    await expect(page.getByText('Município não encontrado')).toHaveCount(0);
  });

  test('D-09: "Regiões com dados" lista o catálogo da API, incluindo Rio Verde e Barreiras', async ({ page }) => {
    await page.goto('/#/explorar?semwebgl=1');
    await page.getByRole('button', { name: /Regiões com dados/ }).click();
    for (const n of ['Sorriso', 'Uberlândia', 'Rio Verde', 'Barreiras']) await expect(page.getByTestId('with-data')).toContainText(n);
  });
});

test.describe('RT-03 mapa indisponível', () => {
  test('sem WebGL: aviso e listas funcionando', async ({ page }) => {
    await page.goto('/#/explorar?semwebgl=1');
    await expect(page.getByText('Mapa indisponível neste aparelho.')).toBeVisible();
    await page.getByRole('button', { name: 'Sorriso, MT', exact: true }).click();
    await expect(page.getByTestId('mun-detail')).toHaveAttribute('data-code', '5107925');
  });

  test('mapa-base sem rede: aviso e limites do IBGE continuam', async ({ page }) => {
    await page.route('https://demotiles.maplibre.org/**', (r) => r.abort());
    await page.goto('/#/explorar?pais=BR');
    await expect(page.getByText(/Mapa-base sem conexão/)).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('list', { name: 'Estados' })).toBeVisible();
  });
});

test.describe('RT-04 busca com a API fora', () => {
  test('D-01: países, estados e municípios locais continuam encontráveis, com aviso da consulta remota', async ({ page }) => {
    await page.route('**/v1/geography**', (r) => r.abort());
    await page.goto('/#/explorar?semwebgl=1');
    await page.locator('#busca-local').fill('argentina');
    await expect(page.locator('#busca-lista')).toContainText('Argentina');
    await expect(page.getByTestId('search-results')).toContainText(/consulta de lugares publicados falhou/);
    await page.locator('#busca-local').fill('sorriso');
    await expect(page.locator('#busca-lista')).toContainText('Sorriso');
  });

  test('busca com teclado e voltar', async ({ page }) => {
    await page.goto('/#/explorar?semwebgl=1');
    await page.locator('#busca-local').fill('sorriso');
    await expect(page.locator('#busca-lista')).toContainText('Sorriso');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('mun-detail')).toHaveAttribute('data-code', '5107925');
  });
});

test.describe('RT-05 busca multilíngue', () => {
  test.fixme('D-11: Germany, Deutschland, Allemagne e Alemania encontram a Alemanha; "ver todos" quando passa de 12', async ({ page }) => {
    await page.goto('/#/explorar?semwebgl=1');
    for (const q of ['Germany', 'Deutschland', 'Allemagne', 'Alemania']) {
      await page.locator('#busca-local').fill(q);
      await expect(page.locator('#busca-lista [role=option]').first()).toContainText('Alemanha');
    }
    await page.locator('#busca-local').fill('são');
    await expect(page.getByRole('button', { name: /Ver todos os \d+ resultados/ })).toBeVisible();
  });
});
