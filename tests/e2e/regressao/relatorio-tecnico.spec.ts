// Relatório técnico das simulações futuras, sobre a API real (publicação fixada de Uberlândia): gerado sem clique no
// idioma da tela, leitura em página própria, exportação da representação exibida e impressão pelo navegador.
import { test, expect, seriousViolations, type Page } from '../helpers';

const RUN = 'sim_fd61ab4118a4e32398a12156';
const REPORT = `/#/relatorio?run=${RUN}&local=BR:ibge:3170206&cultura=soy&safra=2027`;
const prefsWith = (locale: string) => `localStorage.setItem('gaiapus.prefs', JSON.stringify({ v: 1, locale: ${JSON.stringify(locale)} }))`;
const section = (page: Page, id: string) => page.getByTestId(`report-section-${id}`);
const ready = (page: Page) => expect(page.getByTestId('report-document')).toBeVisible({ timeout: 20000 });
/** The footer ends with the first 16 characters of the facts digest (after the report id, which differs by language). */
const digestOf = async (page: Page) => (await page.locator('.report__footer').innerText()).trim().match(/([0-9a-f]{16})\.$/)?.[1];

test.describe('Relatório técnico da simulação', () => {
  test('abrir a simulação prepara o relatório sozinho; a leitura traz os números publicados e as ressalvas', async ({ page, errors }) => {
    const posts: string[] = [];
    page.on('request', (r) => { if (r.method() === 'POST' && /\/v1\/simulations\/[^/]+\/report/.test(r.url())) posts.push(r.postData() ?? ''); });
    await page.goto('/#/simulador?modo=planejamento&local=BR:ibge:3170206&cultura=soy&safra=2027&vista=perfil&semwebgl=1');
    const entry = page.getByTestId('planning-report');
    const link = entry.getByRole('link', { name: 'Abrir relatório técnico' });
    await expect(link).toBeVisible({ timeout: 20000 });
    await expect(entry).toContainText('Execução completa — 2 safras');
    await expect(entry).toContainText('Português');
    // One automatic request, in the language on screen, for the whole run; nothing else was sent.
    expect(posts.map((p) => JSON.parse(p))).toEqual([{ locale: 'pt-BR', scope: { kind: 'run' } }]);
    await link.click();
    await expect(page).toHaveURL(/#\/relatorio\?run=sim_88fd3ea122a8ad02ced3f899&local=BR:ibge:3170206&cultura=soy&safra=2027/);
    await ready(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Relatório técnico de simulação — Uberlândia, soja, safras 2027 e 2028');
    await expect(page.getByTestId('report-document')).toHaveAttribute('lang', 'pt-BR');
    const summary = section(page, 'summary');
    await expect(summary).toContainText('não uma lâmina de irrigação recomendada');
    await expect(summary).toContainText('não é uma probabilidade calibrada');
    await expect(summary).toContainText('3.502 kg/ha');
    await expect(section(page, 'yield_economics')).toContainText('Análise econômica indisponível');
    await expect(section(page, 'identification')).toContainText('não é uma previsão meteorológica diária para 2027 e 2028');
    // Technical details open on demand; the positive P10 below the precision is never shown as zero.
    await section(page, 'results').getByRole('button', { name: 'Resultados por cultura e safra' }).click();
    const deficit = section(page, 'results').getByRole('row', { name: /Déficit de evapotranspiração da cultura/ }).first();
    await expect(deficit).toContainText('<0,1');
    await expect(deficit).toContainText('13,2');
    await section(page, 'charts').getByRole('button').click();
    await expect(section(page, 'charts').getByRole('img').first()).toBeVisible();
    await section(page, 'methods').getByRole('button').click();
    expect(await seriousViolations(page)).toEqual([]);
    await page.getByRole('link', { name: 'Voltar à simulação' }).click();
    await expect(page).toHaveURL(/#\/simulador\?modo=planejamento&local=BR:ibge:3170206&cultura=soy&safra=2027/);
    expect(errors).toEqual([]);
  });

  test('os cinco idiomas mostram o mesmo relatório: mesmos fatos, só a redação muda', async ({ page }) => {
    const titles: Record<string, RegExp> = { 'pt-BR': /^Relatório técnico de simulação/, en: /^Technical simulation report/, es: /^Informe técnico de simulación/, fr: /^Rapport technique de simulation/, de: /^Technischer Simulationsbericht/ };
    const digests = new Set<string | undefined>();
    for (const [locale, title] of Object.entries(titles)) {
      await page.addInitScript(prefsWith(locale));
      await page.goto(REPORT);
      await page.reload();
      await ready(page);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.getByTestId('report-document')).toHaveAttribute('lang', locale);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      await expect(page.getByTestId('report-document')).toContainText(RUN);
      await expect(page.getByTestId('report-document')).toContainText('kg/ha');
      digests.add(await digestOf(page));
    }
    expect(digests.size).toBe(1);
    expect([...digests][0]).toMatch(/^[0-9a-f]{16}$/);
  });

  test('trocar o idioma na página troca o relatório sem mudar o endereço; o escopo é uma escolha explícita', async ({ page, errors }) => {
    await page.goto(REPORT);
    await ready(page);
    const url = page.url();
    await page.locator('[data-testid="language-select"]:visible').first().selectOption('en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Technical simulation report — Uberlândia, soybean and second-season maize, harvests 2027 and 2028');
    await expect(page.getByTestId('report-document')).toHaveAttribute('lang', 'en');
    expect(page.url()).toBe(url);
    await expect(page.getByRole('radio', { name: 'Whole run' })).toBeChecked();
    await page.getByRole('radio', { name: /Selected season/ }).check();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Technical simulation report — Uberlândia, soybean, harvest 2027');
    await expect(page).toHaveURL(/escopo=safra/);
    await expect(section(page, 'summary')).toContainText('7 of 22 scenarios (31.8%)');
    expect(errors).toEqual([]);
  });

  test('exporta a representação exibida: Markdown e HTML com o mesmo identificador, nada automático', async ({ page, request }) => {
    const downloads: string[] = [];
    page.on('download', (d) => downloads.push(d.suggestedFilename()));
    await page.addInitScript(() => { (window as unknown as { printed: number }).printed = 0; window.print = () => { (window as unknown as { printed: number }).printed++; }; });
    await page.goto(REPORT);
    await ready(page);
    const md = page.getByRole('link', { name: 'Baixar Markdown' });
    const href = await md.getAttribute('href');
    expect(href).toMatch(new RegExp(`^/v1/simulations/${RUN}/report\\?report_id=rep_[0-9a-f]{32}&format=md$`));
    const markdown = await request.get(href!);
    expect(markdown.headers()['content-type']).toBe('text/markdown; charset=utf-8');
    expect(await markdown.text()).toMatch(/^# Relatório técnico de simulação — Uberlândia/);
    const html = await request.get(href!.replace('format=md', 'format=html'));
    expect(html.headers()['content-security-policy']).toContain("default-src 'none'");
    expect(await html.text()).toContain('<html lang="pt-BR"');
    // Nothing was printed or downloaded by opening the page.
    expect(await page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(0);
    expect(downloads).toEqual([]);
    await page.getByRole('button', { name: 'Imprimir ou salvar em PDF' }).click();
    expect(await page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(1);
  });

  test('impressão: só o documento, seções técnicas abertas e nada mais largo que a folha', async ({ page }) => {
    await page.setViewportSize({ width: 794, height: 1123 });
    await page.goto(`${REPORT}&escopo=safra`);
    await ready(page);
    await expect(section(page, 'results').getByRole('table').first()).toBeHidden();
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('header.header')).toBeHidden();
    await expect(page.locator('nav.rail')).toBeHidden();
    await expect(page.locator('.report__actions')).toBeHidden();
    for (const id of ['results', 'charts', 'methods']) await expect(section(page, id).locator('.report__body')).toBeVisible();
    await expect(section(page, 'results').getByRole('table').first()).toBeVisible();
    await expect(section(page, 'charts').locator('svg[role="img"]').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    expect(await page.locator('canvas').count()).toBe(0);
  });

  for (const width of [360, 390]) {
    test(`${width} px: sem rolagem lateral, alvos de toque de 40 px ou mais, seções técnicas abrem`, async ({ page }) => {
      await page.setViewportSize({ width, height: 740 });
      await page.goto(REPORT);
      await ready(page);
      for (const id of ['results', 'charts', 'methods']) await section(page, id).getByRole('button').first().click();
      const found = await page.evaluate(() => {
        const out: string[] = []; const doc = document.documentElement; const main = document.querySelector('main')!;
        if (doc.scrollWidth > doc.clientWidth + 1) out.push(`page wider by ${doc.scrollWidth - doc.clientWidth}px`);
        if (main.scrollWidth > main.clientWidth + 1) out.push(`content wider by ${main.scrollWidth - main.clientWidth}px`);
        for (const el of document.querySelectorAll<HTMLElement>('main button, main select, main summary, main .btn, main label.seg__item, .report__back a')) {
          const b = el.getBoundingClientRect(); if (!b.width || !b.height) continue;
          if (b.height < 40 || b.width < 40) out.push(`small target "${(el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(b.width)}x${Math.round(b.height)}`);
        }
        return out;
      });
      expect(found).toEqual([]);
      expect(await seriousViolations(page)).toEqual([]);
    });
  }

  for (const locale of ['de', 'fr']) {
    test(`${locale} em 320 px sem rolagem horizontal`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 900 });
      await page.addInitScript(prefsWith(locale));
      await page.goto(REPORT);
      await ready(page);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      for (const id of ['results', 'charts', 'methods']) await section(page, id).getByRole('button').first().click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
      expect(await page.evaluate(() => { const m = document.querySelector('main')!; return m.scrollWidth - m.clientWidth; })).toBeLessThanOrEqual(1);
    });
  }

  test('endereço sem simulação válida não pede nada e aponta o caminho', async ({ page }) => {
    const posts: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/v1/simulations/')) posts.push(r.url()); });
    await page.goto('/#/relatorio?run=..%2F..%2Fetc');
    await expect(page.getByText('Nenhuma simulação foi indicada para o relatório.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Abrir o planejamento da safra' })).toBeVisible();
    expect(posts).toEqual([]);
  });
});
