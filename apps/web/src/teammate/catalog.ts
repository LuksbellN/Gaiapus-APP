// Catálogo único de culturas. Os IDs são os do contrato de rendimento (contracts/yield-estimate.schema.json);
// os nomes são só apresentação. Definição local e PROVISÓRIA: o backend ainda não serve um catálogo.
// Estar aqui não significa ter previsão: as capacidades por cultura e território ficam em capabilities.ts.
export const CROP_IDS = ['soy', 'maize1', 'maize2', 'bean1', 'bean2', 'rice', 'wheat', 'coffee_arabica', 'coffee_conilon', 'coffee_total_mg'] as const;
export type CropId = (typeof CROP_IDS)[number];
export type CropInfo = {
  id: CropId; name: string; group: 'graos' | 'cafe';
  /** Pode ser escolhida em cadastro e planejamento. Coortes estatísticas não são plantáveis. */
  plantable: boolean; perennial: boolean; role: string;
};
export const CROPS: Record<CropId, CropInfo> = {
  soy: { id: 'soy', name: 'Soja', group: 'graos', plantable: true, perennial: false, role: 'Cultura' },
  maize1: { id: 'maize1', name: 'Milho 1ª safra', group: 'graos', plantable: true, perennial: false, role: 'Cultura e modalidade de safra' },
  maize2: { id: 'maize2', name: 'Milho 2ª safra (safrinha)', group: 'graos', plantable: true, perennial: false, role: 'Cultura e modalidade de safra' },
  bean1: { id: 'bean1', name: 'Feijão 1ª safra', group: 'graos', plantable: true, perennial: false, role: 'Cultura e modalidade de safra' },
  bean2: { id: 'bean2', name: 'Feijão 2ª safra', group: 'graos', plantable: true, perennial: false, role: 'Cultura e modalidade de safra' },
  rice: { id: 'rice', name: 'Arroz', group: 'graos', plantable: true, perennial: false, role: 'Cultura' },
  wheat: { id: 'wheat', name: 'Trigo', group: 'graos', plantable: true, perennial: false, role: 'Cultura' },
  coffee_arabica: { id: 'coffee_arabica', name: 'Café arábica', group: 'cafe', plantable: true, perennial: true, role: 'Espécie de café' },
  coffee_conilon: { id: 'coffee_conilon', name: 'Café conilon', group: 'cafe', plantable: true, perennial: true, role: 'Categoria de café conforme o contrato' },
  coffee_total_mg: { id: 'coffee_total_mg', name: 'Café total MG', group: 'cafe', plantable: false, perennial: true, role: 'Coorte estatística agregada (não é espécie)' },
};
export const PLANTABLE: CropId[] = CROP_IDS.filter((id) => CROPS[id].plantable);
export const isCropId = (x: unknown): x is CropId => typeof x === 'string' && (CROP_IDS as readonly string[]).includes(x);
export const cropName = (id: string | null | undefined) => (isCropId(id) ? CROPS[id].name : null);
export const isCoffee = (id: string | null | undefined) => isCropId(id) && CROPS[id].group === 'cafe';

// Opções de cadastro que não são culturas do contrato: cobertura vegetal e texto livre. Nunca recebem estimativa.
export const COVER_NAME = 'Braquiária (cobertura)';
export const OTHER_NAME = 'Outra';
export const RECORD_CROP_OPTIONS: string[] = [...PLANTABLE.map((id) => CROPS[id].name), COVER_NAME, OTHER_NAME];

// Nomes usados antes do catálogo (registros e planos já salvos no aparelho).
const LEGACY: Record<string, CropId> = { 'Milho safrinha': 'maize2', 'Milho 2ª safra': 'maize2' };
const BY_NAME: Record<string, CropId> = { ...Object.fromEntries(CROP_IDS.map((id) => [CROPS[id].name, id])), ...LEGACY };
/** Nome exibido → ID do contrato. `null` quando não é cultura do contrato (cobertura, "Outra") ou quando é ambíguo. */
export const cropIdFromName = (name: string | null | undefined): CropId | null => (name ? BY_NAME[name.trim()] ?? null : null);
/** Nomes antigos que não dizem a espécie ou a safra ("Café", "Milho", "Feijão"): não adivinhamos, a interface pede complemento. */
export const isAmbiguousCropName = (name: string | null | undefined) => !!name && ['café', 'cafe', 'milho', 'feijão', 'feijao'].includes(name.trim().toLowerCase());
