// Assinatura visual da Gaiapus: fases do ciclo alinhadas à chuva e à reserva de água.
// Reutilizada na visão geral, no Field Shift e no simulador. Um único cursor (índice do dia) é a fonte da verdade.
import { useMemo, useRef } from 'react';
import { useWidth } from './index';
import { dFull, dMonth, dShort, LAND, n1, STAGE } from '../format';
import { translate, useI18n } from '../i18n';

export type TimelineSeries = { dates: string[]; rain: number[]; storage: number[]; storageB?: number[]; stage: string[]; land: string[]; landB?: string[]; stageB?: string[]; deficit?: number[]; capacity: number };
const STAGE_FILL: Record<string, string> = { establishment: 'var(--tint-soil)', vegetative: 'var(--tint-action)', reproductive: 'var(--tint-water)', maturation: 'var(--tint-warn)', off_season_bare: 'var(--tint-risk)', off_season_cover: 'var(--tint-action)' };
const STAGE_SHORT = new Proxy({} as Record<string, string>, { get: (_, k) => (typeof k === 'string' ? translate(`stageShort.${k}`) : undefined) });
const STAGE_ABBR = new Proxy({} as Record<string, string>, { get: (_, k) => (typeof k === 'string' ? translate(`stageAbbr.${k}`) : undefined) });
const STAGE_STROKE: Record<string, string> = { establishment: 'var(--soil)', vegetative: 'var(--action)', reproductive: 'var(--water)', maturation: 'var(--warn)', off_season_bare: 'var(--risk)', off_season_cover: 'var(--action)' };
function runs(a: string[]) { const out: { v: string; from: number; to: number }[] = []; a.forEach((v, i) => { const l = out[out.length - 1]; if (l && l.v === v) l.to = i; else out.push({ v, from: i, to: i }); }); return out; }

export function PhaseTimeline({ series, cursor, onCursor, height = 190, labelA, labelB, ariaLabel }: { series: TimelineSeries; cursor?: number | null; onCursor?: (i: number) => void; height?: number; labelA?: string; labelB?: string; ariaLabel?: string }) {
  const { t } = useI18n(); labelA ??= t('timeline.reserve'); ariaLabel ??= t('timeline.label');
  const [ref, width] = useWidth<HTMLDivElement>(); const svg = useRef<SVGSVGElement>(null);
  const n = series.dates.length; const hasB = !!series.landB;
  const m = { l: 56, r: 56, t: hasB ? 66 : 48, b: 30 }; const W = Math.max(width, 280); const pw = W - m.l - m.r; const ph = height - m.t - m.b;
  const x = (i: number) => m.l + (n <= 1 ? pw / 2 : ((i + 0.5) / n) * pw); const bw = Math.max(1, pw / n - (n > 60 ? 0 : 6));
  const rainMax = Math.max(10, Math.ceil(Math.max(...series.rain) / 10) * 10); const cap = series.capacity;
  const yS = (v: number) => m.t + ph - (v / cap) * ph; const yR = (v: number) => (v / rainMax) * ph;
  const path = (arr: number[]) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yS(v).toFixed(1)}`).join('');
  const landRuns = useMemo(() => runs(series.land), [series.land]); const stageRuns = useMemo(() => runs(series.stage.map((s, i) => series.land[i] + '|' + s)), [series.stage, series.land]);
  const landBRuns = useMemo(() => (series.landB ? runs(series.landB) : []), [series.landB]);
  const ticks = useMemo(() => { if (n <= 12) return series.dates.map((_, i) => i).filter((i) => pw / n > 46 || i % 2 === 0); const t: number[] = []; series.dates.forEach((d, i) => { if (d.endsWith('-01')) t.push(i); }); const every = Math.ceil(50 / (pw / Math.max(1, t.length))); return t.filter((_, k) => k % every === 0); }, [series.dates, n, pw]);
  const pick = (e: React.PointerEvent) => { const r = svg.current!.getBoundingClientRect(); const i = Math.floor(((e.clientX - r.left - m.l) / pw) * n); onCursor?.(Math.max(0, Math.min(n - 1, i))); };
  const key = (e: React.KeyboardEvent) => { if (cursor == null || !onCursor) return; const d = ({ ArrowRight: 1, ArrowLeft: -1, PageUp: 7, PageDown: -7 } as Record<string, number>)[e.key]; if (d) { e.preventDefault(); onCursor(Math.max(0, Math.min(n - 1, cursor + d))); } else if (e.key === 'Home') { e.preventDefault(); onCursor(0); } else if (e.key === 'End') { e.preventDefault(); onCursor(n - 1); } };
  const c = cursor ?? null; const band = (rs: { v: string; from: number; to: number }[], y: number, label: (v: string) => string, fill: (v: string) => string, abbr?: (v: string) => string, stroke?: (v: string) => string) => rs.map((r) => { const x0 = m.l + (r.from / n) * pw, w = ((r.to - r.from + 1) / n) * pw; const lbl = label(r.v); const fits = (s: string) => w > s.length * 6.8 + 8; const shown = fits(lbl) ? lbl : abbr && fits(abbr(r.v)) ? abbr(r.v) : ''; return <g key={r.from}><rect x={x0} y={y} width={Math.max(0, w - 1)} height={18} rx={3} fill={fill(r.v)} stroke={stroke?.(r.v) ?? 'var(--border-strong)'} strokeWidth={stroke ? 1 : 0.5} />{shown && <text className="lbl" x={x0 + 5} y={y + 13}>{shown}</text>}<title>{t('timeline.range', { label: lbl, from: dShort(series.dates[r.from]), to: dShort(series.dates[r.to]) })}</title></g>; });
  return (
    <div className="timeline" ref={ref}>
      <div className="row meta-13" aria-hidden>
        <span className="legend-item"><i className="swatch" style={{ background: 'var(--water)' }} />{t('chart.rainDaily')}</span>
        <span className="legend-item"><i className="swatch" style={{ height: 3, background: 'var(--text)' }} />{labelA} (mm)</span>
        {labelB && <span className="legend-item"><i className="swatch" style={{ height: 0, borderTop: '3px dashed var(--warn)' }} />{labelB} (mm)</span>}
        {series.deficit && <span className="legend-item"><i className="swatch" style={{ background: 'var(--risk)' }} />{t('timeline.deficitDay')}</span>}
      </div>
      <svg ref={svg} width={W} height={height} role={onCursor ? 'slider' : 'img'} tabIndex={onCursor ? 0 : undefined} aria-label={ariaLabel} aria-valuemin={onCursor ? 0 : undefined} aria-valuemax={onCursor ? n - 1 : undefined} aria-valuenow={onCursor && c != null ? c : undefined} aria-valuetext={c != null ? t('timeline.valuetext', { date: dFull(series.dates[c]), land: LAND[series.land[c]] ?? series.land[c], stage: STAGE[series.stage[c]] ?? series.stage[c], reserve: n1(series.storage[c]), rain: n1(series.rain[c]) }) : undefined} onKeyDown={key} onPointerDown={onCursor ? (e) => { (e.target as Element).setPointerCapture?.(e.pointerId); pick(e); } : undefined} onPointerMove={onCursor ? (e) => { if (e.buttons) pick(e); } : undefined} style={onCursor ? undefined : { cursor: 'default' }}>
        <text x={0} y={16}>{hasB ? 'A' : t('timeline.crop')}</text>{band(landRuns, 4, (v) => LAND[v] ?? v, (v) => (v === 'bare' ? 'var(--tint-risk)' : 'var(--surface-2)'))}
        {hasB && <><text x={0} y={36}>B</text>{band(landBRuns, 23, (v) => LAND[v] ?? v, (v) => (v === 'bare' ? 'var(--tint-risk)' : 'var(--surface-2)'))}</>}
        <text x={0} y={m.t - 11}>{t('timeline.phase')}</text>{band(stageRuns, m.t - 24, (v) => STAGE_SHORT[v.split('|')[1]] ?? v, (v) => STAGE_FILL[v.split('|')[1]] ?? 'var(--surface-2)', (v) => STAGE_ABBR[v.split('|')[1]] ?? '', (v) => STAGE_STROKE[v.split('|')[1]] ?? 'var(--border-strong)')}
        {[0, 0.5, 1].map((f) => <g key={f}><line x1={m.l} x2={m.l + pw} y1={yS(cap * f)} y2={yS(cap * f)} stroke="var(--border)" strokeDasharray={f === 1 ? '4 3' : undefined} /><text x={m.l - 6} y={yS(cap * f) + 4} textAnchor="end">{Math.round(cap * f)}{f === 1 ? ' mm' : ''}</text><text x={m.l + pw + 6} y={m.t + ph - f * ph + 4}>{Math.round(rainMax * f)}{f === 1 ? ' mm' : ''}</text></g>)}
        
        {series.rain.map((v, i) => v > 0 && <rect key={i} x={x(i) - bw / 2} y={m.t + ph - yR(v)} width={bw} height={yR(v)} fill="var(--water)" opacity={0.85} />)}
        {series.storageB && <path d={path(series.storageB)} fill="none" stroke="var(--warn)" strokeWidth={2} strokeDasharray="5 4" />}
        <path d={path(series.storage)} fill="none" stroke="var(--text)" strokeWidth={2} strokeLinejoin="round" />
        {series.deficit?.map((v, i) => v > 0.05 && <rect key={i} x={x(i) - Math.max(bw, 1.5) / 2} y={m.t + ph + 3} width={Math.max(bw, 1.5)} height={5} fill="var(--risk)" />)}
        {ticks.map((i) => <g key={i}><line x1={x(i)} x2={x(i)} y1={m.t + ph} y2={m.t + ph + 10} stroke="var(--border-strong)" /><text x={x(i)} y={height - 6} textAnchor="middle">{n <= 12 ? dShort(series.dates[i]) : dMonth(series.dates[i])}</text></g>)}
        
        {c != null && <g pointerEvents="none"><line x1={x(c)} x2={x(c)} y1={2} y2={m.t + ph + 10} stroke="var(--action)" strokeWidth={2} /><circle cx={x(c)} cy={yS(series.storage[c])} r={4.5} fill="var(--action)" stroke="var(--bg)" strokeWidth={1.5} /></g>}
      </svg>
      <p className="meta-13">{t('timeline.axes', { cap: Math.round(cap) })}</p>
    </div>
  );
}
