// Frame-time and scene-cost measurement of the illustrative field (Docs/visual-refresh).
// Usage (from apps/web, with a Vite dev server or preview running on GAIAPUS_WEB_URL):
//   node scripts/perf-field.mjs [gpu|swiftshader] [label]
// "gpu" opens a headed Chrome with the machine's GPU; "swiftshader" is the software renderer used by the e2e suite.
// Numbers are from one machine and one run: they compare before/after on the same hardware, nothing more.
import { chromium } from '@playwright/test';

const base = process.env.GAIAPUS_WEB_URL ?? 'http://127.0.0.1:5178';
const [renderer = 'gpu', label = 'run'] = process.argv.slice(2);
const args = renderer === 'gpu' ? ['--ignore-gpu-blocklist', '--enable-gpu', '--disable-frame-rate-limit', '--disable-gpu-vsync'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const browser = await chromium.launch({ channel: 'chrome', headless: renderer !== 'gpu', args });

const CASES = [
  ['soy reproductive (field)', '/#/simulador?modo=historico&dia=80', false],
  ['maize reproductive (field)', '/#/simulador?modo=historico&dia=205', false],
  ['maize + brachiaria (field)', '/#/simulador?modo=cenario&dia=205', false],
  ['soy reproductive (detail)', '/#/simulador?modo=historico&dia=80', true],
  ['maize + brachiaria (detail)', '/#/simulador?modo=cenario&dia=205', true],
];
const SIZES = [['desktop 1440x900', { viewport: { width: 1440, height: 900 } }], ['phone 390x844 dpr2', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }]];

const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const out = [];
for (const [sizeName, opts] of SIZES) for (const [name, url, detail] of CASES) {
  const ctx = await browser.newContext({ locale: 'pt-BR', ...opts });
  const page = await ctx.newPage();
  await page.addInitScript(() => { localStorage.setItem('gaiapus.tours', JSON.stringify({ v: 1, tours: {}, auto: { device: 'test' } })); localStorage.setItem('gaiapus.prefs', JSON.stringify({ v: 1, theme: 'light', locale: 'pt-BR', lastExplore: null })); });
  await page.goto(base + url);
  await page.waitForFunction(() => !!window.__gaiapusField, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  if (detail) { const b = page.getByTestId('field-detail'); if (await b.count()) { await b.click(); await page.waitForTimeout(900); } else { await ctx.close(); continue; } }
  const canvas = page.locator('.sim__stage canvas').first();
  await canvas.focus();
  // Orbit: one keyboard step per animation frame forces one render per frame (frameloop is on demand).
  const orbit = await page.evaluate(async () => {
    const gl = window.__gaiapusField; const el = gl.domElement; const dts = []; const renders = [];
    const original = gl.render.bind(gl); let cost = 0;
    gl.render = (...a) => { const t0 = performance.now(); original(...a); gl.getContext().finish(); cost += performance.now() - t0; };
    await new Promise((r) => requestAnimationFrame(r));
    let last = performance.now();
    for (let i = 0; i < 150; i++) {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: i % 40 < 20 ? 'ArrowLeft' : 'ArrowRight', bubbles: true }));
      cost = 0;
      await new Promise((r) => requestAnimationFrame(r));
      const now = performance.now(); dts.push(now - last); last = now; renders.push(cost);
    }
    gl.render = original;
    return { dts: dts.slice(10), renders: renders.slice(10), info: { triangles: gl.info.render.triangles, calls: gl.info.render.calls, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures }, gpu: (() => { const c = gl.getContext(); const e = c.getExtension('WEBGL_debug_renderer_info'); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; })(), dpr: gl.getPixelRatio() };
  });
  // Day steps: cost of moving the cursor one day (page update + new plant pose), first forward (poses built for the
  // first time), then back over the same days (poses reused from the cache).
  const steps = await page.evaluate(async () => {
    const find = (label) => [...document.querySelectorAll('.transport button')].find((b) => b.getAttribute('aria-label') === label);
    const raf = () => new Promise((r) => requestAnimationFrame(r)); const run = async (button) => { const out = []; for (let i = 0; i < 40; i++) { const t0 = performance.now(); button.click(); await raf(); await raf(); out.push(performance.now() - t0); } return out; };
    const forward = await run(find('Avançar 1 dia')); const back = await run(find('Voltar 1 dia')); return { forward, back };
  });
  // Playback: press play and time the frames while the cursor advances.
  await page.locator('.transport .btn--primary').click();
  const play = await page.evaluate(async () => { const dts = []; let last = performance.now(); for (let i = 0; i < 120; i++) { await new Promise((r) => requestAnimationFrame(r)); const now = performance.now(); dts.push(now - last); last = now; } return dts.slice(10); });
  const row = { case: name, size: sizeName, gpu: orbit.gpu, dpr: orbit.dpr, triangles: orbit.info.triangles, drawCalls: orbit.info.calls, geometries: orbit.info.geometries,
    renderMs_p50: +pct(orbit.renders, 0.5).toFixed(2), renderMs_p95: +pct(orbit.renders, 0.95).toFixed(2), orbitFrame_p50: +pct(orbit.dts, 0.5).toFixed(2), orbitFrame_p95: +pct(orbit.dts, 0.95).toFixed(2), stepNew_p50: +pct(steps.forward, 0.5).toFixed(1), stepNew_p95: +pct(steps.forward, 0.95).toFixed(1), stepCached_p50: +pct(steps.back, 0.5).toFixed(1), stepCached_p95: +pct(steps.back, 0.95).toFixed(1), playFrame_p50: +pct(play, 0.5).toFixed(2), playFrame_p95: +pct(play, 0.95).toFixed(2) };
  out.push(row); console.log(JSON.stringify(row));
  await ctx.close();
}
await browser.close();
console.log(`# ${label} · ${renderer} · ${new Date().toISOString()}`);
console.table(out.map(({ gpu, ...r }) => r));
