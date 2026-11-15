// Gaiapus stake: identity, ownership code shape, the two remote settings, telemetry reading rules and installation
// history. Pure functions with no storage or network. Sources: imagens_sensor/firmware.md (§2, §4, §5, §8) and the
// handoff specification (gaiapus-sensores-regioes-spec.md §3, §6, §8). Nothing here talks to a broker or a device.
import type { Position } from './geometry';

// ---- Identity and ownership -------------------------------------------------------------------------------
/** device_id: the last 4 bytes of the chip MAC as 8 lower-case hexadecimal characters. Read-only for the user. */
export function normalizeDeviceId(input: string): string | null {
  const id = input.trim().toLowerCase();
  return /^[0-9a-f]{8}$/.test(id) ? id : null;
}
/**
 * PROVISIONAL shape check. The firmware documents "a QR with the device_id and an ownership code" but not the
 * code's format, so only a conservative shape is checked here (6-64 of A-Z a-z 0-9 _ -). Ownership itself can only
 * be proven by the server; the code must never be logged, persisted in the browser or left in the URL.
 */
export const validateClaimCode = (code: string) => /^[A-Za-z0-9_-]{6,64}$/.test(code);

export type QrResult = { ok: true; deviceId: string; claimCode: string } | { ok: false; code: 'unreadable' | 'invalid_device_id' | 'missing_claim_code' };
const ID_KEYS = ['d', 'device_id', 'device', 'id'], CODE_KEYS = ['c', 'claim', 'code', 'posse'];
/** Reads a scanned QR as data. It is never navigated to: only two fields are extracted, from http(s) URLs or "id:code". */
export function parseQrPayload(text: string): QrResult {
  const raw = text.trim();
  let id: string | null = null, code: string | null = null;
  const compact = raw.match(/^([0-9a-fA-F]{8})[:\s]([A-Za-z0-9_-]+)$/);
  if (compact) { id = compact[1]; code = compact[2]; }
  else {
    let url: URL;
    try { url = new URL(raw); } catch { return { ok: false, code: 'unreadable' }; }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, code: 'unreadable' };
    const params = [url.searchParams, new URLSearchParams(url.hash.includes('?') ? url.hash.slice(url.hash.indexOf('?') + 1) : '')];
    const pick = (keys: string[]) => { for (const p of params) for (const k of keys) { const v = p.get(k); if (v) return v; } return null; };
    id = pick(ID_KEYS); code = pick(CODE_KEYS);
    if (!id && !code) return { ok: false, code: 'unreadable' };
  }
  const deviceId = id ? normalizeDeviceId(id) : null;
  if (!deviceId) return { ok: false, code: 'invalid_device_id' };
  if (!code || !validateClaimCode(code)) return { ok: false, code: 'missing_claim_code' };
  return { ok: true, deviceId, claimCode: code };
}

// ---- Remote settings (the only two the firmware accepts) --------------------------------------------------
export const DEFAULT_INTERVAL_MIN = 30;
export const INTERVAL_PRESETS = [15, 30, 60] as const;
export type LedCode = 0 | 1 | 2 | 3;
/** Whole minutes 1-255. 0 is not "off": the protocol turns it into 30, so it is rejected instead of silently changed. */
export function parseInterval(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d{1,3}$/.test(v.trim()) ? Number(v.trim()) : Number.NaN;
  return Number.isInteger(n) && n >= 1 && n <= 255 ? n : null;
}
/** 0 off, 1 green, 2 yellow, 3 red. No agronomic meaning is attached to a colour here. */
export function parseLed(v: unknown): LedCode | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 3 ? (v as LedCode) : null;
}
/** `led: null` = no manual override: the colour follows the backend recommendation. */
export type DesiredConfig = { led: LedCode | null; intervalMin: number };
/**
 * The retained downlink message must carry the complete desired state: publishing only the changed field could
 * drop the other one when a gateway restarts. A change is therefore always merged into the previous desired state.
 */
export function desiredConfig(prev: DesiredConfig | null, patch: Partial<DesiredConfig>): DesiredConfig {
  return { led: patch.led !== undefined ? patch.led : prev?.led ?? null, intervalMin: patch.intervalMin ?? prev?.intervalMin ?? DEFAULT_INTERVAL_MIN };
}

/**
 * Lifecycle of a command intent. There is deliberately NO "confirmed"/"applied" state: the uplink does not echo
 * the interval, the LED or a command version, and the radio ACK goes from the gateway to the stake, not to the app.
 *   saved            intent stored (in the demonstration: stored in this browser only, nothing sent)
 *   published        the broker accepted the retained message (reported by the backend)
 *   awaiting_device  sent; the stake applies it at its next contact — no evidence of application exists
 *   failed           could not be stored or published
 *   superseded       replaced by a newer intent
 */
export const COMMAND_STATES = ['saved', 'published', 'awaiting_device', 'failed', 'superseded'] as const;
export type CommandState = (typeof COMMAND_STATES)[number];
export type CommandEvent = 'broker_accepted' | 'publish_acknowledged' | 'publish_failed' | 'replaced' | 'measurement_received' | 'time_elapsed';
export function nextCommandState(state: CommandState, event: CommandEvent): CommandState {
  if (event === 'replaced') return state === 'failed' ? 'failed' : 'superseded';
  if (state === 'saved' && event === 'broker_accepted') return 'published';
  if (state === 'published' && event === 'publish_acknowledged') return 'awaiting_device';
  if ((state === 'saved' || state === 'published') && event === 'publish_failed') return 'failed';
  // A new measurement or elapsed time proves nothing about the command: the state does not move.
  return state;
}
export type DeviceCommand = { id: string; deviceId: string; revision: number; config: DesiredConfig; state: CommandState; createdAt: string; updatedAt: string; /** 'none': demonstration, nothing left this browser. */ transport: 'none' | 'backend'; failure?: string };

// ---- Telemetry --------------------------------------------------------------------------------------------
export type DepthReading = { depthCm: 15 | 40; rawMoisture: number | null; /** Only ever filled by the backend from a validated calibration. */ moistureM3M3: number | null; soilTempC: number | null };
export type Measurement = {
  deviceId: string; seq: number; observedAt: string; receivedAt: string; readings: DepthReading[];
  airTempC: number | null; airRhPct: number | null; /** Rain accumulated in the interval before this measurement (not a rate). */ rainMm: number | null;
  batteryMv: number | null; rssi: number | null; snr: number | null; flags: number | null; gatewayId: string | null;
  /** 'device': received from a real stake through the backend. 'synthetic': example values, never a device. */
  origin: 'device' | 'synthetic';
};
export type MoistureDisplay = { kind: 'calibrated'; m3m3: number; raw: number | null } | { kind: 'raw'; raw: number } | { kind: 'no_oscillation' } | { kind: 'missing' };
/** Moisture is shown raw until the backend supplies a calibrated value. No percentage is derived in the browser. */
export function moistureDisplay(r: DepthReading): MoistureDisplay {
  if (r.moistureM3M3 != null) return { kind: 'calibrated', m3m3: r.moistureM3M3, raw: r.rawMoisture };
  if (r.rawMoisture == null) return { kind: 'missing' };
  if (r.rawMoisture === 0) return { kind: 'no_oscillation' };
  return { kind: 'raw', raw: r.rawMoisture };
}
export type Flags = { button: boolean; lowBattery: boolean; sensorError: boolean; /** null: bit not set — older firmware has no such bit, so this is "not reported", not "not charging". */ charging: true | null };
export function flagsOf(flags: number | null): Flags | null {
  if (flags == null) return null;
  return { button: (flags & 1) !== 0, lowBattery: (flags & 2) !== 0, sensorError: (flags & 4) !== 0, charging: (flags & 8) !== 0 ? true : null };
}
export type BatteryDisplay = { kind: 'voltage'; millivolts: number; volts: number; low: boolean } | { kind: 'missing' };
/** Battery is a voltage. No state-of-charge percentage exists without a validated estimator. `low` is the device's own flag. */
export function batteryDisplay(mv: number | null, flags: number | null): BatteryDisplay {
  if (mv == null) return { kind: 'missing' };
  return { kind: 'voltage', millivolts: mv, volts: mv / 1000, low: flagsOf(flags)?.lowBattery ?? false };
}
export type HumidityDisplay = { kind: 'value'; pct: number } | { kind: 'suspect' } | { kind: 'missing' };
/** The air sensor reports 0 % when it does not answer, together with the error flag: that is suspect, not dry air. */
export function airHumidityDisplay(rh: number | null, flags: number | null): HumidityDisplay {
  if (rh == null) return { kind: 'missing' };
  if (rh === 0 && flagsOf(flags)?.sensorError) return { kind: 'suspect' };
  return { kind: 'value', pct: rh };
}

const time = (iso: string | null) => { const t = iso ? Date.parse(iso) : Number.NaN; return Number.isNaN(t) ? null : t; };
/** Slack for the reconstruction of observed_at (received_at minus whole minutes of age). */
const OBSERVED_SLACK_MS = 60_000;
/**
 * First-contact check after registering a stake: only a reading of that device, received AND observed after the
 * check started, counts. A queued reading delivered now (observed earlier) or any older data does not.
 */
export function isFirstContact(m: Measurement, check: { deviceId: string; startedAt: string }): boolean {
  const started = time(check.startedAt), observed = time(m.observedAt), received = time(m.receivedAt);
  if (started == null || observed == null || received == null) return false;
  return m.deviceId === check.deviceId && received >= started && observed >= started - OBSERVED_SLACK_MS;
}

export type ContactStatus = { contact: 'never' | 'recent' | 'late'; data: 'none' | 'current' | 'old'; toleranceMin: number; intervalAssumed: boolean };
/**
 * APPLICATION POLICY (not a device fact): contact is "late" after 2 x interval + 5 min without a received packet.
 * Contact uses received_at; freshness of the data uses observed_at, so a re-sent old reading keeps the data old.
 * While an interval change is unconfirmed the larger of the known and the desired interval is used.
 */
export function contactStatus(i: { lastReceivedAt: string | null; lastObservedAt: string | null; intervalMin: number | null; desiredIntervalMin: number | null; now: string }): ContactStatus {
  const interval = Math.max(i.intervalMin ?? DEFAULT_INTERVAL_MIN, i.desiredIntervalMin ?? 0);
  const toleranceMin = 2 * interval + 5, intervalAssumed = i.intervalMin == null;
  const now = time(i.now) ?? Date.now(), received = time(i.lastReceivedAt), observed = time(i.lastObservedAt);
  if (received == null) return { contact: 'never', data: 'none', toleranceMin, intervalAssumed };
  const within = (t: number | null) => t != null && now - t <= toleranceMin * 60_000;
  return { contact: within(received) ? 'recent' : 'late', data: observed == null ? 'none' : within(observed) ? 'current' : 'old', toleranceMin, intervalAssumed };
}

/**
 * Rain total of a set of measurements, counted once per physical measurement. PROVISIONAL client-side rule: two
 * entries are the same measurement when device and sequence match and their observed times differ by at most
 * 2 minutes (a retransmission); the same sequence far apart in time is a new measurement after a reset or wrap.
 * The definitive identity belongs to the backend (specification §8.5). Returns null when nothing reported rain.
 */
export function rainTotalMm(list: readonly Measurement[]): number | null {
  const kept: Measurement[] = [];
  for (const m of list) {
    const t = time(m.observedAt);
    if (kept.some((k) => k.deviceId === m.deviceId && k.seq === m.seq && t != null && Math.abs((time(k.observedAt) ?? Infinity) - t) <= 120_000)) continue;
    kept.push(m);
  }
  const withRain = kept.filter((m) => m.rainMm != null);
  return withRain.length ? withRain.reduce((s, m) => s + (m.rainMm ?? 0), 0) : null;
}

// ---- Installations ----------------------------------------------------------------------------------------
export type PositionSource = 'phone_gps' | 'manual';
/** Where a stake is (or was) installed. One active installation (endedAt null) per device; history is never rewritten. */
export type Installation = { id: string; deviceId: string; plotId: string | null; point: Position; positionSource: PositionSource; accuracyM: number | null; positionAt: string; startedAt: string; endedAt: string | null };
/** The installation in force at the instant a reading was OBSERVED (start inclusive, end exclusive); null = unassigned. */
export function resolveInstallation(list: readonly Installation[], deviceId: string, observedAt: string): Installation | null {
  const t = time(observedAt); if (t == null) return null;
  return list.find((i) => i.deviceId === deviceId && (time(i.startedAt) ?? Infinity) <= t && (i.endedAt == null || t < (time(i.endedAt) ?? -Infinity))) ?? null;
}
export const activeInstallation = (list: readonly Installation[], deviceId: string) => list.find((i) => i.deviceId === deviceId && i.endedAt == null) ?? null;
