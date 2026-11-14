from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from threading import Event
import json
from pathlib import Path

from fastapi.testclient import TestClient
import pytest
from adapter import create_app, ProductUnavailable, verify_files, validate_forcing, ScientificRunner

TOKEN = "local-test-token-only"
REQUEST = {"municipality_code": "5107925", "crop": "soy", "sowing_date": "2026-10-05", "decision_at": "2026-11-14T13:44:33+00:00", "horizon_days": 10}
AUTH = {"Authorization": f"Bearer {TOKEN}"}
ROOT = Path(__file__).resolve().parents[3]
WATER = json.loads((ROOT / "packages/contracts/upstream/examples/water-soy-5107925-N10.json").read_text())

def test_missing_artifacts_do_not_disable_health_or_other_product():
    app = create_app(token=TOKEN, runner=ScientificRunner())
    with TestClient(app) as client:
        assert client.get("/health").status_code == 401
        response = client.get("/health", headers=AUTH)
        assert response.status_code == 200
        assert response.json()["products"]["yield_estimate"]["ready"] is False
        assert client.post("/water-balance/scenarios", headers=AUTH, json=REQUEST).status_code == 503

def test_invalid_crop_extra_coordinates_and_dates_rejected_before_helper():
    class NoInvocation:
        def readiness(self): return {"water_risk_projection": {"ready": True}, "yield_estimate": {"ready": False}}
        def execute(self, product, data): raise AssertionError("invalid request reached scientific helper")
    with TestClient(create_app(token=TOKEN, runner=NoInvocation())) as client:
        for request in [{**REQUEST, "crop": "rice"}, {**REQUEST, "latitude": 0}, {**REQUEST, "sowing_date": "2026-02-30"}, {**REQUEST, "horizon_days": 17}, {**REQUEST, "municipality_code": 5107925}]:
            assert client.post("/water-balance/scenarios", headers=AUTH, json=request).status_code == 422

def test_non_utc_or_outside_cycle_decision_is_rejected():
    with TestClient(create_app(token=TOKEN)) as client:
        for request in [{**REQUEST, "decision_at": "2026-11-14T10:44:33-03:00"}, {**REQUEST, "decision_at": "2026-01-01T00:00:00Z"}]:
            assert client.post("/water-balance/scenarios", headers=AUTH, json=request).status_code == 422

def test_output_validation_keeps_yield_effect_null_and_excludes_extra_properties():
    class BadOutput:
        def readiness(self): return {"water_risk_projection": {"ready": True}}
        def execute(self, product, data): return {**WATER, "yield_effect": 999}
    with TestClient(create_app(token=TOKEN, runner=BadOutput())) as client:
        assert client.post("/water-balance/scenarios", headers=AUTH, json=REQUEST).status_code == 502

def test_capacity_remains_occupied_until_actual_completion():
    entered, release = Event(), Event()
    class SlowRunner:
        def readiness(self): return {"water_risk_projection": {"ready": True}}
        def execute(self, product, data):
            entered.set(); assert release.wait(5); return WATER
    with TestClient(create_app(token=TOKEN, runner=SlowRunner())) as client, ThreadPoolExecutor(max_workers=2) as pool:
        pending = pool.submit(client.post, "/water-balance/scenarios", headers=AUTH, json=REQUEST)
        assert entered.wait(3)
        busy = client.post("/water-balance/scenarios", headers=AUTH, json=REQUEST)
        assert busy.status_code == 503 and busy.json()["error"]["code"] == "dependency_busy"
        release.set(); assert pending.result().status_code == 200

def test_tampered_artifact_or_path_escape_is_rejected(tmp_path):
    (tmp_path / "data.json").write_text("changed")
    with pytest.raises(ProductUnavailable): verify_files(tmp_path, {"data.json": "0" * 64})
    with pytest.raises(ProductUnavailable): verify_files(tmp_path, {"../outside.json": "0" * 64})

def test_forcing_requires_continuous_dates_finite_mm_and_matching_issue():
    issue = {"issued_at": "2026-11-14T06:00:00Z", "available_at": "2026-11-14T13:07:57Z", "retrieved_at": "2026-11-14T13:44:35Z", "forcing_issued_at": "2026-11-14T06:00:00Z", "units": "mm", "time_basis": "UTC"}
    rows = [{"date": "2026-11-14", "rain_mm": 0.0, "et0_mm": 1.0}]
    validate_forcing(rows, date(2026, 11, 14), 1, issue, REQUEST["decision_at"])
    for changed in [{**issue, "forcing_issued_at": "2026-11-13T06:00:00Z"}, {**issue, "issued_at": "2026-11-15T00:00:00Z"}, {**issue, "units": "in"}]:
        with pytest.raises(ProductUnavailable): validate_forcing(rows, date(2026, 11, 14), 1, changed, REQUEST["decision_at"])
    with pytest.raises(ProductUnavailable): validate_forcing([{**rows[0], "rain_mm": None}], date(2026, 11, 14), 1, issue, REQUEST["decision_at"])
    with pytest.raises(ProductUnavailable): validate_forcing(rows, date(2026, 11, 13), 1, issue, REQUEST["decision_at"])

def test_independent_upstream_engine_preserves_evaluated_and_experimental_leads():
    # Synthetic forcing is confined to this wrapper test; never a published observation.
    runner = ScientificRunner()
    response = runner.water_response(
        municipality_code="5107925", latitude=-12.69585, longitude=-55.77992, crop="soy", sowing_date=date(2026, 11, 14),
        decision_at="2026-11-14T13:44:33+00:00", horizon_days=10, observed=[],
        forecast=[{"rain_mm": 0.0, "et0_mm": 1.0} for _ in range(10)],
        issue=WATER["forecast"] | {"provider": "Open-Meteo", "model": "ecmwf_ifs025"},
        limit={"max_supported_lead_days": {"soy": 7}, "archive": WATER["evaluation"]["method"], "verification": WATER["evaluation"]["verification"], "reference": WATER["evaluation"]["reference"], "rule": WATER["evaluation"]["rule"]},
        backtest_by_lead=WATER["evaluation"]["by_lead"],
    )
    assert response["status"] == "partially_validated"
    assert [row["validated_lead"] for row in response["days"]] == [True] * 7 + [False] * 3
    assert response["yield_effect"] is None

def test_no_automatic_fixture_substitution_on_provider_failure():
    class Failed:
        def readiness(self): return {"water_risk_projection": {"ready": True}}
        def execute(self, product, data): raise RuntimeError("provider credentials and private paths must not escape")
    with TestClient(create_app(token=TOKEN, runner=Failed())) as client:
        response = client.post("/water-balance/scenarios", headers=AUTH, json=REQUEST)
        assert response.status_code == 503
        assert "credentials" not in response.text
