// Evidence screenshots for Docs/visual-refresh (light theme "Campo claro / verde mineral" and crop scenes).
// Usage (from apps/web, with a Vite dev server running on GAIAPUS_WEB_URL):
//   node scripts/shots-visual-refresh.mjs screens <antes|depois>   -> main screens, light + dark, desktop + phone
//   node scripts/shots-visual-refresh.mjs pause   <antes|depois>   -> the Pause button while playing, both themes
//   node scripts/shots-visual-refresh.mjs crops   <antes|depois>   -> each crop of the rotation at each stage, field + detail
//   node scripts/shots-visual-refresh.mjs board                    -> demonstration board, desktop + phone
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const base = process.env.GAIAPUS_WEB_URL ?? 'http://127.0.0.1:5178';
const out = path.resolve(process.cwd(), '../../Docs/visual-refresh/evidencias');
mkdirSync(out, { recursive: true });
const [what, suffix = 'depois'] = process.argv.slice(2);
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 };
const SIZES = [['desktop', DESKTOP], ['celular', PHONE]];

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function open(opts, url, theme) {
  const ctx = await browser.newContext({ locale: 'pt-BR', ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript((t) => {
    if (!localStorage.getItem('gaiapus.tours')) localStorage.setItem('gaiapus.tours', JSON.stringify({ v: 1, tours: {}, auto: { device: 'test' } }));
    if (!localStorage.getItem('gaiapus.prefs')) localStorage.setItem('gaiapus.prefs', JSON.stringify({ v: 1, theme: t, locale: 'pt-BR', lastExplore: null }));
  }, theme);
  await page.goto(base + url);
  return { ctx, page, errors };
}
const fieldReady = (page) => page.waitForFunction(() => !!window.__gaiapusField, null, { timeout: 60000 });
const JPG = { type: 'jpeg', quality: 82 };
const shot = (page, name) => page.screenshot({ path: path.join(out, `${name}.jpg`), ...JPG });

if (what === 'screens') {
  const SCREENS = [
    ['explorar', '/#/explorar?pais=BR&uf=51&mun=5107925', async (p) => { await p.waitForFunction(() => !!window.__gaiapusMap && window.__gaiapusMap.loaded(), null, { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(3500); }],
    ['municipio', '/#/municipio?mun=5107925', async (p) => { await p.waitForTimeout(2500); }],
    ['simulador-talhao', '/#/simulador?modo=historico&dia=80', async (p) => { await fieldReady(p); await p.waitForTimeout(1500); }],
    ['simulador-perfil', '/#/simulador?modo=historico&vista=perfil&dia=80', async (p) => { await p.waitForFunction(() => !!window.__gaiapusProfile, null, { timeout: 60000 }); await p.waitForTimeout(2500); }],
    ['simulador-planejamento', '/#/simulador?modo=planejamento&local=BR:ibge:5107925&cultura=soy', async (p) => { await p.waitForTimeout(4000); }],
    ['field-shift', '/#/field-shift', async (p) => { await p.waitForTimeout(3000); }],
    ['minha-area', '/#/minha-area?demo=1', async (p) => { await p.waitForSelector('[data-testid="area-map"][data-ready="true"]', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(3000); }],
    ['visao-geral', '/#/visao-geral', async (p) => { await p.waitForTimeout(2500); }],
    ['design-preview', '/#/design-preview', async (p) => { await p.waitForTimeout(2500); }],
  ];
  for (const theme of ['light', 'dark']) for (const [size, opts] of SIZES) for (const [name, url, wait] of SCREENS) {
    if (theme === 'dark' && !['explorar', 'simulador-talhao', 'simulador-perfil', 'field-shift', 'minha-area', 'design-preview'].includes(name)) continue;
    const { ctx, page, errors } = await open(opts, url, theme);
    try { await wait(page); } catch (e) { errors.push(String(e)); }
    await shot(page, `${name}-${theme === 'light' ? 'claro' : 'escuro'}-${size}-${suffix}`);
    console.log(name, theme, size, errors.length ? errors.slice(0, 3) : 'ok');
    await ctx.close();
  }
}

if (what === 'pause') {
  for (const theme of ['light', 'dark']) {
    const { ctx, page, errors } = await open(DESKTOP, '/#/simulador?modo=historico&dia=20', theme);
    await fieldReady(page); await page.waitForTimeout(800);
    const play = page.locator('.transport .btn--primary');
    await play.click(); await page.waitForTimeout(400);
    const colours = await play.evaluate((el) => { const s = getComputedStyle(el); return { pressed: el.getAttribute('aria-pressed'), color: s.color, background: s.backgroundColor, text: el.textContent }; });
    await page.locator('.sim__timeline').screenshot({ path: path.join(out, `pausar-${theme === 'light' ? 'claro' : 'escuro'}-${suffix}.jpg`), ...JPG });
    await play.screenshot({ path: path.join(out, `pausar-botao-${theme === 'light' ? 'claro' : 'escuro'}-${suffix}.jpg`), ...JPG });
    console.log('pause', theme, JSON.stringify(colours), errors.slice(0, 2));
    await ctx.close();
  }
}

if (what === 'crops') {
  // Day numbers (1-based) of the 2020/2021 agricultural year in the published Sorriso series: one per phase run.
  const DAYS = [
    ['soja-estabelecimento', 'historico', 10], ['soja-vegetativo', 'historico', 40], ['soja-reprodutivo-inicio', 'historico', 56], ['soja-reprodutivo-fim', 'historico', 90], ['soja-maturacao', 'historico', 110],
    ['milho-estabelecimento', 'historico', 128], ['milho-vegetativo', 'historico', 165], ['milho-reprodutivo-inicio', 'historico', 182], ['milho-reprodutivo-fim', 'historico', 210], ['milho-maturacao', 'historico', 230],
    ['solo-exposto', 'historico', 300],
    ['milho-braquiaria-vegetativo', 'cenario', 165], ['milho-braquiaria-reprodutivo', 'cenario', 205], ['milho-braquiaria-maturacao', 'cenario', 230], ['braquiaria-cobertura', 'cenario', 290],
  ];
  const only = process.argv[4];
  for (const [size, opts] of SIZES) for (const [name, modo, dia] of DAYS) {
    if (size === 'celular' && !['soja-reprodutivo-fim', 'milho-reprodutivo-fim', 'braquiaria-cobertura'].includes(name)) continue;
    if (only && !name.includes(only)) continue;
    const { ctx, page, errors } = await open(opts, `/#/simulador?modo=${modo}&dia=${dia}`, 'light');
    try { await fieldReady(page); await page.waitForTimeout(1200); } catch (e) { errors.push(String(e)); }
    const stage = page.locator('.sim__stage').first();
    await stage.screenshot({ path: path.join(out, `cultivo-${name}-talhao-${size}-${suffix}.jpg`), ...JPG });
    const detail = page.getByTestId('field-detail');
    if (await detail.count()) { await detail.click(); await page.waitForTimeout(900); await stage.screenshot({ path: path.join(out, `cultivo-${name}-detalhe-${size}-${suffix}.jpg`), ...JPG }); }
    console.log(name, size, errors.length ? errors.slice(0, 3) : 'ok');
    await ctx.close();
  }
}

if (what === 'board') {
  for (const theme of ['light', 'dark']) for (const [size, opts] of SIZES) {
    const { ctx, page, errors } = await open(opts, '/#/design-preview', theme);
    await page.waitForTimeout(1500);
    await page.waitForFunction(() => window.__gaiapusBoard === 'ready' || window.__gaiapusBoard === 'failed', null, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(out, `prancha-${theme === 'light' ? 'claro' : 'escuro'}-${size}.jpg`), fullPage: true, ...JPG });
    console.log('board', theme, size, await page.evaluate(() => window.__gaiapusBoard ?? null), errors.slice(0, 3));
    await ctx.close();
  }
}
await browser.close();
