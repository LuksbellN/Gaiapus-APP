---
title: Gaiapus API and Frontend Integration Contract
aliases:
  - Gaiapus Shared Contract
created: 2026-11-14
status: planned
contract_version: 0.1.0
tags:
  - gaiapus
  - contracts
  - coordination
---

# Gaiapus API and Frontend Integration Contract

> [!important] One product, two execution fronts
> The user will develop the frontend with a separate agent and give iterative UX/design suggestions. Another agent develops the API independently. This is the common integration specification, not a third implementation front. It does not start either agent or claim an implementation exists.

**Product reference:** [[2026-11-14-gaiapus-product-ux-and-implementation-plan]].

**API execution:** [[2026-11-14-gaiapus-api-implementation-plan]].

**Frontend execution:** [[2026-11-14-gaiapus-frontend-implementation-plan]].

## 1. Responsibilities and edit ownership

| Area | Owner | Rule |
|---|---|---|
| `apps/api/**` | API agent | Node/Fastify, public catalog, account operations, authorization, science integration |
| `services/science-adapter/**` | API agent | Thin Python HTTP adapter; no new scientific algorithms |
| `supabase/**` | API agent | Migrations, grants, row policies, database tests |
| `packages/contracts/**` | API agent | Schemas, generated types, fixture exports, contract checks |
| Root workspace/configuration, lockfile, backend deployment | API agent | Single integration owner; frontend requests required shared changes |
| `apps/web/**` | Frontend agent with the user | App package, routing, components, styles, map, UI states, API client, local mocks |
| `tests/e2e/**` | Frontend agent | Browser scenarios, including real-API integration smoke tests |
| API plan | API agent | Keep its implementation checklist factual |
| Frontend plan and UX decision log | Frontend agent | Record user suggestions and their effects |
| This shared contract | API agent as editor, both fronts as consumers | Publish compatible changes deliberately; never silently change wire shapes |
| Master product plan | Product reference | Update only for a real agreed product change, not routine implementation detail |

Visual changes and microcopy belong to the frontend workflow. Changes to routes, field names, units, date meaning, auth, result basis, or supported scientific inputs require an updated shared contract.

## 2. Foundation milestone M0

The current local workspace contains documents, not the application. A minimal shared foundation is necessary before two implementation branches can reliably integrate.

The API agent owns M0:

- [ ] Establish the intended application repository without overwriting these documents or creating a competing scientific repository.
- [ ] Create the pnpm workspace root, API package, and `@gaiapus/contracts` package.
- [ ] Publish contract version `0.1.0`: route schemas, request/response types, reason codes, and validated fixtures described below.
- [ ] Pin the independent scientific repository revision used for schemas/examples.
- [ ] Make the contracts build/test pass without model binaries, provider credentials, or Supabase credentials.
- [ ] Record the exact foundation revision and commands in an `M0 handoff` section in the API plan.

The frontend agent may start visual research, user discussion, layout decisions, and screen/state sketches immediately. After M0, it creates `apps/web` against the shared package and develops all features with HTTP mocks. It does not wait for the real endpoints, database, or Python service.

If API and frontend development use isolated worktrees, both start from the same M0 revision. Each worktree may install dependencies locally. During integration, the API owner regenerates the root lockfile after accepting frontend package changes; do not hand-merge conflicting generated lockfile entries.

If both agents use one checkout, keep the path ownership above and serialize dependency installation, root configuration changes, and shared build operations. Isolated worktrees are preferred for active code development.

## 3. Development topology

| Component | Default | Notes |
|---|---|---|
| Frontend | `http://localhost:5173` | Vite development server |
| Node application API | `http://localhost:3001` | Owns public `/v1` routes and authenticated resources |
| Internal Python adapter | `http://127.0.0.1:8001` | Node-only integration boundary |
| Frontend API base | `/v1` | Vite proxies to Node in HTTP mode; components never hard-code hostnames |

Expose frontend transport selection as `VITE_APP_API_MODE=mock|http`. In mock mode, browser-side HTTP handlers intercept the same requests the real API client would make. Use MSW as a frontend development/test dependency.

Mock mode must be visibly identifiable during development. Production builds reject browser-side mock mode and simulated authentication. This restriction does not prohibit a production Node API from serving explicitly labeled scientific fixtures.

These axes are different:

- **Frontend transport:** mock handlers or HTTP to Node.
- **Scientific origin:** `fixture` or `live` in application responses.
- **Scientific meaning:** observation, retrospective estimate, projection, or hypothetical scenario.

Switching the frontend transport must not require changing page components.

## 4. Shared identifiers and transport rules

- Country ID: `BR`; state ID: `BR-MT` or `BR-MG`; Brazilian municipality ID: seven-digit IBGE string such as `5107925` or `3170206`.
- Published field IDs are catalog-issued opaque strings. They do not imply private land ownership.
- Private resource IDs are UUIDs and never establish authorization by themselves.
- Authenticated requests carry `Authorization: Bearer <access-token>`; do not send a trusted `user_id` from the browser.
- All JSON uses the documented snake_case field names. TypeScript may derive views through one adapter rather than renaming fields independently in each component.
- Timestamp instants use ISO 8601 with UTC offset. Date-only scientific buckets remain `YYYY-MM-DD` with a declared source time basis.
- List pagination uses `items` and `next_cursor`, with null when complete.
- Error response shape is `{ error: { code, message, field_errors? }, meta: { app_contract_version, request_id } }`. `field_errors` maps request field names to readable messages.
- Domain result states are not transport failures. `before_first_cutoff` remains a successful scientific response with a null estimate.

## 5. Response families

### 5.1 General application responses

Use a consistent `{ data, meta }` wrapper. `meta` always contains `app_contract_version: '0.1.0'` and `request_id`. Published evidence also contains `publication_version` and `context_key`.

The contracts package exports named types and validators for the following data shapes:

| Type | Minimum contents |
|---|---|
| `GeographyPage` | `items` with `area_id`, `name`, `kind`, `parent_id`, optional bounding box and published geometry reference; `next_cursor` |
| `CoverageResult` | `area_id`, `products[]`, and source/publication references |
| `ProductCapability` | `product_id`, `availability`, `reason_code`, published periods, supported crops/cutoffs/horizons, `writable_inputs`, `run_available`, `run_access` |
| `ObservationsResult` | `area_id`, requested period, series with dates/values/units/quality/source time basis/spatial support, and dated imagery references with actual published georeferencing |
| `ExamplePage` | `items` with `example_id`, title, area, product, period, and result basis; `next_cursor` |
| `ExampleDetail` | Selected example metadata, original supported input snapshot, and scientific result envelope |
| `MeResult` | `profile` and `preferences`, including optional `last_monitored_place_id` |
| `MonitoredPlace` | `id`, `area_id`, `kind`, `label`, creation/update timestamps |
| `ComparisonSummary` | `id`, title, product, area, creation time, result basis, optional monitored-place ID |
| `ComparisonDetail` | Summary fields, notes, original input snapshot, complete original output envelope and source versions |
| `EvidenceReview` | `context_key`, reviewed publication version, and review timestamp |

At M0 the API owner materializes the exact nested schemas from these requirements and the actual source packages, exports them from `@gaiapus/contracts`, and supplies one valid fixture per response. This is contract preparation, not permission to invent observations, geometry, scientific controls, or output values.

`product_id` initially distinguishes `history`, `yield_estimate`, `water_risk_projection`, and reserved `strategy_comparison`. An unprovided strategy product stays unavailable. `run_access` is `authenticated`; `run_available` reflects the actual backend capability rather than whether a public visitor has logged in.

Availability reasons must distinguish at least no published coverage, unsupported crop, missing artifacts, incomplete forcing, and an unsupported requested period. Do not overload one `status` field to represent auth, data quality, scientific availability, and network execution.

### 5.2 Scientific envelopes

Preserve `ResultEnvelope<T>` and `ExplorationContext` from master-plan Sections 6 and 8. The package exports `YieldEstimateResponse`, `WaterRiskProjectionResponse`, their validators, and the versioned upstream payload types.

Keep the raw scientific payload inside `data` intact, including `status`, `availability`, `warnings`, nulls, model metadata, and evaluation. Keep application metadata outside it because upstream schemas reject extra properties.

`meta.save_handle`, when present, is `{ id, expires_at }` for the authenticated user. It is a transient save capability, not a public share link. Saved snapshots omit this transient handle.

### 5.3 Authenticated writes

| Operation | Request shape | Response |
|---|---|---|
| Update account | `{ display_name?, locale?, last_monitored_place_id? }` | Updated `MeResult` |
| Save monitored place | `{ area_id, label? }` | `MonitoredPlace` |
| Rename monitored place | `{ label }` | Updated `MonitoredPlace` |
| Delete monitored place | No body | 204; existing comparisons remain accessible |
| Save example comparison | `{ source: { kind: 'example', example_id }, title, notes?, monitored_place_id? }` plus `Idempotency-Key` | `ComparisonDetail` |
| Save fresh analysis | `{ source: { kind: 'analysis', save_handle_id }, title, notes?, monitored_place_id? }` plus `Idempotency-Key` | `ComparisonDetail` |
| Edit comparison | `{ title?, notes? }` | Updated `ComparisonDetail`; scientific snapshot is unchanged |
| Delete comparison | No body | 204 |
| Record evidence review | `{ context_key, publication_version }` | `EvidenceReview`; server supplies review time |

Duplicate monitored-place saves return the existing owned place rather than creating duplicates. Snapshot save retries with the same key/payload return the same snapshot; conflicting reuse returns 409.

At M0 define scientific input schemas using the handoff. Yield accepts the supported municipality/crop/harvest reference and requested cutoff context. Water accepts supported municipality/crop/sowing date/decision/horizon inputs. Soil, rainfall perturbation, and arbitrary calendar controls are not writable unless the actual scientific adapter supports them.

## 6. Route and status agreement

The route inventory is master-plan Section 6.1. Add `GET /v1/evidence-views?context_key=...` for authenticated review-baseline lookup: it returns `{ data: EvidenceReview | null, meta }` for that exact user/context. This read complements the existing review-write route so the frontend never has to infer a private baseline from publication data. The API plan implements these routes; the frontend plan mocks and consumes them. `/health` is a minimal liveness route outside `/v1`; 204 deletions have no JSON body.

| Situation | HTTP/domain behavior | Required frontend behavior |
|---|---|---|
| Unknown public ID | 404 | Explain and allow new selection |
| Valid area without a product | 200 domain `no_data` with reason | Keep location, show available alternatives |
| Invalid input | 422 | Show field/capability error without discarding draft |
| Unauthenticated private request | 401 | Sign-in recovery, preserving allowable context |
| Private record not owned | 404 | No existence/owner disclosure |
| Conflicting idempotency payload | 409 | Retain form; explain save conflict |
| Expired unsaved analysis handle | 410 `result_expired` | Explain expiry; offer deliberate rerun, never silently recompute |
| Transient dependency failure/busy | 503 | Retry path and retained inputs |
| Invalid upstream response | 502 | Safe failure message; old result remains explicitly old |
| Scientific rate limit | 429 | Honor retry information; avoid automatic run loops |

Public example retrieval does not trigger scientific POSTs. Anonymous custom-analysis requests return 401 before computation. The internal Python service remains outside the browser API contract.

## 7. Required fixture scenarios

API-owned canonical fixtures live in `packages/contracts/fixtures`; untouched pinned upstream scientific examples live in `packages/contracts/upstream`. Frontend-owned HTTP behavior scenarios live in `apps/web/src/mocks` and compose those fixtures.

| Fixture/scenario | Expected use |
|---|---|
| Sorriso soybean day 75 | Retrospective ready estimate with its actual supported cutoff and evaluation |
| Sorriso maize safrinha day 75 | Independent crop metadata and result |
| Uberlândia soybean day 20 | `before_first_cutoff`, null estimate/validation |
| Sorriso water N10 | Seven evaluated leads plus three experimental leads; preserve original payload |
| Product-specific geography coverage | Model example and imagery do not automatically share coverage |
| Zero, missing, and partial observations | Different rendering and domain meaning |
| Uncovered area, unknown ID, temporary failure | Distinct HTTP/domain paths |
| Empty/new/returning personal account | Onboarding, quiet state, factual evidence notices |
| Saved comparison with older versions | Reopen without recalculation |
| Authentication expiry and account change | Cache isolation and recoverable context |
| Delayed A/B response race | Current context always wins |
| Invalid input, timeout, busy, throttle, expired handle | Recoverable forms with truthful messages |

Use synthetic identities and explicitly labeled synthetic application fixtures for account states. Do not introduce invented scientific numbers when a real supplied example already defines the scientific case.

## 8. Parallel delivery checkpoints

| Milestone | API front | Frontend front | Integration proof |
|---|---|---|---|
| M0 | Shared workspace/contracts/fixtures published | User discussion and visual/state preparation | Both use the same contract version/revision |
| M1 | Public catalog and examples | Hero, navigation, history, example comparison against mocks | Same fixtures validate and render |
| M2 | Auth, personal places, snapshots, review metadata | Auth screens, onboarding, returning home, saved library against mocks | Real sign-in and save/reopen smoke test |
| M3 | Scientific adapter and actual capability gates | Supported forms, dirty/pending states, result inspection | Matched example reproduction and no fixture fallback |
| M4 | Service/security/packaging evidence | Responsive/accessibility/real-API browser checks | Full public and personal walkthrough |

The API can reach M1 with no frontend. The frontend can complete M1–M3 screens against validated mocks without working Python/model artifacts. Neither front treats a mock result as proof that the other front is implemented.

## 9. Change and handoff protocol

### 2026-11-14 v7 delivery addition (initial contract 0.1.0)

The user supplied the regional v7 integration bundle after M0. Existing four example IDs and HTTP scientific input shapes remain. Yield examples now carry the supplied national v7 Ridge metadata; original v6 files/fixture exports remain available. Publication versions distinguish these deliveries and saved outputs are never rewritten.

Added `FieldShiftResponse`/`StrategyExampleInput` to the shared scientific/example/snapshot unions and published example `field-shift-sorriso`. Its raw discriminator is `field_shift_scenario`, application product is `strategy_comparison`, result basis is `hypothetical_scenario`, and `yield_effect` remains null. No writable strategy route is provided. Frontend must explicitly narrow this third payload before accessing yield/water fields; lists no longer assume four examples.

Added public `GET /v1/scientific-catalog` (`ScientificCatalogResponse`), showing seven supplied artifacts and the frozen `site+mlp` regional-soy decision. Regional weights are missing, so national Ridge reproduction is not labeled regional execution. Other crop artifacts are not permission to bypass the existing soybean/maize public request schema.

The v7 delivery's proposed raw error HTTP 400 codes do not replace the shared application's agreed 422 validation envelope; its raw `YieldErrorPayload` schema is preserved/exported for adapter integration. Frontend continues consuming the application's `{error,meta}` failures.

Exact source hashes, integration checks and required frontend action are in [[2026-11-14-gaiapus-api-handoff]].

For any contract change, record: version, affected route/type, reason, compatibility impact, updated fixture, and required frontend action. Publish schema, generated types, fixtures, and contract tests together. Keep old fixtures available until consumers migrate if a breaking transition is necessary.

For each milestone, each agent reports:

```text
Front: API or Frontend
Milestone and revision:
Implemented:
Mock/fixture-backed:
Verified commands and results:
Remaining external dependency:
Contract changes:
Next integration check:
```

The user may refine layout, hierarchy, interaction, and wording directly with the frontend agent. Frontend records material decisions in its UX log; it escalates only changes that affect the shared API or scientific meaning. A styling preference is not a reason to block on the API agent.
