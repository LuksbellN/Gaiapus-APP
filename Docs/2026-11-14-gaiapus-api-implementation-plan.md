---
title: Gaiapus API Implementation Plan
aliases:
  - Gaiapus API Front
created: 2026-11-14
status: planned
workstream: api
tags:
  - gaiapus
  - api
  - implementation-plan
---

# Gaiapus API Implementation Plan

> **For the API agent:** Implement only this front and its owned shared foundation. The user is developing the frontend with another agent. Use `superpowers:executing-plans` for task execution. Read the shared contract before coding; do not edit frontend components, styles, or browser tests. This is a plan, not a record of completed implementation.

**Goal:** Deliver the Node application API, Supabase-backed personal persistence, and an internal adapter for the independent scientific tool, with contracts the frontend can consume independently.

**Architecture:** Fastify/TypeScript owns application routes and authorization. Supabase provides identity/Postgres. Python serves the supplied scientific code internally. Canonical schemas, generated types, and fixtures are owned by this front and published through `@gaiapus/contracts`.

**Tech stack:** pnpm, TypeScript, Node, Fastify, Ajv 2020-12 with format validation, Supabase Auth/Postgres, internal FastAPI, Vitest/API integration tests, and Python/database tests.

**Spec:** [[2026-11-14-gaiapus-product-ux-and-implementation-plan]] for product/scientific semantics; [[2026-11-14-gaiapus-api-frontend-contract]] for cross-front contracts; [[gaiapus-28-handoff-front-back]] for scientific integration.

## 1. Scope, ownership, and constraints

### Owned paths

- `apps/api/**`: public/private HTTP API and API tests.
- `packages/contracts/**`: application schemas, generated types, canonical fixtures, upstream pins, validators.
- `services/science-adapter/**`: wrapper, artifact loading, HTTP input validation, adapter tests.
- `supabase/**`: application schema, constraints, grants, policies, database tests.
- Root workspace setup, shared lockfile integration, backend deployment configuration, and backend README.

The frontend agent owns `apps/web/**` and `tests/e2e/**`. Request a frontend change through a handoff rather than modifying those files. Root build tooling must discover the frontend package without imposing a visual implementation.

### Global constraints

- Public users get geography, published observations, and examples. Private mutations and custom scientific analysis require verified identity.
- The initial workspace is personal. Do not add invitations, organization roles, or shared-farm administration.
- Science remains independent: do not train models, rebuild preprocessing, or invent a recommendation engine.
- Preserve municipal scope, retrospective availability, cutoff semantics, evaluated horizons, source dates, and `yield_effect: null`.
- Never substitute a fixture when a live scientific request fails.
- Use row policies and verified user-scoped database access; a browser-provided owner ID is never trusted.
- The API must be testable without frontend source and without model artifacts for fixture-backed capabilities.

### Review focus

1. Cross-account access, association, and snapshot-handle theft — A2, A3, A5.
2. Scientific payloads or invalid inputs that pass transport validation but violate upstream meaning — A0, A4, A7.
3. Duplicate saves, expired handles, and mutable snapshots — A5.
4. Missing artifacts or provider failures that disable unrelated working products — A4, A7, A8.
5. Coverage/time/version mismatch that the frontend would otherwise have to guess — A1, A6, A7.

## 2. Deliverables and frontend independence

Deliver in this order: M0 contracts, public API, personal API, scientific integration, packaging. Do not wait for a finished interface to implement endpoint behavior or validate responses.

The frontend consumes the shared types/fixtures and uses HTTP mocks until routes are ready. The API's progress report must name which routes are implemented and which are fixture-backed. An OpenAPI document alone is not proof that a route works.

### M0 handoff

Fill this in when the foundation is actually ready:

- Foundation revision: not yet created.
- Contract package/version: planned `@gaiapus/contracts`, `0.1.0`.
- Scientific source revision: not yet pinned in the application.
- Contract install/build/test commands: establish in A0 and record actual results here.
- Frontend starting instructions: use the same foundation revision, create `apps/web`, and follow its dedicated plan.

## 3. API tasks

Each task is a separate reviewable deliverable. Implement focused failing tests first for its important contracts/state transitions, then the behavior, then run the checks. The commands are intended scripts to establish, not previously executed checks.

### A0 — Publish the shared foundation and contract baseline

**Files:** Workspace root configuration, `apps/api/package.json`, `packages/contracts/**`.

**Consumes:** Shared integration specification and inspected upstream schemas/examples.

**Produces:** A runnable API shell, `@gaiapus/contracts@0.1.0`, validated fixture exports, OpenAPI schemas, and an M0 revision.

- [ ] Inspect the current checkout/instructions and establish a single application repository without overwriting the documentation or scientific repository.
- [ ] Create the pnpm workspace and API/contracts packages, strict TypeScript, compatible pinned runtime, root scripts, and reproducible lockfile.
- [ ] Make `createApp(dependencies)` construct Fastify without binding a port; keep process startup separate for injectable tests.
- [ ] Materialize all route request/response schemas and named types listed in the shared contract. Reuse the actual published asset metadata rather than inventing geometry or data values.
- [ ] Pin and import the two upstream scientific schemas and four examples without modifying their scientific payloads.
- [ ] Export upstream validators using Ajv 2020-12 and date/time formats; generate TypeScript types and add a generated-drift check.
- [ ] Add fixtures for public geography/coverage/history, private resource states, and the failure scenarios listed in the shared contract.
- [ ] Test all canonical fixtures against their schemas. Test rejection of a non-ready yield carrying a number, malformed dates, unexpected scientific properties, and scientific output with a fabricated yield effect.
- [ ] Establish API/client-compatible JSON errors and schema-derived OpenAPI output.
- [ ] Publish the M0 handoff so frontend work can consume the package before the real routes are complete.

**Verification:** Contract tests, contract generation check, API shell tests, and typecheck pass without external credentials or model binaries. `GET /health` returns minimal liveness.

### A1 — Implement the public geography and evidence API

**Files:** `apps/api/src/modules/geography/**`, `apps/api/src/modules/evidence/**`.

**Consumes:** A0 schemas and validated prototype publication packages.

**Produces:** `GET /v1/geography`, `/coverage`, `/observations`, `/examples`, and `/examples/:id`.

- [ ] Publish a catalog with stable IDs, hierarchy, actual extents/geometry references, product coverage, periods, source references, and immutable publication versions.
- [ ] Implement search/parent navigation with pagination and duplicate-name disambiguation.
- [ ] Implement product-specific coverage, supported scientific input metadata, and unavailable reason codes.
- [ ] Serve observations with zero/missing/partial distinctions, declared daily time basis, quality, units, scope, and dated imagery references.
- [ ] Serve the four supplied examples with original inputs, provenance, retrospective warnings, and evaluation metadata.
- [ ] Keep Sorriso model coverage separate from historical imagery published for other locations.
- [ ] Test 404 unknown IDs, 200 domain `no_data`, 422 malformed requests, and valid partial coverage.
- [ ] Cache public evidence by full context and publication version. Do not let public keys contain user-specific records.
- [ ] Test that public reads work without an auth token or scientific service.

**Verification:** API integration tests validate responses against shared schemas and distinguish absence from provider failure. Hand over route readiness for M1.

### A2 — Implement personal persistence and database policies

**Files:** `supabase/migrations/**`, `supabase/tests/**`, API database plugin/repositories.

**Consumes:** Master-plan personal data model and shared write contracts.

**Produces:** `profiles`, `user_preferences`, `monitored_places`, `comparison_snapshots`, and `evidence_views` with effective ownership protection.

- [ ] Create migrations, indexes, grants, foreign keys, and row policies for the personal schema.
- [ ] Add unique constraints for one monitored place per user/area and one snapshot save per user/idempotency key.
- [ ] Preserve snapshots after deleting a monitored place; remove only the monitoring association and invalid last-place preference.
- [ ] Define immutable scientific snapshot fields and metadata-only update behavior.
- [ ] Build user-scoped database access; keep privileged clients outside ordinary request handlers.
- [ ] Add tests with two actual user-scoped test identities plus an anonymous client for select/insert/update/delete and cross-user references.
- [ ] Test account initialization retries and related-record deletion semantics.

**Verification:** Database tests pass as user-scoped clients; a privileged-key-only test run is insufficient. Record setup/reset commands and required test configuration.

### A3 — Implement verified identity, account, and monitored places

**Files:** API auth plugin, account module, places module.

**Consumes:** A2 persistence and Supabase identity configuration.

**Produces:** Verified request identity plus `/v1/me` and `/v1/places` operations.

- [ ] Verify bearer tokens and email-verification requirements server-side; derive the owner from the verified identity.
- [ ] Create account/profile defaults idempotently on first authenticated use.
- [ ] Implement account read/allowed updates and owned last-place selection.
- [ ] Implement monitored-place list/create/rename/delete against existing published areas.
- [ ] Return the existing place for a duplicate user/area save.
- [ ] Reject unknown public targets and any supplied reference to another user's place.
- [ ] Return 401 for invalid/expired identity and 404 for private resources not owned.
- [ ] Set private responses to `private, no-store` and keep tokens/private notes out of logs.
- [ ] Document auth callback/provider configuration the frontend needs without implementing frontend screens.

**Verification:** Auth/account/place API tests pass for anonymous, unverified, expired, owner, and other-user cases. Send M2 account route readiness to frontend.

### A4 — Implement scientific route boundaries in explicit fixture mode

**Files:** API analysis module, scientific client interface, fixture executor.

**Consumes:** A0 scientific contracts, A1 coverage, A3 identity.

**Produces:** Authenticated `/v1/yield-estimates` and `/v1/water-balance/scenarios` with the final public contract before live science is connected.

- [ ] Validate supported inputs from the catalog before invoking an executor; preserve IBGE IDs as strings.
- [ ] Implement an executor interface with separate fixture/live implementations and no scientific calculations in Node.
- [ ] Match fixture requests against exact supported example tuples. Return `422 fixture_not_available` for unmatched inputs.
- [ ] Return the scientific envelope with independent execution-origin/result-basis metadata and original upstream warnings.
- [ ] Bind successful results to the handle service from A5; if A5 is not ready, deliver the executor/route tests first and integrate handles before declaring analysis saving complete.
- [ ] Implement rate limits, request IDs, safe error mapping, and user-level concurrency boundaries.
- [ ] Test anonymous rejection before executor invocation, before-first-cutoff results, N10 partial evaluation, invalid input, and malformed upstream payloads.
- [ ] Ensure live failure never triggers fixture execution.

**Verification:** Analysis integration tests pass using a fake/fixture executor without Python or binaries. Frontend may now test against real Node fixture routes.

### A5 — Implement save handles and immutable comparison snapshots

**Files:** API comparisons module, result-handle store, snapshot repository, related contract tests.

**Consumes:** A2/A3 ownership, A1 examples, A4 analysis result shape.

**Produces:** Snapshot list/detail/save/metadata-edit/delete and the shared save-handle interface.

- [ ] Create a bounded result-handle store, bound to verified user and exact inputs/output, with the master-plan fifteen-minute default expiry.
- [ ] Resolve public example saves server-side by pinned example ID; resolve analysis saves through the current user's valid handle.
- [ ] Reject client-provided replacement outputs and cross-user result handles.
- [ ] Save complete original inputs/output/version/scope metadata, excluding the transient handle.
- [ ] Enforce idempotency in a transaction: same key and payload returns the existing snapshot; conflicting payload returns 409.
- [ ] Implement pagination, owned detail, metadata-only editing, and explicit deletion.
- [ ] Return 410 `result_expired` for an expired/lost unsaved handle and never silently recompute.
- [ ] Test double saves, cross-user links/handles, immutable outputs, newer publication versions, place removal, and Node restart semantics for unsaved handles.

**Verification:** Snapshot tests prove privacy, reproducibility, and idempotency. Hand over M2 save/reopen readiness to frontend.

### A6 — Implement reviewed-evidence state and returning-user metadata

**Files:** Evidence-view handlers/repository and account preferences integration.

**Consumes:** A1 publication context/version metadata and A3 identity.

**Produces:** `POST /v1/evidence-views`, `GET /v1/evidence-views?context_key=...`, and the versioned public/private metadata needed for factual frontend notices.

- [ ] Validate that the supplied context key and publication version refer to a real published context; timestamp reviews on the server.
- [ ] Persist only an explicit review request, not a background public GET.
- [ ] Implement exact-context baseline lookup through the authenticated GET route, returning the owned `EvidenceReview` or null. Export/validate this response in the shared package before frontend consumes it.
- [ ] Distinguish no baseline, unchanged publication, changed publication, and unavailable version metadata.
- [ ] Do not create agronomic warnings from a version change alone.
- [ ] Test cross-user review isolation, invalid versions, context mismatch, and idempotent repeated review requests.

**Verification:** The frontend can derive factual notices from shared metadata without an ad hoc backend payload or invented numeric change.

### A7 — Connect the independent scientific tool through Python

**Files:** `services/science-adapter/**`, live executor, capability/readiness configuration.

**Consumes:** The scientific handoff, trusted artifacts/manifests, precise input semantics, and A4 route boundaries.

**Produces:** Internal HTTP execution for products that pass their scientific publication gates.

- [ ] Pin source/dependencies and load trusted artifacts with manifest/hash checks at startup.
- [ ] Implement internal health, yield, and water routes with per-product readiness.
- [ ] Validate crops/coordinates/calendars/horizons before helper invocation; prevent the inspected invalid-crop table-indexing failure.
- [ ] Preserve scientific preprocessing/cutoff selection, date conventions, forcing requirements, evaluation, and null yield effect.
- [ ] Reproduce supplied cases in a fresh process with equivalent inputs/artifacts and documented numeric tolerances.
- [ ] Implement the configurable Node deadline and bounded Python capacity from the master plan; test timeout/busy behavior without unbounded work accumulation.
- [ ] Check weather issue metadata against the actual forcing issue; reject incomplete or inconsistent input series.
- [ ] Keep current-season yield unavailable until the scientific feature builder and reproducible real case exist.
- [ ] Connect the live executor and capability catalog; do not change public response shapes during this swap.
- [ ] Test malformed outputs, missing artifacts, independent product readiness, provider failure, and no live-to-fixture fallback.

**Verification:** Adapter and Node integration tests reproduce connected products. Missing scientific deliverables are reported explicitly and do not block public/personal API completion.

### A8 — Package, verify, and hand off the API front

**Files:** Backend deployment/startup configuration, API README, operational tests, optional telemetry contract notes.

**Consumes:** A0–A7 capabilities actually delivered and frontend integration observations.

**Produces:** A documented API candidate and factual readiness report.

- [ ] Serve the built frontend through Node in production after integration, keeping `/v1` errors distinct from SPA HTML fallback.
- [ ] Keep Python internal, credentials server-side, public health minimal, and private API responses non-cacheable.
- [ ] Document environment names, migration/reset commands, pinned revisions, fixture/live settings, deadlines, and provider requirements.
- [ ] Run contract/type/API/database/Python tests; run the full independent scientific suite only where its documented data dependencies are present.
- [ ] Provide a route-by-route readiness report and example curl/request files with placeholders rather than secrets.
- [ ] Coordinate the real public/auth/save/reopen smoke tests owned by frontend without editing its browser files.
- [ ] Preserve the IoT gate: durable event identity, rainfall intervals, calibration lineage, and owned device mapping must be agreed before live device history. Do not implement firmware or invent telemetry fixes in production records.
- [ ] Record actual verification output, external dependencies, gated capabilities, and known single-instance handle/rate-limit assumptions.

**Verification:** `pnpm --filter @gaiapus/contracts test`, `pnpm --filter @gaiapus/api test`, typecheck/build, database checks, and applicable Python checks pass. Report what is fixture-backed versus genuinely connected.

## 4. Start prompt for the API agent

```text
Implement the Gaiapus API front using:
Docs/2026-11-14-gaiapus-api-implementation-plan.md
Docs/2026-11-14-gaiapus-api-frontend-contract.md
Docs/2026-11-14-gaiapus-product-ux-and-implementation-plan.md

The user develops apps/web with another agent. Own apps/api,
packages/contracts, services/science-adapter, supabase, and shared root
tooling. Do not edit frontend UI or browser tests.

Start with A0/M0 and publish the contract baseline so frontend can proceed
with validated mocks. Then implement API tasks independently. Use fixtures
to finish the public/personal API without waiting for model binaries.
Keep scientific algorithms in the independent tool. Report exact route
readiness, contract changes, actual checks, and external dependencies.
```

## 5. Definition of done

- [ ] Canonical contracts/fixtures and the M0 source pin are reproducible.
- [ ] Public routes work without frontend, authentication, or Python.
- [ ] Private operations enforce identity/ownership and database policies.
- [ ] Saving and reopening preserves original scientific snapshots.
- [ ] Scientific routes have truthful fixture/live/capability behavior.
- [ ] The frontend agent can integrate using the documented contract without reading backend internals.
- [ ] Delivery evidence distinguishes verified code, fixtures, connected products, and external gates.
