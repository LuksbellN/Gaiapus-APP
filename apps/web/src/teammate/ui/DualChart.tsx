// Dois painéis com o mesmo eixo de datas: linha com lacunas preservadas (ex.: NDVI) e barras (ex.: chuva).
import { useWidth } from './index';
import { dShort, nMax } from '../format';
import { translate } from '../i18n';
export function DualChart({ dates, line, lineLabel, lineDomain, rejected, bars, barsLabel, ariaLabel, maxGapDays = 12 }: { dates: string[]; line?: (number | null | undefined)[]; maxGapDays?: number; lineLabel?: string; lineDomain?: [number, number]; rejected?: boolean[]; bars: (number | null)[]; barsLabel: string; ariaLabel: string }) {
  const [ref, width] = useWidth<HTMLDivElement>(); const W = Math.max(width, 280); const m = { l: 40, r: 12 }; const pw = W - m.l - m.r; const n = dates.length; const hL = line ? 130 : 0, hB = 110, gap = line ? 26 : 8; const H = hL + gap + hB + 26;
  const x = (i: number) => m.l + ((i + 0.5) / n) * pw; const [lo, hi] = lineDomain ?? [0, 1]; const yL = (v: number) => 8 + (hL - 8) - ((v - lo) / (hi - lo)) * (hL - 8);
  const bMax = Math.max(10, Math.ceil(Math.max(0, ...bars.filter((v): v is number => v != null)) / 10) * 10); const y0 = hL + gap + hB; const yB = (v: number) => (v / bMax) * (hB - 8);
  // undefined = dia sem passagem do satélite (a linha segue); null = imagem descartada ou intervalo longo (a linha é interrompida).
  const segs: string[] = []; let cur = ''; let lastI = -1; line?.forEach((v, i) => { if (v === undefined) return; if (v === null || (lastI >= 0 && i - lastI > maxGapDays)) { if (cur) segs.push(cur); cur = ''; } if (v !== null) { cur += `${cur ? 'L' : 'M'}${x(i).toFixed(1)},${yL(v).toFixed(1)}`; lastI = i; } }); if (cur) segs.push(cur);
  const ticks = dates.map((d, i) => (d.endsWith('-01') || d.endsWith('-15') ? i : -1)).filter((i) => i >= 0);
  return <div className="timeline" ref={ref}><svg width={W} height={H} role="img" aria-label={ariaLabel} style={{ cursor: 'default' }}>
    {line && <>{[lo, (lo + hi) / 2, hi].map((v) => <g key={v}><line x1={m.l} x2={m.l + pw} y1={yL(v)} y2={yL(v)} stroke="var(--border)" /><text x={m.l - 6} y={yL(v) + 4} textAnchor="end">{nMax(v, 2)}</text></g>)}
      <text className="lbl" x={m.l} y={hL + 16}>{lineLabel}</text>
      {segs.map((d, i) => <path key={i} d={d} fill="none" stroke="var(--action)" strokeWidth={2} />)}
      {line.map((v, i) => v != null ? <circle key={i} cx={x(i)} cy={yL(v)} r={3} fill="var(--action)"><title>{dShort(dates[i])}: {nMax(v, 3)}</title></circle> : rejected?.[i] ? <path key={i} d={`M${x(i) - 3},${yL(lo) - 3} l6,6 m0,-6 l-6,6`} stroke="var(--text-2)" strokeWidth={1.5}><title>{dShort(dates[i])}: {translate('timeline.rejected')}</title></path> : null)}</>}
    {[0, 0.5, 1].map((f) => <g key={f}><line x1={m.l} x2={m.l + pw} y1={y0 - f * (hB - 8)} y2={y0 - f * (hB - 8)} stroke="var(--border)" /><text x={m.l - 6} y={y0 - f * (hB - 8) + 4} textAnchor="end">{Math.round(bMax * f)}</text></g>)}
    {bars.map((v, i) => v != null && v > 0 && <rect key={i} x={x(i) - Math.max(1, pw / n - 1) / 2} y={y0 - yB(v)} width={Math.max(1, pw / n - 1)} height={yB(v)} fill="var(--water)"><title>{dShort(dates[i])}: {nMax(v, 1)} mm</title></rect>)}
    <text className="lbl" x={m.l} y={hL + gap + 4}>{barsLabel}</text>
    {ticks.map((i) => <text key={i} x={x(i)} y={H - 6} textAnchor="middle">{dShort(dates[i])}</text>)}
  </svg></div>;
}
