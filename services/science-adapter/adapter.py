"""Thin internal HTTP boundary around pinned independent scientific helpers.

No provider acquisition, model training, preprocessing or recommendations run here.
Live execution is gated on hashed frozen inputs and fresh-process reproduction.
"""
import asyncio
import hashlib
import hmac
import importlib
import importlib.metadata
import json
import math
import os
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
import sys
from threading import BoundedSemaphore
from typing import Literal

from fastapi import FastAPI, Header, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from jsonschema import Draft202012Validator, FormatChecker
from pydantic import BaseModel, ConfigDict, Field, StrictInt, StrictStr, model_validator

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
PIN = json.loads((HERE / "source-pin.json").read_text())
PRODUCTS = ("yield_estimate", "water_risk_projection")

class ProductUnavailable(Exception):
    def __init__(self, code="missing_artifacts", status=503):
        self.code, self.status = code, status

def read_json(path):
    path = Path(path)
    if path.stat().st_size > 16 * 1024 * 1024:
        raise ProductUnavailable()
    return json.loads(path.read_text(encoding="utf-8"))

def confined(root, relative):
    root = Path(root).resolve()
    target = (root / relative).resolve()
    if not target.is_relative_to(root) or target == root:
        raise ProductUnavailable()
    return target

def verify_files(root, files):
    if not isinstance(files, dict) or not files:
        raise ProductUnavailable()
    try:
        for relative, digest in files.items():
            path = confined(root, relative)
            if not isinstance(digest, str) or len(digest) != 64:
                raise ProductUnavailable()
            with path.open("rb") as stream:
                actual = hashlib.file_digest(stream, "sha256").hexdigest()
            if not hmac.compare_digest(actual, digest):
                raise ProductUnavailable()
    except (OSError, ValueError, TypeError) as error:
        raise ProductUnavailable() from error

def instant(value):
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.utcoffset() != timedelta(0):
        raise ValueError("Scientific decisions must use UTC")
    return parsed

class YieldRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    municipality_code: StrictStr = Field(pattern=r"^[0-9]{7}$")
    crop: Literal["soy", "maize2"]
    harvest_year: StrictInt = Field(ge=2002, le=2100)
    days_after_sowing: StrictInt = Field(ge=0, le=365)

class WaterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    municipality_code: StrictStr = Field(pattern=r"^[0-9]{7}$")
    crop: Literal["soy", "maize2"]
    sowing_date: StrictStr = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    decision_at: StrictStr
    horizon_days: StrictInt = Field(ge=1, le=16)

    @model_validator(mode="after")
    def calendar(self):
        sowing = date.fromisoformat(self.sowing_date)
        decision = instant(self.decision_at).date()
        # These limits come from the pinned crop table; no scientific table is duplicated.
        crops = load_source().CROPS
        if not 0 <= (decision - sowing).days < sum(crops[self.crop]["phase_days"]):
            raise ValueError("Decision is outside the simulated crop cycle")
        return self

def load_source():
    source = HERE / "vendor"
    verify_files(source, PIN["files"])
    if str(source) not in sys.path:
        sys.path.insert(0, str(source))
    return importlib.import_module("data.serving.products")

def validate_forcing(rows, first_date, expected_length, issue, decision_at):
    try:
        if len(rows) != expected_length or issue["units"] != "mm" or issue["time_basis"] != "UTC":
            raise ProductUnavailable("incomplete_forcing")
        issued, available = instant(issue["issued_at"]), instant(issue["available_at"])
        if issued != instant(issue["forcing_issued_at"]) or issued > available or available > instant(decision_at) or instant(issue["retrieved_at"]) < available:
            raise ProductUnavailable("forcing_issue_mismatch")
        for index, row in enumerate(rows):
            if row["date"] != (first_date + timedelta(days=index)).isoformat():
                raise ProductUnavailable("incomplete_forcing")
            for key in ("rain_mm", "et0_mm"):
                value = row[key]
                if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
                    raise ProductUnavailable("incomplete_forcing")
    except (KeyError, ValueError, TypeError) as error:
        raise ProductUnavailable("incomplete_forcing") from error

def equivalent(actual, expected, tolerance=1e-6):
    """Only generation time varies; all publication metadata and payload keys agree."""
    if isinstance(actual, dict) and isinstance(expected, dict):
        return actual.keys() == expected.keys() and all(k == "generated_at" or equivalent(actual[k], expected[k], tolerance) for k in actual)
    if isinstance(actual, list) and isinstance(expected, list):
        return len(actual) == len(expected) and all(equivalent(a, b, tolerance) for a, b in zip(actual, expected))
    if type(actual) in (int, float) and type(expected) in (int, float):
        return math.isfinite(actual) and abs(actual - expected) <= tolerance
    return actual == expected

class ScientificRunner:
    def __init__(self, manifest_path=None):
        self.engine = load_source()
        self.water_response = self.engine.water_response
        self._cases, self._models = {}, {}
        self._states = {product: {"ready": False, "reason_code": "missing_artifacts", "supported_inputs": []} for product in PRODUCTS}
        self.validators = {product: Draft202012Validator(read_json(ROOT / f"packages/contracts/upstream/{'yield-estimate' if product == 'yield_estimate' else 'water-projection'}.schema.json"), format_checker=FormatChecker()) for product in PRODUCTS}
        if not manifest_path:
            return
        try:
            manifest_path = Path(manifest_path).resolve()
            manifest = read_json(manifest_path)
            if manifest["source_revision"] != PIN["revision"]:
                raise ProductUnavailable()
        except (OSError, ValueError, KeyError, ProductUnavailable):
            return
        self.artifact_root = manifest_path.parent
        for product in PRODUCTS:
            try:
                spec = manifest["products"][product]
                verify_files(self.artifact_root, spec["files"])
                self.allowed_files = spec["files"]
                cases = self.artifact_json(spec["cases_file"])
                if not isinstance(cases, list) or not cases or len(cases) > 100:
                    raise ProductUnavailable()
                self._cases[product] = {}
                if product == "yield_estimate":
                    for package, version in spec["runtime_versions"].items():
                        if importlib.metadata.version(package) != version:
                            raise ProductUnavailable()
                for case in cases:
                    request = (YieldRequest if product == "yield_estimate" else WaterRequest).model_validate(case["input"])
                    if request.municipality_code not in ("5107925", "3170206"):
                        raise ProductUnavailable("no_published_coverage")
                    if product == "yield_estimate":
                        if request.harvest_year != 2021:
                            raise ProductUnavailable("current_season_unavailable")
                        import joblib
                        path = self.artifact_path(case["model_file"])
                        self._models[case["model_file"]] = joblib.load(path)
                        if hashlib.sha256(path.read_bytes()).hexdigest() != case["model"]["artifact_sha256"]:
                            raise ProductUnavailable()
                    self._cases[product][self.key(case["input"])] = {**case, "files": spec["files"]}
                    expected = self.artifact_json(case["expected_output_file"])
                    output = self._execute(product, self._cases[product][self.key(case["input"])])
                    self.validators[product].validate(output)
                    if not equivalent(output, expected):
                        raise ProductUnavailable("reproduction_failed")
                self._states[product] = {"ready": True, "reason_code": None, "supported_inputs": [case["input"] for case in cases]}
            except Exception:
                # Fail the affected product only; no fixture is substituted.
                self._cases.pop(product, None)
                self._states[product] = {"ready": False, "reason_code": "missing_artifacts", "supported_inputs": []}

    @staticmethod
    def key(value):
        return json.dumps(value, sort_keys=True, separators=(",", ":"))

    def artifact_path(self, name):
        if name not in self.allowed_files:
            raise ProductUnavailable()
        return confined(self.artifact_root, name)

    def artifact_json(self, name):
        return read_json(self.artifact_path(name))

    def readiness(self):
        return self._states

    def execute(self, product, data):
        if not self._states.get(product, {}).get("ready"):
            raise ProductUnavailable()
        case = self._cases[product].get(self.key(data))
        if not case:
            raise ProductUnavailable("unsupported_input", 422)
        self.allowed_files = case["files"]
        verify_files(self.artifact_root, case["files"])
        return self._execute(product, case)

    def _execute(self, product, case):
        data = case["input"]
        if product == "water_risk_projection":
            # Coordinates are a pinned municipal reference, never accepted from HTTP.
            if data["municipality_code"] != "5107925":
                raise ProductUnavailable("no_published_coverage")
            forcing = self.artifact_json(case["forcing_file"])
            sowing = date.fromisoformat(data["sowing_date"])
            decision = instant(data["decision_at"]).date()
            validate_forcing(forcing["observed"], sowing, (decision - sowing).days, forcing["issue"], data["decision_at"])
            validate_forcing(forcing["forecast"], decision, len(forcing["forecast"]), forcing["issue"], data["decision_at"])
            if not forcing["forecast"] or len(forcing["forecast"]) > data["horizon_days"]:
                raise ProductUnavailable("incomplete_forcing")
            reference = forcing.get("reference")
            if reference is not None:
                validate_forcing(reference, decision, len(forcing["forecast"]), forcing["issue"], data["decision_at"])
            issue = {k: forcing["issue"][k] for k in ("issued_at", "available_at", "retrieved_at", "issue_time_source")}
            return self.engine.water_response(municipality_code=data["municipality_code"], latitude=-12.69585, longitude=-55.77992, crop=data["crop"], sowing_date=sowing, decision_at=data["decision_at"], horizon_days=data["horizon_days"], observed=forcing["observed"], forecast=forcing["forecast"], issue=issue, limit=forcing["limit"], backtest_by_lead=forcing["backtest_by_lead"], reference=reference)
        import pandas as pd
        bundle = self._models[case["model_file"]]
        features = pd.DataFrame(self.artifact_json(case["features_file"]))
        if len(features) != 1:
            raise ProductUnavailable()
        cutoff = self.engine.cutoff_for_day(data["days_after_sowing"], case["supported_cutoffs"])
        estimate = None
        if cutoff is not None:
            estimate = float(bundle["baseline"].predict(features)[0])
            if case["model"]["type"] != "baseline":
                estimate += float(bundle["model"].predict(features)[0])
        return self.engine.yield_response(municipality_code=data["municipality_code"], crop=data["crop"], harvest_year=data["harvest_year"], sowing_date=case["sowing_date"], days_after_sowing=data["days_after_sowing"], supported_cutoffs=case["supported_cutoffs"], estimate_kg_ha=estimate, observed_through=case["observed_through"], model=case["model"], validation_by_cutoff={int(k): v for k, v in case["validation_by_cutoff"].items()}, coverage=case["coverage"], warnings=case["warnings"])

def create_app(*, token, runner=None):
    if runner is None:
        from v7 import ConfiguredRunner
        runner = ConfiguredRunner(os.environ.get("SCIENCE_MANIFEST_PATH"))
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    capacity = BoundedSemaphore(1)
    validators = {product: Draft202012Validator(read_json(ROOT / f"packages/contracts/upstream/{'yield-estimate' if product == 'yield_estimate' else 'water-projection'}.schema.json"), format_checker=FormatChecker()) for product in PRODUCTS}

    @app.middleware("http")
    async def authenticate(request: Request, call_next):
        supplied = request.headers.get("authorization", "")
        if not token or not hmac.compare_digest(supplied, f"Bearer {token}"):
            return JSONResponse({"error": {"code": "unauthorized", "message": "Internal authentication required"}}, status_code=401)
        return await call_next(request)

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request, error):
        return JSONResponse({"error": {"code": "invalid_input", "message": "Invalid scientific inputs"}}, status_code=422)

    @app.get("/health")
    def health():
        return {"status": "ok", "source_revision": PIN["revision"], "products": runner.readiness()}

    async def invoke(product, data):
        if not capacity.acquire(blocking=False):
            return JSONResponse({"error": {"code": "dependency_busy", "message": "Scientific worker is busy"}}, status_code=503, headers={"Retry-After": "5"})
        def work():
            try:
                output = runner.execute(product, data)
                validators[product].validate(output)
                if output["municipality_code"] != data["municipality_code"] or output["crop"] != data["crop"]:
                    raise ValueError("Output context mismatch")
                return output
            finally:
                # Cancellation/disconnect never releases capacity ahead of the actual thread.
                capacity.release()
        try:
            return await asyncio.to_thread(work)
        except ProductUnavailable as error:
            return JSONResponse({"error": {"code": error.code, "message": "Scientific capability unavailable"}}, status_code=error.status)
        except Exception as error:
            from jsonschema import ValidationError
            status = 502 if isinstance(error, (ValidationError, ValueError)) else 503
            return JSONResponse({"error": {"code": "upstream_invalid" if status == 502 else "dependency_failure", "message": "Scientific execution unavailable"}}, status_code=status)

    @app.post("/yield-estimates")
    async def yield_estimates(data: YieldRequest):
        if data.harvest_year != 2021:
            return JSONResponse({"error": {"code": "current_season_unavailable", "message": "Current-season feature builder has not been delivered"}}, status_code=422)
        return await invoke("yield_estimate", data.model_dump())

    @app.post("/water-balance/scenarios")
    async def water(data: WaterRequest):
        return await invoke("water_risk_projection", data.model_dump())

    return app

def from_env():
    token = os.environ.get("SCIENCE_INTERNAL_TOKEN")
    if not token or len(token) < 32:
        raise RuntimeError("Configure SCIENCE_INTERNAL_TOKEN with at least 32 characters")
    return create_app(token=token)
