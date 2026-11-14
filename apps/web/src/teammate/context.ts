// One rule for "which place is this data about", used by every data screen (D-02):
//   1. what the link asks for (?mun=)      → origin 'link'
//   2. else the municipality of the plot in use → origin 'plot'
//   3. else the Sorriso demonstration       → origin 'demo'
// Simulator and Field Shift are historical simulations of Sorriso by definition and skip step 2;
// they still declare that the data are not the user's plot.
import type { FieldRecord, Plot, Property } from './store';

export const SORRISO = '5107925';
export type PlaceOrigin = 'link' | 'plot' | 'demo';
export type ResolvedPlace = { code: string; name: string; origin: PlaceOrigin };
export type ActiveContext = { plot: Plot | null; property: Property | null };

/** Names this frontend already knows; the coverage catalogue (G2) extends this. */
const KNOWN: Record<string, string> = { '5107925': 'Sorriso, MT', '3170206': 'Uberlândia, MG', '5218805': 'Rio Verde, GO', '2903201': 'Barreiras, BA' };

export const isKnownPlace = (code: string) => code in KNOWN;
export function placeName(code: string, ctx?: ActiveContext): string {
  if (ctx?.property?.municipalityCode === code) return `${ctx.property.municipalityName}, ${ctx.property.uf}`;
  return KNOWN[code] ?? `município IBGE ${code}`;
}

export function resolvePlace(params: URLSearchParams, ctx: ActiveContext, opts: { followPlot?: boolean } = {}): ResolvedPlace {
  const fromUrl = params.get('mun');
  if (fromUrl && /^\d{7}$/.test(fromUrl)) return { code: fromUrl, name: placeName(fromUrl, ctx), origin: 'link' };
  const plotMun = ctx.property?.municipalityCode;
  if (opts.followPlot !== false && plotMun && /^\d{7}$/.test(plotMun)) return { code: plotMun, name: placeName(plotMun, ctx), origin: 'plot' };
  return { code: SORRISO, name: placeName(SORRISO), origin: 'demo' };
}

/** The plot's place, when the data shown are about somewhere else. Null when they match or there is no plot. */
export function plotElsewhere(place: ResolvedPlace, ctx: ActiveContext): { plot: string; place: string } | null {
  if (!ctx.plot || !ctx.property || ctx.property.municipalityCode === place.code) return null;
  return { plot: ctx.plot.name, place: `${ctx.property.municipalityName}, ${ctx.property.uf}` };
}

/** Next dated activity of the plot in use (or of any plot when none is active), from today on. */
export function upcomingActivity(records: FieldRecord[], plotId: string | null, today = new Date().toISOString().slice(0, 10)): FieldRecord | undefined {
  return records.filter((r) => r.event_at >= today && (!plotId || r.plotId === plotId)).sort((a, b) => a.event_at.localeCompare(b.event_at))[0];
}
