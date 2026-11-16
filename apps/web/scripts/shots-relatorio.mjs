// Evidence screenshots of the technical report (Docs/relatorios-tecnicos/evidencias). Needs the web app and an API
// with the report routes running; the partial case needs a publication with a run that has no series artifact.
// Usage (from apps/web): GAIAPUS_WEB_URL=http://127.0.0.1:5181 node scripts/shots-relatorio.mjs [partial run id]
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const base = process.env.GAIAPUS_WEB_URL ?? 'http://127.0.0.1:5173';
const out = path.resolve(import.meta.dirname, '../../../Docs/relatorios-tecnicos/evidencias');
const RUN = 'sim_fd61ab4118a4e32398a12156';
const partialRun = process.argv[2] ?? null;
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
async function open(locale, viewport, hash, theme = 'dark') {
  const context = await browser.newContext({ viewport, locale: 'pt-BR', deviceScaleFactor: 1, ...(viewport.width < 500 ? { hasTouch: true, isMobile: true } : {}) });
  await context.addInitScript(([l, t]) => {
    localStorage.setItem('gaiapus.prefs', JSON.stringify({ v: 1, locale: l, theme: t }));
    if (!localStorage.getItem('gaiapus.tours')) localStorage.setItem('gaiapus.tours', JSON.stringify({ v: 1, tours: {}, auto: { device: 'shots' } }));
  }, [locale, theme]);
  const page = await context.newPage();
  await page.goto(`${base}/#${hash}`);
  return { context, page };
}
const shot = async (page, name, options = {}) => { await page.screenshot({ path: path.join(out, name), ...options }); console.log('saved', name); };
const ready = (page) => page.getByTestId('report-document').waitFor({ timeout: 30000 });
/** The app scrolls inside <main>: bring one section to the top of the viewport and capture the viewport. */
const section = async (page, id, name, open = false) => {
  const target = page.getByTestId(`report-section-${id}`);
  if (open && (await target.getByRole('button').first().getAttribute('aria-expanded')) === 'false') await target.getByRole('button').first().click();
  await target.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await shot(page, name);
};

for (const locale of ['pt-BR', 'en']) {
  for (const [label, viewport] of [['desktop', { width: 1440, height: 900 }], ['celular', { width: 390, height: 844 }]]) {
    const { context, page } = await open(locale, viewport, `/relatorio?run=${RUN}&local=BR:ibge:3170206&cultura=soy&safra=2027`);
    await ready(page);
    await shot(page, `relatorio-${label}-${locale}.png`);
    await section(page, 'summary', `relatorio-${label}-${locale}-resumo.png`);
    await section(page, 'results', `relatorio-${label}-${locale}-resultados.png`, true);
    await section(page, 'charts', `relatorio-${label}-${locale}-graficos.png`, true);
    if (label === 'desktop') await section(page, 'yield_economics', `relatorio-${label}-${locale}-rendimento-economia.png`);
    await context.close();
  }
}

{ // Entry point next to the run information of the season planning.
  const { context, page } = await open('pt-BR', { width: 1440, height: 900 }, '/simulador?modo=planejamento&local=BR:ibge:3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1');
  const entry = page.getByTestId('planning-report');
  await entry.getByRole('link').waitFor({ timeout: 30000 });
  await entry.scrollIntoViewIfNeeded();
  await shot(page, 'simulador-entrada-desktop-pt-BR.png');
  await context.close();
  const phone = await open('pt-BR', { width: 390, height: 844 }, '/simulador?modo=planejamento&local=BR:ibge:3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1&secao=indicadores');
  await phone.page.getByTestId('planning-report').getByRole('link').waitFor({ timeout: 30000 });
  await shot(phone.page, 'simulador-entrada-celular-pt-BR.png');
  await phone.context.close();
}

{ // Print media: what the browser dialog prints or saves as PDF (technical sections open, no app chrome).
  const { context, page } = await open('pt-BR', { width: 1100, height: 1400 }, `/relatorio?run=${RUN}&escopo=safra&cultura=soy&safra=2027`, 'dark');
  await ready(page);
  await page.emulateMedia({ media: 'print' });
  await shot(page, 'relatorio-impressao-pt-BR.png', { fullPage: true });
  await page.pdf({ path: path.join(out, 'relatorio-impressao-pt-BR.pdf'), format: 'A4', printBackground: false });
  console.log('saved relatorio-impressao-pt-BR.pdf');
  await context.close();
}

if (partialRun) { // A valid run with a modelled yield and no daily series.
  for (const locale of ['pt-BR', 'en']) {
    const { context, page } = await open(locale, { width: 1440, height: 900 }, `/relatorio?run=${partialRun}`);
    await ready(page);
    await shot(page, `relatorio-parcial-sem-serie-${locale}.png`);
    await section(page, 'charts', `relatorio-parcial-sem-serie-${locale}-graficos-e-rendimento.png`, true);
    await context.close();
  }
}
await browser.close();
