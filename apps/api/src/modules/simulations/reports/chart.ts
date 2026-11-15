// Printable charts of a crop season: geometry only (SVG path data and tick positions), drawn from the verified
// series of the three representative members. No ensemble statistic is computed here: the band is the published
// daily band and the lines are whole published members.
import type { ReportChart, ReportSeasonFacts, ReportTable, SimulationSeries } from '@gaiapus/contracts';
import type { ReportFormatters } from './format.js';
import type { Span, Translator } from './messages/index.js';

export const CHART = { width: 720, height: 300, left: 52, right: 12, top: 26, bottom: 34 } as const;
/** Above this many days a line is reduced for display (minimum and maximum of each interval are kept). */
export const MAX_CHART_POINTS = 400;
const PLOT = { x: CHART.left, y: CHART.top, width: CHART.width - CHART.left - CHART.right, height: CHART.height - CHART.top - CHART.bottom };
const ROLES = ['central', 'dry', 'wet'] as const;
type Role = (typeof ROLES)[number];
const r1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1);

/** Indices kept for display: every point when few, else the minimum and the maximum of each interval (extremes survive). */
export function displayIndices(values: readonly number[], maxPoints = MAX_CHART_POINTS): number[] {
  if (values.length <= maxPoints) return values.map((_, i) => i);
  const buckets = Math.max(1, Math.floor(maxPoints / 2)), size = values.length / buckets, keep = new Set<number>([0, values.length - 1]);
  for (let b = 0; b < buckets; b++) {
    const from = Math.floor(b * size), to = Math.min(values.length, Math.floor((b + 1) * size));
    let lo = from, hi = from;
    for (let i = from; i < to; i++) { if (values[i]! < values[lo]!) lo = i; if (values[i]! > values[hi]!) hi = i; }
    keep.add(lo); keep.add(hi);
  }
  return [...keep].sort((a, b) => a - b);
}

function scales(days: number, yMax: number) {
  const x = (i: number) => PLOT.x + (days > 1 ? (i / (days - 1)) * PLOT.width : 0);
  const y = (v: number) => PLOT.y + PLOT.height - (yMax > 0 ? Math.min(Math.max(v, 0), yMax) / yMax : 0) * PLOT.height;
  return { x, y };
}
const line = (values: readonly number[], x: (i: number) => number, y: (v: number) => number) => displayIndices(values).map((i, k) => `${k ? 'L' : 'M'}${r1(x(i))},${r1(y(values[i]!))}`).join('');
/** An axis maximum at or above the data maximum whose quarters are exact at one decimal (the tick labels). */
export function niceMax(value: number): number {
  const floor = value > 1 ? value : 1;
  const power = 10 ** Math.floor(Math.log10(floor));
  for (const step of [1.2, 1.6, 2, 2.4, 3.2, 4, 4.8, 6, 8, 10]) if (step * power >= floor) return Number((step * power).toPrecision(6));
  return 10 * power;
}

export interface SeasonCharts { storage: ReportChart; deficit: ReportChart; days: number; reduced: number | null }

export function seasonCharts(season: ReportSeasonFacts, seasonName: string, series: SimulationSeries, t: Translator, f: ReportFormatters): SeasonCharts | null {
  const from = series.dates.findIndex(d => d >= season.sowing_date);
  let to = -1;
  series.dates.forEach((d, i) => { if (d <= season.expected_harvest_date) to = i; });
  if (from < 0 || to < from || !season.trajectories) return null;
  const days = to - from + 1, dates = series.dates.slice(from, to + 1);
  const member = (role: Role) => series.members.find(m => m.role === role) ?? null;
  const cut = (values: readonly number[]) => values.slice(from, to + 1);
  const label = (role: Role) => { const m = season.trajectories!.find(x => x.role === role); return t.text(`charts.${role}`, { member: m?.member_id ?? '' }); };
  const cell = (text: string, style?: Span['style']): Span[] => [style ? { text, style } : { text }];
  const roleName = (role: Role) => t.text(role === 'central' ? 'charts.roleCentral' : role === 'dry' ? 'charts.roleDry' : 'charts.roleWet');
  const memberCell = (m: NonNullable<ReportSeasonFacts['trajectories']>[number]) => (m.analog_year === null ? t.text('charts.memberNoYear', { member: m.member_id }) : t.text('charts.memberValue', { member: m.member_id, year: f.year(m.analog_year) }));

  // Month starts as x ticks; phases of the model calendar as labelled regions.
  const xOf = scales(days, 1).x;
  const monthStarts = dates.flatMap((d, i) => (d.endsWith('-01') ? [{ x: Number(r1(xOf(i))), label: f.monthLabel(d) }] : []));
  const x_ticks = monthStarts.length ? monthStarts : [{ x: Number(r1(xOf(0))), label: f.monthLabel(dates[0]!) }];
  const regions = (season.phases ?? []).map((p, index) => {
    const a = Math.max(0, dates.indexOf(p.start)), b = dates.indexOf(p.end) < 0 ? days - 1 : dates.indexOf(p.end);
    return { x: Number(r1(xOf(a))), width: Number(r1(Math.max(0, xOf(b) - xOf(a)))), label: t.lookup('phase', p.phase_code) ?? p.phase_code, index };
  });
  const yTicks = (yMax: number, y: (v: number) => number) => [0, 0.25, 0.5, 0.75, 1].map(k => ({ y: Number(r1(y(yMax * k))), label: f.mm(yMax * k) }));
  const base = { type: 'chart' as const, width: CHART.width, height: CHART.height, regions, x_ticks, plot: PLOT };
  const range = { start: f.date(dates[0]!), end: f.date(dates.at(-1)!) };

  // 1. Soil water storage: daily band of the scenarios, capacity and the three members.
  const capacity = series.capacity_mm, storageMax = niceMax(Math.max(capacity, ...ROLES.flatMap(r => cut(member(r)?.storage_mm ?? []))));
  const s = scales(days, storageMax);
  const p10 = cut(series.bands.storage_mm.p10), p90 = cut(series.bands.storage_mm.p90);
  const upper = displayIndices(p90), lower = displayIndices(p10);
  const band = `${upper.map((i, k) => `${k ? 'L' : 'M'}${r1(s.x(i))},${r1(s.y(p90[i]!))}`).join('')}${[...lower].reverse().map(i => `L${r1(s.x(i))},${r1(s.y(p10[i]!))}`).join('')}Z`;
  const storageShapes: ReportChart['shapes'] = [
    { kind: 'area', role: 'band', d: band, label: t.text('charts.band') },
    { kind: 'line', role: 'capacity', d: `M${r1(PLOT.x)},${r1(s.y(capacity))}L${r1(PLOT.x + PLOT.width)},${r1(s.y(capacity))}`, label: t.text('charts.capacity', { capacity: f.generic(capacity) }) },
    ...ROLES.flatMap(role => { const m = member(role); return m ? [{ kind: 'line' as const, role, d: line(cut(m.storage_mm), s.x, s.y), label: label(role) }] : []; }),
  ];
  const storageTable: ReportTable = { type: 'table', caption: t.text('charts.storageTableCaption', { season: seasonName }),
    columns: [{ header: t.text('charts.colTrajectory'), numeric: false }, { header: t.text('charts.colMember'), numeric: false }, { header: t.text('charts.colMinStorage'), numeric: true }, { header: t.text('charts.colMinDate'), numeric: false }],
    rows: season.trajectories.map(m => ({ cells: [cell(roleName(m.role)), cell(memberCell(m)), cell(f.mm(m.min_storage_mm)), cell(f.date(m.min_storage_date))] })),
    notes: [] };
  const storage: ReportChart = { ...base, chart_id: `${season.id}:storage`, title: t.text('charts.storageTitle', { season: seasonName }),
    description: `${t.text('charts.storageDescription', { ...range, capacity: f.generic(capacity) })} ${t.text('charts.textAlternative')}`,
    shapes: storageShapes, y_ticks: yTicks(storageMax, s.y), y_label: t.text('charts.yStorage'), table: storageTable };

  // 2. Cumulative deficit of each of the three members: a sum over one member, never over a band.
  const cumulative = (values: readonly number[]) => { let sum = 0; return values.map(v => (sum += v)); };
  const lines = ROLES.flatMap(role => { const m = member(role); return m ? [{ role, values: cumulative(cut(m.et_deficit_mm)) }] : []; });
  const deficitMax = niceMax(Math.max(1, ...lines.map(l => l.values.at(-1) ?? 0)));
  const d = scales(days, deficitMax);
  const deficit: ReportChart = { ...base, chart_id: `${season.id}:deficit`, title: t.text('charts.deficitTitle', { season: seasonName }),
    description: `${t.text('charts.deficitDescription', range)} ${t.text('charts.textAlternative')}`,
    shapes: lines.map(l => ({ kind: 'line' as const, role: l.role, d: line(l.values, d.x, d.y), label: label(l.role) })), y_ticks: yTicks(deficitMax, d.y), y_label: t.text('charts.yDeficit'),
    table: { type: 'table', caption: t.text('charts.deficitTableCaption', { season: seasonName }), columns: [{ header: t.text('charts.colTrajectory'), numeric: false }, { header: t.text('charts.colMember'), numeric: false }, { header: t.text('charts.colDeficit'), numeric: true }],
      rows: season.trajectories.map(m => ({ cells: [cell(roleName(m.role)), cell(memberCell(m)), cell(m.season_deficit_mm === null ? t.text('common.notAvailable') : f.mm(m.season_deficit_mm))] })), notes: [] } };
  return { storage, deficit, days, reduced: days > MAX_CHART_POINTS ? displayIndices(cut(member('central')?.storage_mm ?? [])).length : null };
}
