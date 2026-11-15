// "Minha área — sensores e talhões" and the stake model of the simulator, in a real browser.
// The suite runs without a Supabase project, so the screen is exercised through the explicit guest demonstration;
// the signed-in paths (server confirmation, rejection, account isolation) are covered by MyArea.test.tsx.
import { test, expect, MOBILE, NO_FIRST_RUN, seriousViolations, type Page } from '../helpers';

const UBERLANDIA = { latitude: -18.9166, longitude: -48.2737, accuracy: 12 };
const COORDS = ['-18.9186, -48.2772', '-18.9186, -48.2712', '-18.9146, -48.2702', '-18.9136, -48.2768'].join('\n');

async function seedProperty(page: Page) {
  await page.goto('/#/propriedades?mun=3170206&nome=Uberl%C3%A2ndia&uf=MG');
  await page.getByLabel('Nome da propriedade').fill('Sítio Boa Vista');
  await page.getByRole('button', { name: 'Salvar propriedade' }).click();
  await expect(page.getByText('Propriedade "Sítio Boa Vista" salva', { exact: false })).toBeVisible();
}
async function typedPlot(page: Page, name = 'Talhão da baixada') {
  await page.getByRole('button', { name: 'Demarcar talhão' }).click();
  await page.getByLabel('Nome do talhão').fill(name);
  await page.getByTestId('plot-coords').fill(COORDS);
  await page.getByRole('button', { name: 'Aplicar coordenadas' }).click();
  await page.getByRole('button', { name: 'Salvar talhão' }).click();
  await expect(page.getByTestId('area-message')).toContainText(`Talhão “${name}” salvo.`);
}
async function addStake(page: Page, opts: { gps?: boolean } = {}) {
  await page.getByRole('button', { name: 'Adicionar sensor' }).click();
  await page.getByLabel('Identificador da estaca').fill('C4000110');
  await page.getByLabel('Código de posse').fill('K7Q2-M9XD');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Apelido').fill('Estaca da baixada');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByTestId('place-form').getByLabel('Talhão', { exact: true }).selectOption({ label: 'Talhão da baixada' });
  if (opts.gps) { await page.getByRole('button', { name: 'Usar a posição deste aparelho' }).click(); await expect(page.getByTestId('gps-accuracy')).toContainText('± 12 m'); }
  else { await page.getByLabel('Latitude').fill('-18.9162'); await page.getByLabel('Longitude').fill('-48.2741'); }
  await page.getByLabel('Confirmo que este é o ponto onde a estaca está').check();
  await page.getByRole('button', { name: 'Registrar instalação' }).click();
  await expect(page.getByText('Pressione brevemente o botão da estaca para enviar uma leitura.')).toBeVisible();
}

test.describe('Minha área · acesso', () => {
  test('sem sessão: só o convite para entrar; a demonstração é uma escolha explícita e rotulada', async ({ page }) => {
    await page.goto('/#/minha-area');
    await expect(page.getByTestId('area-gate')).toBeVisible();
    await expect(page.getByTestId('area-page')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Entrar', exact: true })).toHaveAttribute('href', '#/conta?voltar=/minha-area');
    await page.getByRole('link', { name: 'Ver demonstração sem conta' }).click();
    await expect(page.getByText('Você não entrou em uma conta.')).toBeVisible();
    await expect(page.getByTestId('area-demo-banner')).toContainText('Demonstração local — sem dispositivo real conectado.');
  });
  test('o código de posse de um link de QR sai do endereço e não fica no navegador', async ({ page }) => {
    await seedProperty(page);
    await page.goto('/#/minha-area?demo=1&d=c4000110&c=K7Q2-M9XD');
    await expect(page.getByTestId('sensor-wizard')).toBeVisible();
    await expect(page).not.toHaveURL(/K7Q2|c=/);
    await expect(page.getByLabel('Identificador da estaca')).toHaveValue('c4000110');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByTestId('sensor-wizard')).toHaveAttribute('data-step', 'details');
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    expect(stored).not.toContain('K7Q2-M9XD');
  });
});

test.describe('Minha área · talhões', () => {
  test('desenhar no mapa, mover um canto, salvar, recarregar e reabrir para editar', async ({ browser }) => {
    const ctx = await browser.newContext({ geolocation: UBERLANDIA, permissions: ['geolocation'], viewport: { width: 1440, height: 900 }, locale: 'pt-BR' }); await ctx.addInitScript(NO_FIRST_RUN); const page = await ctx.newPage();
    await seedProperty(page);
    await page.goto('/#/minha-area?demo=1');
    await expect(page.locator('[data-testid=area-map][data-ready=true]')).toBeVisible();
    await page.getByRole('button', { name: 'Ir para minha posição' }).click();
    await page.waitForFunction(() => { const m = (window as any).__gaiapusAreaMap; return m && m.getZoom() > 10 && !m.isMoving(); });
    await page.getByRole('button', { name: 'Demarcar talhão' }).click();
    await page.getByLabel('Nome do talhão').fill('Talhão desenhado');
    await page.getByTestId('area-map').evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const box = (await page.getByTestId('area-map').boundingBox())!;
    for (const [dx, dy] of [[0.3, 0.35], [0.7, 0.35], [0.7, 0.75], [0.3, 0.75]]) await page.mouse.click(box.x + box.width * dx, box.y + box.height * dy);
    const status = page.getByTestId('plot-geometry-status');
    await expect(status).toContainText('4 cantos · área calculada');
    const before = await status.textContent();
    // Drag the third corner outwards: the outline and its area follow.
    const handle = (await page.getByTestId('map-vertex-2').boundingBox())!;
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2); await page.mouse.down();
    await page.mouse.move(handle.x + handle.width / 2 + 60, handle.y + handle.height / 2 + 40, { steps: 6 }); await page.mouse.up();
    await expect(status).not.toHaveText(before!);
    await page.getByRole('button', { name: 'Salvar talhão' }).click();
    await expect(page.getByTestId('area-message')).toContainText('Talhão “Talhão desenhado” salvo.');
    const area = await page.getByTestId('plot-area').textContent();
    expect(area).toMatch(/\d ha$/);

    await page.reload();
    await page.getByTestId('area-list').getByRole('button', { name: /Talhão desenhado/ }).click();
    await expect(page.getByTestId('plot-area')).toHaveText(area!);
    await page.getByRole('button', { name: 'Editar contorno e dados' }).click();
    await expect(page.getByTestId('map-vertex-3')).toBeVisible();
    await page.getByRole('button', { name: 'Desfazer último ponto' }).click();
    await expect(status).toContainText('3 cantos');
    // Cancelling an edit asks first and keeps the stored outline.
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await page.getByTestId('discard-draft').click();
    await expect(page.getByTestId('plot-area')).toHaveText(area!);
    await ctx.close();
  });

  test('sem mapa (WebGL indisponível): lista e formulários continuam, o talhão é demarcado por coordenadas', async ({ page }) => {
    await seedProperty(page);
    await page.goto('/#/minha-area?demo=1&semwebgl=1');
    await expect(page.getByText('O mapa não pôde ser aberto.')).toBeVisible();
    await typedPlot(page);
    await expect(page.getByTestId('plot-area')).toContainText('ha');
  });

  test('polígono que cruza a si mesmo é recusado', async ({ page }) => {
    await seedProperty(page);
    await page.goto('/#/minha-area?demo=1&semwebgl=1');
    await page.getByRole('button', { name: 'Demarcar talhão' }).click();
    await page.getByLabel('Nome do talhão').fill('Torto');
    await page.getByTestId('plot-coords').fill(['-18.92, -48.27', '-18.91, -48.26', '-18.92, -48.26', '-18.91, -48.27'].join('\n'));
    await page.getByRole('button', { name: 'Salvar talhão' }).click();
    await page.getByRole('button', { name: 'Salvar talhão' }).click();
    await expect(page.getByTestId('plot-error')).toContainText('O contorno cruza a si mesmo.');
    await expect(page.getByTestId('area-message')).toHaveCount(0);
  });
});

test.describe('Minha área · estacas', () => {
  test('cadastro manual com posição do aparelho, leitura sintética rotulada, ajuste guardado sem dizer aplicado, mudança de talhão com histórico', async ({ browser }) => {
    const ctx = await browser.newContext({ geolocation: UBERLANDIA, permissions: ['geolocation'], viewport: { width: 1440, height: 900 }, locale: 'pt-BR' }); await ctx.addInitScript(NO_FIRST_RUN); const page = await ctx.newPage();
    await seedProperty(page);
    await page.goto('/#/minha-area?demo=1&semwebgl=1');
    await typedPlot(page);
    await typedPlot(page, 'Talhão do alto');
    await addStake(page, { gps: true });
    // No telemetry exists in the demonstration: the check keeps waiting and can be finished as "waiting for first contact".
    await expect(page.getByTestId('verify-status')).toContainText('Aguardando a primeira leitura');
    await page.getByRole('button', { name: 'Concluir e aguardar o primeiro contato' }).click();
    const detail = page.getByTestId('sensor-detail');
    await expect(detail.getByText('Aguardando primeiro contato', { exact: true })).toBeVisible();
    await expect(detail).toContainText('pelo GPS do celular · ± 12 m');
    await detail.getByRole('button', { name: 'Inserir leitura sintética de exemplo' }).click();
    await expect(detail.getByTestId('readings-table')).toContainText('valor bruto · não calibrado');
    await expect(detail).toContainText('Leitura sintética de exemplo.');
    await expect(detail.getByTestId('battery')).toContainText('3285 mV');
    expect(await detail.getByTestId('battery').textContent()).not.toContain('%');

    await detail.getByText('60 min').click();
    await detail.getByRole('button', { name: 'Guardar ajustes' }).click();
    const status = detail.getByTestId('command-status');
    await expect(status).toHaveAttribute('data-state', 'saved');
    await expect(status).toContainText('Guardado neste navegador — nada foi enviado à estaca.');
    expect(await status.textContent()).not.toMatch(/aplicad/i);

    await detail.getByRole('button', { name: 'Mudar de lugar ou de talhão' }).click();
    const form = page.getByTestId('place-form');
    await form.getByLabel('Talhão', { exact: true }).selectOption({ label: 'Talhão do alto' });
    await form.getByLabel('Latitude').fill('-18.9170'); await form.getByLabel('Longitude').fill('-48.2750');
    await form.getByLabel('Confirmo que este é o ponto onde a estaca está').check();
    await form.getByRole('button', { name: 'Registrar nova instalação' }).click();
    const history = page.getByTestId('installation-history').locator('li');
    await expect(history).toHaveCount(2);
    await expect(history.nth(0)).toContainText('Talhão do alto'); await expect(history.nth(0)).toContainText('desde');
    await expect(history.nth(1)).toContainText('Talhão da baixada'); await expect(history.nth(1)).toContainText('1 leitura neste período');

    await page.reload();
    await page.getByTestId('area-list').getByRole('button', { name: /Estaca da baixada/ }).click();
    await expect(page.getByTestId('installation-history').locator('li')).toHaveCount(2);
    await expect(page.getByTestId('command-status')).toContainText('nada foi enviado à estaca');
    await page.getByRole('tab', { name: 'Gateways' }).click();
    await expect(page.getByTestId('gateway-card')).toContainText('9f3e0a12');
    await ctx.close();
  });

  test('identificador inválido e estaca de outra conta: erro sem revelar nada', async ({ page }) => {
    await seedProperty(page);
    await page.goto('/#/minha-area?demo=1&semwebgl=1');
    await page.getByRole('button', { name: 'Adicionar sensor' }).click();
    await page.getByLabel('Identificador da estaca').fill('sonda-01'); await page.getByLabel('Código de posse').fill('K7Q2-M9XD');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByTestId('wizard-error')).toContainText('Identificador inválido');
    await page.getByLabel('Identificador da estaca').fill('deadbeef');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByTestId('wizard-error')).toHaveText('Não foi possível vincular esta estaca. Confira o identificador e o código.');
    await expect(page.getByTestId('sensor-wizard')).toHaveAttribute('data-step', 'identify');
  });
});

test.describe('Minha área · celular e acessibilidade', () => {
  for (const width of [360, 390]) test(`${width} px: sem rolagem lateral e com alvos de toque de 44 px`, async ({ browser }) => {
    const ctx = await browser.newContext({ ...MOBILE, viewport: { width, height: 800 }, locale: 'pt-BR' }); await ctx.addInitScript(NO_FIRST_RUN); const page = await ctx.newPage();
    await seedProperty(page);
    await page.goto('/#/minha-area?demo=1');
    await typedPlot(page);
    await addStake(page);
    await page.getByRole('button', { name: 'Inserir leitura sintética de exemplo' }).click();
    await page.getByRole('button', { name: 'Concluir', exact: true }).click();
    await expect(page.getByTestId('sensor-detail')).toBeVisible();
    const overflow = () => page.evaluate(() => Math.max(document.documentElement.scrollWidth - window.innerWidth, document.getElementById('conteudo')!.scrollWidth - document.getElementById('conteudo')!.clientWidth));
    expect(await overflow()).toBeLessThanOrEqual(1);
    const small = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-testid=area-page] button, [data-testid=area-page] a.btn, [data-testid=area-page] select, [data-testid=area-page] input:not([type=radio]):not([type=checkbox]), [data-testid=area-page] summary, [data-testid=area-page] .seg label, [data-testid=area-page] .check')]
      .filter((el) => el.offsetParent !== null && !el.closest('.maplibregl-ctrl-attrib')).map((el) => ({ text: (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30), h: Math.round(el.getBoundingClientRect().height) })).filter((x) => x.h < 44));
    expect(small).toEqual([]);
    await page.getByText('Mapa', { exact: true }).click();
    await expect(page.locator('[data-testid=area-map][data-ready=true]')).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(1);
    await ctx.close();
  });

  test('sem violações sérias de acessibilidade; o foco volta ao botão depois do diálogo', async ({ page }) => {
    await seedProperty(page);
    await page.goto('/#/minha-area?demo=1&semwebgl=1');
    await typedPlot(page);
    expect(await seriousViolations(page)).toEqual([]);
    await page.getByRole('button', { name: 'Adicionar sensor' }).click();
    await expect(page.getByTestId('sensor-wizard')).toBeVisible();
    await page.waitForTimeout(400); // the dialog fades in; contrast is only meaningful once it is opaque
    expect(await seriousViolations(page)).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Adicionar sensor' })).toBeFocused();
  });
});

test.describe('Simulador · modelo 3D da estaca', () => {
  test('o conjunto rev G é carregado no perfil do solo e a vista de perto alterna', async ({ page, errors }) => {
    await page.goto('/#/simulador?modo=historico&vista=perfil&dia=120');
    await page.waitForFunction(() => (window as any).__gaiapusStake === 'ready', null, { timeout: 60000 });
    await expect(page.getByTestId('stake-failed')).toHaveCount(0);
    const closeUp = page.getByTestId('stake-closeup');
    await expect(closeUp).toHaveAttribute('aria-pressed', 'false');
    await closeUp.click(); await expect(closeUp).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('checkbox', { name: 'Mostrar a estaca Gaiapus' }).uncheck();
    await expect(page.getByTestId('stake-tools')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
  test('se o modelo não carregar, a simulação continua e avisa — sem desenhar o marcador antigo', async ({ page }) => {
    await page.route('**/*.glb*', (r) => r.abort());
    await page.goto('/#/simulador?modo=historico&vista=perfil&dia=120');
    await expect(page.getByTestId('stake-failed')).toContainText('Modelo 3D da estaca indisponível agora.');
    await expect(page.getByTestId('stake-closeup')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reproduzir' })).toBeEnabled();
    await page.getByRole('radio', { name: 'Talhão' }).check();
    await expect(page.getByTestId('stake-failed')).toHaveCount(0);
  });
});
