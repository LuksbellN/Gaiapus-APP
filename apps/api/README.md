# Gaiapus application API

This Node/Fastify API runs independently of the frontend and Python. It provides public published evidence, verified personal accounts/places, immutable comparison saves, evidence-review baselines and explicit fixture/live scientific boundaries. Contracts are `@gaiapus/contracts@0.1.0`, including the explicit v7/Field Shift publication addition in the handoff.

## Start locally

Use Node `22.23.4` and pnpm `10.14.0`:

```powershell
pnpm install --frozen-lockfile
pnpm --filter @gaiapus/contracts build
pnpm dev:api
```

Copy root `.env.example` to `.env` to configure Supabase. Missing Supabase configuration leaves public routes working; private bearer requests report that identity is unavailable. Anonymous private requests always return 401. The runnable server has no fake authentication or in-memory personal database. Test-only repositories/identities live under `apps/api/tests`.

[Supabase setup](../../Docs/2026-11-14-gaiapus-supabase-setup.md) explains project creation, email verification, migration, environment files and two-account integration checks. The API does not provision an external project automatically. It uses only a publishable/anon key plus a provider-verified user's bearer token for private PostgREST queries. Service-role clients are absent from request handlers.

Node listens on `127.0.0.1:3001` by default. The frontend development server should proxy `/v1` and `/publications` to Node. When `apps/web/dist/index.html` exists, Node serves the built frontend and preserves SPA navigation while returning JSON errors for `/v1`, missing publication assets and missing frontend assets. The frontend agent owns UI and browser tests.

## Route readiness

| Routes | Implemented behavior | Dependencies and limits |
|---|---|---|
| `GET /health` | Minimal `{"status":"ok"}` | None |
| `GET /v1/geography` | Accent-insensitive search, hierarchy, IDs, extents/geometry refs, cursor pages | 12 real published catalog targets; no fabricated Sorriso field geometry |
| `GET /v1/coverage` | Per-product publication/input metadata and scientific readiness | Separates Sorriso model examples from three historical imagery locations |
| `GET /v1/observations` | Dated rainfall/NDVI, zero/missing/partial quality, UTC basis and georeferenced imagery | Imported published packages only; no live acquisition |
| `GET /v1/examples`, `GET /v1/examples/:id` | Five unchanged v7 examples with source/version/context and original inputs | National yield/water plus historical Field Shift; explicit fixture origin |
| `GET /v1/scientific-catalog` | Seven supplied model artifacts and the frozen regional-soy decision | Regional MLP weights unavailable; no operational release |
| `GET/PATCH /v1/me` | Idempotent account defaults, allowed profile/preferences updates | Real confirmed Supabase user + migration required |
| `GET/POST /v1/places`, `PATCH/DELETE /v1/places/:id` | Owned target saves, duplicate reuse, rename/delete, pagination | User-scoped database; deleting monitoring clears preference/association but preserves snapshots |
| `POST /v1/yield-estimates`, `POST /v1/water-balance/scenarios` | Verified identity, input/output semantics, exact fixture tuples, handle issuance, rate/concurrency limits | Fixture mode is runnable after Supabase setup; live requires ready internal adapter |
| `GET/POST /v1/comparisons`, `GET/PATCH/DELETE /v1/comparisons/:id` | Server-resolved source, transaction/idempotency, original snapshot preservation, metadata-only edits, owned pagination | Supabase required; `Idempotency-Key` required for saves |
| `GET/POST /v1/evidence-views` | Exact-context private baseline, explicit review, server timestamp, identical-review retries | Valid published context/version; no implicit review from public GET |

`apps/api/requests.http` contains placeholder requests. Application OpenAPI 3.1 JSON is exported at `@gaiapus/contracts/openapi`; schemas/types/fixtures are the canonical frontend integration surface. The integration contract's `meta.app_contract_version` remains `0.1.0`.

## Scientific publication and execution

Scientific reference source is pinned to `ecae8c4457c0bd152915ea16495c83ad5097cfd4` from [Gaiapus_nasa](https://github.com/LeandroJerse/Gaiapus_nasa). The user then supplied the v7 bundle, SHA-256 `bb111a292836f4340f87c6a499c3b50db7997fcd95f3083a86a4ceee764a8f74`. Original schemas, examples, model artifacts, predictor and prepared smoke features are hash-pinned; the original folder is unchanged. All 36 CPU inference checks across seven artifacts passed, including a fresh process and the Linux runtime image. The ignored `.sources/science` checkout is only for controlled imports. Scientific calculations remain upstream.

The real Node→Python integration test recomputes the two Sorriso national Ridge examples and returns the before-first-cutoff Uberlândia case. Its identity/storage are injected test dependencies, so it does not establish hosted Supabase success. Only those three delivered public yield tuples are enabled. The frozen MG/MT soybean rule selects `site+mlp`, whose weights are absent; national Ridge is labeled national. Other supplied crop models pass inference checks but await compatible public request/output/coverage contracts. Current-season and operational use remain unavailable.

Field Shift is the supplied historical hypothetical simulation, opened through `/v1/examples/field-shift-sorriso` and saved by example ID. Complete daily series, sensitivity, limitations and null yield effect are preserved. It does not enable a new strategy engine or convert water differences into yield.

`SCIENCE_MODE=fixture` is the default. Only the exact request tuples in coverage's `supported_inputs` are accepted; unmatched inputs return 422 `fixture_not_available`. `execution_origin` describes fixture/live execution; `result_basis` separately labels retrospective yield versus forecast projection. Public examples never trigger custom analysis.

The pinned water N10 example currently supplies **six evaluated days**, requests ten, and warns that the forecast/cycle ends earlier. Preserve its `ready` status and warning. The plan's older seven evaluated plus three experimental fixture is not supplied at this revision. Adapter unit tests exercise that branch using explicitly synthetic forcing through the independent engine; synthetic forcing is never published as evidence.

Set `SCIENCE_MODE=live`, `SCIENCE_ADAPTER_URL`, and a server-only `SCIENCE_INTERNAL_TOKEN` (32+ characters) to connect Python. Node refreshes readiness on demand with a five-second cache/two-second health deadline, verifies the source revision, and intersects actual reproduced input tuples with the application catalog. It recovers if Python starts later, independently of public/personal API availability. Live errors never invoke fixtures. See [adapter requirements](../../services/science-adapter/README.md). Live water still needs its own trusted forcing package.

The Node deadline is `SCIENCE_DEADLINE_MS=130000` by default; verify that the deployment host supports this request duration before release. Initial limits are one active request/user and ten scientific requests/user/ten minutes, per Node process. Python permits one actual running computation and rejects busy requests without queueing. Cancellation of HTTP does not imply scientific computation stopped.

## Saving and privacy

Fresh results receive a user-bound, server-held save capability valid for fifteen minutes. The bounded store retains at most 1,000 unsaved results. Missing/evicted/restarted handles return 410; cross-user handles return 404. Stored snapshots omit the transient capability and preserve original inputs/output/source versions. Identical idempotency retries return the durable existing record even after the handle expires. Conflicting reuse returns 409. No automatic recomputation occurs.

Private responses use `Cache-Control: private, no-store`. Snapshot/review writes require server-only `APP_STORAGE_SIGNING_KEY`, synchronized with `app_private.signing_config` through operator SQL setup. Direct authenticated INSERT is revoked; narrow signed RPCs verify the user's identity and Node-resolved payload. Ordinary clients remain user-scoped. Comparison lists use database keyset pagination and summary-only queries to avoid the provider's 1,000-row cap.

The logger does not record bearer values or request bodies. Public cache identity includes full request context, publication version and response content. Private notes/resource IDs are excluded from public URLs. The initial deployment is **one Node process and one Python worker**; distributed handles, rate coordination and durable jobs are separate work.

IoT remains gated. No live device history, firmware changes or telemetry corrections are implemented. Durable event identity, rainfall interval semantics, calibration lineage and owned device mapping must be agreed first.

## Verification commands

```powershell
pnpm --filter @gaiapus/contracts test
pnpm contracts:check
pnpm --filter @gaiapus/contracts build
pnpm --filter @gaiapus/api test
pnpm --filter @gaiapus/api typecheck
pnpm --filter @gaiapus/api build
uv run --directory services/science-adapter pytest -q
# Running real adapter + configured SCIENCE_TEST_URL/SCIENCE_TEST_TOKEN:
pnpm --filter @gaiapus/api test:science
pnpm test:database
```

`pnpm test` runs only contracts/API tests, not the concurrently developed frontend. Root `pnpm build`/`pnpm typecheck` discover all workspace packages and can be used during coordinated integration. The real HTTP deadline test needs loopback networking.

Hosted database tests require the seven dedicated test-project variables in the setup guide; without them, `pnpm test:database` deliberately fails rather than pretending to verify RLS. A separate local PostgreSQL policy harness is `node supabase/tests/policies.test.mjs`; it resets only the specifically labeled `gaiapus-policy-test-20261114` disposable container and uses two authenticated roles plus anonymous access. It does not touch any other database. Create that container with:

```powershell
docker run --detach --name gaiapus-policy-test-20261114 --label gaiapus.purpose=isolated-policy-test --publish 127.0.0.1:55439:5432 --env POSTGRES_PASSWORD=gaiapus-local-test-only --env POSTGRES_DB=gaiapus_test postgres:17-alpine
```

The password above is for disposable local tests only. Hosted Auth/PostgREST checks and frontend browser smoke tests remain separate integration evidence. The independent scientific training suite requires omitted datasets; it has not been reported as passing.

## Package locally

```powershell
docker build -f apps/api/Dockerfile -t gaiapus-api:local .
docker build -f services/science-adapter/Dockerfile -t gaiapus-science:local .
docker compose -f compose.backend.yaml up --build api
```

The API Dockerfile now builds contracts, API and frontend together and serves them on one origin. See [first deployment](../../Docs/2026-11-15-primeiro-deploy.md). The optional Compose `live` profile starts Python with no exposed host port. Mount a trusted artifact manifest read-only and configure its path before enabling live products. Supply runtime credentials through the deployment's secret/environment configuration; none are built into the image.

Hosted deployment and Supabase provisioning are separate from the local integration and Git publication. Follow the first-deployment guide for the current package.
