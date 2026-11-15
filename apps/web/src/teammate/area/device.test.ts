import { describe, expect, it } from 'vitest';
import {
  airHumidityDisplay, batteryDisplay, COMMAND_STATES, contactStatus, DEFAULT_INTERVAL_MIN, desiredConfig, flagsOf, isFirstContact, moistureDisplay, nextCommandState,
  normalizeDeviceId, parseInterval, parseLed, parseQrPayload, rainTotalMm, resolveInstallation, validateClaimCode, type Installation, type Measurement,
} from './device';

const m = (over: Partial<Measurement> = {}): Measurement => ({
  deviceId: 'c4000110', seq: 128, observedAt: '2026-11-14T13:30:02Z', receivedAt: '2026-11-14T13:30:02Z',
  readings: [{ depthCm: 15, rawMoisture: 18342, moistureM3M3: null, soilTempC: 24.31 }, { depthCm: 40, rawMoisture: 21011, moistureM3M3: null, soilTempC: 23.1 }],
  airTempC: 29.8, airRhPct: 54, rainMm: 0.4, batteryMv: 3285, rssi: -97, snr: 7.5, flags: 0, gatewayId: '9f3e0a12', origin: 'synthetic', ...over,
});

describe('device identity and ownership code', () => {
  it('accepts exactly 8 hexadecimal characters and stores them in lower case', () => {
    expect(normalizeDeviceId(' C4000110 ')).toBe('c4000110');
    expect(normalizeDeviceId('c4000110')).toBe('c4000110');
  });
  it('rejects every other shape', () => {
    for (const bad of ['', 'c400011', 'c40001100', 'g4000110', 'c400 0110', 'sonda-demo-01', '0xc4000110']) expect(normalizeDeviceId(bad)).toBeNull();
  });
  it('validates the shape of the ownership code without ever echoing it', () => {
    expect(validateClaimCode('K7Q2-M9XD')).toBe(true);
    for (const bad of ['', 'abc', 'has space', 'x'.repeat(65), 'a<b>c1234']) expect(validateClaimCode(bad)).toBe(false);
  });
});

describe('QR payload is data, never a destination', () => {
  it('reads the identifier and the ownership code from an app URL (query or hash route)', () => {
    expect(parseQrPayload('https://app.example/#/minha-area?d=c4000110&c=K7Q2-M9XD')).toEqual({ ok: true, deviceId: 'c4000110', claimCode: 'K7Q2-M9XD' });
    expect(parseQrPayload('https://app.example/claim?device_id=C4000110&claim=K7Q2-M9XD')).toEqual({ ok: true, deviceId: 'c4000110', claimCode: 'K7Q2-M9XD' });
  });
  it('reads the compact "id:code" form', () => {
    expect(parseQrPayload('c4000110:K7Q2-M9XD')).toEqual({ ok: true, deviceId: 'c4000110', claimCode: 'K7Q2-M9XD' });
  });
  it('rejects scripts, other schemes and incomplete content', () => {
    expect(parseQrPayload('javascript:alert(1)')).toEqual({ ok: false, code: 'unreadable' });
    expect(parseQrPayload('https://app.example/#/minha-area?d=nothex&c=K7Q2-M9XD')).toEqual({ ok: false, code: 'invalid_device_id' });
    expect(parseQrPayload('https://app.example/#/minha-area?d=c4000110')).toEqual({ ok: false, code: 'missing_claim_code' });
    expect(parseQrPayload('hello')).toEqual({ ok: false, code: 'unreadable' });
  });
});

describe('remote commands: only LED 0-3 and interval 1-255 minutes', () => {
  it('accepts the interval limits 1 and 255 and the default 30', () => {
    expect(parseInterval('1')).toBe(1); expect(parseInterval('255')).toBe(255); expect(parseInterval(30)).toBe(30); expect(DEFAULT_INTERVAL_MIN).toBe(30);
  });
  it('rejects 0, 256, fractions, signs and text', () => {
    for (const bad of ['0', '256', '1.5', '1,5', '-1', '', ' ', '30min', '3e1', 0, 256, 1.5, Number.NaN, null, undefined]) expect(parseInterval(bad)).toBeNull();
  });
  it('accepts LED codes 0 to 3 only', () => {
    for (const ok of [0, 1, 2, 3]) expect(parseLed(ok)).toBe(ok);
    for (const bad of [-1, 4, 1.5, '1', null]) expect(parseLed(bad)).toBeNull();
  });
  it('keeps the complete desired state when only one field changes', () => {
    expect(desiredConfig(null, { intervalMin: 15 })).toEqual({ led: null, intervalMin: 15 });
    expect(desiredConfig({ led: 2, intervalMin: 30 }, { intervalMin: 60 })).toEqual({ led: 2, intervalMin: 60 });
    expect(desiredConfig({ led: 2, intervalMin: 30 }, { led: 0 })).toEqual({ led: 0, intervalMin: 30 });
  });
});

describe('a command sent is not a command applied', () => {
  it('has no confirmed or applied state at all', () => {
    expect(COMMAND_STATES).toEqual(['saved', 'published', 'awaiting_device', 'failed', 'superseded']);
  });
  it('moves saved -> published -> awaiting_device and stops there', () => {
    expect(nextCommandState('saved', 'broker_accepted')).toBe('published');
    expect(nextCommandState('published', 'publish_acknowledged')).toBe('awaiting_device');
    expect(nextCommandState('saved', 'publish_failed')).toBe('failed');
    expect(nextCommandState('awaiting_device', 'replaced')).toBe('superseded');
  });
  it('a later measurement, a radio ACK or the passing of time never confirm it', () => {
    for (const state of COMMAND_STATES) {
      expect(nextCommandState(state, 'measurement_received')).toBe(state);
      expect(nextCommandState(state, 'time_elapsed')).toBe(state);
    }
  });
});

describe('readings are shown as measured, never converted without a validated model', () => {
  it('uncalibrated moisture stays raw', () => {
    expect(moistureDisplay({ depthCm: 15, rawMoisture: 18342, moistureM3M3: null, soilTempC: 24.31 })).toEqual({ kind: 'raw', raw: 18342 });
  });
  it('a backend-calibrated value is shown in m3/m3 with the raw value kept', () => {
    expect(moistureDisplay({ depthCm: 15, rawMoisture: 18342, moistureM3M3: 0.27, soilTempC: 24.31 })).toEqual({ kind: 'calibrated', m3m3: 0.27, raw: 18342 });
  });
  it('raw 0 is "no oscillation", and a missing value is missing — neither becomes zero moisture', () => {
    expect(moistureDisplay({ depthCm: 40, rawMoisture: 0, moistureM3M3: null, soilTempC: null })).toEqual({ kind: 'no_oscillation' });
    expect(moistureDisplay({ depthCm: 40, rawMoisture: null, moistureM3M3: null, soilTempC: null })).toEqual({ kind: 'missing' });
  });
  it('does not discard a raw value above the expected 5000-20000 band', () => {
    expect(moistureDisplay({ depthCm: 40, rawMoisture: 21011, moistureM3M3: null, soilTempC: 23.1 })).toEqual({ kind: 'raw', raw: 21011 });
  });
  it('battery is a voltage; there is no percentage anywhere in the result', () => {
    const b = batteryDisplay(3285, 0);
    expect(b).toEqual({ kind: 'voltage', millivolts: 3285, volts: 3.285, low: false });
    expect(JSON.stringify(b)).not.toMatch(/pct|percent|%/i);
    expect(batteryDisplay(null, null)).toEqual({ kind: 'missing' });
    expect(batteryDisplay(2950, 0b010)).toMatchObject({ low: true });
  });
  it('relative humidity 0 with the sensor-error flag is suspect, not dry air', () => {
    expect(airHumidityDisplay(0, 0b100)).toEqual({ kind: 'suspect' });
    expect(airHumidityDisplay(0, 0)).toEqual({ kind: 'value', pct: 0 });
    expect(airHumidityDisplay(null, 0)).toEqual({ kind: 'missing' });
  });
  it('decodes flags; an unset charging bit is unknown, not "not charging"', () => {
    expect(flagsOf(0b1111)).toEqual({ button: true, lowBattery: true, sensorError: true, charging: true });
    expect(flagsOf(0)).toEqual({ button: false, lowBattery: false, sensorError: false, charging: null });
    expect(flagsOf(null)).toBeNull();
  });
});

describe('first telemetry check has no false positives', () => {
  const started = '2026-11-14T13:00:00Z';
  it('accepts a new reading of that device observed after the check started', () => {
    expect(isFirstContact(m({ observedAt: '2026-11-14T13:02:00Z', receivedAt: '2026-11-14T13:02:01Z' }), { deviceId: 'c4000110', startedAt: started })).toBe(true);
  });
  it('ignores another device', () => {
    expect(isFirstContact(m({ deviceId: 'aaaaaaaa', observedAt: '2026-11-14T13:02:00Z', receivedAt: '2026-11-14T13:02:01Z' }), { deviceId: 'c4000110', startedAt: started })).toBe(false);
  });
  it('ignores a delayed packet: received now, measured before the check started', () => {
    expect(isFirstContact(m({ observedAt: '2026-11-14T11:30:00Z', receivedAt: '2026-11-14T13:02:01Z' }), { deviceId: 'c4000110', startedAt: started })).toBe(false);
  });
  it('ignores old data and unparseable timestamps', () => {
    expect(isFirstContact(m({ observedAt: '2026-11-14T12:00:00Z', receivedAt: '2026-11-14T12:00:01Z' }), { deviceId: 'c4000110', startedAt: started })).toBe(false);
    expect(isFirstContact(m({ observedAt: 'x', receivedAt: 'y' }), { deviceId: 'c4000110', startedAt: started })).toBe(false);
  });
});

describe('contact is inferred, not a live connection', () => {
  const now = '2026-11-14T14:00:00Z';
  it('normal sleep inside 2 x interval + 5 min is not a failure', () => {
    expect(contactStatus({ lastReceivedAt: '2026-11-14T13:00:00Z', lastObservedAt: '2026-11-14T13:00:00Z', intervalMin: 30, desiredIntervalMin: null, now })).toMatchObject({ contact: 'recent', data: 'current' });
    expect(contactStatus({ lastReceivedAt: '2026-11-14T12:54:00Z', lastObservedAt: '2026-11-14T12:54:00Z', intervalMin: 30, desiredIntervalMin: null, now })).toMatchObject({ contact: 'late' });
  });
  it('recent contact carrying an old measurement stays clearly old', () => {
    expect(contactStatus({ lastReceivedAt: '2026-11-14T13:58:00Z', lastObservedAt: '2026-11-14T08:00:00Z', intervalMin: 30, desiredIntervalMin: null, now })).toMatchObject({ contact: 'recent', data: 'old' });
  });
  it('uses the more tolerant interval while a change is unconfirmed, and says when the interval is assumed', () => {
    expect(contactStatus({ lastReceivedAt: '2026-11-14T12:30:00Z', lastObservedAt: '2026-11-14T12:30:00Z', intervalMin: 15, desiredIntervalMin: 60, now })).toMatchObject({ contact: 'recent', toleranceMin: 125, intervalAssumed: false });
    expect(contactStatus({ lastReceivedAt: '2026-11-14T13:30:00Z', lastObservedAt: '2026-11-14T13:30:00Z', intervalMin: null, desiredIntervalMin: null, now })).toMatchObject({ contact: 'recent', toleranceMin: 65, intervalAssumed: true });
  });
  it('never contacted is its own state', () => {
    expect(contactStatus({ lastReceivedAt: null, lastObservedAt: null, intervalMin: 30, desiredIntervalMin: null, now })).toMatchObject({ contact: 'never', data: 'none' });
  });
});

describe('rain and installation history', () => {
  it('counts rain once per physical measurement, not once per depth or per retransmission', () => {
    const a = m({ seq: 1, rainMm: 0.4, observedAt: '2026-11-14T13:00:00Z' });
    const resent = m({ seq: 1, rainMm: 0.4, observedAt: '2026-11-14T13:00:40Z', receivedAt: '2026-11-14T15:00:00Z' });
    const b = m({ seq: 2, rainMm: 0.2, observedAt: '2026-11-14T13:30:00Z' });
    expect(rainTotalMm([a, resent, b])).toBeCloseTo(0.6, 6);
  });
  it('keeps a new measurement that reuses a sequence number after a reset', () => {
    const before = m({ seq: 1, rainMm: 0.4, observedAt: '2026-11-14T13:00:00Z' });
    const afterReset = m({ seq: 1, rainMm: 1, observedAt: '2026-11-15T09:00:00Z' });
    expect(rainTotalMm([before, afterReset])).toBeCloseTo(1.4, 6);
  });
  it('no data is not zero rain', () => {
    expect(rainTotalMm([])).toBeNull();
    expect(rainTotalMm([m({ rainMm: null })])).toBeNull();
  });
  const inst = (over: Partial<Installation>): Installation => ({ id: 'i', deviceId: 'c4000110', plotId: 'p1', point: [-48.27, -18.92], positionSource: 'manual', accuracyM: null, positionAt: '2026-11-01T00:00:00Z', startedAt: '2026-11-01T00:00:00Z', endedAt: null, ...over });
  const history = [inst({ id: 'old', plotId: 'p1', endedAt: '2026-11-10T00:00:00Z' }), inst({ id: 'new', plotId: 'p2', startedAt: '2026-11-10T00:00:00Z' })];
  it('assigns a delayed reading by the time it was observed, not received', () => {
    expect(resolveInstallation(history, 'c4000110', '2026-11-09T23:00:00Z')?.id).toBe('old');
    expect(resolveInstallation(history, 'c4000110', '2026-11-10T00:00:00Z')?.id).toBe('new');
  });
  it('leaves a reading unassigned when no installation covers its instant', () => {
    expect(resolveInstallation(history, 'c4000110', '2026-10-01T00:00:00Z')).toBeNull();
    expect(resolveInstallation(history, 'aaaaaaaa', '2026-11-09T23:00:00Z')).toBeNull();
  });
});
