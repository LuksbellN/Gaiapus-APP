import json
from pathlib import Path
import subprocess
import sys
import pytest
from fastapi.testclient import TestClient
from adapter import create_app
from v7 import V7Delivery

TOKEN = 'test-v7-internal-token'
AUTH = {'Authorization': f'Bearer {TOKEN}'}
ROOT = Path(__file__).resolve().parents[3]

def test_all_delivered_models_reproduce_their_frozen_smoke_features():
    delivery = V7Delivery()
    assert delivery.report['historical_checks_passed'] == 36
    assert len(delivery.report['models']) == 7
    assert delivery.report['regional_soy']['selected'] == 'site+mlp'
    assert delivery.report['regional_soy']['ready'] is False
    assert delivery.report['operational_release'] == 'not_released'

def test_internal_yield_recomputes_v7_national_examples_from_trusted_features():
    delivery = V7Delivery()
    app = create_app(token=TOKEN, runner=delivery)
    with TestClient(app) as client:
        for crop in ['soy','maize2']:
            raw = json.loads((ROOT / f'packages/contracts/upstream/v7/contracts/examples/yield-{crop}-5107925-day75.json').read_text())
            response = client.post('/yield-estimates', headers=AUTH, json={'municipality_code':'5107925','crop':crop,'harvest_year':2021,'days_after_sowing':75})
            assert response.status_code == 200, response.text
            actual = response.json()
            assert actual['estimate_kg_ha'] == raw['estimate_kg_ha']
            assert actual['model']['version'] == 'research_v7_national_walk_forward'
            assert actual['model']['artifact_sha256'] == raw['model']['artifact_sha256']
            assert actual['warnings'] == raw['warnings']
        early = client.post('/yield-estimates', headers=AUTH, json={'municipality_code':'3170206','crop':'soy','harvest_year':2021,'days_after_sowing':20})
        assert early.status_code == 200 and early.json()['estimate_kg_ha'] is None
        assert client.post('/yield-estimates', headers=AUTH,json={'municipality_code':'5107925','crop':'soy','harvest_year':2026,'days_after_sowing':75}).status_code == 422

def test_missing_or_tampered_v7_delivery_fails_closed_without_fixture_fallback(tmp_path):
    delivery = V7Delivery(root=tmp_path)
    assert delivery.readiness()['yield_estimate']['ready'] is False
    with TestClient(create_app(token=TOKEN,runner=delivery)) as client:
        response=client.post('/yield-estimates',headers=AUTH,json={'municipality_code':'5107925','crop':'soy','harvest_year':2021,'days_after_sowing':75})
        assert response.status_code == 503

def test_v7_reproduces_in_a_fresh_process():
    result=subprocess.run([sys.executable,'-c','from v7 import V7Delivery; d=V7Delivery(); assert d.report["historical_checks_passed"]==36; print("36 checks in fresh process")'],cwd=Path(__file__).resolve().parents[1],capture_output=True,text=True,timeout=30)
    assert result.returncode == 0, result.stderr
