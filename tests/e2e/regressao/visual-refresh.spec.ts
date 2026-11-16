// Visual refresh (light theme "Campo claro / verde mineral" and organ-level crop scenes): regressions measured in
// the real page — computed colours of real states, the pose the scene actually drew, the theme the map actually has.
import { test, expect, type Page } from '../helpers';

type Theme = 'light' | 'dark';
const withTheme = (page: Page, theme: Theme) => page.addInitScript((t) => { if (!localStorage.getItem('gaiapus.prefs')) localStorage.setItem('gaiapus.prefs', JSON.stringify({ v: 1, theme: t, locale: 'pt-BR', lastExplore: null })); }, theme);
const rgb = (css: string) => (css.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
const lum = (c: number[]) => { const [r, g, b] = c.map((v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a: string, b: string) => { const la = lum(rgb(a)), lb = lum(rgb(b)); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
const field = (page: Page) => page.getByTestId('field3d');
const fieldReady = (page: Page) => page.waitForFunction(() => !!(window as unknown as { __gaiapusField?: unknown }).__gaiapusField, null, { timeout: 60000 });
const pixels = (page: Page) => page.locator('.sim__stage canvas').evaluate((c) => (c as HTMLCanvasElement).toDataURL().length);

test.describe('Renovação visual · tema', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`"Pausar" continua legível enquanto reproduz (${theme})`, async ({ page }) => {
      await withTheme(page, theme);
      await page.goto('/#/simulador?modo=historico&dia=20&semwebgl=1');
      const play = page.locator('.transport .btn--primary');
      const normal = await play.evaluate((el) => { const s = getComputedStyle(el); return { fg: s.color, bg: s.backgroundColor }; });
      expect(contrast(normal.fg, normal.bg)).toBeGreaterThanOrEqual(4.5);
      await play.click();
      await expect(play).toHaveAttribute('aria-pressed', 'true');
      await expect(play).toContainText('Pausar');
      await page.mouse.move(5, 5); // not hovering: this is the resting pressed state
      const pressed = await play.evaluate((el) => { const s = getComputedStyle(el); return { fg: s.color, bg: s.backgroundColor }; });
      // A solid fill (no alpha) and at least 4.5:1 — it used to be the label colour over a 10 % tint (1.16:1 / 1.36:1).
      expect(pressed.bg).toMatch(/^rgb\(/);
      expect(contrast(pressed.fg, pressed.bg)).toBeGreaterThanOrEqual(4.5);
      await play.click();
    });
  }

  test('o tema fica gravado e a cor do navegador acompanha', async ({ page }) => {
    await page.goto('/#/visao-geral');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Mudar para tema claro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('meta[name=theme-color]')).toHaveAttribute('content', '#F2F6F3');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(242, 246, 243)');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('meta[name=theme-color]')).toHaveAttribute('content', '#F2F6F3');
  });

  test('trocar o tema não reinicia dia, vista, cenário nem a cena; a cena e a legenda mudam de cor', async ({ page, errors }) => {
    await page.goto('/#/simulador?modo=cenario&ab=1&dia=170');
    await fieldReady(page);
    const canvas = page.locator('.sim__stage canvas');
    await canvas.evaluate((c) => { (c as unknown as { __same: boolean }).__same = true; });
    const before = { pose: await field(page).getAttribute('data-pose'), sky: await page.locator('.sim__stage').evaluate((el) => getComputedStyle(el).backgroundImage), date: await page.locator('.sim__results h2').first().textContent() };
    await page.getByRole('button', { name: 'Mudar para tema claro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page).toHaveURL(/modo=cenario/); await expect(page).toHaveURL(/ab=1/); await expect(page).toHaveURL(/dia=170/);
    expect(await canvas.evaluate((c) => (c as unknown as { __same?: boolean }).__same)).toBe(true); // same canvas: the renderer was not rebuilt
    expect(await field(page).getAttribute('data-pose')).toBe(before.pose);
    expect(await page.locator('.sim__results h2').first().textContent()).toBe(before.date);
    expect(await page.locator('.sim__stage').evaluate((el) => getComputedStyle(el).backgroundImage)).not.toBe(before.sky);
    const caption = await page.getByTestId('sim-caption').evaluate((el) => { const s = getComputedStyle(el); return { fg: s.color, bg: s.backgroundColor }; });
    expect(caption.bg).toMatch(/^rgb\(/); expect(contrast(caption.fg, caption.bg)).toBeGreaterThanOrEqual(4.5);
    expect(errors).toEqual([]);
  });

  test('o mapa troca de paleta no lugar: mesma instância, mesma câmera, mesma seleção', async ({ page }) => {
    await page.goto('/#/explorar?pais=BR&uf=51');
    await page.waitForFunction(() => { const m = (window as unknown as { __gaiapusMap?: { loaded: () => boolean; getLayer: (id: string) => unknown } }).__gaiapusMap; return !!m && m.loaded() && !!m.getLayer('states-fill'); }, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    const read = () => page.evaluate(() => { const m = (window as unknown as { __gaiapusMap: { getPaintProperty: (l: string, p: string) => unknown; getZoom: () => number; getCenter: () => { lng: number; lat: number }; getFilter: (l: string) => unknown; __mark?: number } }).__gaiapusMap; m.__mark ??= 1; return { ocean: m.getPaintProperty('bg', 'background-color'), label: m.getPaintProperty('state-labels', 'text-color'), zoom: m.getZoom(), center: m.getCenter(), filter: JSON.stringify(m.getFilter('states-selected')), mark: m.__mark }; });
    const dark = await read();
    expect(String(dark.ocean).toUpperCase()).toBe('#0A1A21');
    await page.getByRole('button', { name: 'Mudar para tema claro' }).click();
    await expect(page.locator('.explore__map')).toHaveAttribute('data-map-theme', 'light');
    const light = await read();
    expect(String(light.ocean).toUpperCase()).toBe('#DCEBF0'); expect(String(light.label).toUpperCase()).toBe('#163C2D');
    expect(light.mark).toBe(1); expect(light.zoom).toBeCloseTo(dark.zoom, 5); expect(light.center.lng).toBeCloseTo(dark.center.lng, 5); expect(light.filter).toBe(dark.filter);
    // The legend is drawn from the same palette object as the layers.
    await page.getByRole('button', { name: /Camadas|Legenda/ }).first().click().catch(() => {});
    const swatch = page.locator('.explore__legend--key .swatch').nth(1);
    if (await swatch.count()) expect(await swatch.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(183, 214, 226)');
  });

  test('o canvas operável mostra o foco com anel de duas cores e responde ao teclado', async ({ page }) => {
    await withTheme(page, 'light');
    await page.goto('/#/simulador?modo=historico&dia=80');
    await fieldReady(page);
    await page.getByTestId('field-detail').focus();
    await page.keyboard.press('Shift+Tab');
    const ring = await page.evaluate(() => {
      const c = document.activeElement as HTMLElement; const stage = c.closest('.sim__stage') as HTMLElement; const s = getComputedStyle(c), a = getComputedStyle(stage, '::after');
      return { tag: c.tagName, visible: c.matches(':focus-visible'), outline: s.outlineStyle, width: parseFloat(s.outlineWidth), color: s.outlineColor, halo: a.borderTopColor, content: a.content };
    });
    expect(ring.tag).toBe('CANVAS'); expect(ring.visible).toBe(true); expect(ring.outline).toBe('solid'); expect(ring.width).toBeGreaterThanOrEqual(2);
    expect(ring.content).not.toBe('none'); expect(contrast(ring.color, ring.halo)).toBeGreaterThanOrEqual(3);
    const a = await pixels(page);
    await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('+');
    await page.waitForTimeout(400);
    expect(await pixels(page)).not.toBe(a);
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('CANVAS');
  });

  test('gráfico: chuva opaca e halo sob as séries e o cursor', async ({ page }) => {
    await page.goto('/#/simulador?modo=historico&ab=1&dia=80&semwebgl=1');
    const svg = page.locator('.sim__timeline .timeline svg');
    await expect(svg.locator('[data-chart-halo] path')).toHaveCount(2);
    await expect(svg.locator('[data-chart-cursor] line')).toHaveCount(2);
    expect(await svg.locator('rect[opacity]').count()).toBe(0);
    const halo = await svg.locator('[data-chart-halo]').evaluate((el) => getComputedStyle(el).stroke);
    const rain = await svg.locator('rect[fill="var(--water)"]').first().evaluate((el) => getComputedStyle(el).fill);
    expect(contrast(halo, rain)).toBeGreaterThanOrEqual(3);
  });
});

test.describe('Renovação visual · cultivos', () => {
  test('previsão de seis dias na mesma fase não percorre a fase: a pose fica fixa e a legenda diz', async ({ page }) => {
    await page.goto('/#/simulador?modo=previsao');
    await fieldReady(page);
    const first = await field(page).getAttribute('data-pose');
    expect(first).toMatch(/^soy:/);
    await expect(field(page)).toHaveAttribute('data-representative', 'true');
    await expect(page.getByTestId('sim-caption')).toContainText('pose fixa');
    const days = Number((await page.locator('.sim__results .meta').first().textContent())?.match(/de (\d+)/)?.[1] ?? 0);
    expect(days).toBeGreaterThan(2);
    const phase = await page.locator('.sim__overlay .pill').last().textContent();
    const forward = page.getByRole('button', { name: 'Avançar 1 dia' });
    for (let i = 1; i < days; i++) { await forward.click(); if ((await page.locator('.sim__overlay .pill').last().textContent()) === phase) expect(await field(page).getAttribute('data-pose')).toBe(first); }
  });

  test('histórico: a planta muda com o dia real da fase e voltar no tempo devolve a mesma pose', async ({ page }) => {
    await page.goto('/#/simulador?modo=historico&dia=20');
    await fieldReady(page);
    await expect(field(page)).toHaveAttribute('data-representative', 'false');
    const day20 = await field(page).getAttribute('data-pose');
    const forward = page.getByRole('button', { name: 'Avançar 1 dia' }), back = page.getByRole('button', { name: 'Voltar 1 dia' });
    for (let i = 0; i < 12; i++) await forward.click();
    const day32 = await field(page).getAttribute('data-pose');
    expect(day32).not.toBe(day20); expect(day32).toMatch(/^soy:vegetative:/);
    for (let i = 0; i < 12; i++) await back.click();
    expect(await field(page).getAttribute('data-pose')).toBe(day20);
  });

  test('a cena distingue soja, milho, consórcio, cobertura viva e solo exposto', async ({ page }) => {
    const at = async (url: string) => { await page.goto(url); await page.reload(); await fieldReady(page); await expect(field(page)).toBeVisible(); return { crop: await field(page).getAttribute('data-crop'), cover: await field(page).getAttribute('data-cover') }; };
    expect(await at('/#/simulador?modo=historico&dia=80')).toEqual({ crop: 'soy', cover: '' });
    expect(await at('/#/simulador?modo=historico&dia=200')).toEqual({ crop: 'maize', cover: '' });
    expect(await at('/#/simulador?modo=cenario&dia=200')).toEqual({ crop: 'maize', cover: 'understory' });
    expect(await at('/#/simulador?modo=cenario&dia=290')).toEqual({ crop: '', cover: 'living' });
    expect(await at('/#/simulador?modo=historico&dia=300')).toEqual({ crop: '', cover: '' });
  });

  test('sem WebGL a vista 2D desenha a mesma cultura e a mesma pose, e a legenda fica em placa legível', async ({ page }) => {
    await page.goto('/#/simulador?modo=historico&dia=200');
    await fieldReady(page);
    const pose3d = await field(page).getAttribute('data-pose');
    await page.goto('/#/simulador?modo=historico&dia=200&semwebgl=1'); await page.reload(); // a hash-only change keeps the page: reload to start without WebGL
    const flat = page.getByTestId('field2d');
    await expect(flat).toBeVisible();
    await expect(flat).toHaveAttribute('data-crop', 'maize');
    expect(await flat.getAttribute('data-pose')).toBe(pose3d);
    expect(await flat.locator('text').count()).toBe(0); // no text on the soil
    await expect(page.getByTestId('sim-caption')).toContainText('Vista 2D');
    await page.goto('/#/simulador?modo=historico&dia=80&semwebgl=1'); await page.reload();
    await expect(page.getByTestId('field2d')).toHaveAttribute('data-crop', 'soy');
  });

  test('a vista de perto existe, muda o enquadramento e não muda os dados', async ({ page, errors }) => {
    await page.goto('/#/simulador?modo=historico&dia=90');
    await fieldReady(page);
    await page.waitForTimeout(600);
    const wide = await pixels(page); const pose = await field(page).getAttribute('data-pose');
    const button = page.getByTestId('field-detail');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(600);
    expect(await pixels(page)).not.toBe(wide);
    expect(await field(page).getAttribute('data-pose')).toBe(pose);
    await expect(page).toHaveURL(/dia=90/);
    expect(errors).toEqual([]);
  });

  test('culturas sem série continuam indisponíveis, mesmo com modelo na prancha', async ({ page }) => {
    for (const crop of ['wheat', 'rice', 'bean1', 'coffee_arabica']) {
      await page.goto(`/#/simulador?modo=historico&cultura=${crop}`);
      await expect(page.getByTestId('sim-unavailable')).toHaveAttribute('data-crop', crop);
      await expect(page.locator('.sim__stage canvas')).toHaveCount(0);
    }
    await page.goto('/#/simulador?modo=historico&semwebgl=1');
    await expect(page.locator('select[name=cultura]')).toBeVisible();
    const options = await page.locator('select[name=cultura] option').allTextContents();
    expect(options).toHaveLength(9); // the nine plantable entries of the catalogue, nothing added
  });

  test('prancha demonstrativa: rotulada como demonstração, todos os arquétipos, estados medidos nos dois temas', async ({ page, errors }) => {
    await page.goto('/#/design-preview');
    const board = page.getByTestId('crop-board');
    await expect(board).toHaveAttribute('data-mode', 'ready', { timeout: 60000 });
    await expect(board).toContainText('Demonstração de formas, não de dados');
    for (const row of ['soy', 'maize', 'cover']) await expect(page.getByTestId(`board-row-${row}`)).toHaveAttribute('data-integrated', 'true');
    for (const row of ['bean', 'rice', 'wheat', 'coffee_arabica', 'coffee_conilon']) { await expect(page.getByTestId(`board-row-${row}`)).toHaveAttribute('data-integrated', 'false'); await expect(page.getByTestId(`board-row-${row}`)).toContainText('sem série diária'); }
    await expect(board.locator('.crop-card')).toHaveCount(47);
    // A painted card is not blank.
    expect(await page.getByTestId('board-card-maize-reproductiveLate').locator('canvas').evaluate((c) => { const x = (c as HTMLCanvasElement).getContext('2d')!; const d = x.getImageData(0, 0, (c as HTMLCanvasElement).width, (c as HTMLCanvasElement).height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; })).toBeGreaterThan(500);
    for (const theme of ['light', 'dark']) {
      const sample = page.getByTestId(`theme-sample-${theme}`);
      for (const pair of ['textSurface', 'primary', 'primaryPressed', 'selected']) expect(Number(await sample.locator(`tr[data-pair=${pair}]`).getAttribute('data-ratio'))).toBeGreaterThanOrEqual(4.5);
      const pressed = await page.getByTestId(`pressed-${theme}`).evaluate((el) => { const s = getComputedStyle(el); return { fg: s.color, bg: s.backgroundColor }; });
      expect(contrast(pressed.fg, pressed.bg)).toBeGreaterThanOrEqual(4.5);
    }
    await page.locator('input[name="board-view"][value="silhouette"]').check({ force: true });
    await expect(board).toHaveAttribute('data-mode', 'ready');
    expect(errors).toEqual([]);
  });

  test('prancha sem WebGL: os mesmos arquétipos em 2D', async ({ page }) => {
    await page.goto('/#/design-preview?semwebgl=1');
    const board = page.getByTestId('crop-board');
    await expect(board).toHaveAttribute('data-mode', 'flat');
    await expect(board.locator('.crop-card svg')).toHaveCount(47);
    await expect(board).toContainText('vista lateral em 2D');
  });
});
