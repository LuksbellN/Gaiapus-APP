import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { me } = vi.hoisted(() => ({ me: vi.fn() }));
vi.mock('../../features/auth/client', () => ({ supabase: { auth: {} }, currentAccessToken: () => null }));
vi.mock('../adapters/http', async (orig) => { const real = await orig<typeof import('../adapters/http')>(); return { ...real, backend: { ...real.backend, me } }; });
vi.mock('../area/AreaMap', () => ({ default: () => <div data-testid="map-stub" /> }));

import { setLatency } from '../adapters/core';
import { sensors } from '../area/adapter';
import { closeRing, type PolygonGeometry } from '../area/geometry';
import { activateAccount, getState, setState, type Session } from '../store';
import { MyArea } from './MyArea';

window.matchMedia ??= ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as typeof window.matchMedia;
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) { this.open = true; };
HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) { this.open = false; };

const user = (id: string): NonNullable<Session> => ({ userId: id, name: 'Ana', email: 'ana@example.test', researchConsent: false, consentAt: null });
const square: PolygonGeometry = { type: 'Polygon', coordinates: [closeRing([[-48.27, -18.92], [-48.26, -18.92], [-48.26, -18.91], [-48.27, -18.91]])] };
const ME = { profile: { user_id: 'user-a', display_name: 'Ana', created_at: 't', updated_at: 't' }, preferences: { locale: 'pt-BR', last_monitored_place_id: null } };
function Where() { const l = useLocation(); return <output data-testid="where">{l.pathname + l.search}</output>; }
const open = (url = '/minha-area') => render(<MemoryRouter initialEntries={[url]}><MyArea /><Where /></MemoryRouter>);

async function seed() {
  setState({ properties: [{ id: 'prop1', name: 'Sítio Boa Vista', municipalityCode: '3170206', municipalityName: 'Uberlândia', uf: 'MG', areaHa: null, createdAt: 't', updatedAt: 't' }] });
  const plot = await sensors.savePlot({ propertyId: 'prop1', name: 'Talhão secreto', soil: 'Não sei', irrigation: 'Sequeiro', geometry: square });
  await sensors.claimDevice({ deviceId: 'c4000110', claimCode: 'K7Q2-M9XD' });
  await sensors.renameDevice('c4000110', 'Estaca da baixada');
  await sensors.install({ deviceId: 'c4000110', plotId: plot.id, point: [-48.265, -18.915], positionSource: 'manual', accuracyM: null, positionAt: '2026-11-15T12:00:00.000Z' });
  return plot;
}
const openSensor = async () => { fireEvent.click(await screen.findByRole('button', { name: /Estaca da baixada/ })); return screen.findByTestId('sensor-detail'); };

beforeEach(() => { setLatency(0); localStorage.clear(); me.mockReset(); me.mockResolvedValue(ME); activateAccount(null); });

describe('access to "Minha área"', () => {
  it('without a verified session nothing private is shown, only the way in', async () => {
    activateAccount(user('user-a')); await seed(); activateAccount(null);
    open();
    expect(await screen.findByTestId('area-gate')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/conta?voltar=/minha-area');
    expect(screen.queryByText(/Talhão secreto/)).toBeNull(); expect(screen.queryByText(/c4000110/)).toBeNull();
    expect(me).not.toHaveBeenCalled();
  });
  it('a session the server rejects (401 from GET /v1/me) opens nothing', async () => {
    activateAccount(user('user-a')); await seed();
    me.mockRejectedValue(Object.assign(new Error('Authentication required'), { code: 'unauthenticated', status: 401 }));
    open();
    expect(await screen.findByText('O servidor não aceitou esta sessão.')).toBeInTheDocument();
    expect(screen.queryByText(/Talhão secreto/)).toBeNull(); expect(screen.queryByTestId('area-page')).toBeNull();
  });
  it('a verified session confirmed by the server opens the area, permanently labelled as a local demonstration', async () => {
    activateAccount(user('user-a')); await seed();
    open();
    expect(await screen.findByText('Sessão confirmada pelo servidor')).toBeInTheDocument();
    expect(me).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('area-demo-banner')).toHaveTextContent('Demonstração local — sem dispositivo real conectado.');
    expect(screen.getByText(/Talhão secreto/)).toBeInTheDocument();
  });
  it('when the server cannot be reached the session is not called confirmed', async () => {
    activateAccount(user('user-a')); await seed();
    me.mockRejectedValue(Object.assign(new Error('unreachable'), { code: 'api_unreachable', status: 0 }));
    open();
    expect(await screen.findByText('Sessão não confirmada pelo servidor')).toBeInTheDocument();
    expect(screen.queryByText('Sessão confirmada pelo servidor')).toBeNull();
  });
  it('the guest demonstration is opt-in and says it is not authentication', async () => {
    open('/minha-area?demo=1');
    expect(await screen.findByText('Você não entrou em uma conta.')).toBeInTheDocument();
    expect(screen.getByText(/Isto não é autenticação/)).toBeInTheDocument();
    expect(screen.queryByText('Sessão confirmada pelo servidor')).toBeNull();
  });
  it('another account does not see the first account data', async () => {
    activateAccount(user('user-a')); await seed(); activateAccount(user('user-b'));
    open();
    expect(await screen.findByText('Nenhuma propriedade cadastrada')).toBeInTheDocument();
    expect(screen.queryByText(/Talhão secreto/)).toBeNull();
  });
  it('takes the ownership code out of the address as soon as a QR link is opened', async () => {
    activateAccount(user('user-a')); await seed();
    open('/minha-area?d=c4000110&c=K7Q2-M9XD');
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/minha-area'));
    expect(screen.getByTestId('where').textContent).not.toContain('K7Q2-M9XD');
    expect(JSON.stringify(getState()) + JSON.stringify({ ...localStorage })).not.toContain('K7Q2-M9XD');
  });
});

describe('a stake on the screen', () => {
  beforeEach(async () => { activateAccount(user('user-a')); await seed(); });
  it('shows both depths, raw moisture as not calibrated and the battery as a voltage — no percentage', async () => {
    await act(async () => { await sensors.addSyntheticMeasurement('c4000110'); });
    open(); const detail = await openSensor();
    const table = within(detail).getByTestId('readings-table');
    expect(within(table).getByRole('rowheader', { name: '15 cm' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: '40 cm' })).toBeInTheDocument();
    expect(table).toHaveTextContent('18342'); expect(table).toHaveTextContent('21011'); expect(table).toHaveTextContent('valor bruto · não calibrado');
    expect(table.textContent).not.toMatch(/%/);
    const battery = within(detail).getByTestId('battery');
    expect(battery).toHaveTextContent('3,29 V'); expect(battery).toHaveTextContent('3285 mV'); expect(battery.textContent).not.toMatch(/%/);
    expect(detail).toHaveTextContent('Leitura sintética de exemplo.');
    expect(detail).toHaveTextContent('não informado'); // charging bit absent is "not reported"
  });
  it('before any reading it is "waiting for first contact", never an error', async () => {
    open(); const detail = await openSensor();
    expect(within(detail).getByText('Aguardando primeiro contato')).toBeInTheDocument();
    expect(detail).toHaveTextContent('Cadastrada — aguardando primeiro contato');
  });
  it('storing a new interval reads as stored in this browser — not sent, not applied — and a later reading does not change it', async () => {
    open(); const detail = await openSensor();
    fireEvent.click(within(detail).getByRole('radio', { name: '15 min' }));
    fireEvent.click(within(detail).getByRole('button', { name: 'Guardar ajustes' }));
    const status = await within(detail).findByTestId('command-status');
    expect(status).toHaveAttribute('data-state', 'saved');
    expect(status).toHaveTextContent('Guardado neste navegador — nada foi enviado à estaca.');
    expect(status).toHaveTextContent('intervalo de 15 min');
    expect(status.textContent).not.toMatch(/aplicad|confirmad[oa] pel|conclu[ií]d/i);
    await act(async () => { await sensors.addSyntheticMeasurement('c4000110'); });
    expect(within(detail).getByTestId('command-status')).toHaveAttribute('data-state', 'saved');
    expect(within(detail).getByTestId('command-status')).toHaveTextContent('Guardado neste navegador — nada foi enviado à estaca.');
  });
  it('rejects 0, 256 and fractions in the custom interval and stores nothing', async () => {
    open(); const detail = await openSensor();
    fireEvent.click(within(detail).getByRole('radio', { name: 'Outro' }));
    for (const bad of ['0', '256', '1.5']) {
      fireEvent.change(within(detail).getByTestId('interval-input'), { target: { value: bad } });
      fireEvent.click(within(detail).getByRole('button', { name: 'Guardar ajustes' }));
      expect(within(detail).getAllByText('O intervalo precisa ser um número inteiro de 1 a 255 minutos.').length).toBeGreaterThan(0);
    }
    expect(getState().commands).toEqual([]);
    for (const good of ['1', '255']) {
      fireEvent.change(within(detail).getByTestId('interval-input'), { target: { value: good } });
      fireEvent.click(within(detail).getByRole('button', { name: 'Guardar ajustes' }));
      await waitFor(() => expect(getState().commands.at(-1)?.config.intervalMin).toBe(Number(good)));
    }
  });
  it('offers no OTA, Bluetooth, Wi-Fi or irrigation control', async () => {
    open(); const detail = await openSensor();
    const controls = within(detail).getAllByRole('button').map((b) => b.textContent ?? '').join(' | ');
    expect(controls).not.toMatch(/OTA|Bluetooth|Wi-?Fi|irriga|firmware|atualizar/i);
  });
});

describe('plots on the screen', () => {
  beforeEach(async () => { activateAccount(user('user-a')); await seed(); });
  it('reopens a saved plot with its calculated area in hectares', async () => {
    open();
    fireEvent.click(await screen.findByRole('button', { name: /Talhão secreto/ }));
    expect(await screen.findByTestId('plot-area')).toHaveTextContent(/1\d\d,\d\d ha/);
    fireEvent.click(screen.getByRole('button', { name: 'Editar contorno e dados' }));
    expect((await screen.findByTestId('plot-coords') as HTMLTextAreaElement).value.split('\n')).toHaveLength(4);
  });
  it('refuses a self-crossing outline, and cancelling keeps the stored plot', async () => {
    const before = getState().plots[0];
    open();
    fireEvent.click(await screen.findByRole('button', { name: /Talhão secreto/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar contorno e dados' }));
    fireEvent.change(await screen.findByTestId('plot-coords'), { target: { value: '0, 0\n1, 1\n0, 1\n1, 0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar coordenadas' }));
    expect(screen.getByTestId('plot-geometry-status')).toHaveTextContent('O contorno cruza a si mesmo.');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar talhão' }));
    expect(await screen.findByTestId('plot-error')).toHaveTextContent('O contorno cruza a si mesmo.');
    expect(getState().plots[0]).toEqual(before);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(await screen.findByTestId('discard-draft'));
    expect(getState().plots[0]).toEqual(before);
  });
  it('says so when fewer than three corners are given', async () => {
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Demarcar talhão' }));
    fireEvent.change(await screen.findByTestId('plot-coords'), { target: { value: '-18.92, -48.27\n-18.92, -48.26' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar coordenadas' }));
    expect(screen.getByTestId('plot-geometry-status')).toHaveTextContent('Marque pelo menos três cantos diferentes.');
  });
  it('warns, without moving anything, when a new outline leaves a stake outside', async () => {
    open();
    fireEvent.click(await screen.findByRole('button', { name: /Talhão secreto/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar contorno e dados' }));
    fireEvent.change(await screen.findByTestId('plot-coords'), { target: { value: '-18.92, -48.27\n-18.92, -48.268\n-18.918, -48.268\n-18.918, -48.27' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar coordenadas' }));
    expect(await screen.findByText('Há estaca fora do novo contorno.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar talhão' }));
    expect(await screen.findByTestId('plot-error')).toHaveTextContent('Confirme o que fazer com as estacas');
    expect(getState().installations[0].point).toEqual([-48.265, -18.915]);
  });
});
