"""Field Shift extension (field_shift_rotations.py): reproduction gate of A and B, rotation C and the rain factor."""
import json
from pathlib import Path

import pytest
import field_shift_rotations as fsr

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "apps/web/src/teammate/data"
DAILY = json.loads((DATA / "sorriso-daily.json").read_text(encoding="utf-8"))
PUBLISHED = json.loads((DATA / "sorriso-field-shift.json").read_text(encoding="utf-8"))
COMMITTED = json.loads((DATA / "sorriso-field-shift-rotations.json").read_text(encoding="utf-8"))
CAPACITY = DAILY["capacity_mm"]
YEARS = PUBLISHED["weather"]["agricultural_years"]
A = DAILY["scenarios"]["reference_fallow"]
B = DAILY["scenarios"]["brachiaria"]
C = fsr.soy_fallow(A)


@pytest.mark.parametrize("series", [A, B], ids=["reference_fallow", "brachiaria"])
def test_published_a_and_b_are_reproduced_within_001_mm(series):
    err, _ = fsr.max_error(series, fsr.run(series, CAPACITY))
    assert err <= fsr.TOLERANCE_MM == 0.01


def test_rotation_c_has_no_maize_day():
    assert not any(cover.startswith("maize2") for cover in C["land_cover"])
    assert len(C["date"]) == len(A["date"])


def test_maize_indicators_are_null_in_c():
    rows = fsr.by_year(C, fsr.run(C, CAPACITY), YEARS)
    assert all(r["maize_deficit_mm"] is None and r["maize_stress_days"] is None for r in rows)
    mean = fsr.mean(rows)
    assert mean["maize_deficit_mm"] is None and mean["maize_stress_days"] is None
    assert COMMITTED["scenarios"]["soy_fallow"]["mean"]["maize_deficit_mm"] is None


@pytest.mark.parametrize("mult", [0.8, 1.2])
def test_rain_factor_also_scales_rain_on_bare_soil(mult):
    base = fsr.by_year(C, fsr.run(C, CAPACITY), YEARS)
    scaled = fsr.by_year(C, fsr.run(C, CAPACITY, mult), YEARS, mult)
    for b, s in zip(base, scaled):
        assert b["rain_on_bare_soil_mm"] > 0
        assert s["rain_on_bare_soil_mm"] == pytest.approx(b["rain_on_bare_soil_mm"] * mult, abs=0.1)
        assert s["bare_days"] == b["bare_days"]  # the factor changes rain, never the calendar


def test_committed_extension_matches_a_fresh_run(tmp_path):
    assert fsr.main(DATA / "sorriso-daily.json", DATA / "sorriso-field-shift.json", tmp_path) == 0
    fresh = json.loads((tmp_path / "sorriso-field-shift-rotations.json").read_text(encoding="utf-8"))
    for d in (fresh, COMMITTED):
        d["provenance"].pop("input")
    assert fresh == COMMITTED
