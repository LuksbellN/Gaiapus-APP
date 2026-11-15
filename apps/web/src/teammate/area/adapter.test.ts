import { beforeEach, describe, expect, it } from 'vitest';
import { setLatency } from '../adapters/core';
import { activateAccount, getState, hydrate, setState, type Session } from '../store';
import { AreaError, DEMO_TAKEN_ID, sensors, sensorsOutside } from './adapter';
import { closeRing, type PolygonGeometry } from './geometry';

const user = (id: string): NonNullable<Session> => ({ userId: id, name: id, email: `${id}@example.test`, researchConsent: false, consentAt: null });
const square = (lon: number, lat: number, d: number): PolygonGeometry => ({ type: 'Polygon', coordinates: [closeRing([[lon, lat], [lon + d, lat], [lon + d, lat + d], [lon, lat + d]])] });
const CODE = 'K7Q2-M9XD';
const code = async (p: Promise<unknown>) => { try { await p; return 'resolved'; } catch (e) { return e instanceof AreaError ? e.code : `other:${String(e)}`; } };

async function farm() {
  setState({ properties: [{ id: 'prop1', name: 'Sítio', municipalityCode: '3170206', municipalityName: 'Uberlândia', uf: 'MG', areaHa: null, createdAt: 't', updatedAt: 't' }] });
  const a = await sensors.savePlot({ propertyId: 'prop1', name: 'Talhão A', soil: 'Não sei', irrigation: 'Sequeiro', geometry: square(-48.27, -18.92, 0.01) });
  const b = await sensors.savePlot({ propertyId: 'prop1', name: 'Talhão B', soil: 'Não sei', irrigation: 'Sequeiro', geometry: square(-48.25, -18.92, 0.01) });
  return { a, b };
}

beforeEach(() => { setLatency(0); localStorage.clear(); activateAccount(null); activateAccount(user('user-a')); });

describe('plots with a drawn polygon', () => {
  it('saves the polygon with its calculated area and reopens it after the bucket is reloaded', async () => {
    const { a } = await farm();
    expect(a.areaCalcHa).toBeGreaterThan(100);
    expect(a.areaHa).toBeNull(); // declared area stays separate from the calculated one
    activateAccount(null); activateAccount(user('user-a')); // reload from storage
    const again = getState().plots.find((p) => p.id === a.id)!;
    expect(again.geometry).toEqual(a.geometry);
    expect(again.areaCalcHa).toBeCloseTo(a.areaCalcHa!, 9);
  });
  it('rejects an invalid polygon and leaves the stored plot untouched (cancel/invalid keeps the original)', async () => {
    const { a } = await farm();
    const bowTie: PolygonGeometry = { type: 'Polygon', coordinates: [closeRing([[0, 0], [1, 1], [1, 0], [0, 1]])] };
    expect(await code(sensors.savePlot({ id: a.id, propertyId: 'prop1', name: 'X', soil: 'Não sei', irrigation: 'Sequeiro', geometry: bowTie }))).toBe('invalid_geometry');
    expect(await code(sensors.savePlot({ id: a.id, propertyId: 'prop1', name: 'X', soil: 'Não sei', irrigation: 'Sequeiro', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [0, 0]]] } }))).toBe('invalid_geometry');
    expect(getState().plots.find((p) => p.id === a.id)).toEqual(a);
  });
  it('editing keeps identity and declared area, bumps the revision and recalculates the area', async () => {
    const { a } = await farm();
    const edited = await sensors.savePlot({ id: a.id, propertyId: 'prop1', name: 'Talhão A', soil: 'Argiloso', irrigation: 'Irrigado', geometry: square(-48.27, -18.92, 0.02) });
    expect(edited.id).toBe(a.id); expect(edited.createdAt).toBe(a.createdAt);
    expect(edited.revision).toBe((a.revision ?? 0) + 1);
    expect(edited.areaCalcHa! / a.areaCalcHa!).toBeGreaterThan(3.9);
  });
  it('a legacy bucket keeps its records, and a demonstration polygon does not become a real area', () => {
    const legacy = { properties: [{ id: 'p', name: 'Antiga' }], plots: [{ id: 't1', propertyId: 'p', name: 'Demo', areaHa: 12.5, soil: 'Médio', irrigation: 'Sequeiro', polygon: 'demo_uberlandia', createdAt: 't', updatedAt: 't' }], records: [{ id: 'r1', kind: 'evento', plotId: 't1', cycleId: 't1:2025/2026', data: {} }], plans: [] };
    const s = hydrate(legacy);
    expect(s.plots).toHaveLength(1); expect(s.records).toHaveLength(1); expect(s.properties).toHaveLength(1);
    expect(s.plots[0].polygon).toBe('demo_uberlandia');
    expect(s.plots[0].geometry ?? null).toBeNull();
    expect(s.plots[0].areaHa).toBe(12.5);
    expect(s.devices).toEqual([]); expect(s.installations).toEqual([]); expect(s.commands).toEqual([]); expect(s.measurements).toEqual([]);
  });
});

describe('claiming a stake', () => {
  it('needs a valid identifier and an ownership code', async () => {
    expect(await code(sensors.claimDevice({ deviceId: 'sonda-01', claimCode: CODE }))).toBe('invalid_device_id');
    expect(await code(sensors.claimDevice({ deviceId: 'c4000110', claimCode: '' }))).toBe('invalid_claim_code');
    expect(getState().devices).toEqual([]);
  });
  it('never keeps the ownership code in the browser store', async () => {
    await sensors.claimDevice({ deviceId: 'C4000110', claimCode: CODE });
    expect(getState().devices.map((d) => d.id)).toEqual(['c4000110']);
    const everything = Object.keys(localStorage).map((k) => localStorage.getItem(k)).join('\n') + JSON.stringify(getState());
    expect(everything).not.toContain(CODE);
  });
  it('is idempotent for the same account and safe under concurrent attempts', async () => {
    const results = await Promise.all([sensors.claimDevice({ deviceId: 'c4000110', claimCode: CODE }), sensors.claimDevice({ deviceId: 'c4000110', claimCode: CODE }), sensors.claimDevice({ deviceId: 'c4000110', claimCode: CODE })]);
    expect(getState().devices).toHaveLength(1);
    expect(results.map((r) => r.status).sort()).toEqual(['already_yours', 'already_yours', 'claimed']);
  });
  it('answers a stake held by someone else with a generic error that reveals nothing', async () => {
    try { await sensors.claimDevice({ deviceId: DEMO_TAKEN_ID, claimCode: CODE }); expect.unreachable(); }
    catch (e) { expect((e as AreaError).code).toBe('claim_rejected'); expect(JSON.stringify(e)).not.toMatch(/user|owner|account|@/i); }
    expect(getState().devices).toEqual([]);
  });
  it('one account never sees the stakes of another', async () => {
    await sensors.claimDevice({ deviceId: 'c4000110', claimCode: CODE });
    activateAccount(user('user-b'));
    expect(getState().devices).toEqual([]); expect(getState().installations).toEqual([]);
    activateAccount(null);
    expect(getState().devices).toEqual([]);
    activateAccount(user('user-a'));
    expect(getState().devices).toHaveLength(1);
  });
});

describe('sensor -> installation -> plot', () => {
  it('installs a stake in a plot with the position source and accuracy', async () => {
    const { a } = await farm(); await sensors.claimDevice({ deviceId: 'c4000110', claimCode: CODE });
    const i = await sensors.install({ deviceId: 'c4000110', plotId: a.id, point: [-48.265, -18.915], positionSource: 'phone_gps', accuracyM: 8, positionAt: '2026-11-15T12:00:00.000Z' });
    expect(i).toMatchObject({ deviceId: 'c4000110', plotId: a.id, positionSource: 'phone_gps', accuracyM: 8, endedAt: null });
  });
  it('moving to another plot closes the previous installation at the same instant and keeps the history', async () => {
    const { a, b } = await farm(); await sensors.claimDevice({ deviceId: 'c4000110', claimCode: CODE });
    const first = await sensors.install({ deviceId: 'c4000110', plotId: a.id, point: [-48.265, -18.915], positionSource: 'manual', accuracyM: null, positionAt: '2026-11-01T12:00:00.000Z', at: '2026-11-01T12:00:00.000Z' });
    const second = await sensors.install({ deviceId: 'c4000110', plotId: b.id, point: [-48.245, -18.915], positionSource: 'manual', accuracyM: null, positionAt: '2026-11-10T12:00:00.000Z', at: '2026-11-10T12:00:00.000Z' });
    const all = getState().installations.filter((x) => x.deviceId === 'c4000110');
    expect(all).toHaveLength(2);
    expect(all.find((x) => x.id === first.id)).toMatchObject({ plotId: a.id, endedAt: '2026-11-10T12:00:00.000Z' });
    expect(all.find((x) => x.id === second.id)).toMatchObject({ plotId: b.id, startedAt: '2026-11-10T12:00:00.000Z', endedAt: null });
    expect(all.filter((x) => x.endedAt == null)).toHaveLength(1);
  });
  it('removing from the area ends the installation and keeps the stake, its history and its readings', async () => {
    const { a } = await farm(); await sensors.claimDevice({ deviceId: 'c4000110', claimCode: CODE });
    await sensors.install({ deviceId: 'c4000110', plotId: a.id, point: [-48.265, -18.915], positionSource: 'manual', accuracyM: null, positionAt: '2026-11-01T12:00:00.000Z' });
    await sensors.addSyntheticMeasurement('c4000110');
    await sensors.endInstallation('c4000110');
    const s = getState();
    expect(s.installations).toHaveLength(1); expect(s.installations[0].endedAt).not.toBeNull();
    expect(s.measurements).toHaveLength(1); expect(s.devices).toHaveLength(1);
  });
  it('will not archive a plot that still has an active installation', async () => {
    const { a, b } = await farm(); await sensors.claimDevice({ deviceId: 'c4000110', claimCode: CODE });
    await sensors.install({ deviceId: 'c4000110', plotId: a.id, point: [-48.265, -18.915], positionSource: 'manual', accuracyM: null, positionAt: '2026-11-01T12:00:00.000Z' });
    expect(await code(sensors.archivePlot(a.id))).toBe('plot_has_installations');
    await sensors.archivePlot(b.id);
    expect(getState().plots.find((p) => p.id === b.id)?.archivedAt).toBeTruthy();
    expect(getState().plots).toHaveLength(2); // archived, not deleted
  });
  it('lists the sensors an edited outline would leave outside, without moving them', async () => {
    const { a } = await farm(); await sensors.claimDevice({ deviceId: 'c4000110', claimCode: CODE });
    const i = await sensors.install({ deviceId: 'c4000110', plotId: a.id, point: [-48.261, -18.911], positionSource: 'manual', accuracyM: null, positionAt: '2026-11-01T12:00:00.000Z' });
    expect(sensorsOutside(getState(), a.id, square(-48.27, -18.92, 0.005)).map((x) => x.id)).toEqual([i.id]);
    expect(sensorsOutside(getState(), a.id, square(-48.27, -18.92, 0.01))).toEqual([]);
    expect(getState().installations[0].point).toEqual([-48.261, -18.911]);
  });
});

describe('settings: an intent that was stored or sent is never reported as applied', () => {
  beforeEach(async () => { await sensors.claimDevice({ deviceId: 'c4000110', claimCode: CODE }); });
  it('only accepts what the firmware accepts', async () => {
    for (const bad of [0, 256, 1.5]) expect(await code(sensors.sendConfig('c4000110', { intervalMin: bad }))).toBe('invalid_interval');
    expect(await code(sensors.sendConfig('c4000110', { led: 4 as never }))).toBe('invalid_led');
    expect(getState().commands).toEqual([]);
  });
  it('the demonstration stores the intent and says nothing left the browser', async () => {
    const c = await sensors.sendConfig('c4000110', { intervalMin: 15 });
    expect(c).toMatchObject({ state: 'saved', transport: 'none', config: { led: null, intervalMin: 15 }, revision: 1 });
  });
  it('a new intent supersedes the previous one and carries the complete desired state', async () => {
    await sensors.sendConfig('c4000110', { intervalMin: 15 });
    const second = await sensors.sendConfig('c4000110', { led: 2 });
    expect(second.config).toEqual({ led: 2, intervalMin: 15 }); expect(second.revision).toBe(2);
    expect(getState().commands.map((c) => c.state)).toEqual(['superseded', 'saved']);
  });
  it('a reading arriving afterwards does not confirm the command', async () => {
    await sensors.sendConfig('c4000110', { intervalMin: 15 });
    await sensors.addSyntheticMeasurement('c4000110');
    expect(getState().commands.map((c) => c.state)).toEqual(['saved']);
    expect(getState().measurements[0].origin).toBe('synthetic');
  });
});
