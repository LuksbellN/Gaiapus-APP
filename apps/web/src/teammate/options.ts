// Choice fields saved in records and plans (Docs/ux-preservacao/07, section 5). Records used to store the Portuguese
// label ("Sequeiro"); they now store a stable code next to it (`irrigacao_code: 'rainfed'`). Labels are translated at render.
// Reading is additive: old records keep their text and gain the code when it can be recognised; nothing is rewritten.
import { translate } from './i18n';

export const OPTIONS = {
  irrigacao: { rainfed: 'Sequeiro', irrigated: 'Irrigado' },
  irrigation: { rainfed: 'Sequeiro', irrigated: 'Irrigado' },
  solo: { unknown: 'Não sei', sandy: 'Arenoso', medium: 'Médio', clay: 'Argiloso' },
  soil: { unknown: 'Não sei', sandy: 'Arenoso', medium: 'Médio', clay: 'Argiloso' },
  sistema: { no_till: 'Plantio direto', conventional: 'Convencional', minimum_till: 'Cultivo mínimo' },
  tipo: { emergence: 'Emergência', flowering: 'Floração', irrigation: 'Irrigação', fertilization: 'Fertilização', pruning: 'Poda', pest_disease: 'Praga ou doença', damage: 'Dano (granizo, geada, seca)', soil_test: 'Análise de solo', other: 'Outro' },
  forma: { cherry: 'Cereja', dried_cherry: 'Coco', green: 'Beneficiado' },
  origem: { weighing: 'Pesagem', warehouse_ticket: 'Romaneio do armazém', own_estimate: 'Estimativa própria' },
  situacao: { actual: 'Realizado', planned: 'Previsto' },
} as const;
export type OptionField = keyof typeof OPTIONS;
/** Message namespace per field (irrigation and soil share their labels between plans/records and plots). */
const NS: Record<OptionField, string> = { irrigacao: 'irrigation', irrigation: 'irrigation', solo: 'soil', soil: 'soil', sistema: 'system', tipo: 'event', forma: 'coffeeForm', origem: 'harvestSource', situacao: 'saleStatus' };
export const codesOf = (field: OptionField) => Object.keys(OPTIONS[field]);
/** Stored Portuguese label → code; null when the text is not one of the known options. */
export function codeOf(field: OptionField, stored: string | undefined): string | null {
  if (!stored) return null; const hit = Object.entries(OPTIONS[field]).find(([, pt]) => pt === stored.trim()); return hit ? hit[0] : null;
}
/** Label in the current language, for a code or a stored Portuguese label. Unknown text is shown as typed. */
export function optionLabel(field: OptionField, codeOrStored: string | undefined): string {
  if (!codeOrStored) return '';
  const code = codeOrStored in OPTIONS[field] ? codeOrStored : codeOf(field, codeOrStored);
  return code ? translate(`options.${NS[field]}.${code}`) : codeOrStored;
}
/** Portuguese label kept in the record for compatibility with earlier versions, given a code. */
export const legacyLabel = (field: OptionField, code: string) => (OPTIONS[field] as Record<string, string>)[code] ?? code;

/** Adds `<field>_code` where the stored text is recognised. Never removes or rewrites existing values. */
export function withCodes(data: Record<string, string>): Record<string, string> {
  const out = { ...data };
  for (const field of ['irrigacao', 'solo', 'sistema', 'tipo', 'forma', 'origem', 'situacao'] as OptionField[]) {
    const key = `${field}_code`; if (key in out || !(field in out)) continue;
    const code = codeOf(field, out[field]); if (code) out[key] = code;
  }
  return out;
}
/** Value of a choice field as a code: the saved code, else the recognised legacy text. */
export const choice = (data: Record<string, string>, field: OptionField) => data[`${field}_code`] || codeOf(field, data[field]) || '';
/** Writes a choice: code plus the Portuguese label for older versions of the app. */
export const setChoice = (field: OptionField, code: string) => ({ [`${field}_code`]: code, [field]: legacyLabel(field, code) });
