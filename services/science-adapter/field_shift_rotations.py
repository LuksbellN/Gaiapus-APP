"""Field Shift — extensão com a 3ª rotação (soja -> pousio) e sensibilidade de chuva.

Reproduz os cenários publicados A (soja -> milho -> pousio) e B (soja -> milho + braquiária) a partir de
sorriso-daily.json com o motor FAO-56 do pacote (bucket_day) e só então gera C e a sensibilidade.
Falha (exit 1) se a reprodução de A ou B passar de 0,01 mm em qualquer dia.

Uso (na raiz do repositório):
  python services/science-adapter/field_shift_rotations.py \
      apps/web/src/teammate/data/sorriso-daily.json \
      apps/web/src/teammate/data/sorriso-field-shift.json \
      apps/web/src/teammate/data
"""
import copy
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / 'vendor' / 'data' / 'models'))
from water_balance import bucket_day  # noqa: E402

P_BASE = {'soy': .5, 'maize2': .55, 'bare': .6, 'brachiaria': .6, 'maize2+brachiaria': .55}
INITIAL_STORAGE_MM = 38.5  # 0,7 x 55 mm, deduzido do primeiro dia publicado
FALLOW_KC = 0.30
TOLERANCE_MM = 0.01
OUTPUTS = ('storage_end_mm', 'eta_mm', 'et_deficit_mm', 'drainage_mm')


def run(series, capacity, rain_multiplier=1.0):
    storage = INITIAL_STORAGE_MM
    out = {k: [] for k in OUTPUTS}
    for i in range(len(series['date'])):
        etc = series['etc_mm'][i]
        p = min(.8, max(.1, P_BASE[series['land_cover'][i]] + .04 * (5 - etc)))
        values = bucket_day(storage, capacity, series['rain_mm'][i] * rain_multiplier, etc, p)
        storage = values['storage_end_mm']
        for k in OUTPUTS:
            out[k].append(values[k])
    return out


def max_error(series, out):
    worst, where = 0.0, None
    for k in OUTPUTS:
        for i, v in enumerate(out[k]):
            e = abs(v - series[k][i])
            if e > worst:
                worst, where = e, (k, series['date'][i])
    return worst, where


def by_year(series, out, years, rain_multiplier=1.0):
    rows = []
    index = {y: [i for i, a in enumerate(series['agricultural_year']) if a == y] for y in years}
    for n, y in enumerate(years):
        days = index[y]
        covered = sum(series['soil_covered'][i] for i in days)
        soy = [i for i in days if series['land_cover'][i] == 'soy']
        maize = [i for i in days if series['land_cover'][i].startswith('maize2')]
        last_crop = max(i for i in days if series['land_cover'][i] in ('soy', 'maize2', 'maize2+brachiaria'))
        off = [i for i in days if i > last_crop]
        nxt = index[years[n + 1]][:15] if n + 1 < len(years) else None
        rows.append({
            'agricultural_year': y,
            'covered_days': covered,
            'bare_days': len(days) - covered,
            'bare_days_nov_apr': sum(1 for i in days if not series['soil_covered'][i] and series['date'][i][5:7] in ('11', '12', '01', '02', '03', '04')),
            'rain_on_bare_soil_mm': round(sum(series['rain_mm'][i] * rain_multiplier for i in days if not series['soil_covered'][i]), 1),
            'annual_eta_mm': round(sum(out['eta_mm'][i] for i in days), 1),
            'annual_drainage_mm': round(sum(out['drainage_mm'][i] for i in days), 1),
            'off_season_water_use_mm': round(sum(out['eta_mm'][i] for i in off), 2),
            'off_season_drainage_mm': round(sum(out['drainage_mm'][i] for i in off), 2),
            'storage_at_next_sowing_mm': round(out['storage_end_mm'][days[-1]], 3),
            'soy_deficit_mm': round(sum(out['et_deficit_mm'][i] for i in soy), 2),
            'maize_deficit_mm': round(sum(out['et_deficit_mm'][i] for i in maize), 2) if maize else None,
            'maize_stress_days': sum(1 for i in maize if out['et_deficit_mm'][i] > 1e-9) if maize else None,
            'next_soy_establishment_deficit_mm': round(sum(out['et_deficit_mm'][i] for i in nxt), 2) if nxt else None,
        })
    return rows


def mean(rows):
    keys = [k for k in rows[0] if k != 'agricultural_year']
    result = {}
    for k in keys:
        values = [r[k] for r in rows if r[k] is not None]
        result[k] = round(sum(values) / len(values), 2) if values else None
    return result


def soy_fallow(reference):
    c = copy.deepcopy(reference)
    for i, cover in enumerate(reference['land_cover']):
        if cover == 'maize2':
            c['land_cover'][i] = 'bare'
            c['stage'][i] = 'off_season_bare'
            c['soil_covered'][i] = 0
            c['kc'][i] = FALLOW_KC
            c['etc_mm'][i] = round(FALLOW_KC * reference['et0_mm'][i], 3)
    return c


def main(daily_path, field_shift_path, out_dir):
    daily = json.loads(Path(daily_path).read_text(encoding='utf-8'))
    published = json.loads(Path(field_shift_path).read_text(encoding='utf-8'))
    capacity = daily['capacity_mm']
    years = published['weather']['agricultural_years']
    a, b = daily['scenarios']['reference_fallow'], daily['scenarios']['brachiaria']

    checks = {}
    for name, series in (('reference_fallow', a), ('brachiaria', b)):
        err, where = max_error(series, run(series, capacity))
        checks[name] = {'max_abs_error_mm': round(err, 4), 'at': where}
        if err > TOLERANCE_MM:
            print(f'REPRODUCAO FALHOU em {name}: {err:.4f} mm em {where}. Nada foi gerado.')
            return 1

    c = soy_fallow(a)
    scenarios, rotations = {}, (('reference_fallow', a), ('brachiaria', b), ('soy_fallow', c))
    for name, series in rotations:
        rows = by_year(series, run(series, capacity), years)
        scenarios[name] = {'mean': mean(rows), 'by_year': rows}

    sensitivity = []
    for mult in (0.8, 1.2):
        means = {name: mean(by_year(s, run(s, capacity, mult), years, mult)) for name, s in rotations}
        for alt in ('brachiaria', 'soy_fallow'):
            sensitivity.append({
                'parameter': 'rain_multiplier', 'value': mult, 'comparison': f'{alt}_minus_reference_fallow',
                **{f'difference_{k}': (None if means[alt][k] is None or means['reference_fallow'][k] is None
                                       else round(means[alt][k] - means['reference_fallow'][k], 2)) for k in means[alt]},
            })

    c_out = run(c, capacity)
    c_daily = {k: c[k] for k in ('agricultural_year', 'date', 'land_cover', 'stage', 'soil_covered', 'rain_mm', 'et0_mm', 'kc', 'etc_mm')}
    c_daily.update({k: [round(v, 3) for v in c_out[k]] for k in OUTPUTS})

    result = {
        'schema_version': '1.0.0',
        'product': 'field_shift_rotations_extension',
        'municipality_code': published['municipality_code'],
        'simulated': True,
        'scenario_labels': {
            'reference_fallow': 'A: soy -> second-season maize -> fallow (current rotation, reference)',
            'brachiaria': 'B: soy -> second-season maize + brachiaria (cover)',
            'soy_fallow': 'C: soy -> fallow (no second-season maize)',
        },
        'scenarios': scenarios,
        'delta_change_sensitivity': {
            'label': 'sensitivity test, not a climate projection',
            'method': 'daily IMERG rain multiplied by a constant; ET0 unchanged',
            'rows': sensitivity,
        },
        'not_simulated': published.get('not_simulated', []),
        'provenance': {
            'script': 'services/science-adapter/field_shift_rotations.py',
            'engine': 'services/science-adapter/vendor/data/models/water_balance.py bucket_day (FAO-56 bucket)',
            'input': str(daily_path).replace('\\', '/'),
            'input_sha256': hashlib.sha256(Path(daily_path).read_bytes()).hexdigest(),
            'p_base': P_BASE,
            'initial_storage_mm': INITIAL_STORAGE_MM,
            'reproduction_check': checks,
            'soy_fallow_definition': 'reference sequence with the second-season maize replaced by bare soil (Kc 0.30); soy establishment Kc 0.40 as in the reference (no straw effect)',
            'comparability_note': 'off_season_* windows differ between rotations (C starts after soy); compare rotations with the annual_* , covered/bare days and rain_on_bare_soil indicators',
            'gaps': [
                'temperature delta not run: ET0 inputs (temperature, radiation, wind) are not available in the app',
                'next soy establishment deficit averaged over 5 transitions (series ends before the 2021/22 sowing)',
                'rain_on_bare_soil_mm is an erosion-exposure proxy, not an erosion estimate',
            ],
        },
    }
    out = Path(out_dir)
    (out / 'sorriso-field-shift-rotations.json').write_text(json.dumps(result, indent=1, ensure_ascii=False), encoding='utf-8')
    (out / 'sorriso-daily-soy-fallow.json').write_text(json.dumps(c_daily, separators=(',', ':')), encoding='utf-8')
    print(json.dumps(checks))
    return 0


if __name__ == '__main__':
    sys.exit(main(*sys.argv[1:4]))
