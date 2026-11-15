// Versioned registry of what the report knows how to name: seasonal metrics, events, limitation codes and the
// free-text provenance strings of the publications seen so far. Anything outside the registry gets no invented
// unit, name or translation: it is kept with its own identifier (or quoted as original text) and flagged.
import type { ReportTextFact } from '@gaiapus/contracts';

export const REPORT_SCHEMA_VERSION = 'simulation-technical-report.v1';
/** Bump when the structure or the wording rules of the rendered document change. */
export const REPORT_TEMPLATE_VERSION = '1.0.0';

export type MetricUnit = 'mm' | 'days' | 'kg_ha';
/** indicator groups metrics and events that describe the same thing, so the summary never repeats one. */
export type Indicator = 'precipitation' | 'etc' | 'eta' | 'deficit' | 'storage' | 'stress' | 'reproductive_stress' | 'dry_spell' | 'yield';
export interface MetricDefinition { unit: MetricUnit; indicator: Indicator; order: number; block: 'water' | 'yield' }
export const METRICS: Readonly<Record<string, MetricDefinition>> = {
  precipitation_mm: { unit: 'mm', indicator: 'precipitation', order: 1, block: 'water' },
  // US publications name the same in-season precipitation total rain_mm (the planning screen already reads both).
  rain_mm: { unit: 'mm', indicator: 'precipitation', order: 1, block: 'water' },
  crop_etc_mm: { unit: 'mm', indicator: 'etc', order: 2, block: 'water' },
  crop_eta_mm: { unit: 'mm', indicator: 'eta', order: 3, block: 'water' },
  crop_deficit_mm: { unit: 'mm', indicator: 'deficit', order: 4, block: 'water' },
  mean_storage_mm: { unit: 'mm', indicator: 'storage', order: 5, block: 'water' },
  stress_days: { unit: 'days', indicator: 'stress', order: 6, block: 'water' },
  reproductive_stress_days: { unit: 'days', indicator: 'reproductive_stress', order: 7, block: 'water' },
  max_dry_spell_days: { unit: 'days', indicator: 'dry_spell', order: 8, block: 'water' },
  yield_kg_ha: { unit: 'kg_ha', indicator: 'yield', order: 9, block: 'yield' },
};
export type MetricId = 'precipitation_mm' | 'rain_mm' | 'crop_etc_mm' | 'crop_eta_mm' | 'crop_deficit_mm' | 'mean_storage_mm' | 'stress_days' | 'reproductive_stress_days' | 'max_dry_spell_days' | 'yield_kg_ha';

/** Thresholds are definitions of the simulation protocol, never official management limits. */
export interface EventDefinition { indicator: Indicator; threshold: number; order: number }
export const EVENTS: Readonly<Record<string, EventDefinition>> = {
  reproductive_stress_days_ge_10: { indicator: 'reproductive_stress', threshold: 10, order: 1 },
  reproductive_stress_ge_20d: { indicator: 'reproductive_stress', threshold: 20, order: 2 },
  dry_spell_ge_15_days_in_season: { indicator: 'dry_spell', threshold: 15, order: 3 },
  crop_deficit_mm_ge_100: { indicator: 'deficit', threshold: 100, order: 4 },
};
export type EventId = 'reproductive_stress_days_ge_10' | 'reproductive_stress_ge_20d' | 'dry_spell_ge_15_days_in_season' | 'crop_deficit_mm_ge_100';

export const LIMITATION_CODES = ['climatological_scenario_not_daily_forecast', 'historical_frequency_not_probability', 'single_bucket_no_root_profile', 'soil_hypothesis',
  'calendar_hypothesis', 'fallow_parameters_hypothesis', 'not_field_validated', 'no_heat_frost_pest_effects', 'county_scale_not_field', 'scenario_band_not_calibrated',
  'sowing_date_regional_hypothesis', 'rainfed_bucket_hypotheses_no_irrigation', 'label_release_dates_estimated_before_2023', 'research_status_no_promotion'] as const;
export type LimitationCode = (typeof LIMITATION_CODES)[number];
/** Exact legacy sentences of published runs and the code that explains each one in the report language. */
const LIMITATION_MESSAGES: Readonly<Record<string, LimitationCode>> = {
  'County-scale estimate (USDA NASS county yield), not a field or farm prediction': 'county_scale_not_field',
  'Weather after as_of is a climatological scenario from historical analog years, not a forecast': 'climatological_scenario_not_daily_forecast',
  'Scenario band is not a calibrated predictive interval; predictive band adds development residuals only': 'scenario_band_not_calibrated',
  'Sowing date is a fixed regional hypothesis; Crop Progress is state-level': 'sowing_date_regional_hypothesis',
  'Water balance: rainfed bucket; soil capacity and initial storage are hypotheses; irrigation not represented': 'rainfed_bucket_hypotheses_no_irrigation',
  'Label availability before 2023 uses conservative estimated release dates': 'label_release_dates_estimated_before_2023',
  'Research status only; no automatic promotion': 'research_status_no_promotion',
};

export const TEXT_CODES = ['fixed_state_calendar_hypothesis', 'fixed_regional_calendar_hypothesis', 'fao56_penman_monteith_daily', 'retrospective_availability_unknown', 'retrospective_snapshot',
  'protocol_representative_member_deficit_extremes', 'nearest_member_multivariate_median_deficit_extremes', 'season_deficit_difference_central_member', 'each_source_day_once_totals_preserved',
  'ibge_pam_published_by_31_october_next_year', 'missing_values', 'historical_analog_blocks_over_nasa_power', 'usda_nass_county_estimates'] as const;
export type TextCode = (typeof TEXT_CODES)[number];
export type TextField = 'calendar_source' | 'et0' | 'availability' | 'representative_rule' | 'sensitivity_metric' | 'calendar_note' | 'label_release_rule' | 'excluded_reason' | 'segment_origin' | 'yield_labels';
const TEXT_PATTERNS: Readonly<Record<TextField, readonly [RegExp, TextCode][]>> = {
  calendar_source: [[/fixed state calendar \(hypothesis\)$/, 'fixed_state_calendar_hypothesis'], [/fixed regional hypothesis \(us_training_v1\/v2 calendars\)/, 'fixed_regional_calendar_hypothesis']],
  et0: [[/^FAO-56 Penman-Monteith daily \(/, 'fao56_penman_monteith_daily']],
  availability: [[/^unknown \(archived retrospective series; observation date <= as_of enforced\)$/, 'retrospective_availability_unknown'], [/^retrospective snapshot$/, 'retrospective_snapshot']],
  representative_rule: [[/^protocol future_simulation_v1 representative_member; dry\/wet = max\/min crop deficit$/, 'protocol_representative_member_deficit_extremes'],
    [/^nearest whole member to the multivariate median \(rain, deficit, mean storage\); dry\/wet = max\/min crop deficit$/, 'nearest_member_multivariate_median_deficit_extremes']],
  sensitivity_metric: [[/^season crop deficit difference \(mm\) on the central member$/, 'season_deficit_difference_central_member']],
  calendar_note: [[/^each source day used once; precipitation totals preserved$/, 'each_source_day_once_totals_preserved']],
  label_release_rule: [[/^IBGE PAM year Y published by 31 Oct of Y\+1$/, 'ibge_pam_published_by_31_october_next_year']],
  excluded_reason: [[/^missing_values$/, 'missing_values']],
  segment_origin: [[/^historical_analog_blocks_v1 over NASA POWER$/, 'historical_analog_blocks_over_nasa_power']],
  yield_labels: [[/^USDA NASS county estimates \(/, 'usda_nass_county_estimates']],
};

const CONTROL = /[\u0000-\u001f\u007f-\u009f]+/g;
// Absolute or relative file-system paths and directory/file.ext references of the producing pipeline.
const PATH_LIKE = /[A-Za-z]:\\[^\s)]+|(?<=^|[\s("'=])(?:~|\.{1,2})?\/[\w.-]+(?:\/[\w.-]+)+|\b(?:[\w-]+\/)+[\w-]+\.\w+\b/g;
/** Free text of a source, safe to quote: one line, bounded, without paths of the producing pipeline. */
export function sanitizeSourceText(value: string): string {
  return value.replace(CONTROL, ' ').replace(PATH_LIKE, '[internal reference]').replace(/\s+/g, ' ').trim().slice(0, 1000);
}
/** A known code when the registry recognises the text of that field; otherwise the sanitised original. */
export function classifyText(field: TextField, value: string, lang: string | null = null): ReportTextFact {
  for (const [pattern, code] of TEXT_PATTERNS[field]) if (pattern.test(value)) return { kind: 'code', code };
  return { kind: 'text', text: sanitizeSourceText(value) || '[empty]', lang };
}
export function classifyLimitation(value: string): ReportTextFact {
  if ((LIMITATION_CODES as readonly string[]).includes(value)) return { kind: 'code', code: value };
  const mapped = LIMITATION_MESSAGES[value];
  return mapped ? { kind: 'code', code: mapped } : { kind: 'text', text: sanitizeSourceText(value) || '[empty]', lang: null };
}
export const YIELD_METHODS = ['mean_last_5_published_pam_yields'] as const;
export const INTERVAL_METHODS = ['climate_ensemble_spread_only', 'ensemble_spread_uncalibrated', 'p50_plus_development_residual_quantiles'] as const;
export const ENSEMBLE_METHODS = ['historical_analog_blocks_v1'] as const;
export const CALENDAR_MAPPING_METHODS = ['day_offset_from_aligned_start'] as const;
export const CALENDAR_RULES = ['maize2_shifted_after_previous_harvest'] as const;
export const PHASE_CODES = ['fallow', 'establishment', 'vegetative', 'reproductive', 'maturation'] as const;
export const CROP_IDS = ['soy', 'maize', 'maize1', 'maize2', 'wheat', 'wheat_winter', 'rice', 'bean1', 'bean2', 'coffee_arabica', 'coffee_total_mg'] as const;
