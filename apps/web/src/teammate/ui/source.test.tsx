// The source footer is written in the language on screen, including after the language changes without a reload.
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { loadAllCatalogsForTest, setLocale } from '../i18n';
import type { Meta } from '../adapters/core';
import { Source } from './index';

const meta: Meta = { kind: 'publicacao', source: 'Open-Meteo ecmwf_ifs025', version: 'science-v7.3', note: 'retrospective', contract: 'water_risk_projection' };
beforeAll(async () => { await loadAllCatalogsForTest(); });
afterEach(() => { act(() => setLocale('pt-BR')); });

it('names the publication and the contract in Portuguese, then in English when the language changes on the same screen', () => {
  render(<Source meta={meta} />);
  const footer = () => screen.getByText(/science-v7\.3/).textContent;
  expect(footer()).toContain('Publicação science-v7.3 · retrospective · contrato water_risk_projection');
  act(() => setLocale('en'));
  expect(footer()).toContain('Publication science-v7.3 · retrospective · contract water_risk_projection');
  expect(footer()).not.toMatch(/Publicação|contrato/);
  act(() => setLocale('de'));
  expect(footer()).toContain('Veröffentlichung science-v7.3 · retrospective · Schnittstellenvertrag water_risk_projection');
  act(() => setLocale('fr'));
  expect(footer()).toContain('Publication science-v7.3 · retrospective · contrat water_risk_projection');
  act(() => setLocale('es'));
  expect(footer()).toContain('Publicación science-v7.3 · retrospective · contrato water_risk_projection');
});

it('a footer without version or contract is unchanged', () => {
  render(<Source meta={{ kind: 'fixture', source: 'NASA POWER', note: 'field-shift-v2-0d12285bf7a9' }} />);
  expect(screen.getByText(/NASA POWER/).textContent).toBe('Dado de exemplo do pacote · Fonte: NASA POWER · field-shift-v2-0d12285bf7a9');
});

it('a footer with a version and nothing else names only the publication', () => {
  render(<Source meta={{ kind: 'publicacao', source: 'API /v1/locations', version: 'loc-2026.11' }} />);
  expect(screen.getByText(/loc-2026/).textContent).toBe('Publicação da API · Fonte: API /v1/locations · Publicação loc-2026.11');
});
