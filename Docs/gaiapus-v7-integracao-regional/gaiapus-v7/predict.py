"""CPU inference for trusted Gaiapus v7 artifacts, with historical checks."""
import json
import math
from functools import lru_cache
from pathlib import Path

import joblib
import pandas as pd
import sklearn

from data.serving.yield_model import YieldModel

ROOT = Path(__file__).resolve().parent
REGISTRY = json.loads((ROOT / 'model-registry.json').read_text(encoding='utf-8'))


@lru_cache
def _load(crop):
    path = ROOT / REGISTRY[crop]['artifact']
    return YieldModel(path) if path.suffix == '.json' else joblib.load(path)


def predict(crop, horizon_days, features):
    """Receive prepared features; return municipal yield in kg/ha."""
    if crop not in REGISTRY:
        raise ValueError(f'No validated artifact for {crop}')
    spec = REGISTRY[crop]['cutoffs_features']
    if type(horizon_days) is not int or str(horizon_days) not in spec:
        raise ValueError(f'Unsupported cutoff; allowed: {list(spec)}')
    required = spec[str(horizon_days)]
    missing = set(required) - features.keys()
    if missing:
        raise ValueError(f'Missing features: {sorted(missing)}')
    values = {name: features[name] for name in required}
    if any(v is not None and (type(v) not in (int, float) or not math.isfinite(v)) for v in values.values()):
        raise ValueError('Features must be finite numbers or null')
    model = _load(crop)
    if isinstance(model, YieldModel):
        return model.predict({**values, 'horizon_days': horizon_days})
    if model['sklearn'] != sklearn.__version__:
        raise RuntimeError('Use the scikit-learn version pinned in requirements.txt')
    frame = pd.DataFrame([values], dtype=float)
    result = 0.0
    for group in ('history', 'residual'):
        columns, estimator = model[group][horizon_days]
        result += float(estimator.predict(frame[columns])[0])
    return result


if __name__ == '__main__':
    count = 0
    for crop in REGISTRY:
        rows = json.loads((ROOT / 'smoke' / f'{crop}.json').read_text(encoding='utf-8'))
        for row in rows:
            prediction = predict(crop, row['horizon_days'], row['features'])
            if not math.isclose(prediction, row['expected_kg_ha'], rel_tol=0, abs_tol=1e-6):
                raise RuntimeError(f'Parity failure: {crop}, {row["horizon_days"]}')
            count += 1
    print(f'{count} historical inference checks passed')
