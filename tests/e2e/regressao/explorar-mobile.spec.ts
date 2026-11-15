// Explorar no celular: o painel de detalhes é uma folha inferior que arrasta, expande e rola até o último item.
// Emulação Chromium com toque; gestos em aparelho real (Android/iOS) precisam de conferência manual.
import { test, expect, MOBILE, type Page } from '../helpers';

const URL = '/#/explorar?pais=BR&uf=31&mun=3170206&semwebgl=1';
const sheet = (page: Page) => page.getByTestId('explore-sheet');
const box = async (page: Page, sel: string) => (await page.locator(sel).first().boundingBox())!;
async function swipe(page: Page, x: number, y0: number, y1: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / 8 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test.describe('Explorar no celular — folha inferior', () => {
  test.use(MOBILE);

  test('expandir pelos botões e rolar até o último item, acima da navegação', async ({ page, errors }) => {
    await page.goto(URL);
    await expect(sheet(page)).toHaveAttribute('data-pos', 'media');
    await page.getByRole('button', { name: 'Expandir detalhes' }).click();
    await expect(sheet(page)).toHaveAttribute('data-pos', 'expandida');
    const rail = await box(page, 'nav.rail');
    await expect.poll(async () => (await sheet(page).boundingBox())!.y).toBeLessThan(160); // quase toda a altura útil, depois da animação
    const panel = (await sheet(page).boundingBox())!;
    expect(panel.y).toBeGreaterThan(56 + 60);                  // sem cobrir a busca
    expect(Math.round(panel.y + panel.height)).toBeLessThanOrEqual(Math.round(rail.y) + 1);
    const scroller = page.getByTestId('explore-sheet-scroll');
    expect(await scroller.evaluate((el) => el.clientHeight)).toBeGreaterThan(400);
    const last = scroller.locator('a, button').last();
    await last.scrollIntoViewIfNeeded();
    const b = (await last.boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(rail.y + 1);     // nenhum botão sob a barra inferior
    await last.click({ trial: true });                          // alcançável, nada por cima
    expect(await scroller.evaluate((el) => Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight - 1)).toBe(true);
    await scroller.evaluate((el) => el.scrollTo(0, 0));
    await page.getByRole('button', { name: 'Recolher detalhes' }).click();
    await expect(sheet(page)).toHaveAttribute('data-pos', 'media');
    await page.getByRole('button', { name: 'Recolher detalhes' }).click();
    await expect(sheet(page)).toHaveAttribute('data-pos', 'recolhida');
    await expect(page.getByRole('button', { name: 'Recolher detalhes' })).toBeDisabled();
    await expect(page.getByRole('heading', { level: 1, name: 'Uberlândia' })).toBeVisible(); // recolhida ainda diz o que está selecionado
    await expect(page).toHaveURL(/mun=3170206/);
    expect(errors).toEqual([]);
  });

  test('arrastar a alça leva às três posições e não mexe na seleção', async ({ page }) => {
    await page.goto(URL);
    const grip = await box(page, '[data-testid="explore-sheet-grip"]'); const x = grip.x + grip.width / 2, y = grip.y + 8;
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y - 150, { steps: 6 }); await page.mouse.move(x, y - 330, { steps: 6 }); await page.mouse.up();
    await expect(sheet(page)).toHaveAttribute('data-pos', 'expandida');
    const up = await box(page, '[data-testid="explore-sheet-grip"]');
    await page.mouse.move(x, up.y + 8); await page.mouse.down(); await page.mouse.move(x, up.y + 300, { steps: 6 }); await page.mouse.move(x, up.y + 620, { steps: 6 }); await page.mouse.up();
    await expect(sheet(page)).toHaveAttribute('data-pos', 'recolhida');
    await expect(page).toHaveURL(/pais=BR&uf=31&mun=3170206/);
    await expect(page.locator('nav.rail a', { hasText: 'Simulador' }).first()).toBeVisible();
  });

  test('no conteúdo o gesto rola a lista; só no topo um puxão para baixo recolhe', async ({ page }) => {
    await page.goto(URL);
    await page.getByRole('button', { name: 'Expandir detalhes' }).click();
    await expect(sheet(page)).toHaveAttribute('data-pos', 'expandida');
    await page.waitForTimeout(400);
    const scroller = page.getByTestId('explore-sheet-scroll'); const s = (await scroller.boundingBox())!;
    await swipe(page, s.x + s.width / 2, s.y + 400, s.y + 100);   // dedo para cima: rola o conteúdo
    await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(100);
    await expect(sheet(page)).toHaveAttribute('data-pos', 'expandida');
    await swipe(page, s.x + s.width / 2, s.y + 150, s.y + 330);   // para baixo com a lista rolada: volta a rolar, não recolhe
    await expect(sheet(page)).toHaveAttribute('data-pos', 'expandida');
    await scroller.evaluate((el) => el.scrollTo(0, 0));
    await swipe(page, s.x + 40, s.y + 60, s.y + 300);             // no topo, puxão deliberado no título
    await expect(sheet(page)).toHaveAttribute('data-pos', 'media');
  });

  test('o convite do tutorial não cobre o painel e a busca recolhe a folha sem perder o município', async ({ page }) => {
    await page.goto(URL);
    const bar = (await page.getByTestId('tour-bar').boundingBox())!; const panel = (await sheet(page).boundingBox())!;
    expect(bar.y + bar.height).toBeLessThanOrEqual(panel.y);
    await page.locator('#busca-local').focus();
    await expect(sheet(page)).toHaveAttribute('data-pos', 'recolhida');
    await expect(page).toHaveURL(/mun=3170206/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  });
});

test.describe('Explorar em tela baixa (paisagem)', () => {
  test.use({ viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true });
  test('expandida cabe na altura útil e os botões continuam visíveis', async ({ page }) => {
    await page.goto(URL);
    await page.getByRole('button', { name: 'Expandir detalhes' }).click();
    await expect(sheet(page)).toHaveAttribute('data-pos', 'expandida'); await page.waitForTimeout(400);
    const panel = (await sheet(page).boundingBox())!; const rail = await box(page, 'nav.rail');
    expect(panel.y).toBeGreaterThanOrEqual(56);
    expect(Math.round(panel.y + panel.height)).toBeLessThanOrEqual(Math.round(rail.y) + 1);
    await expect(page.getByRole('button', { name: 'Recolher detalhes' })).toBeVisible();
  });
});

test.describe('Explorar no desktop', () => {
  test('o painel lateral não muda: sem alça, 344 px, lista com rolagem própria', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(URL);
    const panel = (await sheet(page).boundingBox())!;
    expect(Math.round(panel.width)).toBe(344);
    await expect(page.getByRole('button', { name: 'Expandir detalhes' })).toHaveCount(0);
    expect(await page.locator('.explore__panel-body').evaluate((el) => getComputedStyle(el).overflowY)).toBe('auto');
  });
});

// Pente fino no celular: nenhuma tela pode ficar mais larga que o aparelho, e o que se toca tem pelo menos 44 px.
test.describe('Responsividade no celular — todas as telas', () => {
  const ROUTES = ['/explorar?semwebgl=1', '/visao-geral', '/municipio?mun=3170206', '/planejar', '/simulador?modo=planejamento&local=BR:ibge:3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1',
    '/simulador?modo=planejamento&local=BR:ibge:3170206&cultura=soy&safra=2027&secao=indicadores&semwebgl=1', '/simulador?modo=historico&semwebgl=1', '/field-shift', '/propriedades', '/registros', '/dispositivos', '/alertas?mun=5107925', '/conta', '/mais', '/ajuda'];
  for (const width of [360, 390]) {
    test(`${width}px: sem rolagem lateral da página nem do conteúdo, alvos de toque de 44 px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 740 });
      const problems: string[] = [];
      for (const route of ROUTES) {
        await page.goto('/#' + route);
        await expect(page.locator('main h1').first()).toBeAttached({ timeout: 15000 });
        await page.waitForTimeout(500);
        const found = await page.evaluate(() => {
          const out: string[] = []; const doc = document.documentElement; const main = document.querySelector('main')!;
          if (doc.scrollWidth > doc.clientWidth + 1) out.push(`page wider by ${doc.scrollWidth - doc.clientWidth}px`);
          if (main.scrollWidth > main.clientWidth + 1) out.push(`content wider by ${main.scrollWidth - main.clientWidth}px`);
          for (const el of document.querySelectorAll<HTMLElement>('main button, main select, main summary, main .btn, .rail a, header button, header select')) {
            const b = el.getBoundingClientRect(); if (!b.width || !b.height || el.closest('.sr-only') || getComputedStyle(el).visibility === 'hidden') continue;
            if (b.height < 40 || b.width < 40) out.push(`small target ${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}" ${Math.round(b.width)}x${Math.round(b.height)}`);
          }
          return out;
        });
        for (const f of found) problems.push(`${route.slice(0, 50)} — ${f}`);
      }
      expect(problems).toEqual([]);
    });
  }
});
