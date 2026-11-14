import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it } from 'vitest';
import { useDraftForm } from './form';
import { activateAccount, getState, resetAll } from '../store';
beforeEach(() => { activateAccount(null); resetAll(); localStorage.clear(); });

it('A → B → A recupera o rascunho de A e não o sobrescreve (D-06)', () => {
  const { result, rerender } = renderHook(({ k }) => useDraftForm(k, { cultivar: '' }), { initialProps: { k: 'registro:plantio:A' } });
  act(() => result.current.set('cultivar', 'CULTIVAR-A'));
  rerender({ k: 'registro:plantio:B' });
  expect(result.current.v.cultivar).toBe('');
  act(() => result.current.set('cultivar', 'CULTIVAR-B'));
  rerender({ k: 'registro:plantio:A' });
  expect(result.current.v.cultivar).toBe('CULTIVAR-A');
  expect(result.current.restored).toBe(true);
  expect(getState().drafts['registro:plantio:A'].cultivar).toBe('CULTIVAR-A');
  expect(getState().drafts['registro:plantio:B'].cultivar).toBe('CULTIVAR-B');
});

it('chave sem rascunho começa do valor inicial e não marca recuperado', () => {
  const { result, rerender } = renderHook(({ k }) => useDraftForm(k, { cultivar: 'x' }), { initialProps: { k: 'a' } });
  rerender({ k: 'b' });
  expect(result.current.v.cultivar).toBe('x');
  expect(result.current.restored).toBe(false);
});
