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
const state = vi.hoisted(() => ({ breakPackage: false }));
vi.mock('../../features/auth/client', () => ({ supabase: { auth: {} }, currentAccessToken: () => null }));
vi.mock('../adapters', async (original) => {
  const real = await original<typeof import('../adapters')>();
  return { ...real, simulations: { ...real.simulations,
    fieldShift: async () => ({ data: v1, meta: { kind: 'publicacao', source: v1.weather.source, note: 'Publicação v7' } }),
    fieldShiftStrategies: async (code: string) => { if (state.breakPackage) throw new AdapterError('field_shift_package_mismatch', 409); return real.simulations.fieldShiftStrategies(code); } } };
});
import { FieldShiftPage } from './FieldShift';

window.matchMedia ??= ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
const open = (query = '') => render(<MemoryRouter initialEntries={[`/field-shift${query}`]}><FieldShiftPage /></MemoryRouter>);
const num = (v: number, d = 1) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: d }).format(v);
const cell = (table: HTMLElement, metric: string, sel: string) => table.querySelector(`tr[data-metric="${metric}"] ${sel}`) as HTMLElement;
afterEach(() => { state.breakPackage = false; });

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
