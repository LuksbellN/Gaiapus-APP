/* Generated from application schemas; run pnpm contracts:generate. */

/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ReasonCode".
 */
export type ReasonCode =
  | 'no_published_coverage'
  | 'unsupported_crop'
  | 'missing_artifacts'
  | 'incomplete_forcing'
  | 'unsupported_period'
  | 'fixture_not_available'
  | 'current_season_unavailable'
  | 'strategy_not_provided';
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ScientificEnvelope".
 */
export type ScientificEnvelope = YieldEstimateResponse | WaterRiskProjectionResponse | FieldShiftResponse;
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "EvidenceReviewResult".
 */
export type EvidenceReviewResult = EvidenceReview | null;
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "LocationId".
 */
export type LocationId = string;
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "LocationCropId".
 */
export type LocationCropId = 'soy' | 'maize1' | 'maize2' | 'wheat_winter';
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "LocationReason".
 */
export type LocationReason =
  | 'no_field_imagery'
  | 'too_few_clear_scenes'
  | 'forecast_not_in_publication'
  | 'crop_calendar_unknown'
  | 'out_of_season'
  | 'source_unavailable';
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "LocationLayerStatus".
 */
export type LocationLayerStatus = 'available' | 'unavailable';
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationRunKey".
 */
export type SimulationRunKey = string;
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationCapabilityStatus".
 */
export type SimulationCapabilityStatus =
  'ready' | 'research' | 'needs_input' | 'queued' | 'missing_data' | 'out_of_domain' | 'unsupported';
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationReason".
 */
export type SimulationReason =
  | 'insufficient_history'
  | 'unsupported_crop_engine'
  | 'unknown_yield_lag'
  | 'model_out_of_domain'
  | 'model_not_validated_for_planning'
  | 'source_unavailable'
  | 'invalid_calendar'
  | 'insufficient_soil_inputs'
  | 'flooded_system_not_represented'
  | 'perennial_engine_missing'
  | 'season_already_started_without_observations'
  | 'post_harvest_no_daily_series'
  | 'unsupported';
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationResearchStatus".
 */
export type SimulationResearchStatus =
  | 'research_confirmed'
  | 'gain_not_confirmed'
  | 'reference_selected'
  | 'underpowered'
  | 'not_executed'
  | 'not_evaluated';
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationSeasonPosition".
 */
export type SimulationSeasonPosition = 'pre_season' | 'in_season_partial' | 'post_cutoff' | 'post_harvest_pre_release';
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationOutputMode".
 */
export type SimulationOutputMode = 'simulation_conditional_on_historical_weather' | 'in_season_forecast';
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationScientificStatus".
 */
export type SimulationScientificStatus = 'physical_experimental' | 'reference' | 'research' | 'unavailable';
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationWeatherKind".
 */
export type SimulationWeatherKind = 'observed' | 'short_forecast' | 'seasonal_forecast' | 'climatological_scenario';
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationYield".
 */
export type SimulationYield =
  | {
      status: 'unavailable';
      reason_code: SimulationReason;
      value_kg_ha: null;
    }
  | {
      status: 'reference';
      method: string;
      value_kg_ha: number;
      years_used: number[];
      last_label_year: number;
      history_horizon_years: number;
      label_release_rule: string;
      research_status: SimulationResearchStatus;
      exposure_flags: string[];
      conditional_on_scenario: false;
      interval_method: null;
      scale: string;
    }
  | {
      status: 'research' | 'reference';
      method: string;
      model_version: string;
      value_kg_ha: number;
      scenario_range: {
        p10: number;
        p50: number;
        p90: number;
        method: 'ensemble_spread_uncalibrated';
      } | null;
      predictive_range: {
        p10: number;
        p50: number;
        p90: number;
        interval_method: string;
      } | null;
      position_vs_season: SimulationSeasonPosition;
      last_label_year: number;
      history_horizon_years: number;
      label_release_rule: string;
      research_status: SimulationResearchStatus;
      exposure_flags: string[];
      conditional_on_scenario: boolean;
      scale: string;
    };

export interface GaiapusContracts {
  YieldPayload?: YieldPayload;
  WaterRiskPayload?: WaterRiskPayload;
  FieldShiftPayload?: GaiapusFieldShiftScenario;
  YieldErrorPayload?: GaiapusYieldRequestError;
  ReasonCode?: ReasonCode;
  Period?: Period;
  ResponseMeta?: ResponseMeta;
  ScientificMeta?: ScientificMeta;
  YieldEstimateResponse?: YieldEstimateResponse;
  WaterRiskProjectionResponse?: WaterRiskProjectionResponse;
  FieldShiftResponse?: FieldShiftResponse;
  ScientificEnvelope?: ScientificEnvelope;
  ExplorationContext?: ExplorationContext;
  SourceReference?: SourceReference;
  Geography?: Geography;
  GeographyPage?: GeographyPage;
  SupportedInput?: SupportedInput;
  ProductCapability?: ProductCapability;
  CoverageResult?: CoverageResult;
  ObservationPoint?: ObservationPoint;
  ObservationSeries?: ObservationSeries;
  ImageryReference?: ImageryReference;
  ObservationsResult?: ObservationsResult;
  ExampleSummary?: ExampleSummary;
  ExamplePage?: ExamplePage;
  StrategyExampleInput?: StrategyExampleInput;
  ExampleDetail?: ExampleDetail;
  YieldEstimateRequest?: YieldEstimateRequest;
  WaterRiskProjectionRequest?: WaterRiskProjectionRequest;
  Profile?: Profile;
  Preferences?: Preferences;
  MeResult?: MeResult;
  MonitoredPlace?: MonitoredPlace;
  MonitoredPlacePage?: MonitoredPlacePage;
  ComparisonSummary?: ComparisonSummary;
  ComparisonDetail?: ComparisonDetail;
  ScientificCatalog?: ScientificCatalog;
  ComparisonPage?: ComparisonPage;
  EvidenceReview?: EvidenceReview;
  EvidenceReviewResult?: EvidenceReviewResult;
  UpdateAccountRequest?: UpdateAccountRequest;
  CreatePlaceRequest?: CreatePlaceRequest;
  RenamePlaceRequest?: RenamePlaceRequest;
  SaveComparisonRequest?: SaveComparisonRequest;
  EditComparisonRequest?: EditComparisonRequest;
  RecordEvidenceRequest?: RecordEvidenceRequest;
  PageQuery?: PageQuery;
  GeographyQuery?: GeographyQuery;
  CoverageQuery?: CoverageQuery;
  ObservationsQuery?: ObservationsQuery;
  ExamplesQuery?: ExamplesQuery;
  EvidenceQuery?: EvidenceQuery;
  PrivateIdParams?: PrivateIdParams;
  ExampleIdParams?: ExampleIdParams;
  ErrorResponse?: ErrorResponse;
  LocationId?: LocationId;
  LocationIdParams?: LocationIdParams;
  LocationCropId?: LocationCropId;
  LocationReason?: LocationReason;
  LocationLayerStatus?: LocationLayerStatus;
  LocationWeatherRow?: LocationWeatherRow;
  LocationWaterRow?: LocationWaterRow;
  LocationWaterSeason?: LocationWaterSeason;
  LocationNdviRow?: LocationNdviRow;
  LocationForecastRow?: LocationForecastRow;
  LocationPlace?: LocationPlace;
  LocationField?: LocationField;
  LocationCrop?: LocationCrop;
  LocationLayerStatuses?: LocationLayerStatuses;
  LocationCore?: LocationCore;
  LocationSummary?: LocationSummary;
  LocationPage?: LocationPage;
  SimulationRunKey?: SimulationRunKey;
  SimulationIdParams?: SimulationIdParams;
  SimulationCapabilityStatus?: SimulationCapabilityStatus;
  SimulationReason?: SimulationReason;
  SimulationResearchStatus?: SimulationResearchStatus;
  SimulationSeasonPosition?: SimulationSeasonPosition;
  SimulationOutputMode?: SimulationOutputMode;
  SimulationScientificStatus?: SimulationScientificStatus;
  SimulationWeatherKind?: SimulationWeatherKind;
  SimulationQuery?: SimulationQuery;
  SimulationCapability?: SimulationCapability;
  SimulationPlaceCapabilities?: SimulationPlaceCapabilities;
  SimulationCatalog?: SimulationCatalog;
  SimulationArtifact?: SimulationArtifact;
  SimulationPublication?: SimulationPublication;
  SimulationPublicationList?: SimulationPublicationList;
  SimulationYield?: SimulationYield;
  SimulationSeason?: SimulationSeason;
  SimulationRun?: SimulationRun;
  SimulationSeriesMember?: SimulationSeriesMember;
  SimulationSeries?: SimulationSeries;
  SimulationCatalogResponse?: SimulationCatalogResponse;
  SimulationPublicationListResponse?: SimulationPublicationListResponse;
  SimulationRunResponse?: SimulationRunResponse;
  SimulationSeriesResponse?: SimulationSeriesResponse;
  LocationPageResponse?: LocationPageResponse;
  LocationCoreResponse?: LocationCoreResponse;
  GeographyPageResponse?: GeographyPageResponse;
  CoverageResultResponse?: CoverageResultResponse;
  ObservationsResultResponse?: ObservationsResultResponse;
  ExamplePageResponse?: ExamplePageResponse;
  ExampleDetailResponse?: ExampleDetailResponse;
  MeResultResponse?: MeResultResponse;
  MonitoredPlaceResponse?: MonitoredPlaceResponse;
  MonitoredPlacePageResponse?: MonitoredPlacePageResponse;
  ComparisonPageResponse?: ComparisonPageResponse;
  ComparisonDetailResponse?: ComparisonDetailResponse;
  EvidenceReviewResponse?: EvidenceReviewResponse;
  EvidenceReviewResultResponse?: EvidenceReviewResultResponse;
  ScientificCatalogResponse?: ScientificCatalogResponse;
}
/**
 * Municipal yield at harvest (kg/ha) from data available up to a validated cutoff after sowing. Separate product from the water-risk projection.
 *
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "YieldPayload".
 */
export interface YieldPayload {
  schema_version: '1.0.0';
  product: 'yield_estimate';
  status: 'ready' | 'before_first_cutoff' | 'not_supported';
  generated_at: string;
  municipality_code: string;
  crop: 'soy' | 'maize2';
  harvest_year: number;
  sowing_date: string;
  /**
   * Origin of sowing_date. The models were validated on the state calendar; a reported date shifts the features (see calendar sensitivity)
   */
  sowing_basis: 'hypothetical_fixed_calendar_per_state' | 'reported_by_user';
  days_after_sowing_requested: number;
  /**
   * @minItems 1
   */
  supported_cutoffs_days: [number, ...number[]];
  /**
   * Largest validated cutoff not after the requested day
   */
  cutoff_days_used: number | null;
  estimate_kg_ha: number | null;
  /**
   * Last day of data the estimate used
   */
  observed_through: string | null;
  model: {
    version: string;
    type: 'baseline' | 'ridge' | 'hgb' | 'mlp';
    sources: string[];
    artifact_sha256: string;
    trained_through_harvest: number;
  };
  validation: {
    years: number[];
    cutoff_days: number;
    mae_kg_ha: number;
    bias_kg_ha: number;
    label_families: number;
    municipalities: number;
    scope: string;
    out_of_training_municipalities?: {
      mae_kg_ha: number;
      label_families: number;
    };
  } | null;
  coverage: {
    forcing_days_expected: number;
    forcing_days_present: number;
    sources: string[];
  };
  availability: 'retrospective_inputs_vintages_unverified';
  warnings: string[];
}
/**
 * Soil water, deficit and stress for N days after a decision, driven by the forecast issued before the request. Never converted into a yield effect.
 *
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "WaterRiskPayload".
 */
export interface WaterRiskPayload {
  schema_version: '1.0.0';
  product: 'water_risk_projection';
  status: 'ready' | 'partially_validated' | 'not_supported';
  generated_at: string;
  municipality_code: string;
  location: {
    latitude: number;
    longitude: number;
  };
  crop: 'soy' | 'maize2';
  sowing_date: string;
  sowing_basis: 'hypothetical_fixed_calendar_per_state' | 'reported_by_user';
  decision_at: string;
  crop_day_at_decision: number;
  horizon_days_requested: number;
  horizon_days_served: number;
  max_validated_lead_days: number;
  soil: {
    cad_class: string;
    capacity_mm: number;
    initial_fraction_at_sowing: number;
    basis: string;
  };
  forecast: {
    provider: string;
    model: string;
    issued_at: string | null;
    available_at: string | null;
    retrieved_at: string;
    issue_time_source: string;
  };
  initial_state: {
    date: string;
    storage_mm: number;
    available_water_fraction: number;
    observed_days: number;
    observed_source: string;
  } | null;
  days: Day[];
  /**
   * Same bucket driven by the 2001-2021 day-of-year climatology, for comparison
   */
  reference_days: Day[];
  evaluation: {
    method: string;
    verification: string;
    reference: string;
    rule: {};
    by_lead: {
      lead_days: number;
      storage_mae_mm: number;
      reference_storage_mae_mm: number;
      stress_accuracy: number;
      coverage: number;
      passed: boolean;
    }[];
  };
  yield_effect: null;
  yield_effect_note: string;
  warnings: string[];
}
/**
 * This interface was referenced by `WaterRiskPayload`'s JSON-Schema
 * via the `definition` "day".
 */
export interface Day {
  date: string;
  lead_days: number;
  crop_day: number;
  phase: 'establishment' | 'vegetative' | 'reproductive' | 'maturation';
  rain_mm: number;
  et0_mm: number;
  storage_end_mm: number;
  available_water_fraction: number;
  et_deficit_mm: number;
  ks: number;
  stress: boolean;
  /**
   * False beyond the largest lead that passed the backtest
   */
  validated_lead: boolean;
}
/**
 * Simulated water and soil-cover indicators for two successions in one municipality. No yield effect; the municipal yield estimate is a separate response.
 *
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "FieldShiftPayload".
 */
export interface GaiapusFieldShiftScenario {
  schema_version: '1.0.0';
  product: 'field_shift_scenario';
  generated_at: string;
  municipality_code: string;
  simulated: true;
  sowing: {
    [k: string]: {
      origin: string;
    };
  };
  scenarios: {
    [k: string]: {
      mean: Indicators;
      /**
       * @minItems 1
       */
      by_year: [{}, ...{}[]];
    };
  };
  /**
   * @minItems 1
   */
  sensitivity: [{}, ...{}[]];
  daily_series_last_year: {
    /**
     * @minItems 300
     */
    [k: string]: [
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      Day1,
      ...Day1[]
    ];
  };
  yield_effect: null;
}
/**
 * This interface was referenced by `GaiapusFieldShiftScenario`'s JSON-Schema
 * via the `definition` "indicators".
 */
export interface Indicators {
  covered_days: number;
  off_season_water_use_mm: number;
  off_season_drainage_mm: number;
  storage_at_next_sowing_mm: number;
  soy_deficit_mm: number;
  maize_deficit_mm: number;
  maize_stress_days: number;
  next_soy_establishment_deficit_mm?: number | null;
}
/**
 * This interface was referenced by `GaiapusFieldShiftScenario`'s JSON-Schema
 * via the `definition` "day".
 */
export interface Day1 {
  date: string;
  land_cover: 'soy' | 'maize2' | 'maize2+brachiaria' | 'brachiaria' | 'bare';
  soil_covered: boolean;
  storage_end_mm: number;
  ks: number;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "YieldErrorPayload".
 */
export interface GaiapusYieldRequestError {
  schema_version: '1.0.0';
  product: 'yield_estimate';
  error: {
    code: 'invalid_crop' | 'invalid_municipality_code' | 'municipality_not_covered';
  };
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "Period".
 */
export interface Period {
  start: string;
  end: string;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ResponseMeta".
 */
export interface ResponseMeta {
  app_contract_version: '0.1.0';
  request_id: string;
  publication_version?: string;
  context_key?: string;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ScientificMeta".
 */
export interface ScientificMeta {
  app_contract_version: '0.1.0';
  request_id: string;
  publication_version: string;
  context_key: string;
  execution_origin: 'fixture' | 'live';
  result_basis: 'observation' | 'retrospective_estimate' | 'forecast_projection' | 'hypothetical_scenario' | 'mixed';
  save_handle?: {
    id: string;
    expires_at: string;
  };
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "YieldEstimateResponse".
 */
export interface YieldEstimateResponse {
  data: YieldPayload;
  meta: ScientificMeta;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "WaterRiskProjectionResponse".
 */
export interface WaterRiskProjectionResponse {
  data: WaterRiskPayload;
  meta: ScientificMeta;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "FieldShiftResponse".
 */
export interface FieldShiftResponse {
  data: GaiapusFieldShiftScenario;
  meta: ScientificMeta;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ExplorationContext".
 */
export interface ExplorationContext {
  area_id: string | null;
  view: 'explore' | 'timeline' | 'compare';
  product_id: ('history' | 'yield_estimate' | 'water_risk_projection' | 'strategy_comparison') | null;
  layer_id: string | null;
  period: Period | null;
  selected_date: string | null;
  example_id: string | null;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SourceReference".
 */
export interface SourceReference {
  source_id: string;
  description: string;
  url: string;
  source_revision: string;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "Geography".
 */
export interface Geography {
  area_id: string;
  name: string;
  kind: 'country' | 'state' | 'municipality' | 'published_field';
  parent_id: string | null;
  country_id: 'BR';
  state_id: string | null;
  /**
   * @minItems 4
   * @maxItems 4
   */
  bbox?: [number, number, number, number];
  geometry_ref?: string;
  scope: string;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "GeographyPage".
 */
export interface GeographyPage {
  items: Geography[];
  next_cursor: string | null;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SupportedInput".
 */
export interface SupportedInput {
  input: YieldEstimateRequest | WaterRiskProjectionRequest;
  example_id: string;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "YieldEstimateRequest".
 */
export interface YieldEstimateRequest {
  municipality_code: string;
  crop: 'soy' | 'maize2';
  harvest_year: number;
  days_after_sowing: number;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "WaterRiskProjectionRequest".
 */
export interface WaterRiskProjectionRequest {
  municipality_code: string;
  crop: 'soy' | 'maize2';
  sowing_date: string;
  decision_at: string;
  horizon_days: number;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ProductCapability".
 */
export interface ProductCapability {
  product_id: 'history' | 'yield_estimate' | 'water_risk_projection' | 'strategy_comparison';
  availability: 'available' | 'partial' | 'no_data';
  reason_code: ReasonCode | null;
  periods: Period[];
  supported_crops: ('soy' | 'maize2')[];
  supported_cutoffs_days: number[];
  supported_horizons_days: number[];
  evaluated_horizon_days: number | null;
  writable_inputs: string[];
  run_available: boolean;
  run_access: 'authenticated';
  execution_origin: ('fixture' | 'live') | null;
  supported_inputs: SupportedInput[];
  source_refs: SourceReference[];
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "CoverageResult".
 */
export interface CoverageResult {
  area_id: string;
  products: ProductCapability[];
  source_refs: SourceReference[];
  publication_version: string;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ObservationPoint".
 */
export interface ObservationPoint {
  date: string;
  value: number | null;
  quality: 'valid' | 'missing' | 'partial';
  acquired_at: string | null;
  scene_id: string | null;
  valid_fraction: number | null;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ObservationSeries".
 */
export interface ObservationSeries {
  series_id: string;
  unit: 'mm' | '1';
  time_basis: 'UTC';
  spatial_support: string;
  source: string;
  interval: 'daily' | 'acquisition';
  points: ObservationPoint[];
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ImageryReference".
 */
export interface ImageryReference {
  date: string;
  scene_id: string;
  collection: string;
  url: string;
  /**
   * @minItems 4
   * @maxItems 4
   */
  corners: [[number, number], [number, number], [number, number], [number, number]];
  spatial_support: string;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ObservationsResult".
 */
export interface ObservationsResult {
  area_id: string;
  period: Period;
  availability: 'available' | 'partial' | 'no_data';
  reason_code: ReasonCode | null;
  series: ObservationSeries[];
  imagery: ImageryReference[];
  source_refs: SourceReference[];
  alternatives: string[];
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ExampleSummary".
 */
export interface ExampleSummary {
  example_id: string;
  title: string;
  area_id: string;
  product_id: 'history' | 'yield_estimate' | 'water_risk_projection' | 'strategy_comparison';
  period: Period;
  result_basis: 'observation' | 'retrospective_estimate' | 'forecast_projection' | 'hypothetical_scenario' | 'mixed';
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ExamplePage".
 */
export interface ExamplePage {
  items: ExampleSummary[];
  next_cursor: string | null;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "StrategyExampleInput".
 */
export interface StrategyExampleInput {
  municipality_code: string;
  scenario_id: 'field-shift-sorriso';
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ExampleDetail".
 */
export interface ExampleDetail {
  example_id: string;
  title: string;
  area_id: string;
  product_id: 'history' | 'yield_estimate' | 'water_risk_projection' | 'strategy_comparison';
  period: Period;
  result_basis: 'observation' | 'retrospective_estimate' | 'forecast_projection' | 'hypothetical_scenario' | 'mixed';
  input_snapshot: YieldEstimateRequest | WaterRiskProjectionRequest | StrategyExampleInput;
  result: ScientificEnvelope;
  source_refs: SourceReference[];
  warnings: string[];
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "Profile".
 */
export interface Profile {
  user_id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "Preferences".
 */
export interface Preferences {
  locale: 'pt-BR' | 'en';
  last_monitored_place_id: string | null;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "MeResult".
 */
export interface MeResult {
  profile: Profile;
  preferences: Preferences;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "MonitoredPlace".
 */
export interface MonitoredPlace {
  id: string;
  area_id: string;
  kind: 'country' | 'state' | 'municipality' | 'published_field';
  label: string;
  created_at: string;
  updated_at: string;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "MonitoredPlacePage".
 */
export interface MonitoredPlacePage {
  items: MonitoredPlace[];
  next_cursor: string | null;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ComparisonSummary".
 */
export interface ComparisonSummary {
  id: string;
  title: string;
  product_id: 'history' | 'yield_estimate' | 'water_risk_projection' | 'strategy_comparison';
  area_id: string;
  created_at: string;
  updated_at: string;
  result_basis: 'observation' | 'retrospective_estimate' | 'forecast_projection' | 'hypothetical_scenario' | 'mixed';
  monitored_place_id: string | null;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ComparisonDetail".
 */
export interface ComparisonDetail {
  id: string;
  title: string;
  product_id: 'history' | 'yield_estimate' | 'water_risk_projection' | 'strategy_comparison';
  area_id: string;
  created_at: string;
  updated_at: string;
  result_basis: 'observation' | 'retrospective_estimate' | 'forecast_projection' | 'hypothetical_scenario' | 'mixed';
  monitored_place_id: string | null;
  notes: string;
  input_snapshot: YieldEstimateRequest | WaterRiskProjectionRequest | StrategyExampleInput;
  output_envelope: ScientificEnvelope;
  source_versions: {
    scientific_revision: string;
    publication_version: string;
    app_contract_version: '0.1.0';
  };
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ScientificCatalog".
 */
export interface ScientificCatalog {
  bundle_sha256: string;
  source_revision: string;
  operational_release: 'not_released';
  models: {
    crop: string;
    artifact: string;
    validation_status: string;
    public_contract_supported: boolean;
    smoke_cases: number;
    operational_release: 'not_released';
  }[];
  regional_soy: {
    selected: 'site+mlp';
    run_available: false;
    reason_code: 'missing_artifacts';
    frozen_at: string;
    test_2022_2024_evaluated: false;
  };
  published_strategy_examples: string[];
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ComparisonPage".
 */
export interface ComparisonPage {
  items: ComparisonSummary[];
  next_cursor: string | null;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "EvidenceReview".
 */
export interface EvidenceReview {
  context_key: string;
  publication_version: string;
  reviewed_at: string;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "UpdateAccountRequest".
 */
export interface UpdateAccountRequest {
  display_name?: string | null;
  locale?: 'pt-BR' | 'en';
  last_monitored_place_id?: string | null;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "CreatePlaceRequest".
 */
export interface CreatePlaceRequest {
  area_id: string;
  label?: string;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "RenamePlaceRequest".
 */
export interface RenamePlaceRequest {
  label: string;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SaveComparisonRequest".
 */
export interface SaveComparisonRequest {
  source:
    | {
        kind: 'example';
        example_id: string;
      }
    | {
        kind: 'analysis';
        save_handle_id: string;
      };
  title: string;
  notes?: string;
  monitored_place_id?: string | null;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "EditComparisonRequest".
 */
export interface EditComparisonRequest {
  title?: string;
  notes?: string;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "RecordEvidenceRequest".
 */
export interface RecordEvidenceRequest {
  context_key: string;
  publication_version: string;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "PageQuery".
 */
export interface PageQuery {
  cursor?: string;
  limit?: number;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "GeographyQuery".
 */
export interface GeographyQuery {
  cursor?: string;
  limit?: number;
  q?: string;
  parent_id?: string;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "CoverageQuery".
 */
export interface CoverageQuery {
  area_id: string;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ObservationsQuery".
 */
export interface ObservationsQuery {
  area_id: string;
  start: string;
  end: string;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ExamplesQuery".
 */
export interface ExamplesQuery {
  cursor?: string;
  limit?: number;
  area_id?: string;
  product_id?: 'history' | 'yield_estimate' | 'water_risk_projection' | 'strategy_comparison';
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "EvidenceQuery".
 */
export interface EvidenceQuery {
  context_key: string;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "PrivateIdParams".
 */
export interface PrivateIdParams {
  id: string;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ExampleIdParams".
 */
export interface ExampleIdParams {
  id: string;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ErrorResponse".
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    field_errors?: {
      [k: string]: string;
    };
  };
  meta: ResponseMeta;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "LocationIdParams".
 */
export interface LocationIdParams {
  id: LocationId;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "LocationWeatherRow".
 */
export interface LocationWeatherRow {
  date: string;
  rain_mm: number;
  et0_mm: number;
  tmin_c: number;
  tmax_c: number;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "LocationWaterRow".
 */
export interface LocationWaterRow {
  date: string;
  storage_mm: number;
  available_fraction: number;
  etc_mm: number;
  eta_mm: number;
  deficit_mm: number;
  drainage_mm: number;
  ks: number;
  stage: 'establishment' | 'vegetative' | 'reproductive' | 'maturation';
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "LocationWaterSeason".
 */
export interface LocationWaterSeason {
  crop: LocationCropId;
  season: string;
  sowing_date: string;
  harvest_date: string;
  initial_fraction: number;
  parameter_set: string;
  /**
   * @minItems 1
   */
  rows: [LocationWaterRow, ...LocationWaterRow[]];
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "LocationNdviRow".
 */
export interface LocationNdviRow {
  date: string;
  ndvi: number | null;
  valid_fraction: number;
  scene_id: string;
  collection: 'hls2-l30' | 'hls2-s30';
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "LocationForecastRow".
 */
export interface LocationForecastRow {
  date: string;
  rain_mm: number;
  et0_mm: number;
  storage_mm: number;
  stress: boolean;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "LocationPlace".
 */
export interface LocationPlace {
  id: LocationId;
  country: 'BR' | 'US';
  scheme: 'ibge' | 'fips';
  code: string;
  name: string;
  admin1_code: string;
  admin1_name: string;
  legacy_area_id: string | null;
  /**
   * @minItems 2
   * @maxItems 2
   */
  centroid: [number, number];
  /**
   * @minItems 4
   * @maxItems 4
   */
  bbox: [number, number, number, number];
  boundary_url: string;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "LocationField".
 */
export interface LocationField {
  polygon: {
    type: 'Polygon';
    /**
     * @minItems 1
     */
    coordinates: [[[number, number], ...[number, number][]], ...[[number, number], ...[number, number][]][]];
  };
  area_ha: number;
  rationale: string;
  inside_boundary: true;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "LocationCrop".
 */
export interface LocationCrop {
  crop: LocationCropId;
  season: string;
  sowing_date: string | null;
  harvest_date: string | null;
  calendar_source: string | null;
  is_hypothesis: true;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "LocationLayerStatuses".
 */
export interface LocationLayerStatuses {
  weather: LocationLayerStatus;
  water_balance: LocationLayerStatus;
  ndvi: LocationLayerStatus;
  forecast: LocationLayerStatus;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "LocationCore".
 */
export interface LocationCore {
  schema_version: 'location-core.v1';
  place: LocationPlace;
  field: LocationField | null;
  /**
   * @minItems 1
   */
  crops: [LocationCrop, ...LocationCrop[]];
  soil: {
    capacity_mm: number;
    source: string;
    is_hypothesis: boolean;
  };
  layers: {
    weather:
      | {
          status: 'available';
          source: string;
          method?: string;
          period: Period;
          /**
           * @minItems 1
           */
          rows: [LocationWeatherRow, ...LocationWeatherRow[]];
        }
      | {
          status: 'unavailable';
          reason_code: LocationReason;
          source?: string;
        };
    water_balance:
      | {
          status: 'available';
          source: string;
          method?: string;
          period: Period;
          /**
           * @minItems 1
           */
          seasons: [LocationWaterSeason, ...LocationWaterSeason[]];
        }
      | {
          status: 'unavailable';
          reason_code: LocationReason;
          source?: string;
        };
    ndvi:
      | {
          status: 'available';
          source: string;
          method?: string;
          period: Period;
          /**
           * @minItems 1
           */
          rows: [LocationNdviRow, ...LocationNdviRow[]];
        }
      | {
          status: 'unavailable';
          reason_code: LocationReason;
          source?: string;
        };
    forecast:
      | {
          status: 'available';
          source: string;
          method?: string;
          period: Period;
          /**
           * @minItems 1
           */
          rows: [LocationForecastRow, ...LocationForecastRow[]];
          issued_at: string;
          crop: LocationCropId;
          season: string;
        }
      | {
          status: 'unavailable';
          reason_code: LocationReason;
          source?: string;
        };
  };
  provenance: {
    generated_at: string;
    generator: string;
    /**
     * @minItems 1
     */
    inputs: [
      {
        source: string;
        dataset: string;
        retrieved_at: string;
        sha256: string | null;
      },
      ...{
        source: string;
        dataset: string;
        retrieved_at: string;
        sha256: string | null;
      }[]
    ];
  };
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "LocationSummary".
 */
export interface LocationSummary {
  id: LocationId;
  country: 'BR' | 'US';
  scheme: 'ibge' | 'fips';
  code: string;
  name: string;
  admin1_code: string;
  admin1_name: string;
  legacy_area_id: string | null;
  /**
   * @minItems 2
   * @maxItems 2
   */
  centroid: [number, number];
  /**
   * @minItems 4
   * @maxItems 4
   */
  bbox: [number, number, number, number];
  layers: LocationLayerStatuses;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "LocationPage".
 */
export interface LocationPage {
  items: LocationSummary[];
  next_cursor: string | null;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationIdParams".
 */
export interface SimulationIdParams {
  id: SimulationRunKey;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationQuery".
 */
export interface SimulationQuery {
  location_id?: LocationId;
  crop_id?: string;
  harvest_year?: string;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationCapability".
 */
export interface SimulationCapability {
  crop_id: string;
  harvest_year: number;
  status: SimulationCapabilityStatus;
  reason_code: SimulationReason | null;
  run_ids: SimulationRunKey[];
  water_balance?: 'physical_experimental';
  yield?: string;
  yield_result?: SimulationYield;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationPlaceCapabilities".
 */
export interface SimulationPlaceCapabilities {
  location_id: LocationId;
  name: string;
  state_code: string;
  history_years: number;
  observed_until: string | null;
  capabilities: SimulationCapability[];
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationCatalog".
 */
export interface SimulationCatalog {
  contract: 'future-simulation-capabilities.v1';
  as_of: string;
  harvest_years: number[];
  places: SimulationPlaceCapabilities[];
  /**
   * Reproduction inputs of the publication (places, seed, member limit)
   */
  inputs: {};
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationArtifact".
 */
export interface SimulationArtifact {
  kind: 'run' | 'series' | 'members';
  path: string;
  sha256: string;
  bytes: number;
  compression: 'gzip' | null;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationPublication".
 */
export interface SimulationPublication {
  run_id: SimulationRunKey;
  location_id: LocationId;
  place_name: string;
  plan_id: string;
  crops: string[];
  harvest_years: number[];
  as_of: string;
  issued_at: string;
  visibility: 'public_regional' | 'private';
  publication_version: string;
  current: boolean;
  artifacts: SimulationArtifact[];
  measured: {
    seconds: number | null;
    peak_python_mib: number | null;
    series_bytes_raw: number;
    series_bytes_gzip: number;
    members: number;
    days: number;
    note: string;
  };
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationPublicationList".
 */
export interface SimulationPublicationList {
  as_of: string;
  items: SimulationPublication[];
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationSeason".
 */
export interface SimulationSeason {
  crop_id: string;
  harvest_year: number;
  season_label: string;
  sowing_date: string;
  expected_harvest_date: string;
  cycle_days: number;
  calendar_source: string;
  quantiles: {
    [k: string]: {
      p10: number;
      p50: number;
      p90: number;
      n: number;
    };
  };
  events: {
    event_id: string;
    share_of_members: number;
    members: number;
  }[];
  interval_method: string;
  members: {
    [k: string]: {
      [k: string]: number;
    };
  };
  yield: SimulationYield;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationRun".
 */
export interface SimulationRun {
  run_id: SimulationRunKey;
  contract: 'future-simulation-run.v1';
  protocol_id: string;
  execution_status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  output_mode: SimulationOutputMode;
  scientific_status: {
    weather: 'climatological_scenario' | 'observed' | 'seasonal_forecast' | 'mixed';
    water_balance: SimulationScientificStatus;
    phenology: SimulationScientificStatus;
    yield: SimulationScientificStatus;
  };
  location_id: LocationId;
  place_name: string;
  state_code: string;
  plan_id: string;
  harvest_years: number[];
  as_of: string;
  issued_at: string;
  simulation_start: string;
  simulation_end: string;
  weather_segments: {
    kind: SimulationWeatherKind;
    start: string;
    end: string;
    origin: string;
  }[];
  ensemble: {
    method: string;
    members: number;
    effective_source_years: number;
    analog_years: number[];
    eligible_years: number[];
    excluded_years: {
      [k: string]: string;
    };
    coverage_class: 'standard' | 'limited';
    seed: number;
    analog_years_requested: number[] | null;
    calendar_mapping: {
      method: string;
      max_month_day_drift_days: number;
      note: string;
    };
  };
  /**
   * Provenance of history, observed prefix and ET0 method (files, checksums, periods)
   */
  sources: {};
  engine: {
    version: string;
    parameter_set_id: string;
    daily_order: string[];
  };
  soil: {
    capacity_mm: number;
    profile_id: string;
    is_hypothesis: boolean;
  };
  calendar_rules: {
    rule: string;
    harvest_year: number;
    state_calendar: string;
    used: string;
  }[];
  seasons: SimulationSeason[];
  representative: {
    central: string;
    dry: string;
    wet: string;
    rule: string;
  };
  initial_condition: {
    storage_fraction: number;
    is_hypothesis: boolean;
    warm_up: {
      start: string;
      end: string;
      source: string;
    } | null;
    sensitivity: {
      [k: string]: {
        [k: string]: number;
      };
    };
    sensitivity_metric: string;
  };
  limitations: string[];
  /**
   * Canonical scientific identity hashed into run_id
   */
  identity: {};
  checksums: {
    series_sha256: string;
    identity_sha256: string;
  };
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationSeriesMember".
 */
export interface SimulationSeriesMember {
  member_id: string;
  analog_year: number | null;
  role: 'central' | 'dry' | 'wet';
  crop_id: (string | null)[];
  phase_code: string[];
  precipitation_mm: number[];
  et0_mm: number[];
  etc_mm: number[];
  eta_mm: number[];
  et_deficit_mm: number[];
  storage_mm: number[];
  drainage_mm: number[];
  stress_coefficient: number[];
  mass_balance_residual_mm: number[];
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationSeries".
 */
export interface SimulationSeries {
  run_id: SimulationRunKey;
  dates: string[];
  capacity_mm: number;
  day_kind: SimulationWeatherKind[];
  members: SimulationSeriesMember[];
  bands: {
    storage_mm: {
      p10: number[];
      p50: number[];
      p90: number[];
    };
    precipitation_mm: {
      p10: number[];
      p50: number[];
      p90: number[];
    };
    et_deficit_mm: {
      p10: number[];
      p50: number[];
      p90: number[];
    };
  };
  full_members_artifact: SimulationArtifact;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationCatalogResponse".
 */
export interface SimulationCatalogResponse {
  data: SimulationCatalog;
  meta: ResponseMeta;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationPublicationListResponse".
 */
export interface SimulationPublicationListResponse {
  data: SimulationPublicationList;
  meta: ResponseMeta;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationRunResponse".
 */
export interface SimulationRunResponse {
  data: SimulationRun;
  meta: ResponseMeta;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "SimulationSeriesResponse".
 */
export interface SimulationSeriesResponse {
  data: SimulationSeries;
  meta: ResponseMeta;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "LocationPageResponse".
 */
export interface LocationPageResponse {
  data: LocationPage;
  meta: ResponseMeta;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "LocationCoreResponse".
 */
export interface LocationCoreResponse {
  data: LocationCore;
  meta: ResponseMeta;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "GeographyPageResponse".
 */
export interface GeographyPageResponse {
  data: GeographyPage;
  meta: ResponseMeta;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "CoverageResultResponse".
 */
export interface CoverageResultResponse {
  data: CoverageResult;
  meta: ResponseMeta;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ObservationsResultResponse".
 */
export interface ObservationsResultResponse {
  data: ObservationsResult;
  meta: ResponseMeta;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ExamplePageResponse".
 */
export interface ExamplePageResponse {
  data: ExamplePage;
  meta: ResponseMeta;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ExampleDetailResponse".
 */
export interface ExampleDetailResponse {
  data: ExampleDetail;
  meta: ResponseMeta;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "MeResultResponse".
 */
export interface MeResultResponse {
  data: MeResult;
  meta: ResponseMeta;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "MonitoredPlaceResponse".
 */
export interface MonitoredPlaceResponse {
  data: MonitoredPlace;
  meta: ResponseMeta;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "MonitoredPlacePageResponse".
 */
export interface MonitoredPlacePageResponse {
  data: MonitoredPlacePage;
  meta: ResponseMeta;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ComparisonPageResponse".
 */
export interface ComparisonPageResponse {
  data: ComparisonPage;
  meta: ResponseMeta;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ComparisonDetailResponse".
 */
export interface ComparisonDetailResponse {
  data: ComparisonDetail;
  meta: ResponseMeta;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "EvidenceReviewResponse".
 */
export interface EvidenceReviewResponse {
  data: EvidenceReview;
  meta: ResponseMeta;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "EvidenceReviewResultResponse".
 */
export interface EvidenceReviewResultResponse {
  data: EvidenceReviewResult;
  meta: ResponseMeta;
}
/**
 * This interface was referenced by `GaiapusContracts`'s JSON-Schema
 * via the `definition` "ScientificCatalogResponse".
 */
export interface ScientificCatalogResponse {
  data: ScientificCatalog;
  meta: ResponseMeta;
}
