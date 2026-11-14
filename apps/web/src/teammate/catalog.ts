// Catálogo único de culturas. Os IDs são os do contrato de rendimento (contracts/yield-estimate.schema.json);
// os nomes são só apresentação, traduzidos pelo idioma ativo. Definição local e PROVISÓRIA: o backend ainda não serve um catálogo.
// Estar aqui não significa ter previsão: as capacidades por cultura e território ficam em capabilities.ts.
import { translate } from './i18n';

export const CROP_IDS = ['soy', 'maize1', 'maize2', 'bean1', 'bean2', 'rice', 'wheat', 'coffee_arabica', 'coffee_conilon', 'coffee_total_mg'] as const;
export type CropId = (typeof CROP_IDS)[number];
export type CropInfo = {
  id: CropId; readonly name: string; group: 'graos' | 'cafe';
  /** Pode ser escolhida em cadastro e planejamento. Coortes estatísticas não são plantáveis. */
  plantable: boolean; perennial: boolean; readonly role: string;
};
const info = (id: CropId, group: CropInfo['group'], plantable: boolean, perennial: boolean, role: string): CropInfo => ({
  id, group, plantable, perennial, get name() { return translate(`crop.${id}`); }, get role() { return translate(`cropRole.${role}`); },
});
export const CROPS: Record<CropId, CropInfo> = {
  soy: info('soy', 'graos', true, false, 'crop'),
  maize1: info('maize1', 'graos', true, false, 'cropSeason'),
  maize2: info('maize2', 'graos', true, false, 'cropSeason'),
  bean1: info('bean1', 'graos', true, false, 'cropSeason'),
  bean2: info('bean2', 'graos', true, false, 'cropSeason'),
  rice: info('rice', 'graos', true, false, 'crop'),
  wheat: info('wheat', 'graos', true, false, 'crop'),
  coffee_arabica: info('coffee_arabica', 'cafe', true, true, 'coffeeSpecies'),
  coffee_conilon: info('coffee_conilon', 'cafe', true, true, 'coffeeCategory'),
  coffee_total_mg: info('coffee_total_mg', 'cafe', false, true, 'cohort'),
};
/** True when the crop's role is the plain "crop" (no extra hint needed). */
export const isPlainCrop = (id: CropId) => ['soy', 'rice', 'wheat'].includes(id);
export const PLANTABLE: CropId[] = CROP_IDS.filter((id) => CROPS[id].plantable);
export const isCropId = (x: unknown): x is CropId => typeof x === 'string' && (CROP_IDS as readonly string[]).includes(x);
export const cropName = (id: string | null | undefined) => (isCropId(id) ? CROPS[id].name : null);
export const isCoffee = (id: string | null | undefined) => isCropId(id) && CROPS[id].group === 'cafe';

// Nomes em português com que registros e planos foram gravados (antes e depois do catálogo). Servem só para LER dados antigos.
export const PT_NAME: Record<CropId, string> = { soy: 'Soja', maize1: 'Milho 1ª safra', maize2: 'Milho 2ª safra (safrinha)', bean1: 'Feijão 1ª safra', bean2: 'Feijão 2ª safra', rice: 'Arroz', wheat: 'Trigo', coffee_arabica: 'Café arábica', coffee_conilon: 'Café conilon', coffee_total_mg: 'Café total MG' };
// Opções de cadastro que não são culturas do contrato: cobertura vegetal e texto livre. Nunca recebem estimativa.
export const COVER_NAME = 'Braquiária (cobertura)';
export const OTHER_NAME = 'Outra';
/** Record crop options as stored values (pt-BR names, kept for compatibility with saved records). */
export const RECORD_CROP_OPTIONS: string[] = [...PLANTABLE.map((id) => PT_NAME[id]), COVER_NAME, OTHER_NAME];
/** Label of a stored crop option in the current language. Unknown text (typed by the user) is shown as is. */
export function cropOptionLabel(stored: string): string {
  const id = cropIdFromName(stored); if (id) return CROPS[id].name;
  if (stored === COVER_NAME) return translate('crop.cover'); if (stored === OTHER_NAME) return translate('crop.other');
  return stored;
}

const LEGACY: Record<string, CropId> = { 'Milho safrinha': 'maize2', 'Milho 2ª safra': 'maize2' };
const BY_NAME: Record<string, CropId> = { ...Object.fromEntries(CROP_IDS.map((id) => [PT_NAME[id], id])), ...LEGACY };
/** Nome gravado (pt-BR) → ID do contrato. `null` quando não é cultura do contrato (cobertura, "Outra") ou quando é ambíguo. */
export const cropIdFromName = (name: string | null | undefined): CropId | null => (name ? BY_NAME[name.trim()] ?? null : null);
/** Nomes antigos que não dizem a espécie ou a safra ("Café", "Milho", "Feijão"): não adivinhamos, a interface pede complemento. */
export const isAmbiguousCropName = (name: string | null | undefined) => !!name && ['café', 'cafe', 'milho', 'feijão', 'feijao'].includes(name.trim().toLowerCase());
