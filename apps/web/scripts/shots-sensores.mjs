// Evidence screenshots for Docs/sensores-talhoes (simulation hardware before/after and the "Minha área" screen).
// Usage (from apps/web, with a Vite dev server running):
//   node scripts/shots-sensores.mjs sim <suffix>     -> simulation profile, desktop + phone
//   node scripts/shots-sensores.mjs area             -> new screen, desktop + phone
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const base = process.env.GAIAPUS_WEB_URL ?? 'http://127.0.0.1:5176';
const out = path.resolve(process.cwd(), '../../Docs/sensores-talhoes/evidencias');
mkdirSync(out, { recursive: true });
const [what, suffix = 'depois'] = process.argv.slice(2);
const NO_FIRST_RUN = () => { if (!localStorage.getItem('gaiapus.tours')) localStorage.setItem('gaiapus.tours', JSON.stringify({ v: 1, tours: {}, auto: { device: 'test' } })); };
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 };

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function open(opts, url) {
  const ctx = await browser.newContext({ locale: 'pt-BR', ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(NO_FIRST_RUN);
  await page.goto(base + url);
  return { ctx, page, errors };
}

if (what === 'sim') {
  for (const [name, opts] of [['desktop', DESKTOP], ['celular', PHONE]]) {
    const { ctx, page, errors } = await open(opts, '/#/simulador?modo=historico&vista=perfil&dia=120');
    await page.waitForFunction(() => !!window.__gaiapusProfile, null, { timeout: 60000 });
    // The stake model reports when it is in the scene (after) — the provisional one has no such flag (before).
    await page.waitForFunction(() => window.__gaiapusStake === 'ready' || window.__gaiapusStake === 'failed', null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const stage = page.locator('.sim__stage').first();
    await stage.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, `simulacao-perfil-${name}-${suffix}.png`) });
    if (name === 'desktop') {
      // Close-up: dolly the camera in with the scene's own keyboard control, then crop the canvas.
      const canvas = page.locator('.sim__stage canvas').first();
      await canvas.focus();
      for (let i = 0; i < 6; i++) await page.keyboard.press('+');
      await page.waitForTimeout(800);
      await canvas.screenshot({ path: path.join(out, `simulacao-perfil-zoom-${suffix}.png`) });
    }
    const closeUp = page.getByTestId('stake-closeup');
    if (await closeUp.count()) {
      await page.reload(); await page.waitForFunction(() => window.__gaiapusStake === 'ready', null, { timeout: 30000 });
      await closeUp.click(); await page.waitForTimeout(1200);
      await page.locator('.sim__stage').first().screenshot({ path: path.join(out, 'simulacao-estaca-de-perto-' + name + '.png') });
    }
    console.log(name, 'stake flag:', await page.evaluate(() => window.__gaiapusStake ?? null), 'errors:', errors);
    await ctx.close();
  }
}
await browser.close();
