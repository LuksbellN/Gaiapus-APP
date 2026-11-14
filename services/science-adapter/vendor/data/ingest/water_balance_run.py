"""Reproduce research hydrology from frozen local POWER inputs; no downloads."""
import csv
import gzip
import hashlib
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from data.models.water_balance import CROPS, PHASES, et0_daily, simulate

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'data/processed/water_balance_v1'


def sha(path):
    with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()


def save_json(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2,allow_nan=False)+'\n',encoding='utf-8')


def write_csv(path,rows):
    with path.open('w',encoding='utf-8',newline='') as stream:
        writer=csv.DictWriter(stream,fieldnames=list(rows[0]))
        writer.writeheader();writer.writerows(rows)


def summarize(rows):
    fields=('rain_mm','rain_removed_mm','et0_mm','etc_mm','eta_mm','et_deficit_mm','drainage_mm','runoff_mm')
    result={key:sum(r[key] for r in rows) for key in fields}
    result.update(days=len(rows),stress_days=sum(r['ks']<1-1e-9 for r in rows),min_ks=min(r['ks'] for r in rows),
                  storage_start_mm=rows[0]['storage_start_mm'],storage_end_mm=rows[-1]['storage_end_mm'],
                  eta_etc_ratio=result['eta_mm']/result['etc_mm'] if result['etc_mm'] else None)
    return result


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    frozen=json.loads((ROOT/'data/processed/training_v1/delivery_manifest.json').read_text(encoding='utf-8'))['files']
    sources={}
    def checked(relative):
        path=ROOT/relative;digest=sha(path)
        if relative not in frozen or frozen[relative]['sha256']!=digest:raise ValueError(f'Frozen input mismatch: {relative}')
        sources[relative]={'sha256':digest,'bytes':path.stat().st_size}
        return path
    locations=json.loads(checked('data/raw/training_v1/locations.json').read_text(encoding='utf-8'))
    coordinates={}
    required_units={'IMERG_PRECTOT':'mm/day','T2M_MIN':'C','T2M_MAX':'C','ALLSKY_SFC_SW_DWN':'MJ/m^2/day','WS2M':'m/s','T2MDEW':'C','PS':'kPa'}
    for loc in locations:
        code=loc['municipality_code'];raw=checked(f'data/raw/training_v1/power_{code}.json').read_bytes()
        obj=json.loads(gzip.decompress(raw) if raw[:2]==b'\x1f\x8b' else raw)
        for parameter,unit in required_units.items():
            if obj['parameters'][parameter]['units']!=unit:raise ValueError(f'Unexpected units: {parameter}')
        coordinates[code]=obj['geometry']['coordinates']
    weather={loc['municipality_code']:{} for loc in locations};et_rows=[]
    for row in csv.DictReader(checked('data/processed/training_v1/weather_daily.csv').open(encoding='utf-8-sig',newline='')):
        code=row['municipality_code'];day=row['day_utc'];lon,lat,elevation=coordinates[code]
        if day in weather[code]:raise ValueError('Duplicate daily forcing')
        result=et0_daily(date.fromisoformat(day),lat,elevation,*[float(row[key]) for key in ('t_min_c','t_max_c','radiation_mj_m2','ws2m_m_s','pressure_kpa')],dewpoint=float(row['dewpoint_c']))
        output={'municipality_code':code,'day_utc':day,'rain_mm':float(row['rain_mm']),**result}
        if output['rain_mm']<0:raise ValueError('Invalid rainfall')
        weather[code][day]=output;et_rows.append(output)
    expected_days=(date(2025,1,1)-date(2001,1,1)).days
    expected_dates={(date(2001,1,1)+timedelta(days=i)).isoformat() for i in range(expected_days)}
    if any(set(series)!=expected_dates for series in weather.values()):raise ValueError('Daily coverage mismatch')
    write_csv(OUT/'et0_daily.csv',et_rows)
    scenarios=[];phases=[];max_residual=0.;checked_days=0;daily_count=0;paired=0;sample=None
    daily_stream=(OUT/'daily_2024.csv').open('w',encoding='utf-8',newline='');daily_writer=None
    for loc in locations:
        code=loc['municipality_code']
        for crop,config in CROPS.items():
            for year in range(2002,2025):
                sowing=date(year-1,11 if loc['state_code']=='31' else 10,5) if crop=='soy' else date(year,1,5)
                forcing=[weather[code][(sowing+timedelta(days=i)).isoformat()] for i in range(sum(config['phase_days']))]
                settings=[(ad,initial) for ad in ('AD2','AD4','AD6') for initial in (.3,.7,1.)] if year==2024 else [('AD4',.7)]
                for ad,initial in settings:
                    baseline=simulate(forcing,crop,config['cad_mm'][ad],initial)
                    baseline_totals=summarize(baseline)
                    variants=[(None,1.)]+[(phase,multiplier) for phase in PHASES for multiplier in (.5,0.)]
                    for dry_phase,multiplier in variants:
                        rows=baseline if dry_phase is None else simulate(forcing,crop,config['cad_mm'][ad],initial,dry_phase=dry_phase,rain_multiplier=multiplier)
                        scenario_id=f'{code}_{crop}_{year}_{ad}_i{initial:g}_{dry_phase or "historical"}_r{multiplier:g}'
                        metadata={'scenario_id':scenario_id,'municipality_code':code,'municipality':loc['municipality'],'state': 'MG' if loc['state_code']=='31' else 'MT','crop':crop,'harvest_year':year,'sowing_date':sowing.isoformat(),'cad_class':ad,'capacity_mm':config['cad_mm'][ad],'initial_fraction':initial,'dry_phase':dry_phase or 'none','rain_multiplier':multiplier,'forcing_scope':'point_v1','status':'research_uncalibrated'}
                        totals=summarize(rows);delta=totals['et_deficit_mm']-baseline_totals['et_deficit_mm']
                        if delta < -1e-8:raise ValueError('Drought decreased whole-cycle ET deficit')
                        if dry_phase is not None:paired+=1
                        scenarios.append({**metadata,**totals,'extra_et_deficit_vs_baseline_mm':delta})
                        for phase in PHASES:
                            phase_rows=[r for r in rows if r['phase']==phase]
                            phases.append({**metadata,'phase':phase,'start_date':phase_rows[0]['day_utc'],'end_date':phase_rows[-1]['day_utc'],**summarize(phase_rows)})
                        for row,base in zip(rows,baseline):
                            residual=abs(row['mass_residual_mm']);max_residual=max(max_residual,residual);checked_days+=1
                            expected_rain=base['rain_mm']*(multiplier if row['phase']==dry_phase else 1.)
                            if residual>1e-8 or not 0<=row['storage_end_mm']<=row['capacity_mm'] or not 0<=row['eta_mm']<=row['etc_mm']+1e-9 or row['storage_end_mm']>base['storage_end_mm']+1e-8 or row['rain_mm']!=expected_rain or row['etc_mm']!=base['etc_mm']:
                                raise ValueError(f'Physical/scenario invariant failed: {scenario_id} {row["day_utc"]}')
                            if year==2024:
                                daily_row={'scenario_id':scenario_id,'municipality_code':code,'crop':crop,**row}
                                if daily_writer is None:
                                    daily_writer=csv.DictWriter(daily_stream,fieldnames=list(daily_row));daily_writer.writeheader()
                                daily_writer.writerow(daily_row);daily_count+=1
                        if code=='3170206' and crop=='soy' and year==2024 and ad=='AD4' and initial==.7 and dry_phase=='reproductive' and multiplier==.5:
                            sample={'metadata':metadata,'summary':totals,'baseline_summary':baseline_totals,'days':rows,'baseline_days':baseline}
    daily_stream.close()
    write_csv(OUT/'scenario_summary.csv',scenarios);write_csv(OUT/'phase_summary.csv',phases)
    save_json(OUT/'api_example.json',sample)
    validation={'status':'passed_numerical_checks_not_field_validation','et0_days':len(et_rows),'municipalities':len(locations),'scenarios':len(scenarios),'phase_summaries':len(phases),'daily_rows_2024':daily_count,'all_simulated_days_checked':checked_days,'drought_pairs_checked':paired,'max_mass_residual_mm':max_residual,'et0_min_mm':min(r['et0_mm'] for r in et_rows),'et0_max_mm':max(r['et0_mm'] for r in et_rows),'flags':{flag:sum(r[flag] for r in et_rows) for flag in ('radiation_ratio_clipped','vpd_clipped','et0_clipped')},'empirical_validation':False,'yield_prediction':False}
    save_json(OUT/'validation.json',validation)
    save_json(OUT/'provenance.json',{'created_at':datetime.now(timezone.utc).isoformat(),'sources':sources,'coordinates_from_power':coordinates,'crops':CROPS,'meteorology':'Frozen POWER daily UTC point v1; no v2 mixture or bias correction','dates':'Soy MG November 5 / MT October 5 of previous year; maize2 January 5. Hypothetical independent cycles, not observed sowing or historical ZARC eligibility.','assumptions':['Fixed CAD, fixed root zone; no root growth','Initial water sensitivity, not measured; historical baseline AD4 70%','Zero irrigation, zero runoff, immediate drainage, rainfall before ET','Single Kc stress approximation; no local Kc calibration','Drought changes precipitation only; no heat/radiation/humidity coupling','ZARC phase lengths mapped to Kc phases as hypothesis, not calibrated phenology'],'references':['https://www.fao.org/4/x0490e/x0490e08.htm','https://www.fao.org/4/x0490e/x0490e0b.htm','https://www.fao.org/4/x0490e/x0490e0e.htm','docs/superpowers/plans/gaiapus-12-zarc-e-seca-por-fase.md']})
    print(json.dumps(validation,ensure_ascii=False,indent=2))


if __name__=='__main__':main()
