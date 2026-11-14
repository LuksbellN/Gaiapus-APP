# Internal scientific adapter

Run from the application root:

```powershell
uv sync --directory services/science-adapter --frozen
# Set a unique server-only SCIENCE_INTERNAL_TOKEN of at least 32 characters.
uv run --directory services/science-adapter uvicorn adapter:from_env --factory --host 127.0.0.1 --port 8001 --workers 1
uv run --directory services/science-adapter pytest -q
```

Python 3.13 and dependencies are locked by `uv.lock`, including the exact v7 numpy/pandas/scikit-learn/scipy/joblib versions. Four unmodified independent modules are vendored with source hashes at revision `ecae8c4457c0bd152915ea16495c83ad5097cfd4` from [Gaiapus_nasa](https://github.com/LeandroJerse/Gaiapus_nasa). The user-supplied v7 delivery is copied unchanged into `delivery/v7` and pinned by `v7-pin.json` (bundle `bb111a292836f4340f87c6a499c3b50db7997fcd95f3083a86a4ceee764a8f74`). The wrapper adds HTTP, validation, integrity and capacity checks; calculations remain upstream. No training or weather acquisition pipeline runs in requests.

All internal routes, including health, require the internal bearer token. There is no browser CORS or published container port in the backend Compose setup. Public Node health remains minimal and does not proxy dependency details.

## Readiness and delivery gates

The supplied v7 national yield artifacts now load on CPU by default. Startup verifies hashes, reproduces all 36 smoke inputs across seven artifacts, and compares each of the three HTTP-enabled yield examples against its original output. Real inference is available for the two Sorriso national Ridge cases; Uberlândia day 20 returns the original successful null estimate. Other crop artifacts pass smoke checks but the public output schema remains limited to soybean/maize. The frozen regional MG/MT soybean rule selects `site+mlp`; its weights are missing, so that model stays unavailable and is never replaced under a regional label. The 2022–2024 test remains closed and all outputs remain retrospective/not operationally released.

Live water remains unavailable without `SCIENCE_MANIFEST_PATH` supplying its trusted forcing/reproduction package. This gate does not disable v7 yield. Node refreshes readiness on demand with a five-second cache and intersects actual reproduced input tuples, so it recovers after Python startup. There is no Python fixture fallback. Public Field Shift is supplied data served through Node examples, not a new custom Python strategy route.

A trusted manifest must be installed by the operator, never uploaded through the API:

```json
{
  "source_revision": "ecae8c4457c0bd152915ea16495c83ad5097cfd4",
  "products": {
    "water_risk_projection": {
      "files": { "water-cases.json": "REPLACE_WITH_SHA256", "forcing.json": "REPLACE_WITH_SHA256", "expected-water.json": "REPLACE_WITH_SHA256" },
      "cases_file": "water-cases.json"
    }
  }
}
```

Every referenced file must appear in that product's hashed allowlist and stay inside the manifest directory. Each case has an `input` matching the public request schema, a `forcing_file`, and `expected_output_file`. Expected outputs must be actual independently published/reproduced cases, not guessed model values. Startup executes each case and compares every field except `generated_at`, with absolute numeric tolerance `1e-6`, before enabling the product.

Water forcing contains `observed` (sowing through decision minus one day), `forecast` (continuous UTC dates from decision), optional equally sized `reference`, `issue`, `limit`, and `backtest_by_lead`. Rows contain `date`, `rain_mm`, `et0_mm`. `issue` includes real `issued_at`, `available_at`, `retrieved_at`, `forcing_issued_at`, `issue_time_source`, `units: "mm"`, `time_basis: "UTC"`. The actual forcing issue must match the reported issue and have been available by the decision. An API's latest-run metadata alone does not prove the forcing's vintage. Missing or inconsistent series are rejected.

The v7 delivery now supplies the compatible national model/feature/runtime slice described above. For additional legacy-manifest yield cases, the product manifest must declare `runtime_versions`; install those trusted matching packages in its image/environment. Cases name `model_file`, `features_file` (one frozen feature row), `sowing_date`, `supported_cutoffs`, `observed_through`, `model`, `validation_by_cutoff`, `coverage`, `warnings`, and `expected_output_file`. Model files are deserialized only after hash verification. Current-season yield remains rejected until an upstream feature builder and reproducible real case are approved. The wrapper does not train or rebuild features.

The supplied N10 publication at this pin serves **six** evaluated days, requests ten, and warns about truncation. Its evaluated limit is seven; no extra days may be padded. A separate adapter unit test uses explicitly synthetic forcing to exercise seven evaluated plus three experimental leads through the real upstream engine. It is not a published scientific example or evidence of reproducing the supplied forcing.

## Capacity and operations

Run one Uvicorn worker per initial instance. One scientific thread may run at a time; a busy request receives 503 without joining a queue. The thread releases its slot only when actual computation finishes, including after HTTP cancellation. Node defaults to a 130-second deadline and does not retry scientific POSTs. Confirm the deployment's request budget before enabling live computation. Multiple processes/instances require a separate coordination design.

The full independent scientific training suite requires omitted local datasets. The adapter suite exercises source integrity and boundary behavior without those data. Neither it nor static fixtures establish model-binary reproduction.
