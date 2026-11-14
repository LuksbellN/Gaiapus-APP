import { CROP_IDS, CROPS } from './catalog';
const nf = (d: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
export const n0 = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? '—' : nf(0).format(v));
export const n1 = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? '—' : nf(1).format(v));
export const n2 = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? '—' : nf(2).format(v));
export const signed = (v: number, d = 1) => (v > 0 ? '+' : v < 0 ? '−' : '') + nf(d).format(Math.abs(v));
export const pct = (f: number | null | undefined) => (f == null ? '—' : nf(0).format(f * 100) + '%');
const parse = (iso: string) => new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
const MON = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const dShort = (iso: string) => { const d = parse(iso); return `${d.getDate()} ${MON[d.getMonth()]}`; };
export const dFull = (iso: string) => { const d = parse(iso); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
export const dMonth = (iso: string) => { const d = parse(iso); return `${MON[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`; };
export const dWeek = (iso: string) => parse(iso).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
export function dTime(iso: string) { const d = new Date(iso); return `${d.getDate()} ${MON[d.getMonth()]}, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (hora local)`; }
export const money = (v: number, cur = 'BRL') => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: cur }).format(v);
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export const STAGE: Record<string, string> = { establishment: 'Estabelecimento', vegetative: 'Vegetativo', reproductive: 'Reprodutivo', maturation: 'Maturação', off_season_bare: 'Entressafra · solo exposto', off_season_cover: 'Entressafra · braquiária' };
export const LAND: Record<string, string> = { soy: 'Soja', maize2: 'Milho safrinha', 'maize2+brachiaria': 'Milho + braquiária', brachiaria: 'Braquiária (cobertura)', bare: 'Pousio (solo exposto)' };
export const CROP: Record<string, string> = Object.fromEntries(CROP_IDS.map((id) => [id, CROPS[id].name]));
