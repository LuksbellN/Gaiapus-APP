// "Minha área" data access.
//
// WHAT IS REAL: the account. The screen opens for the Supabase session verified by src/features/auth and checks it
// against the private API route GET /v1/me (see session-check.ts). Each account has its own browser bucket (store.ts).
// WHAT IS NOT ON THE SERVER: plots with outlines, stakes, installations, commands and telemetry. The Gaiapus API has
// no route and the database no table for them (apps/api/src/modules, supabase/migrations). Until they exist, this
// file is the DEMONSTRATION adapter: everything is kept in the account's browser bucket, nothing is validated by a
// server and nothing reaches a device or a broker. The proposed tables and policies are in
// supabase/proposals/20261115_sensors_plots.sql; the routes still missing are listed in PENDING below.
//
// `SensorsAdapter` is the contract an HTTP implementation must satisfy to replace `demoSensors`.
import { wait } from '../adapters/core';
import { getAccountScope, getState, now, setState, uid, type OwnedDevice, type Plot, type State } from '../store';
import { activeInstallation, desiredConfig, nextCommandState, normalizeDeviceId, parseInterval, parseLed, validateClaimCode, type DesiredConfig, type DeviceCommand, type Installation, type LedCode, type Measurement, type PositionSource } from './device';
import { geodesicAreaHa, pointInPolygon, validatePolygon, type GeometryError, type PolygonGeometry, type Position } from './geometry';

export type AreaErrorCode = 'account_changed' | 'invalid_geometry' | 'plot_not_found' | 'plot_has_installations' | 'invalid_device_id' | 'invalid_claim_code' | 'claim_rejected' | 'device_not_found' | 'invalid_position' | 'invalid_interval' | 'invalid_led' | 'name_required';
/** Errors carry a code (translated by the screen) and never any detail about other accounts. */
export class AreaError extends Error { constructor(public code: AreaErrorCode, public geometry?: GeometryError) { super(code); } }

export type PlotInput = { id?: string; propertyId: string; name: string; soil: string; irrigation: string; geometry: PolygonGeometry | null };
export type InstallInput = { deviceId: string; plotId: string | null; point: Position; positionSource: PositionSource; accuracyM: number | null; positionAt: string; /** Effective instant; defaults to now. */ at?: string };
export type ClaimResult = { status: 'claimed' | 'already_yours'; device: OwnedDevice };
export interface SensorsAdapter {
  /** 'demo': browser-local, no server validation, no device. An HTTP implementation reports 'server'. */
  readonly mode: 'demo' | 'server';
  savePlot(input: PlotInput): Promise<Plot>;
  archivePlot(id: string): Promise<void>;
  claimDevice(input: { deviceId: string; claimCode: string }): Promise<ClaimResult>;
  renameDevice(deviceId: string, nickname: string): Promise<void>;
  install(input: InstallInput): Promise<Installation>;
  endInstallation(deviceId: string, at?: string): Promise<void>;
  sendConfig(deviceId: string, patch: { led?: LedCode | null; intervalMin?: number }): Promise<DeviceCommand>;
}

/** Server pieces this screen needs and the Gaiapus API does not have yet (shown on the screen, in order). */
export const PENDING = ['plots', 'claim', 'installations', 'telemetry', 'commands', 'gateways', 'calibration', 'transport'] as const;

/** Demonstration only: an identifier that behaves as "linked to another account" so the generic refusal can be seen. */
export const DEMO_TAKEN_ID = 'deadbeef';

const guard = async () => { const scope = getAccountScope(); await wait(undefined, 40); if (scope !== getAccountScope()) throw new AreaError('account_changed'); };
const validPoint = (p: Position) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90;

export const demoSensors: SensorsAdapter & { addSyntheticMeasurement(deviceId: string): Promise<Measurement> } = {
  mode: 'demo',

  async savePlot(input) {
    await guard();
    if (!input.name.trim()) throw new AreaError('name_required');
    let geometry: PolygonGeometry | null = null;
    if (input.geometry) { const r = validatePolygon(input.geometry); if (!r.ok) throw new AreaError('invalid_geometry', r.code); geometry = r.geometry; }
    const s = getState(); const t = now();
    const prev = input.id ? s.plots.find((p) => p.id === input.id) : undefined;
    if (input.id && !prev) throw new AreaError('plot_not_found');
    const item: Plot = {
      ...prev, id: prev?.id ?? uid('talhao'), propertyId: input.propertyId, name: input.name.trim(), soil: input.soil, irrigation: input.irrigation,
      areaHa: prev?.areaHa ?? null, polygon: prev?.polygon ?? null, createdAt: prev?.createdAt ?? t, updatedAt: t,
      geometry, areaCalcHa: geometry ? geodesicAreaHa(geometry) : null, revision: (prev?.revision ?? 0) + 1, archivedAt: prev?.archivedAt ?? null,
    };
    setState({ plots: prev ? s.plots.map((p) => (p.id === item.id ? item : p)) : [...s.plots, item], activePlotId: s.activePlotId ?? item.id });
    return item;
  },

  async archivePlot(id) {
    await guard(); const s = getState();
    if (!s.plots.some((p) => p.id === id)) throw new AreaError('plot_not_found');
    if (s.installations.some((i) => i.plotId === id && i.endedAt == null)) throw new AreaError('plot_has_installations');
    const t = now();
    setState({ plots: s.plots.map((p) => (p.id === id ? { ...p, archivedAt: t, updatedAt: t } : p)), activePlotId: s.activePlotId === id ? null : s.activePlotId });
  },

  async claimDevice({ deviceId, claimCode }) {
    const id = normalizeDeviceId(deviceId);
    if (!id) throw new AreaError('invalid_device_id');
    // DEMONSTRATION: only the shape of the code is checked. Ownership is NOT validated — no server exists for it.
    // The code is used for this check and dropped: it is not stored, logged or returned.
    if (!validateClaimCode(claimCode)) throw new AreaError('invalid_claim_code');
    await guard();
    if (id === DEMO_TAKEN_ID) throw new AreaError('claim_rejected');
    // Check and insert run in one synchronous step, so concurrent attempts cannot create two links.
    const s = getState(); const existing = s.devices.find((d) => d.id === id);
    if (existing) {
      if (existing.removedAt == null) return { status: 'already_yours', device: existing };
      const back = { ...existing, removedAt: null }; setState({ devices: s.devices.map((d) => (d.id === id ? back : d)) });
      return { status: 'claimed', device: back };
    }
    const device: OwnedDevice = { id, nickname: '', claimedAt: now(), removedAt: null };
    setState({ devices: [...s.devices, device] });
    return { status: 'claimed', device };
  },

  async renameDevice(deviceId, nickname) {
    await guard(); const s = getState();
    if (!s.devices.some((d) => d.id === deviceId)) throw new AreaError('device_not_found');
    setState({ devices: s.devices.map((d) => (d.id === deviceId ? { ...d, nickname: nickname.trim().slice(0, 60) } : d)) });
  },

  async install(input) {
    if (!validPoint(input.point)) throw new AreaError('invalid_position');
    await guard(); const s = getState();
    if (!s.devices.some((d) => d.id === input.deviceId && d.removedAt == null)) throw new AreaError('device_not_found');
    if (input.plotId && !s.plots.some((p) => p.id === input.plotId)) throw new AreaError('plot_not_found');
    const at = input.at ?? now();
    // A new physical position is a new installation: the previous one is closed at the same instant, never rewritten.
    const closed = s.installations.map((i) => (i.deviceId === input.deviceId && i.endedAt == null ? { ...i, endedAt: at } : i));
    const item: Installation = { id: uid('inst'), deviceId: input.deviceId, plotId: input.plotId, point: input.point, positionSource: input.positionSource, accuracyM: input.accuracyM, positionAt: input.positionAt, startedAt: at, endedAt: null };
    setState({ installations: [...closed, item] });
    return item;
  },

  async endInstallation(deviceId, at) {
    await guard(); const s = getState();
    if (!s.devices.some((d) => d.id === deviceId)) throw new AreaError('device_not_found');
    const t = at ?? now();
    // Readings and past installations stay; only the active installation is closed.
    setState({ installations: s.installations.map((i) => (i.deviceId === deviceId && i.endedAt == null ? { ...i, endedAt: t } : i)) });
  },

  async sendConfig(deviceId, patch) {
    if (patch.intervalMin !== undefined && parseInterval(patch.intervalMin) == null) throw new AreaError('invalid_interval');
    if (patch.led !== undefined && patch.led !== null && parseLed(patch.led) == null) throw new AreaError('invalid_led');
    await guard(); const s = getState();
    if (!s.devices.some((d) => d.id === deviceId)) throw new AreaError('device_not_found');
    const mine = s.commands.filter((c) => c.deviceId === deviceId); const last = mine.at(-1); const t = now();
    const config: DesiredConfig = desiredConfig(last?.config ?? null, patch);
    // DEMONSTRATION: the intent is stored and stays 'saved' with transport 'none'. Nothing is published anywhere,
    // and no timer ever advances it: only a backend that really publishes may report 'published'/'awaiting_device'.
    const command: DeviceCommand = { id: uid('cmd'), deviceId, revision: (last?.revision ?? 0) + 1, config, state: 'saved', createdAt: t, updatedAt: t, transport: 'none' };
    setState({ commands: [...s.commands.map((c) => (c.deviceId === deviceId && c.state !== 'superseded' ? { ...c, state: nextCommandState(c.state, 'replaced'), updatedAt: t } : c)), command] });
    return command;
  },

  /** DEMONSTRATION ONLY: stores the example reading of firmware.md §8.2, stamped now and marked 'synthetic'. It never comes from a device. */
  async addSyntheticMeasurement(deviceId) {
    await guard(); const s = getState();
    if (!s.devices.some((d) => d.id === deviceId)) throw new AreaError('device_not_found');
    const t = now(); const seq = s.measurements.filter((m) => m.deviceId === deviceId).length + 1;
    const m: Measurement = {
      deviceId, seq, observedAt: t, receivedAt: t,
      readings: [{ depthCm: 15, rawMoisture: 18342, moistureM3M3: null, soilTempC: 24.31 }, { depthCm: 40, rawMoisture: 21011, moistureM3M3: null, soilTempC: 23.1 }],
      airTempC: 29.8, airRhPct: 54, rainMm: 0.4, batteryMv: 3285, rssi: -97, snr: 7.5, flags: 0, gatewayId: '9f3e0a12', origin: 'synthetic',
    };
    setState({ measurements: [...s.measurements, m] });
    return m;
  },
};
export const sensors = demoSensors;

/** Active installations of a plot whose point would fall outside a new outline. Nothing is moved: the user decides. */
export function sensorsOutside(s: State, plotId: string, geometry: PolygonGeometry): Installation[] {
  return s.installations.filter((i) => i.plotId === plotId && i.endedAt == null && !pointInPolygon(i.point, geometry));
}
export const latestMeasurement = (s: State, deviceId: string) => s.measurements.filter((m) => m.deviceId === deviceId).sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0] ?? null;
export const currentCommand = (s: State, deviceId: string) => s.commands.filter((c) => c.deviceId === deviceId).at(-1) ?? null;
export { activeInstallation };
