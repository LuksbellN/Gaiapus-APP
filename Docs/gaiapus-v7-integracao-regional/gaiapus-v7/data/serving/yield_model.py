"""Load portable v7 yield models (JSON + state_dict) and predict on CPU.

Formats written by data.ingest.train_v7: 'gaiapus-ridge-v1' (history Ridge plus residual
Ridge per cutoff) and 'gaiapus-mlp-v1' (history Ridge per cutoff plus a seed ensemble of
MLPs on the residual, with the cutoff as input). Only numpy and torch are needed; no
pickled project classes are loaded.
"""
import json
from pathlib import Path


def _linear(spec, row):
    import numpy as np
    x = np.array([row.get(f) for f in spec['features']], dtype=float)
    x = np.where(np.isnan(x), spec['imputer_median'], x)
    z = (x - np.array(spec['scaler_mean'])) / np.array(spec['scaler_scale'])
    return float(z @ np.array(spec['coef']) + spec['intercept'])


def _missing(spec_features, row):
    return [f for f in spec_features if f not in row]


class YieldModel:
    def __init__(self, path):
        path = Path(path)
        self.spec = json.loads(path.with_suffix('.json').read_text(encoding='utf-8'))
        self.format = self.spec['format']
        if self.format not in ('gaiapus-ridge-v1', 'gaiapus-mlp-v1'):
            raise ValueError(f'Unsupported model format: {self.format}')
        self.cutoffs = sorted(int(h) for h in self.spec['history_by_horizon'])
        if self.format == 'gaiapus-mlp-v1':
            import torch
            weights = torch.load(path.with_suffix('.pt'), map_location='cpu', weights_only=True)
            self.networks = []
            for index in range(len(self.spec['seeds'])):
                state = {k.split('.', 1)[1]: v for k, v in weights.items() if k.startswith(f'seed{index}.')}
                layers, previous = [], len(self.spec['features'])
                for size in self.spec['hidden']:
                    layers += [torch.nn.Linear(previous, size), torch.nn.ReLU()]
                    if self.spec['dropout']:
                        layers.append(torch.nn.Dropout(self.spec['dropout']))
                    previous = size
                network = torch.nn.Sequential(*layers, torch.nn.Linear(previous, 1))
                network.load_state_dict(state)
                network.eval()
                self.networks.append(network)

    def required_features(self, horizon):
        history = self.spec['history_by_horizon'][str(horizon)]['features']
        if self.format == 'gaiapus-ridge-v1':
            return sorted(set(history) | set(self.spec['residual_by_horizon'][str(horizon)]['features']))
        return sorted(set(history) | set(self.spec['features']) - {'horizon_days'})

    def predict(self, row):
        """`row` holds the cohort features for one municipality, crop and cutoff (`horizon_days`)."""
        horizon = int(row['horizon_days'])
        if horizon not in self.cutoffs:
            raise ValueError(f'Cutoff {horizon} not supported; supported: {self.cutoffs}')
        missing = _missing(self.required_features(horizon), row)
        if missing:
            raise ValueError(f'Missing required features: {missing}')
        history = _linear(self.spec['history_by_horizon'][str(horizon)], row)
        if self.format == 'gaiapus-ridge-v1':
            return history + _linear(self.spec['residual_by_horizon'][str(horizon)], row)
        import numpy as np
        import torch
        x = np.array([row.get(f) for f in self.spec['features']], dtype=float)
        x = np.where(np.isnan(x), self.spec['imputer_median'], x)
        z = torch.tensor((x - np.array(self.spec['scaler_mean'])) / np.array(self.spec['scaler_scale']), dtype=torch.float32)[None]
        with torch.no_grad():
            residual = float(np.mean([net(z).item() for net in self.networks])) * self.spec['residual_scale']
        return history + residual
