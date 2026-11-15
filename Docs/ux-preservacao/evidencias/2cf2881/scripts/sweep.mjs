// Read-only audit sweep of the active Gaiapus-APP frontend. Fresh browser contexts only; no user profile is touched.
import { chromium } from '../../../../../apps/web/node_modules/@playwright/test/index.mjs';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.GAIAPUS_WEB_URL ?? 'http://127.0.0.1:5173';
// Output always goes to this evidence folder (no path taken from the command line).
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
fs.mkdirSync(path.join(OUT, 'capturas'), { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

const ROUTES = [
  ['explorar-mundo', '/#/explorar', 4500], ['explorar-brasil', '/#/explorar?pais=BR', 3500], ['explorar-mt', '/#/explorar?pais=BR&uf=51', 3500],
  ['explorar-sorriso', '/#/explorar?pais=BR&uf=51&mun=5107925', 4000], ['explorar-uberlandia', '/#/explorar?pais=BR&uf=31&mun=3170206', 4000],
  ['explorar-sem-analise', '/#/explorar?pais=BR&uf=31&mun=3106200', 4000], ['explorar-argentina', '/#/explorar?pais=ARG', 4000], ['explorar-sp', '/#/explorar?pais=BR&uf=35', 3500],
  ['visao-geral', '/#/visao-geral', 2500], ['visao-geral-uberlandia', '/#/visao-geral?mun=3170206', 2500],
  ['municipio-clima', '/#/municipio', 2500], ['municipio-agua', '/#/municipio?mun=5107925&aba=agua', 2500], ['municipio-safra', '/#/municipio?mun=5107925&aba=safra', 3000],
  ['municipio-safra-cafe', '/#/municipio?mun=3170206&aba=safra&cultura=coffee_arabica', 3000], ['municipio-imagem', '/#/municipio?mun=3170206&aba=imagem', 3000], ['municipio-imagem-sorriso', '/#/municipio?mun=5107925&aba=imagem', 2500],
  ['planejar', '/#/planejar', 2500], ['planejar-cafe-udi', '/#/planejar?mun=3170206', 2500],
  ['simulador', '/#/simulador', 6000], ['simulador-previsao-ab', '/#/simulador?modo=previsao&ab=1', 5000], ['simulador-cafe', '/#/simulador?cultura=coffee_arabica&mun=3170206', 2500],
  ['field-shift', '/#/field-shift', 2500], ['propriedades', '/#/propriedades', 2000], ['registros-vazio', '/#/registros', 2000],
  ['dispositivos', '/#/dispositivos', 2000], ['alertas', '/#/alertas', 2500], ['conta', '/#/conta', 2000], ['conta-cadastro', '/#/conta/cadastro', 2000], ['conta-recuperar', '/#/conta/recuperar', 2000],
  ['mais', '/#/mais', 1500], ['design-preview', '/#/design-preview', 2000], ['nao-encontrada', '/#/nao-existe', 1500],
  ['auth-callback-erro', '/auth/callback?error=access_denied', 2000], ['auth-recovery-sem-codigo', '/auth/recovery', 2000],
];

const snapshot = () => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const name = (e) => (e.getAttribute('aria-label') || (e.labels && e.labels[0] && e.labels[0].innerText) || e.innerText || e.getAttribute('placeholder') || e.getAttribute('name') || e.getAttribute('title') || '').replace(/\s+/g, ' ').trim().slice(0, 90);
  const q = (sel) => [...document.querySelectorAll(sel)].filter(vis);
  const controls = q('main button, main a[href], main input, main select, main textarea, main [role=slider], main [role=tab]').map((e) => ({ t: e.getAttribute('role') || e.tagName.toLowerCase() + (e.type && e.tagName === 'INPUT' ? ':' + e.type : ''), n: name(e), d: e.disabled || undefined, h: Math.round(e.getBoundingClientRect().height), w: Math.round(e.getBoundingClientRect().width) }));
  const small = controls.filter((c) => (c.t === 'button' || c.t === 'a' || c.t === 'tab') && (c.h < 24 || c.w < 24)).length;
  const noName = controls.filter((c) => !c.n).length;
  const ae = document.activeElement;
  return {
    title: document.title, lang: document.documentElement.lang, theme: document.documentElement.dataset.theme,
    h1: q('h1').map((e) => e.innerText.trim()), h2: q('main h2').map((e) => e.innerText.trim()).slice(0, 30),
    pills: [...new Set(q('.pill').map((e) => e.innerText.trim()))].slice(0, 30), notices: q('.notice, .empty').map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 160)).slice(0, 12),
    sources: q('.source').map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 200)).slice(0, 8),
    counts: { button: q('main button').length, link: q('main a[href]').length, input: q('main input').length, select: q('main select').length, textarea: q('main textarea').length, tab: q('main [role=tab]').length, table: q('main table').length, slider: q('main [role=slider]').length, canvas: q('main canvas').length },
    controls, small, noName, overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    active: ae ? `${ae.tagName.toLowerCase()}${ae.id ? '#' + ae.id : ''}` : null, hash: location.hash, pathname: location.pathname,
    navLinks: q('nav.rail a').map((e) => e.innerText.trim()), headerText: (document.querySelector('header')?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 220),
  };
};

const result = { base: BASE, at: new Date().toISOString(), sweep: {} };
for (const [vp, size, extra] of [['desktop', { width: 1440, height: 900 }, {}], ['mobile', { width: 390, height: 844 }, { hasTouch: true, isMobile: true }]]) {
  const ctx = await browser.newContext({ viewport: size, ...extra, locale: 'pt-BR' });
  for (const [id, url, waitMs] of ROUTES) {
    const page = await ctx.newPage(); const errs = []; const fails = []; const api = [];
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 200))); page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
    page.on('requestfailed', (r) => fails.push(r.url().slice(0, 120) + ' ' + (r.failure()?.errorText ?? '')));
    page.on('response', (r) => { const u = new URL(r.url()); if (u.pathname.startsWith('/v1/')) api.push(`${r.status()} ${u.pathname}${u.search}`.slice(0, 140)); });
    try {
      await page.goto(BASE + url, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(waitMs);
      const s = await page.evaluate(snapshot);
      await page.screenshot({ path: path.join(OUT, 'capturas', `${id}-${vp}.png`), fullPage: !id.startsWith('explorar') && !id.startsWith('simulador') });
      result.sweep[`${id}@${vp}`] = { url, ...s, errors: errs, failed: fails, api: [...new Set(api)] };
    } catch (e) { result.sweep[`${id}@${vp}`] = { url, crash: String(e).slice(0, 300), errors: errs }; }
    await page.close();
  }
  await ctx.close();
}
fs.writeFileSync(path.join(OUT, 'varredura.json'), JSON.stringify(result, null, 1));
const rows = Object.entries(result.sweep).map(([k, v]) => `${k.padEnd(34)} h1=${JSON.stringify(v.h1 ?? v.crash).slice(0, 60).padEnd(62)} ctl=${v.controls?.length ?? '-'} small=${v.small ?? '-'} noName=${v.noName ?? '-'} ovf=${v.overflowX ?? '-'} err=${v.errors?.length ?? '-'} title=${JSON.stringify(v.title)}`);
console.log(rows.join('\n'));
await browser.close();
