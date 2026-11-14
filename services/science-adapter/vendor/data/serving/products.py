"""The two analysis products the backend serves, kept separate on purpose.

1. Yield estimate: municipal yield at harvest (kg/ha) from data up to a validated cutoff.
2. Water-risk projection: soil water, deficit and stress for N days, from the forecast
   issued before the request. It never reports a yield effect: that integration has not
   been evaluated.
Responses follow contracts/yield-estimate.schema.json and contracts/water-projection.schema.json.
"""
from datetime import date, datetime, timedelta, timezone

from data.models.water_balance import CROPS
from data.ingest.water_projection import CAD_CLASS, INITIAL_FRACTION, MODEL as FORECAST_MODEL, advance

SCHEMA_VERSION = '1.0.0'
YIELD_STATUS = ('ready', 'before_first_cutoff', 'not_supported')
WATER_STATUS = ('ready', 'partially_validated', 'not_supported')


def now():
    return datetime.now(timezone.utc).isoformat()


def cutoff_for_day(days_after_sowing, supported):
    """Largest validated cutoff not after the requested day: the model only uses data it was validated on."""
    eligible = [c for c in sorted(supported) if c <= days_after_sowing]
    return eligible[-1] if eligible else None


SOWING_BASIS = ('hypothetical_fixed_calendar_per_state', 'reported_by_user')


def yield_response(*, municipality_code, crop, harvest_year, sowing_date, days_after_sowing, supported_cutoffs,
                   estimate_kg_ha, observed_through, model, validation_by_cutoff, coverage, warnings=(),
                   sowing_basis='hypothetical_fixed_calendar_per_state'):
    if sowing_basis not in SOWING_BASIS:
        raise ValueError('Unknown sowing basis')
    cutoff = cutoff_for_day(days_after_sowing, supported_cutoffs)
    if sowing_basis == 'reported_by_user':
        warnings = [*warnings, 'Sowing date reported by the user; the model was validated on the state calendar']
    response = {
        'schema_version': SCHEMA_VERSION, 'product': 'yield_estimate', 'generated_at': now(),
        'municipality_code': str(municipality_code), 'crop': crop, 'harvest_year': int(harvest_year),
        'sowing_date': str(sowing_date), 'sowing_basis': sowing_basis,
        'days_after_sowing_requested': int(days_after_sowing), 'supported_cutoffs_days': sorted(int(c) for c in supported_cutoffs),
        'cutoff_days_used': cutoff, 'observed_through': observed_through, 'model': model,
        'coverage': coverage, 'availability': 'retrospective_inputs_vintages_unverified',
        'warnings': list(warnings)}
    if crop not in ('soy', 'maize2'):
        return {**response, 'status': 'not_supported', 'estimate_kg_ha': None, 'validation': None,
                'warnings': [*response['warnings'], 'Crop not modelled']}
    if cutoff is None:
        return {**response, 'status': 'before_first_cutoff', 'estimate_kg_ha': None, 'validation': None,
                'warnings': [*response['warnings'], f'No validated cutoff before day {days_after_sowing}; first is day {min(supported_cutoffs)}']}
    return {**response, 'status': 'ready', 'estimate_kg_ha': round(float(estimate_kg_ha), 1),
            'validation': validation_by_cutoff[cutoff]}


def water_days(storage, crop, crop_day, decision_date, forecast, max_validated_lead):
    """Advance the bucket with the forecast; day k after the decision carries lead k and its validation flag."""
    rows = advance(storage, crop, crop_day, forecast)
    out = []
    for lead, row in enumerate(rows, 1):
        out.append({'date': (decision_date + timedelta(days=lead - 1)).isoformat(), 'lead_days': lead,
                    'crop_day': row['crop_day'], 'phase': row['phase'], 'rain_mm': round(row['rain_mm'], 2),
                    'et0_mm': round(row['et0_mm'], 2), 'storage_end_mm': round(row['storage_end_mm'], 2),
                    'available_water_fraction': round(row['available_water_fraction'], 4),
                    'et_deficit_mm': round(row['et_deficit_mm'], 2), 'ks': round(row['ks'], 4),
                    'stress': bool(row['stress']), 'validated_lead': lead <= max_validated_lead})
    return out


def water_response(*, municipality_code, latitude, longitude, crop, sowing_date, decision_at, horizon_days,
                   observed, forecast, issue, limit, backtest_by_lead, reference=None,
                   sowing_basis='hypothetical_fixed_calendar_per_state'):
    """`observed`: daily rain/ET0 from sowing to the day before the decision; `forecast`: days from the decision date."""
    decision = datetime.fromisoformat(decision_at).date()
    capacity = CROPS[crop]['cad_mm'][CAD_CLASS]
    cycle = sum(CROPS[crop]['phase_days'])
    crop_day = (decision - sowing_date).days
    base = {'schema_version': SCHEMA_VERSION, 'product': 'water_risk_projection', 'generated_at': now(),
            'municipality_code': str(municipality_code), 'location': {'latitude': latitude, 'longitude': longitude},
            'crop': crop, 'sowing_date': str(sowing_date), 'sowing_basis': sowing_basis,
            'decision_at': decision_at, 'crop_day_at_decision': crop_day,
            'horizon_days_requested': int(horizon_days), 'max_validated_lead_days': int(limit['max_supported_lead_days'][crop]),
            'soil': {'cad_class': CAD_CLASS, 'capacity_mm': capacity, 'initial_fraction_at_sowing': INITIAL_FRACTION,
                     'basis': 'fixed hypothesis, not a measured soil profile'},
            'forecast': {'provider': 'Open-Meteo', 'model': FORECAST_MODEL, **issue},
            'evaluation': {'method': limit['archive'], 'verification': limit['verification'], 'reference': limit['reference'],
                           'rule': limit['rule'], 'by_lead': backtest_by_lead},
            'yield_effect': None, 'yield_effect_note': 'Not evaluated; do not convert this projection into kg/ha.',
            'warnings': []}
    if crop not in CROPS or not 0 <= crop_day < cycle:
        return {**base, 'status': 'not_supported', 'horizon_days_served': 0, 'initial_state': None, 'days': [],
                'reference_days': [], 'warnings': ['Decision date outside the simulated crop cycle']}
    if len(observed) != crop_day or any(None in (d['rain_mm'], d['et0_mm']) for d in observed):
        return {**base, 'status': 'not_supported', 'horizon_days_served': 0, 'initial_state': None, 'days': [],
                'reference_days': [], 'warnings': ['Observed forcing incomplete between sowing and decision']}
    history = advance(INITIAL_FRACTION * capacity, crop, 0, observed) if observed else []
    storage = history[-1]['storage_end_mm'] if history else INITIAL_FRACTION * capacity
    usable = []
    for day in forecast[:min(horizon_days, cycle - crop_day)]:
        if None in (day['rain_mm'], day['et0_mm']):
            break
        usable.append(day)
    days = water_days(storage, crop, crop_day, decision, usable, base['max_validated_lead_days'])
    warnings = []
    if len(usable) < horizon_days:
        warnings.append(f'Served {len(usable)} of {horizon_days} days: forecast or crop cycle ends earlier')
    if any(not d['validated_lead'] for d in days):
        warnings.append(f'Days after lead {base["max_validated_lead_days"]} are experimental: no archived forecast to evaluate them')
    status = 'ready' if days and all(d['validated_lead'] for d in days) else ('partially_validated' if days else 'not_supported')
    reference_days = water_days(storage, crop, crop_day, decision, reference[:len(usable)], base['max_validated_lead_days']) if reference else []
    return {**base, 'status': status, 'horizon_days_served': len(days),
            'initial_state': {'date': (decision - timedelta(days=1)).isoformat(), 'storage_mm': round(storage, 2),
                              'available_water_fraction': round(storage / capacity, 4), 'observed_days': len(observed),
                              'observed_source': f'Open-Meteo {FORECAST_MODEL} shortest-lead series'},
            'days': days, 'reference_days': reference_days, 'warnings': warnings}


def fetch_forcing(latitude, longitude, start, end):
    """Daily rain and ET0 from the same archive used by the backtest, plus the issue time of the latest run."""
    import requests
    meta = requests.get(f'https://api.open-meteo.com/data/{FORECAST_MODEL}/static/meta.json', timeout=30).json()
    stamp = lambda key: datetime.fromtimestamp(meta[key], timezone.utc).isoformat() if key in meta else None
    if 'data_end_time' in meta:
        # Last complete UTC day of the current run; asking beyond it is rejected by the API.
        end = min(end, datetime.fromtimestamp(meta['data_end_time'], timezone.utc).date() - timedelta(days=1))
    response = requests.get('https://previous-runs-api.open-meteo.com/v1/forecast', params={
        'latitude': latitude, 'longitude': longitude, 'daily': 'precipitation_sum,et0_fao_evapotranspiration',
        'start_date': str(start), 'end_date': str(end), 'models': FORECAST_MODEL, 'timezone': 'UTC'}, timeout=90)
    response.raise_for_status()
    payload = response.json()
    if payload['daily_units']['precipitation_sum'] != 'mm' or payload['daily_units']['et0_fao_evapotranspiration'] != 'mm':
        raise ValueError('Unexpected forecast units')
    daily = payload['daily']
    series = {day: {'rain_mm': rain, 'et0_mm': et0} for day, rain, et0 in
              zip(daily['time'], daily['precipitation_sum'], daily['et0_fao_evapotranspiration'])}
    issue = {'issued_at': stamp('last_run_initialisation_time'), 'available_at': stamp('last_run_availability_time'),
             'retrieved_at': now(), 'issue_time_source': 'Open-Meteo model metadata (last run initialisation)'}
    return series, issue
