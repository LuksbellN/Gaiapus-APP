// Field Shift: three calculated strategies from one pinned package, next to the previous A/B publication.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import type { FieldShiftSummary } from '../sim/field-shift-decision';
import { AdapterError } from '../adapters/core';

const v1 = JSON.parse(readFileSync(join(process.cwd(), '..', '..', 'packages', 'contracts', 'upstream', 'v7', 'contracts', 'examples', 'field-shift-sorriso.json'), 'utf8'));
const summary = JSON.parse(readFileSync(join(process.cwd(), 'src', 'teammate', 'data', 'field-shift-v2', 'summary.json'), 'utf8')) as FieldShiftSummary;
const state = vi.hoisted(() => ({ breakPackage: false, bare: null as null | 'gap' | 'refused' }));
vi.mock('../../features/auth/client', () => ({ supabase: { auth: {} }, currentAccessToken: () => null }));
vi.mock('../adapters', async (original) => {
  const real = await original<typeof import('../adapters')>();
  return { ...real, simulations: { ...real.simulations,
    fieldShift: async () => ({ data: v1, meta: { kind: 'publicacao', source: v1.weather.source, note: 'Publicação v7' } }),
    fieldShiftStrategies: async (code: string) => { if (state.breakPackage) throw new AdapterError('field_shift_package_mismatch', 409); return real.simulations.fieldShiftStrategies(code); },
    fieldShiftBareSoil: async (code: string, s: FieldShiftSummary) => {
      if (state.bare === 'refused') throw new AdapterError('field_shift_bare_soil_mismatch', 409);
      const r = await real.simulations.fieldShiftBareSoil(code, s); if (state.bare !== 'gap') return r;
      const data = structuredClone(r.data); data.scenarios.soy_fallow.mean.bare_days_nov_apr = null; return { ...r, data }; } } };
});
import { FieldShiftPage } from './FieldShift';

window.matchMedia ??= ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
const open = (query = '') => render(<MemoryRouter initialEntries={[`/field-shift${query}`]}><FieldShiftPage /></MemoryRouter>);
const num = (v: number, d = 1) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: d }).format(v);
const cell = (table: HTMLElement, metric: string, sel: string) => table.querySelector(`tr[data-metric="${metric}"] ${sel}`) as HTMLElement;
afterEach(() => { state.breakPackage = false; state.bare = null; });

it('shows the three calculated strategies with the published means, and absent maize as "not grown"', async () => {
  open();
  const table = await screen.findByTestId('fs-strategy-table');
  expect(within(table).getByRole('columnheader', { name: 'A · Pousio' })).toBeInTheDocument();
  expect(within(table).getByRole('columnheader', { name: 'B · Braquiária' })).toBeInTheDocument();
  expect(within(table).getByRole('columnheader', { name: 'C · Pousio prolongado' })).toBeInTheDocument();
  expect(within(table).getByRole('columnheader', { name: 'B − A' })).toBeInTheDocument();
  expect(within(table).getByRole('columnheader', { name: 'C − A' })).toBeInTheDocument();
  for (const s of ['reference_fallow', 'brachiaria', 'soy_long_fallow'] as const) {
    expect(cell(table, 'covered_days', `[data-strategy="${s}"]`)).toHaveTextContent(num(summary.scenarios[s].mean.covered_days!));
    expect(cell(table, 'year_water_use_mm', `[data-strategy="${s}"]`)).toHaveTextContent(num(summary.scenarios[s].mean.year_water_use_mm!));
  }
  for (const metric of ['maize_deficit_mm', 'maize_stress_days']) {
    expect(cell(table, metric, '[data-strategy="soy_long_fallow"]')).toHaveTextContent('não cultivado');
    expect(cell(table, metric, '[data-strategy="soy_long_fallow"]')).not.toHaveTextContent(/\d/);
    expect(cell(table, metric, '[data-delta="soy_long_fallow"]')).not.toHaveTextContent(/\d/);
    expect(cell(table, metric, '[data-strategy="reference_fallow"]')).toHaveTextContent(/\d/);
  }
  const published = summary.comparisons.soy_long_fallow_minus_reference_fallow.covered_days;
  expect(cell(table, 'covered_days', '[data-delta="soy_long_fallow"]')).toHaveTextContent(`−${num(Math.abs(published.mean!))}`);
  expect(screen.getByText('Não avaliado — indisponível')).toBeInTheDocument();
  expect(screen.getByTestId('fs-package')).toHaveTextContent(summary.package_id);
  expect(screen.getByTestId('fs-strategies')).toHaveTextContent('menos culturas — não é uma rotação diversificada');
  expect(screen.getByTestId('fs-strategies')).toHaveTextContent('referência da demonstração');
  expect(screen.getByText(/não é intervalo de previsão/)).toBeInTheDocument();
});

it('draws the three reserves of the chosen year with a text legend for each', async () => {
  open();
  await screen.findByTestId('fs-strategy-table');
  expect(screen.getByRole('img', { name: 'Reserva de água nas três estratégias em 2020/2021' })).toBeInTheDocument();
  for (const label of ['Reserva A · pousio (mm)', 'Reserva B · braquiária (mm)', 'Reserva C · pousio prolongado (mm)']) expect(screen.getByText(label)).toBeInTheDocument();
});

it('changing the reference changes the differences and never the values', async () => {
  open();
  const table = await screen.findByTestId('fs-strategy-table');
  const before = ['reference_fallow', 'brachiaria', 'soy_long_fallow'].map((s) => cell(table, 'year_drainage_mm', `[data-strategy="${s}"]`).textContent);
  await userEvent.click(screen.getByRole('radio', { name: 'C · Pousio prolongado' }));
  const after = await screen.findByTestId('fs-strategy-table');
  expect(after).toHaveAttribute('data-reference', 'soy_long_fallow');
  expect(within(after).getByRole('columnheader', { name: 'A − C' })).toBeInTheDocument();
  expect(within(after).getByRole('columnheader', { name: 'B − C' })).toBeInTheDocument();
  expect(['reference_fallow', 'brachiaria', 'soy_long_fallow'].map((s) => cell(after, 'year_drainage_mm', `[data-strategy="${s}"]`).textContent)).toEqual(before);
  const published = summary.comparisons.soy_long_fallow_minus_reference_fallow.covered_days;
  expect(cell(after, 'covered_days', '[data-delta="reference_fallow"]')).toHaveTextContent(`+${num(Math.abs(published.mean!))}`);
  expect(cell(after, 'maize_deficit_mm', '[data-delta="reference_fallow"]')).not.toHaveTextContent(/\d/); // nothing to pair with
});

it('a summary and a series of different packages are refused: the last valid A/B publication stays', async () => {
  state.breakPackage = true;
  open();
  expect(await screen.findByText('Pacote das três estratégias incoerente')).toBeInTheDocument();
  expect(screen.queryByTestId('fs-strategy-table')).toBeNull();
  expect(screen.getByRole('columnheader', { name: 'A · Pousio' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'B − A' })).toBeInTheDocument();
  expect(screen.queryByRole('columnheader', { name: /^C · / })).toBeNull();
  expect(screen.getByText('Não avaliado — indisponível')).toBeInTheDocument();
});

// M2 — producer priority and decision cards.
import { setState } from '../store';
const groups = () => screen.getByTestId('fs-strategy-table').getAttribute('data-groups');
const numbers = () => [...screen.getByTestId('fs-strategy-table').querySelectorAll('td[data-strategy]')].map((td) => `${td.closest('tr')!.getAttribute('data-metric')}:${td.getAttribute('data-strategy')}:${td.textContent}`).sort();

it('without a plan the priority is the visible default; changing it reorders the indicators and keeps every number', async () => {
  open();
  await screen.findByTestId('fs-strategy-table');
  const picker = screen.getByTestId('fs-priority');
  expect(picker).toHaveAttribute('data-source', 'default');
  expect(within(picker).getByRole('radio', { name: 'Conservar solo e água' })).toBeChecked();
  expect(picker).toHaveTextContent('Nenhum plano escolhido');
  expect(picker).toHaveTextContent('Não muda o clima, o modelo nem os resultados');
  expect(groups()).toBe('cover,common,soy,maize,own');
  const before = numbers(); const pkg = screen.getByTestId('fs-package').textContent;
  expect(screen.getByTestId('fs-cards').querySelector('[data-strategy="brachiaria"] [data-part="benefits"] li')).toHaveAttribute('data-line', 'covered');
  await userEvent.click(within(picker).getByRole('radio', { name: 'Produção' }));
  expect(groups()).toBe('soy,maize,common,cover,own');
  expect(numbers()).toEqual(before);
  expect(screen.getByTestId('fs-package').textContent).toBe(pkg);
  expect(screen.getByTestId('fs-priority')).toHaveTextContent('São indicadores hídricos, não produção prevista.');
  expect(screen.getByTestId('fs-cards').querySelector('[data-strategy="brachiaria"] [data-part="benefits"] li')).toHaveAttribute('data-line', 'soy');
});

it('the priority comes from the plan named in the address, never from another plan', async () => {
  setState({ plans: [{ id: 'plano_novo', createdAt: '2026-11-14T10:00:00Z', data: { prioridade: 'margem' } }, { id: 'plano_velho', createdAt: '2026-11-01T10:00:00Z', data: { prioridade: 'producao' } }] });
  try {
    const first = open('?plano=plano_velho');
    await screen.findByTestId('fs-strategy-table');
    expect(screen.getByTestId('fs-priority')).toHaveAttribute('data-priority', 'producao');
    expect(screen.getByTestId('fs-priority')).toHaveAttribute('data-source', 'plan');
    expect(screen.getByTestId('fs-priority')).toHaveTextContent('Prioridade do plano salvo em 1 nov 2026');
    first.unmount();
    const second = open(); // no plan in the address: the newest saved plan is not used
    await screen.findByTestId('fs-strategy-table');
    expect(screen.getByTestId('fs-priority')).toHaveAttribute('data-priority', 'conservacao');
    second.unmount();
    open('?plano=plano_de_outra_conta');
    await screen.findByTestId('fs-strategy-table');
    expect(screen.getByTestId('fs-priority')).toHaveAttribute('data-source', 'plan_missing');
    expect(screen.getByTestId('fs-priority')).toHaveTextContent('não existe nesta conta');
  } finally { setState({ plans: [] }); }
});

it('margin is not calculated without yield and costs: no default value appears', async () => {
  open('?prioridade=margem');
  await screen.findByTestId('fs-strategy-table');
  const margin = screen.getByTestId('fs-margin');
  expect(margin).toHaveTextContent('a margem não é calculada aqui');
  expect(margin).toHaveTextContent('Nenhum desses valores tem padrão');
  expect(margin).not.toHaveTextContent(/R\$|\d/);
  expect(groups()).toBe('maize,soy,common,cover,own');
});

it('each strategy has a card with why, evidence, simulated results, gaps and risks; C never wins on absent maize', async () => {
  open();
  await screen.findByTestId('fs-strategy-table');
  const cards = screen.getByTestId('fs-cards');
  for (const s of ['reference_fallow', 'brachiaria', 'soy_long_fallow']) {
    const card = cards.querySelector(`[data-strategy="${s}"]`) as HTMLElement;
    for (const heading of ['Por quê', 'Evidência', 'O que a simulação mostra', 'Lacunas', 'Riscos para revisar no local']) expect(within(card).getByRole('heading', { name: heading })).toBeInTheDocument();
    expect(card).toHaveTextContent('Média de 6 safras (2015/2016 a 2020/2021)');
    expect(card).toHaveTextContent('sem medição em campo');
  }
  const c = cards.querySelector('[data-strategy="soy_long_fallow"]') as HTMLElement;
  expect(c.querySelector('[data-line="maize"]')).toHaveTextContent('O milho não é cultivado nesta estratégia');
  expect(c.querySelector('[data-line="maize"]')).not.toHaveTextContent(/\d/);
  expect(c.querySelector('[data-line="covered"]')).toHaveTextContent(`${num(summary.scenarios.soy_long_fallow.mean.covered_days!)} dias por ano (−120,0 dias em relação a A)`);
  const a = cards.querySelector('[data-strategy="reference_fallow"]') as HTMLElement;
  expect(a.querySelector('[data-line="covered"]')).toHaveTextContent('referência da comparação');
  const noStraw = summary.sensitivity.parameters.find((p) => p.parameter === 'straw_factor' && Number(p.value) === 1)!.comparisons.brachiaria_minus_reference_fallow.next_soy_establishment_deficit_mm.mean!;
  expect(cards.querySelector('[data-strategy="brachiaria"] [data-part="gaps"]')).toHaveTextContent(`é de ${num(noStraw, 2)} mm`);
  expect(document.body).not.toHaveTextContent(/melhor estratégia|recomendad/i);
});

it('with B as reference the cards compare against B', async () => {
  open('?ref=B');
  await screen.findByTestId('fs-strategy-table');
  const cards = screen.getByTestId('fs-cards');
  expect(cards.querySelector('[data-strategy="brachiaria"] [data-line="covered"]')).toHaveTextContent('referência da comparação');
  expect(cards.querySelector('[data-strategy="reference_fallow"] [data-line="covered"]')).toHaveTextContent('em relação a B');
});

it('qualitative agronomy says "not assessed" where no applicable source exists, and the reading guide explains the terms', async () => {
  open();
  await screen.findByTestId('fs-strategy-table');
  const matrix = screen.getByTestId('fs-matrix');
  expect(within(matrix).getAllByText('não avaliado')).toHaveLength(15);
  expect(matrix).toHaveTextContent('não se aplica automaticamente à soja');
  expect(matrix).not.toHaveTextContent(/quebra o ciclo|fixa nitrogênio/i);
  const guide = screen.getByTestId('reading-guide');
  for (const term of ['et0', 'etc', 'eta', 'deficit', 'reserve', 'scale']) expect(guide.querySelector(`[data-term="${term}"]`)).not.toBeNull();
  expect(guide).toHaveTextContent('Não é umidade volumétrica nem leitura de sonda');
  expect(guide).toHaveTextContent('Um ponto de grade não é a média do município nem a medição de um talhão');
  expect(guide).toHaveTextContent(summary.weather.source);
});

// M3 — rain sensitivity: three calculated points, never an interpolation.
const point = (percent: number) => summary.sensitivity.rain.points.find((p) => p.rain_change_percent === percent)!;
it('rain control offers only the calculated points and says it is not a forecast', async () => {
  open();
  await screen.findByTestId('fs-strategy-table');
  const rain = screen.getByTestId('fs-rain');
  expect(within(rain).getAllByRole('radio').map((r) => (r as HTMLInputElement).value)).toEqual(['-20', '0', '20']);
  expect(within(rain).getByRole('radio', { name: 'histórica' })).toBeChecked();
  expect(rain).toHaveAttribute('data-multiplier', '1');
  expect(rain).toHaveTextContent('Teste de sensibilidade sobre o clima histórico — não é previsão climática.');
  expect(rain).toHaveTextContent('Temperatura: não calculada neste pacote');
  expect(rain.querySelector('input[type="range"]')).toBeNull();
});

it('−20% and +20% show the recalculated strategies of that point, with the same package', async () => {
  open();
  const table = await screen.findByTestId('fs-strategy-table');
  const base = cell(table, 'year_water_use_mm', '[data-strategy="reference_fallow"]').textContent;
  const pkg = screen.getByTestId('fs-package').textContent;
  await userEvent.click(within(screen.getByTestId('fs-rain')).getByRole('radio', { name: '−20%' }));
  const dry = point(-20), t2 = screen.getByTestId('fs-strategy-table');
  expect(screen.getByTestId('fs-rain')).toHaveAttribute('data-multiplier', '0.8');
  for (const s of ['reference_fallow', 'brachiaria', 'soy_long_fallow'] as const) {
    expect(cell(t2, 'year_water_use_mm', `[data-strategy="${s}"]`)).toHaveTextContent(num(dry.scenarios[s].mean.year_water_use_mm!));
    expect(cell(t2, 'soy_deficit_mm', `[data-strategy="${s}"]`)).toHaveTextContent(num(dry.scenarios[s].mean.soy_deficit_mm!));
  }
  expect(cell(t2, 'year_water_use_mm', '[data-strategy="reference_fallow"]').textContent).not.toBe(base);
  const published = dry.comparisons.soy_long_fallow_minus_reference_fallow.year_drainage_mm.mean!;
  expect(cell(t2, 'year_drainage_mm', '[data-delta="soy_long_fallow"]')).toHaveTextContent(`+${num(published)}`);
  expect(cell(t2, 'maize_deficit_mm', '[data-strategy="soy_long_fallow"]')).toHaveTextContent('não cultivado');
  expect(screen.getByTestId('fs-rain')).toHaveTextContent(`Chuva −20%: ${num(dry.scenarios.reference_fallow.mean.year_rain_mm!, 0)} mm por ano agrícola.`);
  expect(screen.getByTestId('fs-rain')).toHaveTextContent('multiplicada por 0,8');
  expect(screen.getByTestId('fs-package').textContent).toBe(pkg);
  expect(screen.getByTestId('fs-cards').querySelector('[data-strategy="reference_fallow"] [data-line="soy"]')).toHaveTextContent(num(dry.scenarios.reference_fallow.mean.soy_deficit_mm!));
  expect(screen.getByText('O gráfico diário mostra o clima histórico, sem alteração.')).toBeInTheDocument();
  await userEvent.click(within(screen.getByTestId('fs-rain')).getByRole('radio', { name: '+20%' }));
  expect(cell(screen.getByTestId('fs-strategy-table'), 'year_water_use_mm', '[data-strategy="brachiaria"]')).toHaveTextContent(num(point(20).scenarios.brachiaria.mean.year_water_use_mm!));
});

it('a rain value that was not calculated falls back to the historical one instead of inventing a result', async () => {
  open('?chuva=10');
  const table = await screen.findByTestId('fs-strategy-table');
  expect(screen.getByTestId('fs-rain')).toHaveAttribute('data-multiplier', '1');
  expect(cell(table, 'year_water_use_mm', '[data-strategy="reference_fallow"]')).toHaveTextContent(num(summary.scenarios.reference_fallow.mean.year_water_use_mm!));
});

// Final review — one version on screen: with the v2 package shown, no number of the older publication remains.
it('parameter sensitivity and hypothesis notice come from the v2 package, with C and paired differences against A', async () => {
  open('?ref=C&chuva=-20');
  await screen.findByTestId('fs-strategy-table');
  const table = screen.getByTestId('fs-parameters');
  expect(table).toHaveTextContent('diferenças pareadas em relação a A');
  expect(table).toHaveTextContent('com a chuva histórica');
  const signed2 = (v: number) => (Math.abs(v) < 0.005 ? num(0, 2) : `${v > 0 ? '+' : '−'}${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v))}`);
  for (const p of summary.sensitivity.parameters) {
    const row = table.querySelector(`tr[data-parameter="${p.parameter}"][data-value="${p.value}"]`) as HTMLElement;
    for (const alt of ['brachiaria', 'soy_long_fallow'] as const) for (const k of ['storage_at_next_sowing_mm', 'soy_deficit_mm', 'next_soy_establishment_deficit_mm', 'year_water_use_mm'] as const) {
      expect(row.querySelector(`[data-alt="${alt}"][data-metric="${k}"]`), `${p.parameter} ${p.value} ${alt} ${k}`).toHaveTextContent(signed2(p.comparisons[`${alt}_minus_reference_fallow`][k].mean!));
    }
  }
  expect(table.querySelectorAll('tbody tr')).toHaveLength(summary.sensitivity.parameters.length);
  // v1 publishes -0.36 for the soy deficit at cover Kc 0.75 (difference of means); the package pairs by year and has another value
  const v1Row = v1.sensitivity.find((s: any) => s.parameter === 'cover_kc' && s.value === 0.75);
  const v2Mean = summary.sensitivity.parameters.find((p) => p.parameter === 'cover_kc' && p.value === 0.75)!.comparisons.brachiaria_minus_reference_fallow.soy_deficit_mm.mean!;
  expect(v1Row.difference_soy_deficit_mm).not.toBe(v2Mean);
  expect(screen.queryByText('Cada linha muda uma hipótese por vez. Valores são B − A, média das 6 safras.')).toBeNull();
});

it('when the package is refused, the older publication keeps its own sensitivity table', async () => {
  state.breakPackage = true;
  open();
  await screen.findByText('Pacote das três estratégias incoerente');
  expect(screen.queryByTestId('fs-parameters')).toBeNull();
  expect(screen.getByText('Cada linha muda uma hipótese por vez. Valores são B − A, média das 6 safras.')).toBeInTheDocument();
});

const ext = JSON.parse(readFileSync(join(process.cwd(), 'src', 'teammate', 'data', 'sorriso-field-shift-rotations.json'), 'utf8'));
const bareCell = (metric: string, sel: string) => screen.getByTestId('fs-bare-table').querySelector(`tr[data-metric="${metric}"] ${sel}`) as HTMLElement;
it('bare soil card: three strategies, B − A and C − A, the erosion-proxy label and the ±20% rows labelled as a sensitivity test', async () => {
  open();
  const table = await screen.findByTestId('fs-bare-table');
  for (const name of ['A · Pousio', 'B · Braquiária', 'C · Pousio prolongado', 'B − A', 'C − A']) expect(within(table).getByRole('columnheader', { name })).toBeInTheDocument();
  expect(bareCell('rain_on_bare_soil_mm', '[data-strategy="soy_long_fallow"]')).toHaveTextContent(num(ext.scenarios.soy_fallow.mean.rain_on_bare_soil_mm));
  expect(bareCell('bare_days_nov_apr', '[data-strategy="soy_long_fallow"]')).toHaveTextContent(num(ext.scenarios.soy_fallow.mean.bare_days_nov_apr));
  expect(bareCell('bare_days_nov_apr', '[data-strategy="reference_fallow"]')).toHaveTextContent('0');
  expect(within(table).getByText('proxy de exposição à erosão, não erosão')).toBeInTheDocument();
  const sens = screen.getByTestId('fs-bare-sens');
  expect(sens.querySelectorAll('tr[data-highlight]')).toHaveLength(4);
  expect(screen.getByText('Teste de sensibilidade (não é projeção climática).')).toBeInTheDocument();
  expect(within(sens).getByText(/Temperatura \+1,5 °C: não simulada/)).toBeInTheDocument();
});

it('a missing bare-soil value shows "—", never 0', async () => {
  state.bare = 'gap';
  open();
  await screen.findByTestId('fs-bare-table');
  expect(bareCell('bare_days_nov_apr', '[data-strategy="soy_long_fallow"]').textContent).toBe('—');
  expect(bareCell('bare_days_nov_apr', '[data-strategy="soy_long_fallow"]')).not.toHaveTextContent('0');
});

it('the priority moves the bare soil card: first with conservation, after the table otherwise', async () => {
  const before = (a: HTMLElement, b: HTMLElement) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
  const first = open();
  await screen.findByTestId('fs-bare-table');
  expect(screen.getByTestId('fs-bare')).toHaveAttribute('data-highlight', 'true');
  expect(before(screen.getByTestId('fs-bare'), screen.getByTestId('fs-cards'))).toBe(true);
  first.unmount();
  open('?prioridade=producao');
  await screen.findByTestId('fs-bare-table');
  expect(screen.getByTestId('fs-bare')).not.toHaveAttribute('data-highlight');
  expect(before(screen.getByTestId('fs-strategy-table'), screen.getByTestId('fs-bare'))).toBe(true);
});

it('a bare-soil extension that does not match the package shows no number', async () => {
  state.bare = 'refused';
  open();
  await screen.findByText('Solo nu indisponível');
  expect(screen.getByTestId('fs-bare')).toHaveAttribute('data-status', 'refused');
  expect(screen.getByTestId('fs-bare')).not.toHaveTextContent(/\d/);
  expect(screen.getByTestId('fs-strategy-table')).toBeInTheDocument();
});

it('the priority sentence quotes the package numbers on screen and the cards carry the decision footer', async () => {
  const first = open();
  const sentence = await screen.findByTestId('fs-priority-sentence');
  const mean = summary.scenarios;
  for (const v of [mean.reference_fallow.mean.bare_days!, mean.soy_long_fallow.mean.bare_days!, mean.soy_long_fallow.mean.year_drainage_mm!]) expect(sentence).toHaveTextContent(num(v));
  expect(screen.getByTestId('fs-cards-footer')).toHaveTextContent('Apoia, não substitui, a decisão do produtor e do agrônomo.');
  first.unmount();
  open('?prioridade=producao');
  const production = await screen.findByTestId('fs-priority-sentence');
  for (const v of [mean.reference_fallow.mean.soy_deficit_mm!, mean.brachiaria.mean.maize_deficit_mm!]) expect(production).toHaveTextContent(num(v));
  expect(production).toHaveTextContent('C não cultiva milho');
});
