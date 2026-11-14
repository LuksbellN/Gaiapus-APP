"""Water-risk projection N days ahead and its backtest by lead time.

The projection advances the physical soil-water balance with forecast rain and ET0.
It is a separate product from the yield estimate: no yield effect is derived from it.

Backtest: Open-Meteo Previous Runs keeps, for each valid hour, the value forecast
1..7 days earlier (ECMWF IFS 0.25). For an origin day t and lead k the forcing of day
t+k is the forecast issued k days before it. The exact run hour is not exposed, so the
issue time is known to the day. The verification series is the same provider's
shortest-lead series, not rain gauges.

The acceptance rule below was fixed before any score was computed.
"""
import argparse
import hashlib
import json
import time
from datetime import date, datetime, timedelta, timezone

from data.ingest.water_balance_run import ROOT, save_json, sha, write_csv
from data.models.water_balance import CROPS, bucket_day, crop_day

RAW = ROOT / 'data/raw/forecast_backtest_v1'
OUT = ROOT / 'data/processed/water_projection_v1'
MODEL = 'ecmwf_ifs025'
LEADS = tuple(range(1, 8))
SEASONS = {'soy': (2025, 2026), 'maize2': (2025, 2026)}
PERIOD = (date(2024, 10, 1), date(2026, 11, 10))
CAD_CLASS = 'AD4'
INITIAL_FRACTION = 0.7
# Acceptance rule, fixed in advance: a lead N is supported when every lead up to N has
# storage MAE within this share of the soil capacity, beats the climatology reference
# and has at least this share of origin days with a complete forecast.
MAX_STORAGE_MAE_SHARE = 0.15
MIN_COVERAGE = 0.90


def sowing_date(code, crop, year):
    return date(year - 1, 11 if code.startswith('31') else 10, 5) if crop == 'soy' else date(year, 1, 5)


def daily_sums(times, values):
    """UTC-day totals; a day with any missing hour stays missing instead of becoming a partial sum."""
    days = {}
    for stamp, value in zip(times, values):
        days.setdefault(stamp[:10], []).append(value)
    return {day: (sum(v) if len(v) == 24 and None not in v else None) for day, v in days.items()}


def advance(storage, crop, first_index, forcing):
    """Run the bucket from crop day `first_index` with a list of {'rain_mm', 'et0_mm'}."""
    capacity = CROPS[crop]['cad_mm'][CAD_CLASS]
    rows = []
    for offset, day in enumerate(forcing):
        phase, kc = crop_day(crop, first_index + offset)
        etc = kc * day['et0_mm']
        p = min(.8, max(.1, CROPS[crop]['p_base'] + .04 * (5 - etc)))
        item = bucket_day(storage, capacity, day['rain_mm'], etc, p)
        storage = item['storage_end_mm']
        rows.append({'crop_day': first_index + offset, 'phase': phase, 'rain_mm': day['rain_mm'], 'et0_mm': day['et0_mm'],
                     'storage_end_mm': storage, 'available_water_fraction': storage / capacity,
                     'et_deficit_mm': item['et_deficit_mm'], 'ks': item['ks'], 'stress': item['ks'] < 1 - 1e-9})
    return rows


def supported_lead(rows):
    """Largest N such that every lead up to N meets the acceptance rule; 0 when lead 1 fails."""
    best = 0
    for row in sorted(rows, key=lambda r: r['lead_days']):
        if not (row['meets_error'] and row['beats_reference'] and row['meets_coverage']):
            break
        best = row['lead_days']
    return best


def fetch_site(location):
    import requests
    names = ['precipitation', 'et0_fao_evapotranspiration']
    hourly = ','.join(names + [f'{n}_previous_day{k}' for n in names for k in LEADS])
    out = {}
    start = PERIOD[0]
    while start <= PERIOD[1]:
        end = min(PERIOD[1], start + timedelta(days=179))
        path = RAW / f'{location["municipality_code"]}_{start}_{end}.json'
        receipt = path.with_suffix('.json.manifest.json')
        params = {'latitude': location['latitude'], 'longitude': location['longitude'], 'hourly': hourly,
                  'start_date': str(start), 'end_date': str(end), 'models': MODEL, 'timezone': 'UTC'}
        if not receipt.exists():
            response = None
            for attempt in range(6):
                try:
                    response = requests.get('https://previous-runs-api.open-meteo.com/v1/forecast', params=params, timeout=180)
                    if response.status_code == 200:
                        break
                except requests.RequestException:
                    response = None
                time.sleep(15 * (attempt + 1))
            if response is None:
                raise SystemExit('Forecast archive unreachable; rerun to resume from the cached files.')
            response.raise_for_status()
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(response.content)
            save_json(receipt, {'url': response.url, 'retrieved_at': datetime.now(timezone.utc).isoformat(),
                                'bytes': len(response.content), 'sha256': hashlib.sha256(response.content).hexdigest(),
                                'model': MODEL, 'issue_time_resolution': 'forecast issued k days before the valid time'})
        elif json.loads(receipt.read_text(encoding='utf-8'))['sha256'] != sha(path):
            raise ValueError(f'Checksum mismatch: {path.name}')
        payload = json.loads(path.read_bytes())
        units = payload['hourly_units']
        if units['precipitation'] != 'mm' or units['et0_fao_evapotranspiration'] != 'mm':
            raise ValueError('Unexpected forecast units')
        hours = payload['hourly']
        for key, values in hours.items():
            if key != 'time':
                out.setdefault(key, {}).update(daily_sums(hours['time'], values))
        start = end + timedelta(days=1)
    return out


def climatology(code):
    """Day-of-year mean rain and ET0 from the frozen 2001-2021 municipal series."""
    import csv
    totals = {}
    with (ROOT / 'data/processed/water_balance_v1/et0_daily.csv').open(encoding='utf-8', newline='') as stream:
        for row in csv.DictReader(stream):
            if row['municipality_code'] == code and row['day_utc'] <= '2021-12-31':
                item = totals.setdefault(row['day_utc'][5:], [0.0, 0.0, 0])
                item[0] += float(row['rain_mm']); item[1] += float(row['et0_mm']); item[2] += 1
    return {key: {'rain_mm': rain / n, 'et0_mm': et0 / n} for key, (rain, et0, n) in totals.items()}


def backtest_site(location, series, normal):
    code, rows = location['municipality_code'], []
    for crop, years in SEASONS.items():
        cycle = sum(CROPS[crop]['phase_days'])
        capacity = CROPS[crop]['cad_mm'][CAD_CLASS]
        for year in years:
            start = sowing_date(code, crop, year)
            days = [(start + timedelta(days=i)).isoformat() for i in range(cycle)]
            observed = [{'rain_mm': series['precipitation'].get(d), 'et0_mm': series['et0_fao_evapotranspiration'].get(d)} for d in days]
            if days[-1] > PERIOD[1].isoformat() or any(None in o.values() for o in observed):
                continue
            truth = advance(INITIAL_FRACTION * capacity, crop, 0, observed)
            for origin in range(cycle - max(LEADS)):
                state = truth[origin]['storage_end_mm']
                forecast, reference = [], []
                for k in LEADS:
                    day = days[origin + k]
                    forecast.append({'rain_mm': series[f'precipitation_previous_day{k}'].get(day),
                                     'et0_mm': series[f'et0_fao_evapotranspiration_previous_day{k}'].get(day)})
                    reference.append(normal.get(day[5:], normal['02-28']))
                for lead in LEADS:
                    window = forecast[:lead]
                    record = {'municipality_code': code, 'crop': crop, 'harvest_year': year, 'origin_day': days[origin],
                              'lead_days': lead, 'capacity_mm': capacity, 'covered': not any(None in f.values() for f in window)}
                    if record['covered']:
                        projected = advance(state, crop, origin + 1, window)
                        baseline = advance(state, crop, origin + 1, reference[:lead])
                        actual = truth[origin + 1:origin + 1 + lead]
                        record.update(
                            storage_error_mm=abs(projected[-1]['storage_end_mm'] - actual[-1]['storage_end_mm']),
                            reference_storage_error_mm=abs(baseline[-1]['storage_end_mm'] - actual[-1]['storage_end_mm']),
                            deficit_error_mm=abs(sum(r['et_deficit_mm'] for r in projected) - sum(r['et_deficit_mm'] for r in actual)),
                            reference_deficit_error_mm=abs(sum(r['et_deficit_mm'] for r in baseline) - sum(r['et_deficit_mm'] for r in actual)),
                            stress_agrees=projected[-1]['stress'] == actual[-1]['stress'],
                            reference_stress_agrees=baseline[-1]['stress'] == actual[-1]['stress'],
                            actual_stress=actual[-1]['stress'])
                    rows.append(record)
    return rows


def summarize(rows):
    import pandas as pd
    frame = pd.DataFrame(rows)
    table = []
    for scope, part in [('all', frame)] + [(crop, frame[frame.crop == crop]) for crop in SEASONS]:
        for lead, group in part.groupby('lead_days'):
            covered = group[group.covered]
            limit = MAX_STORAGE_MAE_SHARE * float(group.capacity_mm.mean())
            mae, reference = float(covered.storage_error_mm.mean()), float(covered.reference_storage_error_mm.mean())
            table.append({'scope': scope, 'lead_days': int(lead), 'origin_days': len(group), 'coverage': len(covered) / len(group),
                          'crop_seasons': int(group.groupby(['municipality_code', 'crop', 'harvest_year']).ngroups),
                          'storage_mae_mm': mae, 'reference_storage_mae_mm': reference, 'skill_vs_reference': 1 - mae / reference,
                          'storage_mae_limit_mm': limit, 'deficit_mae_mm': float(covered.deficit_error_mm.mean()),
                          'reference_deficit_mae_mm': float(covered.reference_deficit_error_mm.mean()),
                          'stress_accuracy': float(covered.stress_agrees.mean()),
                          'reference_stress_accuracy': float(covered.reference_stress_agrees.mean()),
                          'stress_day_share': float(covered.actual_stress.mean()),
                          'meets_error': mae <= limit, 'beats_reference': mae < reference,
                          'meets_coverage': len(covered) / len(group) >= MIN_COVERAGE})
    return table


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()
    locations = json.loads((ROOT / 'data/raw/training_v1/locations.json').read_text(encoding='utf-8'))
    rows = []
    for location in locations:
        series = fetch_site(location)
        rows.extend(backtest_site(location, series, climatology(location['municipality_code'])))
        print(location['municipality_code'], len(rows), flush=True)
    OUT.mkdir(parents=True, exist_ok=True)
    write_csv(OUT / 'backtest_origins.csv', [{k: r.get(k) for k in rows[0] | {'storage_error_mm': None, 'reference_storage_error_mm': None,
              'deficit_error_mm': None, 'reference_deficit_error_mm': None, 'stress_agrees': None, 'reference_stress_agrees': None,
              'actual_stress': None}} for r in rows])
    table = summarize(rows)
    write_csv(OUT / 'backtest_by_lead.csv', table)
    limits = {scope: supported_lead([t for t in table if t['scope'] == scope]) for scope in ('all', *SEASONS)}
    save_json(OUT / 'operational_limit.json', {
        'created_at': datetime.now(timezone.utc).isoformat(), 'forecast_model': MODEL, 'archive': 'Open-Meteo Previous Runs API',
        'verification': 'same provider shortest-lead series, not rain gauges', 'reference': 'day-of-year climatology 2001-2021',
        'rule': {'max_storage_mae_share_of_capacity': MAX_STORAGE_MAE_SHARE, 'must_beat_reference': True, 'min_coverage': MIN_COVERAGE,
                 'fixed_before_scoring': True},
        'leads_tested': list(LEADS), 'max_supported_lead_days': limits, 'soil': f'{CAD_CLASS} fixed capacity, initial {INITIAL_FRACTION:.0%}',
        'issue_time_resolution': 'day (run hour not exposed by the archive)', 'yield_effect_validated': False})
    for row in table:
        if row['scope'] == 'all':
            print(row['lead_days'], f"cov {row['coverage']:.2f} mae {row['storage_mae_mm']:.2f} ref {row['reference_storage_mae_mm']:.2f} "
                  f"limit {row['storage_mae_limit_mm']:.2f} stress {row['stress_accuracy']:.3f}/{row['reference_stress_accuracy']:.3f}")
    print('max supported lead', limits)


if __name__ == '__main__':
    main()
