import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';
import applicationSchema from '../schemas/application.json' with { type: 'json' };
import type { ValidateFunction } from 'ajv';
export type * from './generated/types.js';
export type ResultEnvelope<T> = { data: T; meta: import('./generated/types.js').ScientificMeta };
export type ExecutionOrigin = import('./generated/types.js').ScientificMeta['execution_origin'];
export type ResultBasis = import('./generated/types.js').ScientificMeta['result_basis'];
export { routeContracts } from './generated/routes.js';
export { publishedCoverage, publishedObservations } from './publication.js';
export const APP_CONTRACT_VERSION = '0.1.0' as const;
export const schemas = applicationSchema;
const ajv = new Ajv2020({ allErrors: true, strict: false, coerceTypes: false });
const addFormats = addFormatsModule as unknown as (instance: Ajv2020) => void;
addFormats(ajv); ajv.addSchema(applicationSchema);
export const validators: Record<string, ValidateFunction> = Object.fromEntries(Object.keys(applicationSchema.$defs).map(name => [name, ajv.compile({ $ref: `${applicationSchema.$id}#/$defs/${name}` })]));
export function validateScientific(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (record.product === 'yield_estimate') return validators.YieldPayload!(value);
  if (record.product === 'water_risk_projection') return validators.WaterRiskPayload!(value);
  if (record.product === 'field_shift_scenario') return validators.FieldShiftPayload!(value);
  return false;
}
/** Canonical JSON identity: all request parameters, stable key ordering, no private fields. */
export function contextKey(kind: string, parameters: Record<string, unknown>): string {
  return `${kind}:${JSON.stringify(Object.fromEntries(Object.entries(parameters).sort(([a], [b]) => a.localeCompare(b))))}`;
}
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
