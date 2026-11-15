// Targeted read-only probes against the running dev build. Each probe uses a fresh, empty browser context.
import { chromium } from '../../../../../apps/web/node_modules/@playwright/test/index.mjs';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
const BASE = process.env.GAIAPUS_WEB_URL ?? 'http://127.0.0.1:5173'; const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const only = /^[a-z0-9:-]+$/.test(process.argv[2] ?? '') ? process.argv[2] : undefined; // output folder is fixed
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const R = {}; const rec = (k, v) => { R[k] = v; console.log(`\n## ${k}\n${typeof v === 'string' ? v : JSON.stringify(v, null, 1)}`); };
const fresh = async (opts = {}) => { const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR', ...opts }); const page = await ctx.newPage(); return { ctx, page }; };
const run = async (name, fn) => { if (only && only !== name) return; try { await fn(); } catch (e) { rec(name + ':CRASH', String(e).slice(0, 400)); } };
const searchResults = async (page, q) => { await page.locator('#busca-local').fill(''); await page.locator('#busca-local').fill(q); await page.waitForTimeout(900); return page.evaluate(() => [...document.querySelectorAll('#busca-lista [role=option]')].map((e) => e.innerText.replace(/\s+/g, ' ').trim())); };

await run('busca', async () => {
  const { ctx, page } = await fresh(); const nf = []; page.on('response', (r) => { if (r.status() === 404) nf.push(r.url().slice(0, 140)); });
  await page.goto(BASE + '/#/explorar?semwebgl=1'); await page.waitForTimeout(2500);
  const out = {}; for (const q of ['alemanha', 'germany', 'deutschland', 'allemagne', 'alemania', 'DEU', 'de', 'estados unidos', 'usa', 'united states', 'japão', 'japan', 'rio verde', 'barreiras', 'sorriso', 'uberlandia', 'MT', '5107925', 'são', 'zz']) out[q] = await searchResults(page, q);
  rec('busca:resultados', out);
  // Rio Verde comes from the API catalogue only: what does selecting it show?
  await page.locator('#busca-local').fill('rio verde'); await page.waitForTimeout(900); await page.keyboard.press('Enter'); await page.waitForTimeout(2500);
  rec('busca:rio-verde-selecionado', await page.evaluate(() => ({ hash: location.hash, h1: document.querySelector('.explore__panel h1')?.innerText, crumbs: document.querySelector('.crumbs')?.innerText.replace(/\s+/g, ' '), body: document.querySelector('.explore__panel-body')?.innerText.replace(/\s+/g, ' ').slice(0, 500) })));
  await page.screenshot({ path: path.join(OUT, 'capturas', 'probe-rio-verde.png') });
  await ctx.close();
  // World list: are the names really there? (innerText is empty under content-visibility)
  const b = await fresh(); await b.page.goto(BASE + '/#/explorar'); await b.page.waitForTimeout(4500);
  rec('mundo:lista', await b.page.evaluate(() => { const li = [...document.querySelectorAll('ul[aria-label="Países"] button')]; return { n: li.length, firstText: li.slice(0, 3).map((e) => e.textContent), lastText: li.slice(-2).map((e) => e.textContent), cv: getComputedStyle(li[40].closest('li')).contentVisibility, markers: [...document.querySelectorAll('.map-marker')].map((e) => e.textContent) }; }));
  const nf2 = []; b.page.on('response', (r) => { if (r.status() >= 400) nf2.push(r.status() + ' ' + r.url().slice(0, 160)); }); await b.page.reload(); await b.page.waitForTimeout(5000); rec('mundo:respostas>=400', nf2);
  await b.ctx.close();
});

await run('api-fora', async () => {
  // Geography endpoint down: do locally bundled countries/states/municipalities still appear in the search?
  for (const [label, handler] of [['abort', (r) => r.abort()], ['503', (r) => r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'dependency_failure', message: 'Unavailable' } }) })]]) {
    const { ctx, page } = await fresh(); await page.route('**/v1/geography**', handler);
    await page.goto(BASE + '/#/explorar?semwebgl=1'); await page.waitForTimeout(2500);
    const out = {}; for (const q of ['argentina', 'sorriso', 'mato grosso']) out[q] = await searchResults(page, q); rec(`api-fora:busca(${label})`, out);
    if (label === 'abort') await page.screenshot({ path: path.join(OUT, 'capturas', 'probe-busca-api-fora.png') });
    await ctx.close();
  }
  // Whole API down: what do the screens say?
  const { ctx, page } = await fresh(); await page.route('**/v1/**', (r) => r.abort());
  const out = {};
  for (const [id, url] of [['explorar-sorriso', '/#/explorar?pais=BR&uf=51&mun=5107925&semwebgl=1'], ['visao-geral', '/#/visao-geral'], ['municipio-safra', '/#/municipio?aba=safra'], ['municipio-clima', '/#/municipio'], ['simulador', '/#/simulador'], ['field-shift', '/#/field-shift'], ['planejar', '/#/planejar'], ['alertas', '/#/alertas'], ['propriedades', '/#/propriedades']]) {
    await page.goto(BASE + url); await page.waitForTimeout(2200);
    out[id] = await page.evaluate(() => ({ h1: [...document.querySelectorAll('h1')].map((e) => e.innerText), alerts: [...document.querySelectorAll('[role=alert]')].map((e) => e.innerText.replace(/\s+/g, ' ').slice(0, 150)), stats: [...document.querySelectorAll('.stat__value')].map((e) => e.innerText.replace(/\s+/g, ' ')).slice(0, 6), cards: document.querySelectorAll('main .card').length }));
  }
  rec('api-fora:telas', out); await page.goto(BASE + '/#/visao-geral'); await page.waitForTimeout(1500); await page.screenshot({ path: path.join(OUT, 'capturas', 'probe-visao-geral-api-fora.png') });
  await ctx.close();
});

const seed = async (page) => {
  // Builds one property with two plots through the real UI, in an empty test profile.
  await page.goto(BASE + '/#/propriedades?mun=3170206&nome=Uberl%C3%A2ndia&uf=MG'); await page.waitForTimeout(1200);
  await page.getByLabel('Nome da propriedade').fill('Sítio Teste'); await page.getByRole('button', { name: 'Salvar propriedade' }).click(); await page.waitForTimeout(600);
  for (const [n, a] of [['Talhão A', '12,5'], ['Talhão B', '30']]) { await page.getByLabel('Nome do talhão').fill(n); await page.getByLabel('Área (ha)', { exact: true }).fill(a); await page.getByRole('button', { name: 'Salvar talhão' }).click(); await page.waitForTimeout(500); }
};

await run('rascunho', async () => {
  const { ctx, page } = await fresh(); await seed(page);
  await page.goto(BASE + '/#/registros?novo=plantio'); await page.waitForTimeout(1200);
  const cult = page.getByLabel('Cultivar ou variedade'); const plotSel = page.locator('.page-head select');
  const opts = await plotSel.locator('option').allInnerTexts(); const steps = [];
  const snap = async (label) => steps.push({ label, plot: await plotSel.evaluate((s) => s.options[s.selectedIndex].text), cultivar: await cult.inputValue(), area: await page.getByLabel('Área plantada (ha)').inputValue(), status: (await page.locator('#h-form').locator('xpath=..').locator('[role=status]').innerText()).trim(), drafts: await page.evaluate(() => Object.fromEntries(Object.entries(JSON.parse(localStorage.getItem('gaiapus.v1.guest') || '{}').drafts ?? {}).filter(([k]) => k.startsWith('registro')).map(([k, v]) => [k.replace(/talhao_\w+/, (m) => m.slice(-4)), v.cultivar]))) });
  await snap('início (talhão ativo)'); await cult.fill('CULTIVAR-DO-A'); await snap('digitou no A');
  await plotSel.selectOption({ label: 'Talhão B' }); await page.waitForTimeout(500); await snap('trocou para B'); await cult.fill('CULTIVAR-DO-B'); await snap('digitou no B');
  await plotSel.selectOption({ label: 'Talhão A' }); await page.waitForTimeout(500); await snap('voltou para A');
  await page.reload(); await page.waitForTimeout(1500); await snap('recarregou (A ativo)');
  rec('rascunho:A-B-A', { opts, steps }); await ctx.close();
});

await run('numero', async () => {
  const { ctx, page } = await fresh(); await page.goto(BASE + '/#/planejar'); await page.waitForTimeout(1500);
  const set = async (label, v, exact = false) => page.getByLabel(label, { exact }).fill(v);
  await page.getByLabel('Unidade do preço').selectOption('kg'); await set('Rendimento esperado (kg/ha)', '3000'); await set('Preço (R$ por kg)', '2'); await set('Data do preço', '2026-11-14'); await set('Custo total (R$/ha)', '0');
  const out = {};
  for (const area of ['10,5', '10.5', '1.5', '1,000.5', '1 000,5', '10e2']) { await set('Área (ha)', area, true); await page.waitForTimeout(250); out[area] = await page.evaluate(() => [...document.querySelectorAll('[data-testid=plan-eco] .stat')].map((e) => e.innerText.replace(/\s+/g, ' ')).join(' || ').slice(0, 260)); }
  rec('numero:area-no-plano (esperado com 10,5 ha: R$ 63.000,00)', out);
  await page.screenshot({ path: path.join(OUT, 'capturas', 'probe-numero-ponto.png'), fullPage: true }); await ctx.close();
});

await run('contexto', async () => {
  const { ctx, page } = await fresh(); await seed(page);
  const read = () => page.evaluate(() => ({ header: document.querySelector('.header__ctx')?.innerText.replace(/\s+/g, ' ').trim(), h1: [...document.querySelectorAll('h1')].map((e) => e.innerText), pillsTop: [...document.querySelectorAll('.page-head .pill')].map((e) => e.innerText), demoNotice: [...document.querySelectorAll('.notice')].some((e) => /demonstração de Sorriso/.test(e.innerText)), hash: location.hash }));
  const out = {};
  for (const [id, url] of [['visao-geral', '/#/visao-geral'], ['planejar', '/#/planejar'], ['simulador', '/#/simulador'], ['municipio', '/#/municipio'], ['alertas', '/#/alertas'], ['field-shift', '/#/field-shift']]) { await page.goto(BASE + url); await page.waitForTimeout(id === 'simulador' ? 4000 : 1800); out[id] = await read(); }
  rec('contexto:talhão em Uberlândia ativo', out); await page.goto(BASE + '/#/visao-geral'); await page.waitForTimeout(1500); await page.screenshot({ path: path.join(OUT, 'capturas', 'probe-contexto-udi-visao-geral.png') });
  // Upcoming activity ignores the active plot?
  await page.goto(BASE + '/#/registros?novo=evento'); await page.waitForTimeout(1000); await page.getByLabel('Data', { exact: true }).fill('2027-01-10'); await page.getByRole('button', { name: /Salvar manejo/ }).click(); await page.waitForTimeout(600);
  await page.locator('.page-head select').selectOption({ label: 'Talhão B' }); await page.waitForTimeout(300); await page.goto(BASE + '/#/visao-geral'); await page.waitForTimeout(1800);
  rec('contexto:próxima atividade com Talhão B ativo (evento é do A)', await page.evaluate(() => ({ header: document.querySelector('.header__ctx')?.innerText.replace(/\s+/g, ' ').trim(), prox: document.querySelector('#h-prox')?.parentElement?.innerText.replace(/\s+/g, ' ') })));
  await ctx.close();
});

await run('planos', async () => {
  const { ctx, page } = await fresh(); await page.goto(BASE + '/#/planejar?mun=3170206'); await page.waitForTimeout(1500);
  for (let i = 1; i <= 7; i++) { await page.getByLabel('Área (ha)', { exact: true }).fill(String(i)); await page.getByRole('button', { name: 'Salvar planejamento' }).click(); await page.waitForTimeout(150); }
  const listed = await page.evaluate(() => ({ shown: [...document.querySelectorAll('main section.card')].find((s) => /Planejamentos salvos/.test(s.innerText))?.querySelectorAll('li').length, stored: JSON.parse(localStorage.getItem('gaiapus.v1.guest')).plans.length, more: /ver todos|mostrar mais|mais planos/i.test(document.body.innerText) }));
  // Reopen a plan saved for Uberlândia while the URL has no municipality: which place does the page show?
  await page.goto(BASE + '/#/planejar'); await page.waitForTimeout(1200); await page.locator('main section.card li button').first().click(); await page.waitForTimeout(400);
  const reopened = await page.evaluate(() => ({ place: document.querySelector('.page-head .pill')?.innerText, item: [...document.querySelectorAll('main section.card')].find((s) => /Planejamentos salvos/.test(s.innerText))?.querySelector('li')?.innerText.replace(/\s+/g, ' ') }));
  // "Salvar e abrir no simulador": which parameters arrive?
  await page.getByRole('button', { name: 'Salvar e abrir no simulador' }).click(); await page.waitForTimeout(1500);
  rec('planos', { listed, reopened, simuladorHash: await page.evaluate(() => location.hash) }); await ctx.close();
});

await run('foco', async () => {
  const { ctx, page } = await fresh(); await page.goto(BASE + '/#/visao-geral'); await page.waitForTimeout(1800); const out = {};
  await page.keyboard.press('Tab'); out.primeiroTab = await page.evaluate(() => document.activeElement?.innerText || document.activeElement?.getAttribute('aria-label'));
  await page.keyboard.press('Enter'); out.aposSkip = await page.evaluate(() => document.activeElement?.id);
  await page.locator('nav.rail a', { hasText: 'Planejar' }).click(); await page.waitForTimeout(1200);
  out.aposNavegar = await page.evaluate(() => ({ active: document.activeElement?.tagName + ':' + (document.activeElement?.innerText || '').slice(0, 30), title: document.title, h1: document.querySelector('h1')?.innerText, liveRegions: document.querySelectorAll('[aria-live], [role=status], [role=alert]').length }));
  await page.locator('button[aria-label^="Mudar para tema"]').click(); out.tema = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, keys: Object.keys(localStorage), themeColor: document.querySelector('meta[name=theme-color]')?.content }));
  await page.reload(); await page.waitForTimeout(1200); out.temaAposRecarregar = await page.evaluate(() => document.documentElement.dataset.theme);
  out.storage = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k).length])));
  rec('foco-titulo-tema', out); await ctx.close();
  // Mobile: which destinations are reachable from the bottom bar and from "Mais"?
  const m = await fresh({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); await m.page.goto(BASE + '/#/mais'); await m.page.waitForTimeout(1200);
  rec('celular:navegacao', await m.page.evaluate(() => ({ barra: [...document.querySelectorAll('nav.rail a')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.innerText.trim()), mais: [...document.querySelectorAll('main a')].map((e) => e.innerText.trim()), headerButtons: [...document.querySelectorAll('header a, header button')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => (e.getAttribute('aria-label') || e.innerText).replace(/\s+/g, ' ').trim() + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)) })));
  await m.ctx.close();
});

await run('auth', async () => {
  const { ctx, page } = await fresh(); const out = {};
  await page.goto(BASE + '/#/conta/cadastro'); await page.waitForTimeout(1200);
  out.cadastro = await page.evaluate(() => ({ submitDisabled: document.querySelector('form .btn--primary')?.disabled, noValidate: document.querySelector('form')?.noValidate, notice: document.querySelector('.notice')?.innerText.replace(/\s+/g, ' '), fields: [...document.querySelectorAll('form input')].map((i) => `${i.labels?.[0]?.innerText}|${i.type}|required=${i.required}|autocomplete=${i.autocomplete}`) }));
  await page.goto(BASE + '/auth/callback?code=abc&lang=de#/explorar'); await page.waitForTimeout(1500);
  out.callback = await page.evaluate(() => ({ url: location.href, h1: document.querySelector('h1')?.innerText, msg: document.querySelector('[role=status]')?.innerText, links: [...document.querySelectorAll('main a')].map((a) => a.innerText + ' → ' + a.getAttribute('href')) }));
  rec('auth:sem-supabase', out); await ctx.close();
});

fs.writeFileSync(path.join(OUT, `sondagens${only ? '-' + only : ''}.json`), JSON.stringify({ base: BASE, at: new Date().toISOString(), results: R }, null, 1));
await browser.close();
