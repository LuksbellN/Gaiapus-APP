// Contextual panel of one stake: summary, readings at 15 and 40 cm, air, rain, battery voltage, the two remote
// settings, installation history and removal. Values are shown as measured: no percentage is derived here.
import { useEffect, useRef, useState } from 'react';
import { MapPin, Radio, Settings2, Trash2 } from 'lucide-react';
import { dDateTime, n1, n2 } from '../format';
import { useI18n, type MessageKey } from '../i18n';
import { useStore, type State } from '../store';
import { Dialog, Field, Notice, Pill } from '../ui';
import { AreaError, currentCommand, latestMeasurement, sensors } from './adapter';
import { activeInstallation, airHumidityDisplay, batteryDisplay, contactStatus, DEFAULT_INTERVAL_MIN, flagsOf, INTERVAL_PRESETS, moistureDisplay, parseInterval, rainTotalMm, resolveInstallation, type DeviceCommand, type DepthReading, type LedCode, type Measurement } from './device';
import type { Position } from './geometry';

export const fmtPoint = (p: Position) => `${p[1].toFixed(5)}, ${p[0].toFixed(5)}`;
export const deviceLabel = (d: { id: string; nickname: string }) => d.nickname || d.id;

/** Text and tone of the inferred contact state. Never "online"/"offline": the stake sleeps between readings. */
export function contactOf(s: State, deviceId: string, now: string) {
  const m = latestMeasurement(s, deviceId); const received = s.measurements.filter((x) => x.deviceId === deviceId).map((x) => x.receivedAt).sort().at(-1) ?? null;
  const cmd = currentCommand(s, deviceId);
  // The interval in force is never echoed by the stake: only the default is known until a backend reports otherwise.
  return contactStatus({ lastReceivedAt: received, lastObservedAt: m?.observedAt ?? null, intervalMin: null, desiredIntervalMin: cmd?.config.intervalMin ?? null, now });
}
export function ContactPill({ status }: { status: ReturnType<typeof contactOf> }) {
  const { t } = useI18n();
  if (status.contact === 'never') return <Pill tone="water">{t('area.contact.never')}</Pill>;
  if (status.contact === 'late') return <Pill tone="warn">{t('area.contact.late')}</Pill>;
  return <Pill tone={status.data === 'old' ? 'warn' : 'ok'}>{t(status.data === 'old' ? 'area.contact.recentOld' : 'area.contact.recent')}</Pill>;
}

/** The wording of a command intent. No state reads as applied or confirmed. */
export function commandText(c: DeviceCommand): MessageKey {
  if (c.transport === 'none') return c.state === 'superseded' ? 'area.command.superseded' : c.state === 'failed' ? 'area.command.failed' : 'area.command.savedDemo';
  return `area.command.${c.state}` as MessageKey;
}

function Moisture({ r }: { r: DepthReading }) {
  const { t } = useI18n(); const m = moistureDisplay(r);
  if (m.kind === 'calibrated') return <>{n2(m.m3m3)} m³/m³ <span className="meta-13">{t('area.reading.calibrated')}</span></>;
  if (m.kind === 'raw') return <>{String(m.raw)} <span className="meta-13">{t('area.reading.rawUncalibrated')}</span></>;
  return <span className="meta-13">{t(m.kind === 'no_oscillation' ? 'area.reading.noOscillation' : 'area.reading.missing')}</span>;
}

function Readings({ m, rainTotal }: { m: Measurement; rainTotal: number | null }) {
  const { t } = useI18n(); const flags = flagsOf(m.flags); const battery = batteryDisplay(m.batteryMv, m.flags); const rh = airHumidityDisplay(m.airRhPct, m.flags);
  const missing = <span className="meta-13">{t('area.reading.missing')}</span>;
  return <>
    {m.origin === 'synthetic' && <Notice tone="warn" title={t('area.reading.syntheticTitle')}>{t('area.reading.synthetic')}</Notice>}
    {flags?.sensorError && <Notice tone="warn">{t('area.reading.sensorError')}</Notice>}
    <div className="area-scroll"><table className="area-table" data-testid="readings-table"><caption className="sr-only">{t('area.reading.caption')}</caption>
      <thead><tr><th scope="col">{t('area.reading.depth')}</th><th scope="col">{t('area.reading.moisture')}</th><th scope="col">{t('area.reading.soilTemp')}</th></tr></thead>
      <tbody>{([15, 40] as const).map((d) => { const r = m.readings.find((x) => x.depthCm === d); return <tr key={d}><th scope="row">{d} cm</th><td>{r ? <Moisture r={r} /> : missing}</td><td>{r?.soilTempC == null ? missing : `${n1(r.soilTempC)} °C`}</td></tr>; })}</tbody>
    </table></div>
    <dl className="kv">
      <dt>{t('area.reading.airTemp')}</dt><dd>{m.airTempC == null ? missing : `${n1(m.airTempC)} °C`}</dd>
      <dt>{t('area.reading.airRh')}</dt><dd>{rh.kind === 'missing' ? missing : rh.kind === 'suspect' ? <span>{t('area.reading.rhSuspect')}</span> : `${rh.pct} %`}</dd>
      <dt>{t('area.reading.rainInterval')}</dt><dd>{m.rainMm == null ? missing : `${n1(m.rainMm)} mm`}</dd>
      <dt>{t('area.reading.rainTotal')}</dt><dd>{rainTotal == null ? missing : `${n1(rainTotal)} mm`}</dd>
      <dt>{t('area.reading.battery')}</dt><dd data-testid="battery">{battery.kind === 'missing' ? missing : <>{n2(battery.volts)} V <span className="meta-13">({battery.millivolts} mV)</span>{battery.low ? <> · {t('area.reading.batteryLow')}</> : null}</>}</dd>
      <dt>{t('area.reading.charging')}</dt><dd>{flags == null ? missing : flags.charging ? t('area.reading.chargingYes') : <span className="meta-13">{t('area.reading.chargingUnknown')}</span>}</dd>
      <dt>{t('area.reading.gateway')}</dt><dd>{m.gatewayId ?? <span className="meta-13">{t('area.reading.noGateway')}</span>}</dd>
      <dt>{t('area.reading.signal')}</dt><dd>{m.rssi == null ? missing : `${m.rssi} dBm`}{m.gatewayId && m.snr != null ? ` · SNR ${n1(m.snr)} dB` : ''}</dd>
    </dl>
    <p className="meta-13">{t('area.reading.notes')}</p>
  </>;
}

export function SensorDetail({ deviceId, now, onMove, onClosed }: { deviceId: string; now: string; onMove: () => void; onClosed: () => void }) {
  const { t } = useI18n(); const s = useStore((x) => x); const device = s.devices.find((d) => d.id === deviceId);
  const inst = activeInstallation(s.installations, deviceId); const history = s.installations.filter((i) => i.deviceId === deviceId).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const list = s.measurements.filter((m) => m.deviceId === deviceId); const m = latestMeasurement(s, deviceId); const cmd = currentCommand(s, deviceId);
  const [nick, setNick] = useState(device?.nickname ?? ''); const [interval, setIntervalText] = useState(String(cmd?.config.intervalMin ?? DEFAULT_INTERVAL_MIN));
  const [custom, setCustom] = useState(!(INTERVAL_PRESETS as readonly number[]).includes(cmd?.config.intervalMin ?? DEFAULT_INTERVAL_MIN));
  const [led, setLed] = useState<LedCode | null>(cmd?.config.led ?? null); const [maintenance, setMaintenance] = useState(false);
  const [err, setErr] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [confirmRemove, setConfirmRemove] = useState(false); const removeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => { setNick(device?.nickname ?? ''); setErr(''); setMsg(''); setMaintenance(false); }, [deviceId]); // eslint-disable-line react-hooks/exhaustive-deps -- reset the form when another stake is opened
  if (!device) return null;
  const plotName = (id: string | null) => (id ? s.plots.find((p) => p.id === id)?.name ?? t('area.plot.unknown') : t('area.sensor.noPlot'));
  const status = contactOf(s, deviceId, now); const intervalValue = parseInterval(interval);
  const run = async (fn: () => Promise<unknown>, ok: MessageKey) => { setErr(''); setMsg(''); setBusy(true); try { await fn(); setMsg(t(ok)); } catch (e) { setErr(t(`area.error.${e instanceof AreaError ? e.code : 'generic'}` as MessageKey)); } finally { setBusy(false); } };
  const saveConfig = (e: React.FormEvent) => { e.preventDefault(); if (intervalValue == null) { setErr(t('area.error.invalid_interval')); return; } void run(async () => { if (nick.trim() !== device.nickname) await sensors.renameDevice(deviceId, nick); if (intervalValue !== (cmd?.config.intervalMin ?? DEFAULT_INTERVAL_MIN) || !cmd) await sensors.sendConfig(deviceId, { intervalMin: intervalValue }); }, 'area.sensor.savedMsg'); };
  return <section className="card area-detail" aria-labelledby="h-sensor" data-testid="sensor-detail">
    <div className="row-between"><h2 id="h-sensor"><Radio size={18} aria-hidden />{deviceLabel(device)}</h2><ContactPill status={status} /></div>
    <dl className="kv">
      <dt>{t('area.sensor.id')}</dt><dd translate="no"><code>{device.id}</code></dd>
      <dt>{t('area.sensor.plot')}</dt><dd>{inst ? plotName(inst.plotId) : t('area.sensor.notInstalled')}</dd>
      <dt>{t('area.sensor.position')}</dt><dd>{inst ? <>{fmtPoint(inst.point)}<br /><span className="meta-13">{t(inst.positionSource === 'phone_gps' ? 'area.sensor.sourceGps' : 'area.sensor.sourceManual')}{inst.accuracyM != null ? ` · ± ${Math.round(inst.accuracyM)} m` : ''}</span></> : '—'}</dd>
      <dt>{t('area.sensor.observedAt')}</dt><dd>{m ? dDateTime(m.observedAt) : <span className="meta-13">{t('area.sensor.noReading')}</span>}</dd>
      <dt>{t('area.sensor.receivedAt')}</dt><dd>{m ? dDateTime(m.receivedAt) : <span className="meta-13">{t('area.sensor.noReading')}</span>}</dd>
    </dl>
    <p className="meta-13">{t('area.contact.policy', { minutes: status.toleranceMin })}{status.intervalAssumed ? ` ${t('area.contact.assumed')}` : ''}</p>

    <h3>{t('area.reading.title')}</h3>
    {m ? <Readings m={m} rainTotal={rainTotalMm(list)} /> : <div className="empty"><strong>{t('area.sensor.waitingTitle')}</strong><p>{t('area.sensor.waitingText')}</p>
      <button type="button" className="btn btn--sm" disabled={busy} onClick={() => void run(() => sensors.addSyntheticMeasurement(deviceId), 'area.sensor.syntheticAdded')}>{t('area.sensor.addSynthetic')}</button></div>}

    <h3><Settings2 size={16} aria-hidden />{t('area.config.title')}</h3>
    <form className="stack" onSubmit={saveConfig} noValidate>
      <Field label={t('area.config.nickname')} optional>{(a) => <input className="input" maxLength={60} {...a} value={nick} onChange={(e) => setNick(e.target.value)} />}</Field>
      <fieldset className="area-fieldset"><legend>{t('area.config.interval')}</legend>
        <div className="seg">{INTERVAL_PRESETS.map((v) => <label key={v}><input type="radio" name="intervalo" checked={!custom && interval === String(v)} onChange={() => { setCustom(false); setIntervalText(String(v)); }} />{t('area.config.minutes', { n: v })}</label>)}
          <label><input type="radio" name="intervalo" checked={custom} onChange={() => setCustom(true)} />{t('area.config.custom')}</label></div>
        {custom && <Field label={t('area.config.customLabel')} hint={t('area.config.customHint')} error={intervalValue == null ? t('area.error.invalid_interval') : undefined}>{(a) => <input className="input" inputMode="numeric" {...a} value={interval} onChange={(e) => setIntervalText(e.target.value)} data-testid="interval-input" />}</Field>}
        <p className="meta-13">{t('area.config.intervalNote')}</p></fieldset>
      <div><button type="submit" className="btn btn--primary" disabled={busy}>{t('area.config.save')}</button></div>
    </form>
    <details className="area-maintenance" open={maintenance} onToggle={(e) => setMaintenance((e.target as HTMLDetailsElement).open)}><summary>{t('area.led.title')}</summary>
      <div className="stack"><p className="meta-13">{t('area.led.text')}</p>
        <fieldset className="area-fieldset"><legend>{t('area.led.legend')}</legend><div className="seg">
          <label><input type="radio" name="led" checked={led == null} onChange={() => setLed(null)} />{t('area.led.auto')}</label>
          {([0, 1, 2, 3] as const).map((v) => <label key={v}><input type="radio" name="led" checked={led === v} onChange={() => setLed(v)} />{t(`area.led.code${v}` as MessageKey)}</label>)}</div></fieldset>
        <div><button type="button" className="btn" disabled={busy} onClick={() => void run(() => sensors.sendConfig(deviceId, { led }), 'area.sensor.savedMsg')}>{t('area.led.save')}</button></div></div></details>
    {cmd && <div className="notice" role="status" data-testid="command-status" data-state={cmd.state}><span aria-hidden /><div><strong>{t(commandText(cmd))}</strong> {t('area.command.detail', { interval: cmd.config.intervalMin, led: cmd.config.led == null ? t('area.led.auto') : t(`area.led.code${cmd.config.led}` as MessageKey), when: dDateTime(cmd.updatedAt), revision: cmd.revision })}<br /><span className="meta-13">{t('area.command.note')}</span></div></div>}
    {err && <p role="alert" className="notice notice--risk"><span />{err}</p>}{msg && <p role="status" className="meta">{msg}</p>}

    <h3><MapPin size={16} aria-hidden />{t('area.install.title')}</h3>
    {history.length === 0 ? <p className="meta">{t('area.install.none')}</p> : <ol className="area-history" data-testid="installation-history">{history.map((i) => <li key={i.id}><b>{plotName(i.plotId)}</b> · {fmtPoint(i.point)}<br /><span className="meta-13">{i.endedAt ? t('area.install.period', { from: dDateTime(i.startedAt), to: dDateTime(i.endedAt) }) : t('area.install.since', { from: dDateTime(i.startedAt) })} · {t('area.install.readings', { count: list.filter((x) => resolveInstallation(s.installations, deviceId, x.observedAt)?.id === i.id).length })}</span></li>)}</ol>}
    <div className="row"><button type="button" className="btn" onClick={onMove}>{inst ? t('area.install.move') : t('area.install.place')}</button>
      {inst && <button type="button" className="btn" ref={removeBtn} onClick={() => setConfirmRemove(true)}><Trash2 size={16} aria-hidden />{t('area.install.remove')}</button>}</div>
    <details><summary>{t('area.field.title')}</summary><p className="meta-13">{t('area.field.text')}</p></details>
    <Dialog open={confirmRemove} onClose={() => { setConfirmRemove(false); removeBtn.current?.focus(); }} title={t('area.install.removeTitle')}>
      <p>{t('area.install.removeText')}</p>
      <div className="row"><button type="button" className="btn btn--primary" onClick={() => { setConfirmRemove(false); void run(() => sensors.endInstallation(deviceId), 'area.install.removed').then(onClosed); }}>{t('area.install.removeConfirm')}</button><button type="button" className="btn" onClick={() => { setConfirmRemove(false); removeBtn.current?.focus(); }}>{t('common.cancel')}</button></div>
    </Dialog>
  </section>;
}
