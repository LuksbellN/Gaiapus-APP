import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { useDraftForm } from './ui/form';
vi.mock('./lazyPage', () => ({
  lazyPage: () => function FormProbe() { const form = useDraftForm('property', { name: '' }); return <input aria-label="Private draft" {...form.bind('name')} />; },
  preloadLightPages() {}, preloadRoute() {},
}));
import { App } from './App';
import { activateAccount, getState, resetAll } from './store';
const user = { userId: 'A', name: 'A', email: 'a@example.com', researchConsent: false, consentAt: null };
beforeEach(() => { activateAccount(null); resetAll(); localStorage.clear(); });
it('remounts private forms when another account or guest becomes active', () => {
  activateAccount(user);
  render(<MemoryRouter initialEntries={['/propriedades']}><App /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Private draft'), { target: { value: 'A-only property' } });
  act(() => activateAccount({ ...user, userId: 'B' }));
  expect(screen.getByLabelText('Private draft')).toHaveValue('');
  fireEvent.change(screen.getByLabelText('Private draft'), { target: { value: 'B-only property' } });
  expect(getState().drafts.property.name).toBe('B-only property');
  act(() => activateAccount(null));
  expect(screen.getByLabelText('Private draft')).toHaveValue('');
});
