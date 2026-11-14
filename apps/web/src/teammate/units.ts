import { translate } from './i18n';
// Unidades e economia. Nada aqui supõe saca de 60 kg: o peso da saca é sempre uma entrada.
export type PriceUnit = 'kg' | 't' | 'saca';
/** Label of a price unit in the current language (the currency stays BRL: language never converts money). */
export const PRICE_UNIT_LABEL: Record<PriceUnit, string> = new Proxy({} as Record<PriceUnit, string>, { get: (_, k) => (typeof k === 'string' ? translate(`plan.priceUnit.${k}`) : undefined), ownKeys: () => ['saca', 'kg', 't'], getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) });
export const isPriceUnit = (x: unknown): x is PriceUnit => x === 'kg' || x === 't' || x === 'saca';

/** Preço na unidade informada → R$/kg. Saca exige peso declarado; sem ele devolve null. */
export function pricePerKg(price: number | null, unit: PriceUnit, sackKg: number | null): number | null {
  if (price == null || price < 0) return null;
  if (unit === 'kg') return price;
  if (unit === 't') return price / 1000;
  return sackKg && sackKg > 0 ? price / sackKg : null;
}
export type EconomicsInput = { yieldKgHa: number | null; areaHa: number | null; price: number | null; priceUnit: PriceUnit; sackKg: number | null; costPerHa: number | null; priceDate: string };
export type EconomicsResult = { priceKg: number | null; productionKg: number | null; revenue: number | null; costs: number | null; margin: number | null; missing: string[] };
/** Receita = kg/ha × ha × R$/kg. Margem = receita − custo/ha × a mesma área. Só calcula com todas as entradas. */
export function economics(i: EconomicsInput): EconomicsResult {
  const priceKg = pricePerKg(i.price, i.priceUnit, i.sackKg);
  // Codes of the missing inputs (plan.missing.*), translated by the screen.
  const missing = [
    !(i.areaHa != null && i.areaHa > 0) && 'area',
    !(i.yieldKgHa != null && i.yieldKgHa >= 0) && 'yield',
    i.price == null && 'price',
    i.price != null && i.priceUnit === 'saca' && priceKg == null && 'sack',
    !i.priceDate && 'priceDate',
    i.costPerHa == null && 'cost',
  ].filter(Boolean) as string[];
  const okBase = i.areaHa != null && i.areaHa > 0 && i.yieldKgHa != null && i.yieldKgHa >= 0;
  const productionKg = okBase ? i.yieldKgHa! * i.areaHa! : null;
  if (missing.length || productionKg == null || priceKg == null || i.costPerHa == null) return { priceKg, productionKg, revenue: null, costs: null, margin: null, missing };
  const revenue = productionKg * priceKg; const costs = i.costPerHa * i.areaHa!;
  return { priceKg, productionKg, revenue, costs, margin: revenue - costs, missing };
}
