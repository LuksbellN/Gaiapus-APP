// Close review of the demonstration board: one image per crop row and per view (oblique, front, silhouette, detail).
// Usage (from apps/web): node scripts/shots-board-rows.mjs [outDir] [rows=soy,maize,...] [views=oblique,detail] [theme=light]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const base = process.env.GAIAPUS_WEB_URL ?? 'http://127.0.0.1:5178';
const [outArg, rowsArg, viewsArg, theme = 'light'] = process.argv.slice(2);
const out = path.resolve(process.cwd(), outArg ?? '../../Docs/visual-refresh/evidencias');
mkdirSync(out, { recursive: true });
const rows = (rowsArg ?? 'soy,maize,cover,bean,rice,wheat,coffee_arabica,coffee_conilon').split(',');
const views = (viewsArg ?? 'oblique,front,silhouette,detail').split(',');
const NAMES = { oblique: 'obliqua', front: 'frontal', silhouette: 'silhueta', detail: 'detalhe' };

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ locale: 'pt-BR', viewport: { width: 1760, height: 6400 } });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript((t) => { localStorage.setItem('gaiapus.tours', JSON.stringify({ v: 1, tours: {}, auto: { device: 'test' } })); localStorage.setItem('gaiapus.prefs', JSON.stringify({ v: 1, theme: t, locale: 'pt-BR', lastExplore: null })); }, theme);
await page.goto(base + '/#/design-preview');
await page.waitForSelector('[data-testid="crop-board"][data-mode="ready"]', { timeout: 60000 });
for (const view of views) {
  await page.locator(`input[name="board-view"][value="${view}"]`).check({ force: true });
  await page.waitForTimeout(1800);
  for (const row of rows) await page.getByTestId(`board-row-${row}`).screenshot({ path: path.join(out, `prancha-${row}-${NAMES[view]}${theme === 'dark' ? '-escuro' : ''}.jpg`), type: 'jpeg', quality: 84 });
  console.log(view, 'ok');
}
console.log('errors:', errors.slice(0, 3));
await browser.close();
