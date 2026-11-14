// Capacidades por cultura e território. Não é um booleano "disponível": cada função tem um estado próprio.
// Reflete o que ESTE frontend consegue mostrar hoje com os contratos e exemplos existentes;
// a falta de exemplo local não prova que o backend não cobre o município.
import { CROPS, type CropId } from './catalog';
import examples from './data/fixtures/v7/index.json';

export type CapStatus = 'local' | 'demo' | 'pendente' | 'sem_suporte';
export const CAP_STATUS: Record<CapStatus, { label: string; tone: 'ok' | 'water' | 'warn' | undefined }> = {
  local: { label: 'Disponível neste aparelho', tone: 'ok' },
  demo: { label: 'Exemplo demonstrativo', tone: 'water' },
  pendente: { label: 'Integração pendente', tone: 'warn' },
  sem_suporte: { label: 'Sem suporte nesta edição', tone: undefined },
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
  const inRotation = mun === SORRISO && crop === 'maize2';
  return [
    info.plantable
      ? { id: 'cadastro', label: 'Cadastro manual', status: 'local', note: 'Plantio, manejo, colheita e venda ficam salvos só neste aparelho; a sincronização depende do backend.' }
      : { id: 'cadastro', label: 'Cadastro manual', status: 'sem_suporte', note: 'É uma coorte estatística agregada, não uma espécie plantável. Cadastre arábica ou conilon.' },
    { id: 'historico', label: 'Histórico municipal', status: 'pendente', note: 'A série de área e rendimento do IBGE PAM entra no treino, mas não é servida por nenhum contrato atual.' },
    here
      ? { id: 'rendimento', label: 'Estimativa de rendimento', status: 'demo', note: 'Resposta de exemplo do contrato yield-estimate para este município; retrospectiva (colheita 2021), não liberada para operação.' }
      : { id: 'rendimento', label: 'Estimativa de rendimento', status: 'pendente', note: anywhere ? 'O contrato yield-estimate cobre a cultura e há exemplo em outro município. Sem serviço HTTP ligado, não dá para consultar este município; isso não prova falta de cobertura.' : 'Sem exemplo do contrato para esta cultura neste frontend.' },
    hasDailySeries(crop, mun)
      ? { id: 'hidrica', label: 'Simulação hídrica', status: 'demo', note: 'Projeção de 6 dias e simulação histórica 2015/16–2020/21 da rotação de Sorriso (pacote v7).' }
      : inRotation
        ? { id: 'hidrica', label: 'Simulação hídrica', status: 'demo', note: 'O milho safrinha aparece dentro da rotação soja → milho de Sorriso; não há série própria começando no milho.' }
        : { id: 'hidrica', label: 'Simulação hídrica', status: 'pendente', note: 'Os contratos water-projection e field-shift só têm resposta para a rotação de soja em Sorriso. Nenhuma série é gerada para esta combinação.' },
    (opts.field ?? mun === UBERLANDIA)
      ? { id: 'imagem', label: 'Imagem e NDVI', status: 'demo', note: 'Recorte rural demonstrativo publicado (HLS). Vale para o recorte, não para o município nem para a cultura, e não comprova previsão de rendimento.' }
      : { id: 'imagem', label: 'Imagem e NDVI', status: 'pendente', note: 'Depende do polígono do talhão, do período e da qualidade da imagem; não há contrato de imagem por talhão.' },
    hasDailySeries(crop, mun) || inRotation
      ? { id: 'cena3d', label: 'Representação 3D', status: 'demo', note: 'Cena ilustrativa com modelos provisórios; segue um calendário demonstrativo e não prova crescimento.' }
      : { id: 'cena3d', label: 'Representação 3D', status: 'sem_suporte', note: 'Não há representação específica desta cultura; a cena de soja não é reaproveitada com outro nome.' },
  ];
}
