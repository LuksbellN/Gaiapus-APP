"""Use the delivered CPU predictor unchanged, only for reproduced frozen cases."""
import importlib.util
import json
import math
from pathlib import Path
import sys
from adapter import HERE, PIN, ProductUnavailable, ScientificRunner, load_source, read_json, verify_files, equivalent

class V7Delivery:
    def __init__(self, root=None):
        self.root = Path(root) if root else HERE / 'delivery/v7'
        self.pin = read_json(HERE / 'v7-pin.json')
        self.ready = False
        self.inputs = []
        self.report = {'bundle_sha256': self.pin['bundle_sha256'], 'historical_checks_passed': 0, 'models': [], 'operational_release': 'not_released', 'regional_soy': {'selected': 'site+mlp', 'ready': False, 'reason_code': 'missing_artifacts'}}
        try:
            verify_files(self.root, self.pin['runtime_files'])
            # load_source imports only the hash-pinned independent v6 helper; the
            # delivered v7 predictor owns v7 preprocessing and inference on CPU.
            self.engine = load_source()
            sys.path.insert(0, str(self.root))
            spec = importlib.util.spec_from_file_location('gaiapus_v7_predict', self.root / 'predict.py')
            self.predictor = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(self.predictor)
            self.smoke = {}
            for crop in self.predictor.REGISTRY:
                rows = read_json(self.root / f'smoke/{crop}.json')
                self.smoke[crop] = rows
                for row in rows:
                    value = self.predictor.predict(crop, row['horizon_days'], row['features'])
                    if not math.isclose(value, row['expected_kg_ha'], rel_tol=0, abs_tol=1e-6):
                        raise ProductUnavailable('reproduction_failed')
                    self.report['historical_checks_passed'] += 1
                self.report['models'].append({'crop': crop, 'historical_checks_passed': len(rows), 'public_contract_supported': crop in ('soy','maize2'), 'operational_release': 'not_released'})
            self.templates = {}
            for crop, code, day in [('soy','5107925',75),('maize2','5107925',75),('soy','3170206',20)]:
                raw = read_json(self.root / f'contracts/examples/yield-{crop}-{code}-day{day}.json')
                request = {'municipality_code':code,'crop':crop,'harvest_year':raw['harvest_year'],'days_after_sowing':day}
                self.templates[self.key(request)] = raw
                self.inputs.append(request)
            self.ready = True
            # Every HTTP-enabled example is recomputed and compared before readiness.
            for request in self.inputs:
                if not equivalent(self.execute('yield_estimate',request),self.templates[self.key(request)]):
                    raise ProductUnavailable('reproduction_failed')
        except Exception:
            self.ready = False
            self.inputs = []

    @staticmethod
    def key(value):
        return json.dumps(value,sort_keys=True,separators=(',',':'))

    def readiness(self):
        return {'yield_estimate': {'ready': self.ready,'reason_code': None if self.ready else 'missing_artifacts','supported_inputs':self.inputs},'water_risk_projection':{'ready':False,'reason_code':'incomplete_forcing','supported_inputs':[]}}

    def execute(self,product,data):
        if product != 'yield_estimate' or not self.ready:
            raise ProductUnavailable()
        verify_files(self.root,self.pin['runtime_files'])
        raw=self.templates.get(self.key(data))
        if raw is None:
            raise ProductUnavailable('unsupported_input',422)
        cutoff=self.engine.cutoff_for_day(data['days_after_sowing'],raw['supported_cutoffs_days'])
        estimate=None
        if cutoff is not None:
            row=next((row for row in self.smoke[data['crop']] if row['municipality_code']==data['municipality_code'] and row['horizon_days']==cutoff and row['features']['harvest_year']==data['harvest_year']),None)
            if row is None:
                raise ProductUnavailable('incomplete_forcing')
            estimate=self.predictor.predict(data['crop'],cutoff,row['features'])
        national_note='National validation artifact; no regional model selection is implied'
        base_warnings=[warning for warning in raw['warnings'] if not warning.startswith('No validated cutoff before ') and warning!=national_note]
        output=self.engine.yield_response(municipality_code=data['municipality_code'],crop=data['crop'],harvest_year=data['harvest_year'],sowing_date=raw['sowing_date'],days_after_sowing=data['days_after_sowing'],supported_cutoffs=raw['supported_cutoffs_days'],estimate_kg_ha=estimate,observed_through=raw['observed_through'],model=raw['model'],validation_by_cutoff={cutoff:raw['validation']} if cutoff is not None else {},coverage=raw['coverage'],warnings=base_warnings)
        output['warnings'].append(national_note)
        return output

class ConfiguredRunner:
    def __init__(self, manifest_path=None):
        self.frozen = ScientificRunner(manifest_path)
        self.v7 = V7Delivery()

    def readiness(self):
        return {**self.frozen.readiness(), 'yield_estimate':self.v7.readiness()['yield_estimate'] if self.v7.ready else self.frozen.readiness()['yield_estimate']}

    def execute(self,product,data):
        if product == 'yield_estimate' and self.v7.ready:
            return self.v7.execute(product,data)
        return self.frozen.execute(product,data)
