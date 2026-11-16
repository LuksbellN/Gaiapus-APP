// Adding a stake: identify it (QR or identifier + ownership code), name it, choose property and plot, record where
// it is (the stake has no GPS: the position comes from this phone or is typed), then check for a first reading.
// The ownership code lives only in this component's memory until the claim call and is cleared right after it.
import { StakeGuide } from './StakeGuide';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, LocateFixed } from 'lucide-react';
import { dDateTime } from '../format';
import { useI18n, type MessageKey } from '../i18n';
import { getState, now as nowIso, useStore } from '../store';
import { Dialog, Field, Notice } from '../ui';
import { AreaError, sensors } from './adapter';
import { activeInstallation, isFirstContact, normalizeDeviceId, parseQrPayload, validateClaimCode, type PositionSource } from './device';
import { pointInPolygon, type Position } from './geometry';

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
const detectorCtor = () => (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
export const canScanQr = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && !!detectorCtor();

/** Live QR reader. The decoded text is handed over as data; it is never opened as a link. */
function QrScanner({ onText, onProblem }: { onText: (text: string) => void; onProblem: () => void }) {
  const video = useRef<HTMLVideoElement>(null); const { t } = useI18n();
  useEffect(() => {
    let stream: MediaStream | null = null; let alive = true; let timer = 0; const Ctor = detectorCtor();
    if (!Ctor) { onProblem(); return; }
    const detector = new Ctor({ formats: ['qr_code'] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then((s) => {
      if (!alive) { s.getTracks().forEach((x) => x.stop()); return; }
      stream = s; const v = video.current; if (!v) return; v.srcObject = s; void v.play().catch(() => undefined);
      const tick = async () => { if (!alive) return; try { const hit = (await detector.detect(v))[0]; if (hit?.rawValue) { onText(hit.rawValue); return; } } catch { /* frame not ready */ } timer = window.setTimeout(tick, 350); };
      void tick();
    }).catch(() => { if (alive) onProblem(); });
    return () => { alive = false; clearTimeout(timer); stream?.getTracks().forEach((x) => x.stop()); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- one camera session per mount
  return <div className="area-scan"><video ref={video} muted playsInline aria-label={t('area.wizard.scanLabel')} /><p className="meta-13">{t('area.wizard.scanHint')}</p></div>;
}

export type Place = { plotId: string | null; point: Position; source: PositionSource; accuracyM: number | null; at: string };
const parseCoord = (text: string, limit: number) => { const v = text.trim().replace(',', '.'); if (!/^[+-]?\d+(\.\d+)?$/.test(v)) return null; const n = Number(v); return Math.abs(n) <= limit ? n : null; };

/** Property, plot and position of an installation. Used when adding a stake and when moving it. */
export function PlaceForm({ initial, picked, onPickOnMap, onSubmit, submitLabel, busy }: { initial?: Partial<Place> & { propertyId?: string }; picked?: Position | null; onPickOnMap?: () => void; onSubmit: (p: Place) => void; submitLabel: string; busy?: boolean }) {
  const { t } = useI18n(); const properties = useStore((s) => s.properties); const allPlots = useStore((s) => s.plots);
  const firstProp = initial?.propertyId ?? allPlots.find((p) => p.id === initial?.plotId)?.propertyId ?? properties[0]?.id ?? '';
  const [propertyId, setPropertyId] = useState(firstProp); const plots = useMemo(() => allPlots.filter((p) => p.propertyId === propertyId && !p.archivedAt), [allPlots, propertyId]);
  const [plotId, setPlotId] = useState(initial?.plotId ?? ''); const [lat, setLat] = useState(initial?.point ? String(initial.point[1]) : ''); const [lon, setLon] = useState(initial?.point ? String(initial.point[0]) : '');
  const [gps, setGps] = useState<{ accuracyM: number; at: string } | null>(null); const [geo, setGeo] = useState(''); const [confirmed, setConfirmed] = useState(false); const [outsideOk, setOutsideOk] = useState(false); const [err, setErr] = useState('');
  useEffect(() => { if (picked) { setLat(String(picked[1])); setLon(String(picked[0])); setGps(null); setConfirmed(false); } }, [picked]);
  const la = parseCoord(lat, 90), lo = parseCoord(lon, 180); const point: Position | null = la != null && lo != null ? [lo, la] : null;
  const plot = plots.find((p) => p.id === plotId); const outside = !!(point && plot?.geometry && !pointInPolygon(point, plot.geometry));
  const locate = () => {
    if (!navigator.geolocation) { setGeo(t('area.place.gpsUnsupported')); return; }
    setGeo(t('area.place.gpsLocating'));
    navigator.geolocation.getCurrentPosition((pos) => { setLat(pos.coords.latitude.toFixed(6)); setLon(pos.coords.longitude.toFixed(6)); setGps({ accuracyM: pos.coords.accuracy, at: new Date(pos.timestamp).toISOString() }); setConfirmed(false); setGeo(''); },
      () => setGeo(t('area.place.gpsDenied')), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!point) { setErr(t('area.error.invalid_position')); return; }
    if (!confirmed) { setErr(t('area.place.confirmRequired')); return; }
    if (outside && !outsideOk) { setErr(t('area.place.outsideRequired')); return; }
    setErr(''); onSubmit({ plotId: plotId || null, point, source: gps ? 'phone_gps' : 'manual', accuracyM: gps?.accuracyM ?? null, at: gps?.at ?? nowIso() });
  };
  return <form className="stack" onSubmit={submit} noValidate data-testid="place-form">
    <div className="form-grid">
      <Field label={t('area.place.property')}>{(a) => <select className="input" {...a} value={propertyId} onChange={(e) => { setPropertyId(e.target.value); setPlotId(''); }}>{properties.length === 0 && <option value="">{t('area.place.noProperty')}</option>}{properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}</Field>
      <Field label={t('area.place.plot')}>{(a) => <select className="input" {...a} value={plotId} onChange={(e) => { setPlotId(e.target.value); setOutsideOk(false); }}><option value="">{t('area.place.noPlot')}</option>{plots.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}</Field>
    </div>
    <p className="meta-13">{t('area.place.noGps')}</p>
    <div className="row"><button type="button" className="btn" onClick={locate}><LocateFixed size={16} aria-hidden />{t('area.place.usePhone')}</button>{onPickOnMap && <button type="button" className="btn" onClick={onPickOnMap}>{t('area.place.pickOnMap')}</button>}</div>
    {geo && <p role="status" className="meta">{geo}</p>}
    <div className="form-grid">
      <Field label={t('area.place.lat')} hint={t('area.place.latHint')}>{(a) => <input className="input" inputMode="decimal" autoComplete="off" {...a} value={lat} onChange={(e) => { setLat(e.target.value); setGps(null); setConfirmed(false); }} />}</Field>
      <Field label={t('area.place.lon')} hint={t('area.place.lonHint')}>{(a) => <input className="input" inputMode="decimal" autoComplete="off" {...a} value={lon} onChange={(e) => { setLon(e.target.value); setGps(null); setConfirmed(false); }} />}</Field>
    </div>
    {gps && <p className="meta" data-testid="gps-accuracy">{t('area.place.gpsResult', { meters: Math.round(gps.accuracyM), when: dDateTime(gps.at) })}</p>}
    {outside && <Notice tone="warn" title={t('area.place.outsideTitle')}>{t('area.place.outside')}<label className="check"><input type="checkbox" checked={outsideOk} onChange={(e) => setOutsideOk(e.target.checked)} /><span>{t('area.place.outsideOk')}</span></label></Notice>}
    <label className="check"><input type="checkbox" checked={confirmed} disabled={!point} onChange={(e) => setConfirmed(e.target.checked)} /><span>{t('area.place.confirm')}</span></label>
    {err && <p role="alert" className="notice notice--risk"><span />{err}</p>}
    <div><button type="submit" className="btn btn--primary" disabled={busy}>{submitLabel}</button></div>
  </form>;
}

type Step = 'identify' | 'details' | 'place' | 'verify';
export function SensorWizard({ open, onClose, prefill, onOpenSensor }: { open: boolean; onClose: () => void; prefill: { deviceId: string; claimCode: string } | null; onOpenSensor: (deviceId: string) => void }) {
  const { t } = useI18n(); const [step, setStep] = useState<Step>('identify'); const [id, setId] = useState(''); const [code, setCode] = useState(''); const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [deviceId, setDeviceId] = useState(''); const [nick, setNick] = useState(''); const [startedAt, setStartedAt] = useState('');
  const measurements = useStore((s) => s.measurements); const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (!open) return; setStep('identify'); setErr(''); setScanning(false); setDeviceId(''); setNick(''); setId(prefill?.deviceId ?? ''); setCode(prefill?.claimCode ?? ''); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- reset each time the dialog opens
  useEffect(() => { heading.current?.focus(); }, [step]);
  const fail = (e: unknown) => setErr(t(`area.error.${e instanceof AreaError ? e.code : 'generic'}` as MessageKey));
  const first = startedAt ? measurements.find((m) => isFirstContact(m, { deviceId, startedAt })) : undefined;
  const close = () => { setCode(''); onClose(); };

  const claim = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    const normal = normalizeDeviceId(id); if (!normal) { setErr(t('area.error.invalid_device_id')); return; }
    if (!validateClaimCode(code)) { setErr(t('area.error.invalid_claim_code')); return; }
    setBusy(true);
    try {
      const r = await sensors.claimDevice({ deviceId: normal, claimCode: code });
      setCode(''); // consumed: nothing keeps the ownership code after the claim call
      // Already linked to this account and installed: open it instead of registering it twice.
      if (r.status === 'already_yours' && activeInstallation(getState().installations, r.device.id)) { close(); onOpenSensor(r.device.id); return; }
      setDeviceId(r.device.id); setNick(r.device.nickname); setStep('details');
    } catch (x) { fail(x); } finally { setBusy(false); }
  };
  const onScan = (text: string) => { setScanning(false); const r = parseQrPayload(text); if (!r.ok) { setErr(t(`area.wizard.qr.${r.code}` as MessageKey)); return; } setErr(''); setId(r.deviceId); setCode(r.claimCode); };
  const title = t(`area.wizard.step.${step}` as MessageKey);
  return <Dialog open={open} onClose={close} title={t('area.wizard.title')}>
    <div className="stack area-wizard" data-testid="sensor-wizard" data-step={step}>
      <h3 ref={heading} tabIndex={-1}>{t('area.wizard.progress', { n: ['identify', 'details', 'place', 'verify'].indexOf(step) + 1, total: 4 })} · {title}</h3>
      {step === 'identify' && <form className="stack" onSubmit={claim} noValidate>
        <Notice tone="warn" title={t('area.demo.claimTitle')}>{t('area.demo.claim')}</Notice>
        {!scanning && <StakeGuide />}
        {scanning ? <><QrScanner onText={onScan} onProblem={() => { setScanning(false); setErr(t('area.wizard.cameraDenied')); }} /><div><button type="button" className="btn" onClick={() => setScanning(false)}>{t('area.wizard.stopScan')}</button></div></>
          : <div className="row"><button type="button" className="btn" disabled={!canScanQr()} onClick={() => { setErr(''); setScanning(true); }}><Camera size={16} aria-hidden />{t('area.wizard.scan')}</button>{!canScanQr() && <span className="meta-13">{t('area.wizard.scanUnavailable')}</span>}</div>}
        <Field label={t('area.wizard.deviceId')} hint={t('area.wizard.deviceIdHint')}>{(a) => <input className="input" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={12} {...a} value={id} onChange={(e) => setId(e.target.value)} />}</Field>
        <Field label={t('area.wizard.claimCode')} hint={t('area.wizard.claimCodeHint')}>{(a) => <input className="input" type="password" autoComplete="off" spellCheck={false} maxLength={64} {...a} value={code} onChange={(e) => setCode(e.target.value)} />}</Field>
        {err && <p role="alert" className="notice notice--risk" data-testid="wizard-error"><span />{err}</p>}
        <div><button type="submit" className="btn btn--primary" disabled={busy}>{t('area.wizard.continue')}</button></div>
      </form>}
      {step === 'details' && <form className="stack" onSubmit={(e) => { e.preventDefault(); setBusy(true); sensors.renameDevice(deviceId, nick).then(() => setStep('place')).catch(fail).finally(() => setBusy(false)); }}>
        <dl className="kv"><dt>{t('area.sensor.id')}</dt><dd translate="no"><code>{deviceId}</code></dd></dl>
        <Field label={t('area.config.nickname')} hint={t('area.wizard.nicknameHint')} optional>{(a) => <input className="input" maxLength={60} {...a} value={nick} onChange={(e) => setNick(e.target.value)} />}</Field>
        {err && <p role="alert" className="notice notice--risk"><span />{err}</p>}
        <div><button type="submit" className="btn btn--primary" disabled={busy}>{t('area.wizard.continue')}</button></div>
      </form>}
      {step === 'place' && <><PlaceForm busy={busy} submitLabel={t('area.wizard.install')} onSubmit={(p) => { setBusy(true); setErr(''); sensors.install({ deviceId, plotId: p.plotId, point: p.point, positionSource: p.source, accuracyM: p.accuracyM, positionAt: p.at }).then(() => { setStartedAt(nowIso()); setStep('verify'); }).catch(fail).finally(() => setBusy(false)); }} />
        {err && <p role="alert" className="notice notice--risk"><span />{err}</p>}</>}
      {step === 'verify' && <div className="stack">
        <p><strong>{t('area.wizard.pressButton')}</strong></p>
        <p className="meta">{t('area.wizard.verifyText')}</p>
        {first ? <Notice tone="warn" title={t('area.wizard.syntheticSeenTitle')}>{t('area.wizard.syntheticSeen')}</Notice>
          : <><p role="status" data-testid="verify-status"><span className="spinner" aria-hidden /> {t('area.wizard.waiting')}</p>
            <Notice tone="warn" title={t('area.demo.noTelemetryTitle')}>{t('area.demo.noTelemetry')}</Notice>
            <div><button type="button" className="btn btn--sm" disabled={busy} onClick={() => { setBusy(true); sensors.addSyntheticMeasurement(deviceId).catch(fail).finally(() => setBusy(false)); }}>{t('area.sensor.addSynthetic')}</button></div></>}
        <div><button type="button" className="btn btn--primary" onClick={() => { close(); onOpenSensor(deviceId); }}>{first ? t('area.wizard.finish') : t('area.wizard.finishWaiting')}</button></div>
      </div>}
    </div>
  </Dialog>;
}
