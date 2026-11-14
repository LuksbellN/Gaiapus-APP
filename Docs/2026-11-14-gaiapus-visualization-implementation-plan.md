# Gaiapus Interactive Visualization Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task. Use subagents only when authorized by the user or applicable instructions. Track work with the checkboxes below. Read this entire document before changing code. Saving this plan does not itself authorize implementation, deployment, or external publication.

**Goal:** Build a realistic Earth-to-field interactive map and synchronized visualizations that make supplied environmental evidence, agricultural trade-offs, and uncertainty understandable.

**Architecture:** A React/TypeScript frontend uses MapLibre for geographic exploration and coordinated analysis views. A FastAPI/Pydantic application backend validates requests, authorizes private resources, and adapts teammates' storage, analysis, and simulation interfaces into stable UI contracts. Data storage infrastructure, AI analysis, and the physical water-balance engine are owned by other teammates.

**Tech stack:** React, TypeScript, MapLibre, FastAPI, Pydantic. Reuse the actual target repository's package manager, chart components, and test tooling. If no chart implementation exists, implement the initial line/bar charts with React SVG and an HTML data-table alternative; do not introduce a chart library just for the initial slice.

**Spec:** The agreed Earth-to-field plan reproduced in this document, incorporating the user's latest responsibility split and supplied challenge-video transcript. Read [the existing architecture](gaiapus-25-arquitetura-front-back.md) for geographic and API context and [the telemetry protocol](protocolo-dados.md) for sensor semantics. The earlier [experience proposal](2026-11-14-gaiapus-experience-proposal.md) supplies optional background and edge cases; it is not the implementation scope authority.

## 1. Authority, scope, and defaults

### Confirmed decisions

- Our team owns the frontend, interactive map, dashboards, application backend, validation, authorization integration, and adapters for supplied data and results.
- Other teammates own data storage and AI analysis. They also supply a runnable or remotely callable water-balance engine. Our backend integrates it; we do not implement its scientific calculations.
- The challenge-video transcript explicitly supports an interactive map or visualization as a deliverable. Do not turn this work into a requirement to build a new agricultural recommendation engine.
- Preserve the original screenshot's dominant Earth, dark atmosphere, and contextual information panel; replace pixel art with realistic imagery and a readable contemporary interface.
- Visitors can explore public evidence and published examples without login. Logged-in users can access authorized fields, device timelines, and saved comparisons.
- Use one connected map experience with **Explore**, **Timeline**, and **Compare** views. Preserve context when switching views.
- Start with Brazilian agricultural coverage, country → state → municipality → published field navigation, and one thematic layer at a time. Other countries remain geographically explorable without implying agricultural coverage.
- Use published field boundaries initially. Custom boundary drawing, hardware/firmware, model training, new agronomic rules, and decorative crop-growth animation are outside this implementation.
- Treat price, soil benefits, recommendations, and yield as supplied evidence or explicit assumptions. Never fabricate unavailable values or scientific conclusions.
- Do not let time pressure determine scope; build and verify complete vertical slices in the dependency order below.

### Conflict resolution

The latest ownership and scope decisions here supersede conflicting parts of the older experience proposal. In particular, do not implement its proposed rotation engine, ingestion pipeline, calibration engine, or storage infrastructure. In the original architecture, backend responsibilities for providers, models, and water balance mean **integration with the owning team's interfaces** for this implementation.

The backend may serve or execute an approved supplied artifact, but it does not retrain it or change its scientific logic. Persistent fields, scenarios, memberships, and telemetry must use the storage owner's integration contract. Do not introduce a competing production database.

### Current workspace facts and execution prerequisite

At plan creation this workspace contains planning documents, not the referenced `gaiapus-mvp/`, model artifacts, datasets, or application source. No implementation or data availability has been verified.

- [ ] Locate the intended application checkout and read its `AGENTS.md`, manifests, existing UI, API, and tests before implementation.
- [ ] Reuse the referenced React/MapLibre prototype if available; do not create a parallel application by default.
- [ ] If no target checkout exists, obtain its location or explicit authorization to scaffold one. Continue contract and fixture preparation only in the authorized workspace.
- [ ] Record actual run/test commands in the target repository's development documentation after inspecting its tooling; commands in this plan must not be reported as already executed.

## 2. Product behavior and integration contracts

### Experience specification

**Public entrance:** A realistic, navigable globe with location search, a named published example, and sign-in. No forced camera intro or geolocation prompt. Selecting a place opens contextual evidence. Never display a single local temperature as the condition of an entire country.

**Returning grower:** Open the last authorized field directly. Keep “Explore Earth” available. Sign-in preserves the public selection and draft, but saving requires an intentional choice of authorized destination.

**Desktop:** Map remains central with a contextual side panel. **Mobile:** Use a compact map and full-width analysis sheet with reachable Explore, Timeline, and Compare controls. Validate at 1366 × 768 and 390 × 844. Do not shrink text to reproduce the screenshot's density.

**Visual system:** Midnight navy canvas, realistic basemap imagery, restrained atmosphere, neutral sans-serif type, thin borders, and limited panel nesting. Cyan identifies selection; green/amber/red communicate labeled analytical states only when supported. Scenario identity also uses text and line patterns. Maintain visible keyboard focus and sufficient contrast. Honor reduced motion; camera movement must be interruptible.

**Explore:** Enable only published layers. Rainfall, vegetation, soil moisture, heat, and imagery are capability candidates, not guaranteed data products. Show active-layer units, source, date/period, spatial support, and coverage. Field boundaries and authorized device markers can overlay the active theme.

**Timeline:** Coordinate map dates, dated imagery, linked charts, and selected sensor observations. Preserve each source's acquisition times and intervals. Missing days remain gaps; never reuse an older image without showing its actual date. Support play/pause, direct date selection, keyboard stepping, and an accessible data table.

**Compare:** Display supplied baseline/alternative results with shared axes, consistent geographic context, explicit assumptions, reasons, risks, and missing information. Support synchronized side-by-side maps and time selection when comparable spatial outputs exist. If results are scalar or daily series only, compare those directly without inventing a map layer.

**Simulation:** An explicit Run comparison action sends supported inputs to the backend adapter for the supplied engine. Previous results remain labeled with their original inputs while changes are pending. Daily water reserve, rainfall, deficit, and stress drive synchronized charts and a schematic soil profile. Any depth depiction must match available model output; do not invent depth-resolved water values from an aggregate reserve.

**Benefits:** Show economic results with their price, yield, costs, units, dates, scope, and accounting assumptions. Preserve municipal yield scope. Soil benefits without evaluated numerical outputs are sourced qualitative statements or “not evaluated.” Water-balance differences alone do not establish yield or profit improvements.

### Minimum interfaces

Retain the existing proposed public routes and meanings:

| Route | Responsibility |
|---|---|
| `GET /v1/geography` | Hierarchy, search, stable IDs, bounding boxes and geometry references |
| `GET /v1/coverage` | Published products, dates, cultures, supported cutoffs/horizons and unavailable reasons |
| `GET /v1/observations` | Dated observations, units, quality, source references and imagery references |
| `POST /v1/yield-estimates` | Integrate supplied estimate/artifact with declared scope and evaluation metadata |
| `POST /v1/water-balance/scenarios` | Validate supported inputs and invoke the supplied engine |
| `GET /health` | Application status without exposing private operational details |

Define storage-backed resource operations for authorized fields, device history, and saved comparisons through the storage owner's existing interface. Reuse those resource contracts rather than inventing a second persistence API. Keep their exact service calls inside adapters; never couple frontend components to storage SDKs or provider payloads.

All decision-relevant responses must retain area identity, unit, time support, spatial scope, provenance, quality, coverage and version. Distinguish observation time, arrival time, forecast issue time, forecast validity and result generation time. Keep transport timestamps in UTC and format display dates with the location's timezone.

Use the documented 404 for unknown IDs, 422 for invalid inputs, 503 for transient unavailability, and an explicit empty/no-data response for a valid uncovered area. Add normal authentication/authorization responses for private resources. Partial coverage must not erase unrelated valid products.

Represent observation, estimate, forecast, hypothetical scenario, and demonstration fixture as explicit result bases. Use a visible fixture/replay badge. Do not describe cached or replayed evidence as live.

### Internal boundaries to preserve

Organize by responsibility, mapping these names onto existing repository conventions before adding files:

| Unit | Responsibility |
|---|---|
| Frontend API adapter | Translate application responses into typed view data; no scientific calculations |
| Exploration state | Selection, active layer, requested date/period, view, scenario and request context |
| Map controller | Camera, geography, sources/layers, selection and capability fallback |
| Analysis views | Evidence panel, timeline, charts, comparison and input forms |
| Backend storage adapter | Authorized access to externally owned persistence |
| Backend analysis adapter | Supplied AI outputs/artifacts, limitations and failures |
| Backend simulation adapter | Supplied engine invocation and supported execution capabilities |
| Versioned fixtures | Reproducible public example, integration payloads and failure cases |

An execution agent must inspect the existing source before choosing exact file paths; the application tree is absent here. Keep these boundaries even if existing filenames differ.

## 3. Ordered implementation tasks

For each task, implement in small changes, run its focused checks, and inspect the resulting behavior before moving on. Use existing test infrastructure. Add tests for meaningful contracts, state transitions and failure modes; avoid tests that merely duplicate markup or implementation details. Do not commit, publish, or deploy unless authorized for that execution session.

### Task 1 — Establish contracts and a reproducible example

**Consumes:** Existing architecture, storage/analysis/engine interfaces from their owners. **Produces:** Backend response models, frontend types/adapters and versioned fixtures used by every later task.

- [ ] Inspect supplied capabilities and distinguish verified products from planned ones. Record the chosen public demo region only after its data package is confirmed.
- [ ] Create consistent fixture responses for geography, coverage, dated imagery/observations, supplied analysis and daily simulation output. Supply source/date/scope metadata and distinguish synthetic content from cached real observations.
- [ ] Add failure fixtures for uncovered areas, missing observations, stale products and unavailable analysis/engine.
- [ ] Add contract checks proving frontend and backend agree on IDs, units, missingness, provenance, result basis and supported horizons.
- [ ] Verify a valid uncovered region differs from an unknown ID and from a temporary provider error. No downstream task may rely on invented capability.

### Task 2 — Deliver the public Earth-to-region slice

**Consumes:** Task 1 geography and coverage contracts. **Produces:** Working map shell and shared exploration state.

- [ ] Build the realistic dark globe shell with search, named example, sign-in entry and contextual panel.
- [ ] Connect map clicks, search, breadcrumbs and accessible lists to the same country/state/municipality/published-field selection.
- [ ] Load geography on demand, fit the camera to selection, and clear child selections when their parent changes.
- [ ] Persist public selection/layer/period in the URL without private secrets. Browser back and refresh restore public context.
- [ ] Guard against obsolete responses after rapid selection changes. Verify that a late response for location A cannot overwrite location B.
- [ ] Provide coverage explanations and useful search/list analysis when WebGL is unavailable. Verify keyboard and reduced-motion navigation.

### Task 3 — Deliver evidence layers and synchronized history

**Consumes:** Task 2 selection; Task 1 observations and imagery. **Produces:** Explore and Timeline views with consistent spatial/temporal context.

- [ ] Render one supported thematic layer at a time and expose its legend, source, unit, observation period and spatial support.
- [ ] Coordinate map selection with linked rainfall/vegetation charts and the evidence panel.
- [ ] Implement shared date selection, play/pause, keyboard stepping and table alternatives. Charts use the same selected time context while retaining source-specific sampling intervals.
- [ ] Display cloudy/invalid imagery, missing observations, partial days and outdated products honestly; zero precipitation is a valid value.
- [ ] Verify a requested date without imagery does not imply that an older displayed acquisition belongs to the requested date.
- [ ] Verify zooming into a field does not relabel regional data as field-resolution evidence. Confirm local-day display around UTC midnight and season boundaries.

### Task 4 — Integrate supplied analysis and interactive scenarios

**Consumes:** Tasks 1–3; teammates' analysis and simulation interfaces. **Produces:** Compare view, simulation forms and reproducible result inspection.

- [ ] Expose only supported crops, inputs, cutoffs and horizons from the capability contract. Keep yield observation cutoffs separate from days simulated ahead.
- [ ] Display supplied planting/rotation options, explanations, evidence gaps and qualified benefits. Unsupported products remain unavailable with a reason.
- [ ] Implement baseline/alternative comparison with shared chart scales and labeled differences. Synchronize side-by-side maps only for compatible spatial results.
- [ ] Invoke the supplied engine through the backend adapter; do not reproduce the physical model in the UI or invent output during engine failure.
- [ ] Drive charts, stress inspection and the schematic soil profile from the same selected daily result. Input edits mark the displayed result as belonging to the previous run.
- [ ] Preserve draft inputs during failure/retry. Use the supplied engine's execution mode: direct response for synchronous capability, explicit run status for asynchronous capability. Normalize both behind the application adapter.
- [ ] Verify invalid inputs, unsupported horizons, late results, engine failure and mismatched comparison periods. No stale run may replace the currently selected scenario.
- [ ] Verify economic units/assumptions, negative results and unavailable benefits. Never derive a profit or yield increase solely from a water curve.

### Task 5 — Add authorized workspaces, saved comparisons and IoT history

**Consumes:** Earlier views; storage owner's authentication, field, membership, device and saved-result interfaces. **Produces:** Logged-in field experience without a parallel data store.

- [ ] Restore the last authorized field for returning users and preserve public exploration drafts through sign-in.
- [ ] Save/reopen comparisons using the storage owner's contract, retaining original inputs, result references and data/model versions. Do not silently recalculate a saved result with newer evidence.
- [ ] Integrate authorized device timelines with separate 15 cm and 40 cm series, observation versus arrival time, calibration status, quality and freshness.
- [ ] Render uncalibrated moisture as raw data or unavailable calibrated values; do not display oscillator counts as moisture percentages.
- [ ] Treat the packet-wide sensor-error flag conservatively; it cannot identify which depth failed. Flag ambiguous data rather than isolating a sensor without evidence.
- [ ] Require durable event identity and rainfall-interval semantics from the data owner. The current uint16 sequence can wrap/reset, and packet-level rain must not be summed once per depth. Do not solve these ambiguities by silently changing historical records in our API.
- [ ] Verify private-field/run/device access server-side, private cache isolation, logout, workspace switching and expired-session recovery.
- [ ] Verify stale, offline and never-connected device states. Public/satellite exploration remains useful without an estaca.

### Task 6 — Visual finish, integration and public walkthrough

**Consumes:** Working vertical slices. **Produces:** A verified user experience and a factual handoff report.

- [ ] Compare rendered screens with the supplied visual direction: dominant realistic Earth, readable contextual panel, restrained effects and clear primary action. Correct visual drift in a real browser.
- [ ] Check 1366 × 768 desktop and 390 × 844 mobile layouts, keyboard navigation, screen-reader structure, reduced motion, chart alternatives, readable units and focus visibility.
- [ ] Check loading, no coverage, partial data, provider/engine failure and offline/cached evidence states without blanking unrelated valid content.
- [ ] Connect real supplied services through the same tested adapters. Keep any still-unconnected fixture products visibly labeled and do not count them as live integration.
- [ ] Rehearse the public story: Earth → supported place → dated NASA evidence → local context → supplied comparison → scenario timeline → saved decision where authorized.
- [ ] Keep the public example inspectable without credentials. Exclude private field geometry/device details from public demonstration data unless explicitly authorized.
- [ ] Record actual build/test commands, browser checks, connected services, remaining dependencies and known limitations. Report implemented, fixture-backed and blocked capabilities separately.

## 4. Review focus and release acceptance

The following five failure classes must have explicit verification in their owning tasks:

1. **Selection races:** Results and map overlays always belong to the current location/scenario — Tasks 2 and 4.
2. **Time and scale mismatch:** Missing dates, stale imagery, UTC boundaries and coarse source support remain visible — Task 3.
3. **Unsupported scientific conclusions:** Assumptions, cutoffs, benefits and water-model outputs never become fabricated predictions — Task 4.
4. **Telemetry ambiguity:** Calibration, shared error flags, repeated packets and rainfall duplication are not hidden by visualization — Task 5.
5. **Private/public state leakage:** Authentication transitions, caches, saved results and public examples respect authorization — Tasks 5 and 6.

Acceptance requires a visitor to explore a published example without login; a user to explain one supplied trade-off and find its source; all synchronized views to show the selected place/time/scenario consistently; an authorized grower to reopen a saved comparison with its original versions; and unavailable or uncertain evidence to remain distinguishable from favorable results.

No implementation, tests, provider connections, scientific validation or deployment are claimed by this plan. Missing teammate interfaces are dependencies to report explicitly, not permission to replace the owning team's work with invented production behavior.
