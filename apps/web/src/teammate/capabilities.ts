// Capacidades por cultura e território. Não é um booleano "disponível": cada função tem um estado próprio.
// Reflete o que ESTE frontend consegue mostrar hoje com os contratos e exemplos existentes;
// a falta de exemplo local não prova que o backend não cobre o município.
import { CROPS, type CropId } from './catalog';
import examples from './data/fixtures/v7/index.json';
import { translate } from './i18n';

export type CapStatus = 'local' | 'demo' | 'pendente' | 'sem_suporte';
const status = (key: CapStatus, tone: 'ok' | 'water' | 'warn' | undefined) => ({ tone, get label() { return translate(`caps.status.${key}`); } });
export const CAP_STATUS: Record<CapStatus, { readonly label: string; tone: 'ok' | 'water' | 'warn' | undefined }> = {
  local: status('local', 'ok'), demo: status('demo', 'water'), pendente: status('pendente', 'warn'), sem_suporte: status('sem_suporte', undefined),
};
export type CapId = 'cadastro' | 'historico' | 'rendimento' | 'hidrica' | 'imagem' | 'cena3d';
export type Capability = { id: CapId; label: string; status: CapStatus; note: string };

export const SORRISO = '5107925'; export const UBERLANDIA = '3170206';
// Respostas antigas (schema 1.0.0) que já estavam no frontend, além dos exemplos v7.
const LEGACY_YIELD: [CropId, string][] = [['soy', SORRISO], ['maize2', SORRISO], ['soy', UBERLANDIA]];
export function yieldExampleCount(crop: CropId, mun?: string | null) {
  const all = [...examples.examples.map((e) => [e.crop, e.municipality_code] as const), ...LEGACY_YIELD];
  return all.filter(([c, m]) => c === crop && (!mun || m === mun)).length;
}
/** Simulação hídrica diária e cena 3D existem só para a rotação de Sorriso (soja → milho safrinha → pousio/braquiária). */
export const hasDailySeries = (crop: CropId, mun: string | null) => mun === SORRISO && crop === 'soy';

/** `field`: the municipality has a published demonstration field with imagery (from the coverage catalogue). */
export function capabilities(crop: CropId, mun: string | null, opts: { field?: boolean } = {}): Capability[] {
  const info = CROPS[crop]; const here = mun ? yieldExampleCount(crop, mun) : 0; const anywhere = yieldExampleCount(crop);
  const inRotation = mun === SORRISO && crop === 'maize2'; const tr = (k: string) => translate(`caps.${k}`); const label = (id: CapId) => tr(`label.${id}`);
  return [
    info.plantable ? { id: 'cadastro', label: label('cadastro'), status: 'local', note: tr('note.cadastroLocal') } : { id: 'cadastro', label: label('cadastro'), status: 'sem_suporte', note: tr('note.cadastroCohort') },
    { id: 'historico', label: label('historico'), status: 'pendente', note: tr('note.historico') },
    here ? { id: 'rendimento', label: label('rendimento'), status: 'demo', note: tr('note.rendimentoDemo') }
      : { id: 'rendimento', label: label('rendimento'), status: 'pendente', note: anywhere ? tr('note.rendimentoElsewhere') : tr('note.rendimentoNone') },
    hasDailySeries(crop, mun) ? { id: 'hidrica', label: label('hidrica'), status: 'demo', note: tr('note.hidricaDemo') }
      : inRotation ? { id: 'hidrica', label: label('hidrica'), status: 'demo', note: tr('note.hidricaRotation') }
      : { id: 'hidrica', label: label('hidrica'), status: 'pendente', note: tr('note.hidricaPending') },
    (opts.field ?? mun === UBERLANDIA) ? { id: 'imagem', label: label('imagem'), status: 'demo', note: tr('note.imagemDemo') }
      : { id: 'imagem', label: label('imagem'), status: 'pendente', note: tr('note.imagemPending') },
    hasDailySeries(crop, mun) || inRotation ? { id: 'cena3d', label: label('cena3d'), status: 'demo', note: tr('note.cena3dDemo') }
      : { id: 'cena3d', label: label('cena3d'), status: 'sem_suporte', note: tr('note.cena3dNone') },
  ];
}
