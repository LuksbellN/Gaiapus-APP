---
title: Gaiapus Frontend Implementation Plan
aliases:
  - Gaiapus Frontend Front
created: 2026-11-14
status: planned
workstream: frontend
tags:
  - gaiapus
  - frontend
  - ux
  - implementation-plan
---

# Gaiapus Frontend Implementation Plan

> **For the frontend agent:** The user will work directly with you, giving design and UX suggestions while another agent builds the API. Own the frontend and its browser tests. Develop against shared validated fixtures and HTTP mocks; do not wait for the real API, Supabase database, or scientific artifacts to finish the screens and interactions. Use `superpowers:executing-plans` when implementing the tasks. This document does not claim implementation is complete.

**Goal:** Build the public Earth-to-evidence journey and a polished personal workspace that the user can shape interactively, then connect the same interface to the API without rewriting components.

**Architecture:** React/TypeScript/Vite renders a single MapLibre-based experience, coordinated history/comparison views, and personal account screens. One typed API client uses either development HTTP mocks or the real Node API. Supabase is used in the browser for identity flows only; application data goes through Node.

**Tech stack:** React, TypeScript, Vite, MapLibre GL JS, shared `@gaiapus/contracts`, MSW for development/test mocks, SVG charts with HTML tables, Supabase Auth SDK, Vitest/React Testing Library, and Playwright.

**Spec:** [[2026-11-14-gaiapus-product-ux-and-implementation-plan]] for the product/visual direction and [[2026-11-14-gaiapus-api-frontend-contract]] for routes, payloads, ownership, and fixtures.

> [!important] Current visual iteration
> Follow [[2026-11-14-gaiapus-frontend-ux-decisions]] for the latest user steering. The user rejected V4 and explicitly requested implementation like the original illustrated reference: left navigation, colorful illustrated Earth, right evidence/crop/regional panels, and a daily timeline. The first public frontend slice now exists in `apps/web`; previous generated V1–V4 candidates do not override the original reference. Product truth and shared API/scientific contracts remain unchanged.

## First-slice implementation status — 2026-11-14

| Task group | Status |
|---|---|
| F0 | Typed fetch client, canonical-fixture MSW transport, initial unit checks, and production mock guard implemented. Mock auth and exhaustive scenario controls remain pending. |
| F1 | Original illustrated visual direction implemented; local fonts, real logo, generated decorative assets, desktop/mobile layout and screenshots are present. |
| F2 | Published-place search, URL/context restoration, race guards and a lazy local-geometry MapLibre view implemented. Full geographic hierarchy/layer integration remains pending. |
| F3 | Water-example daily timeline/table implemented. Full historical observation/imagery synchronization remains pending. |
| F4 | Published water and retrospective crop-result inspection, source details and null-cutoff explanation implemented. Full tour/remaining comparison cases remain pending. |
| F5–F7 | Personal/auth/save/custom-run workflows remain pending; the sign-in action explains that status. |
| F8–F9 | Initial desktop/mobile mocked-browser verification performed; real API/account integration and full accessibility/performance work remain pending. |

Use `apps/web/README.md` for run/check commands and dependency-lockfile handoff. These statuses are partial progress, not checked completion of the full tasks below.

## 1. Scope and working relationship with the user

### Owned paths

- `apps/web/**`, including package manifest, Vite configuration, components, routes, styles, state, API client, auth client, UI tests, and HTTP mocks.
- `tests/e2e/**`, including public, mocked-account, and real-API browser scenarios.
- This frontend plan and a UX decision log at `Docs/2026-11-14-gaiapus-frontend-ux-decisions.md`, created when implementation starts.

The API agent owns shared root configuration/lockfile integration, `packages/contracts`, `apps/api`, `supabase`, and `services/science-adapter`. Do not bypass its API or duplicate its schema/database work inside the frontend.

### How to work with user suggestions

1. Deliver a working screen or interaction as early as possible, so feedback refers to visible behavior.
2. Treat user feedback as steering the current screen/workflow unless it explicitly replaces the product direction.
3. Record material changes as: request, chosen UI behavior, rationale, affected screen, and whether the API contract changes.
4. Implement layout, hierarchy, spacing, motion, and microcopy refinements within the frontend without waiting for backend permission.
5. Raise a contract change only if the request needs new data, writable scientific inputs, new routes, changed semantics, or different authorization.
6. Keep iterative changes inside the agreed scientific meaning. A prettier presentation must not turn an assumption into an observation or a municipal estimate into a field prediction.

Use the relevant research-first frontend/design skills during implementation, starting from the supplied image and master-plan reference lock. This plan split does not authorize a new unrelated visual direction.

## 2. Global constraints and review focus

### Global constraints

- Keep the realistic Earth, dark atmosphere, and contextual information panel from the agreed direction.
- Use Portuguese product copy, readable text, restrained panels, and one clear main action per state.
- Visitors can inspect evidence and published comparisons without login. Accounts add monitored places, supported custom requests, and saved history.
- Start with personal accounts and published areas; do not add boundary drawing, farm invitations, or a recommendation engine.
- Use shared contracts and one typed API boundary; components do not depend on scientific files or provider-specific payloads.
- Scientific `fixture` versus `live` and retrospective versus projected meaning remain visible and independent of frontend mock transport.
- Preserve source dates, units, missing values, actual cutoffs, evaluated leads, spatial scope, and null yield effect.
- Keep public navigation in the URL and private drafts/notes out of public URLs.
- Clear prior user state on logout/account change.
- Desktop acceptance is 1366 x 768; mobile acceptance is 390 x 844. Include keyboard, reduced-motion, and chart-table paths.

### Review focus

1. A delayed request or map update shows the wrong place/result — F0, F2, F7.
2. First-time or returning accounts have empty/confusing heroes — F5, F6.
3. Polished charts hide retrospective scope, data gaps, or experimental days — F3, F4.
4. Auth transitions or cached results expose the previous account — F5, F6, F9.
5. Mock-only behavior cannot be replaced by the real API without component rewrites — F0, F9.

## 3. Development setup and mock independence

### M0 dependency

The API agent publishes a small foundation containing the workspace and `@gaiapus/contracts@0.1.0`. Consume that revision; do not create a second independent application root or competing contract package.

Before M0, visual research and user discussion can progress from the existing documents and screenshot. After M0, all frontend tasks can progress against mocks without waiting for endpoint implementation or scientific artifacts.

### Proposed frontend units

```text
apps/web/src/
  app/                       router, providers, page shell
  lib/api/                   typed fetch client and normalized errors
  lib/auth/                  Supabase/mock identity adapters
  mocks/                     MSW handlers and development scenario controls
  features/explore/          geography context, search, coverage, MapLibre
  features/timeline/         source-aware dates, history, charts, tables
  features/compare/          result inspection, custom forms, save/library
  features/workspace/        onboarding, monitored places, personal home
  components/                accessible shared primitives
  styles/                    tokens, global layout, responsive rules
```

Use `VITE_APP_API_MODE=mock|http` and a single API base `/v1`. Build the same pages with the same API client in both modes. Prefer MSW request handlers over fixture objects imported directly into screen components.

Mock identity is a development/test adapter, not a backend security mechanism. Keep it visibly labeled and blocked from production builds. Real Node must reject fake tokens even if the browser thinks a mock user is signed in.

Mock handlers reproduce the shared schemas, 204 empty responses, auth/error statuses, idempotent saves, and delayed-response scenarios. Their state is disposable and never proof of working account persistence.

## 4. Frontend tasks

Each task produces visible behavior the user can inspect. Add focused tests for state transitions and important interactions; avoid tests that merely mirror static markup. Commands below are scripts to establish during implementation, not checks already run.

### F0 — Build the typed API boundary and development scenarios

**Files:** `apps/web/package.json`, Vite configuration, `src/lib/api/**`, `src/lib/auth/**`, `src/mocks/**`.

**Consumes:** M0 shared types, schemas, canonical fixtures, routes, and reason codes.

**Produces:** A running Vite app with interchangeable mock/HTTP transport and controllable UI states.

- [ ] Create `apps/web` in the existing workspace, consuming `@gaiapus/contracts`; request root-script/lockfile integration from the API owner.
- [ ] Implement one typed fetch client with bearer-token support, `AbortSignal`, context keys, normalized errors, and correct 204 handling.
- [ ] Implement an identity adapter boundary for user/session state. Use Supabase for HTTP mode and a development-only fake identity adapter for mock scenarios.
- [ ] Build MSW handlers from the shared response types and fixture exports.
- [ ] Provide developer-only controls for empty/new/returning accounts, no coverage, missing imagery, timeouts, invalid inputs, expired sessions/handles, and A/B response races.
- [ ] Check mock responses against the canonical schemas in tests rather than maintaining a second manually defined wire model.
- [ ] Test missing/expired token behavior, response errors, cancellation, 204 responses, and no stale-context acceptance.
- [ ] Verify production builds reject browser mock mode/simulated authentication.

**Verification:** `pnpm --filter @gaiapus/web test -- api mocks` and frontend typecheck pass. Changing transport mode does not require editing a page component.

### F1 — Establish the visual system and public hero with the user

**Files:** `src/styles/**`, app shell, public entrance, shared UI primitives.

**Consumes:** Master-plan visual tokens/reference lock and the user's active suggestions.

**Produces:** A responsive first screen with the agreed Earth/context composition and a clear public entry action.

- [ ] Inspect the supplied image and usable prototype assets. Preserve realistic Earth, navy canvas, readable contemporary type, and a restrained contextual panel.
- [ ] Define tokens, spacing, typography, states, focus styles, and motion defaults before styling individual screens.
- [ ] Render the hero with search, named example entry, and secondary sign-in. No forced animation or automatic geolocation prompt.
- [ ] Make the example chooser reachable in one action and a named example within two.
- [ ] Reserve stable map/imagery space and keep the main action visible at laptop height.
- [ ] Show the first usable screen to the user and implement their visual suggestions in focused iterations.
- [ ] Record adopted decisions in the UX log; avoid adding metric cards just to fill empty space.
- [ ] Check 1366 x 768, 390 x 844, focus visibility, and reduced-motion behavior in a real browser.

**Verification:** The public entry communicates what users can explore and works before login. Record browser/viewport checks rather than claiming a visual result from code alone.

### F2 — Implement geographic exploration and public URL state

**Files:** `features/explore/**`, public route state, MapLibre controller.

**Consumes:** F0 client and shared geography/coverage fixtures; F1 shell.

**Produces:** Country/state/municipality/published-field navigation with coherent map/panel selection.

- [ ] Implement canonical `ExplorationContext` and reducer/controller from the master plan.
- [ ] Connect search, breadcrumb, list selection, and map selection to the same state.
- [ ] Load detailed boundaries on demand; keep one active thematic layer with source-aware overlays.
- [ ] Persist public area/view/layer/period/date/example in the URL and support Back/Forward/refresh.
- [ ] Clear child selections when a parent changes; invalidate previous-place evidence immediately.
- [ ] Guard against late data and map-source updates after a rapid location change.
- [ ] Implement no-coverage, unknown-ID, duplicate-name, denied-geolocation, and tile/WebGL failure states.
- [ ] Keep search/list and evidence navigation available without the map.

**Verification:** `pnpm --filter @gaiapus/web test -- explore` passes; browser checks prove map/list equivalence and A-to-B race safety.

### F3 — Implement source-aware evidence and history

**Files:** `features/timeline/**`, evidence panel, SVG charts and table views.

**Consumes:** F2 context and shared observation/imagery fixtures.

**Produces:** Dated imagery, rainfall/vegetation history, and coordinated temporal inspection.

- [ ] Render one active product/layer with unit, acquisition/period, source, and spatial support.
- [ ] Build SVG series with genuine gaps and a data-table alternative.
- [ ] Implement play/pause, direct date selection, keyboard stepping, and a shared chart cursor.
- [ ] Preserve each source's sampling interval and actual image acquisition date.
- [ ] Show no image on a missing requested acquisition; offer explicit nearest-available-date navigation.
- [ ] Differentiate zero rain, missing observation, invalid/cloudy scene, partial day, and stale product.
- [ ] Keep UTC date-only buckets intact when formatting timestamps locally.
- [ ] Stop playback on manual selection, context changes, and a hidden tab; use reduced-motion alternatives.

**Verification:** Timeline tests prove gap/zero/timezone behavior. The user can inspect evidence using touch, mouse, keyboard, or table without changing its scientific meaning.

### F4 — Deliver public scientific examples and comparison explanation

**Files:** `features/compare/**`, evidence drawer, public tour/example routes.

**Consumes:** F0/F3 infrastructure and the four pinned upstream examples.

**Produces:** A complete useful public result/comparison experience with no custom scientific execution.

- [ ] Render yield separately from water: municipality, crop, harvest, requested day, actual cutoff, retrospective availability, and aggregate evaluation.
- [ ] Render the day-20 null estimate as an explanation of the first supported cutoff, not an empty/error metric.
- [ ] Render water versus climatological reference on shared axes with an accurate comparison label.
- [ ] Synchronize the selected model day across reserve/rainfall charts, stress strip, text summary, and aggregate-reserve schematic.
- [ ] Default the N10 visible evaluated scope to seven days; preserve the ten-day payload and expose an explicit experimental-extension toggle.
- [ ] Keep “What differs?”, “What explains it?”, and “What remains unknown?” beside the result; provide full provenance in the evidence drawer.
- [ ] Preserve scope when showing a field map: a municipal estimate stays municipal.
- [ ] Make tour location changes explicit when moving between Sorriso analyses and imagery published elsewhere.
- [ ] Test actual cutoff lists, missing reference dates, incompatible comparison periods, evaluation boundaries, and late example responses.
- [ ] Add contextual sign-in actions for saving and custom analysis, without gating source inspection.

**Verification:** A visitor explains one supplied comparison, finds its source, and identifies the experimental portion without credentials. The public story is reviewable by the user before account/API completion.

### F5 — Implement sign-in and first-use onboarding

**Files:** Auth routes/screens, `lib/auth/**`, onboarding and recovery UI.

**Consumes:** F0 identity boundary, shared account/place contracts, and public return context.

**Produces:** Complete auth/onboarding screens against mocks, replaceable by real Supabase identity without data-access rewrites.

- [ ] Implement sign-up, verification state, sign-in, sign-out, password recovery, and allowed callback routes.
- [ ] Preserve public place/example selection through sign-in; require an explicit save after identity is established.
- [ ] Support expired links and unrecoverable draft context with clear recovery instead of guessed restoration.
- [ ] Implement personal onboarding: save a municipality/published field, optionally label it, and optionally open/save an analysis.
- [ ] Do not require a device, measured soil, private geometry, or a crop-history questionnaire to use the workspace.
- [ ] Separate unverified account, signed-out, expired-session, and auth-service failure states.
- [ ] Clear private caches/drafts/results on logout or a different user's session.
- [ ] Test cross-account browser-state isolation and a paused draft interrupted by authentication expiry.

**Verification:** Mocked auth/onboarding browser scenarios pass. State remains private, and first useful setup fits within three screens. Real identity wiring is checked again in F9.

### F6 — Build the personal home and monitored-place workflow

**Files:** `features/workspace/**`, place picker/list, evidence-review interactions.

**Consumes:** Shared place/account/review contracts, F3 evidence views, F5 identity.

**Produces:** Empty, first-review, returning, no-change, and new-evidence personal hero states.

- [ ] Restore the last available monitored place; handle missing/deleted place references by showing a useful list or onboarding state.
- [ ] Implement place add/rename/remove and explain that monitoring a public area does not establish ownership.
- [ ] Show a context-appropriate primary action: review new evidence, continue a saved comparison, or inspect history.
- [ ] Display at most three factual publication notices using the actual prior reviewed baseline.
- [ ] Keep no baseline, unchanged version, changed version, and unavailable metadata as distinct states.
- [ ] Record review only after explicit evidence inspection, not a prefetch.
- [ ] Keep the workspace useful with no device, no live scientific product, or no saved comparison.
- [ ] Iterate the density/hierarchy with the user without changing shared field meanings.

**Verification:** Workspace tests cover empty/deleted/no-change/error states. Returning users reach a saved comparison in at most two actions.

### F7 — Implement supported custom analysis and saved comparisons

**Files:** Analysis forms, compare state, snapshot save/detail/library UI.

**Consumes:** F4 result views, F5 identity, shared capabilities/analysis/save contracts.

**Produces:** Capability-driven forms and a reproducible personal comparison workflow, fully testable through mocks.

- [ ] Build controls only from supported capability metadata. Keep fixed soil assumptions read-only; do not expose decorative rainfall/soil sliders.
- [ ] Keep yield cutoff context separate from water days-ahead horizon.
- [ ] Implement an explicit run action; edits create a dirty draft while the old result remains labeled with its original inputs.
- [ ] Retain inputs during invalid input, busy, rate-limit, timeout, and session-expiry states. Do not retry scientific runs automatically.
- [ ] Reject stale result/context updates after input or place changes.
- [ ] Save public examples by example ID and fresh analyses by the user-bound save handle; never submit a forged output payload.
- [ ] Use a stable idempotency key for one save attempt/retry cycle and distinguish 409 conflicts from 410 expired handles.
- [ ] Implement saved list/detail, title/notes editing, deliberate deletion, and place-removal behavior.
- [ ] Restore original inputs/results/versions on reopen; **Run with newer evidence** starts a separate request.
- [ ] Test duplicate clicks, expired handles, mismatched context, newer source versions, negative/unavailable comparisons, and account switching during a run.

**Verification:** Analysis/save/library tests pass against shared handlers. No form edit or saved-result reopen silently changes the scientific output.

### F8 — Polish the responsive and accessible experience

**Files:** Frontend components/styles and UI/browser tests.

**Consumes:** F1–F7 working screens and user feedback.

**Produces:** A coherent visual experience with verified keyboard, touch, and failure paths.

- [ ] Compare rendered screens with the reference lock and correct drift in map dominance, readable type, spacing, and contextual hierarchy.
- [ ] Validate laptop/phone sizes and browser zoom; do not shrink labels to force screenshot density.
- [ ] Use one mobile map plus analysis sheet; show dual desktop maps only for genuinely compatible spatial outputs.
- [ ] Check labels, focus visibility/order/restoration, semantic landmarks, contrast, announcements, and table alternatives.
- [ ] Use patterned lines/text as well as color for scenarios and evaluation boundaries.
- [ ] Verify interrupted/reduced camera motion, hidden-tab playback pause, and no forced introduction.
- [ ] Verify loading/no-coverage/partial/stale/offline/provider-failure states preserve unrelated useful content.
- [ ] Inspect network-throttled loading, layout stability, and late WebGL context loss.
- [ ] Incorporate the user's final UX suggestions and record material decisions.

**Verification:** Record actual viewport/browser findings and pass the public/personal mocked browser suite. Mocked tests are labeled as such.

### F9 — Connect the real API and run integration acceptance

**Files:** HTTP configuration, real Supabase identity adapter, `tests/e2e/**`, frontend README.

**Consumes:** API milestones M1/M2 and any genuinely ready M3 scientific products.

**Produces:** The same frontend running against Node, real account persistence, and supported scientific capabilities.

- [ ] Switch `VITE_APP_API_MODE` from mock to HTTP; remove no UI state merely because its real backend case is inconvenient.
- [ ] Configure Supabase Auth identity and allowed redirects. Keep application database calls behind Node.
- [ ] Verify public examples and errors still match shared schemas; report contract mismatches to the API owner rather than patching components around undocumented payloads.
- [ ] Run actual sign-in, save-place, save-comparison, logout, sign-in, and reopen flows with dedicated test accounts.
- [ ] Verify expired sessions, another user's private UUID, cache clearing, and deletion associations against the real API.
- [ ] Check dirty/pending, partial-horizon, busy/timeout, and unsupported-current-season behavior against the connected capabilities.
- [ ] Rehearse the public/evaluator story and the returning-grower story without coaching.
- [ ] Test the production bundle with Node static serving and valid SPA routing.
- [ ] Document frontend commands, mock controls, environment names, actual verification, and products still fixture-backed or gated.

**Verification:** Typecheck/build, component tests, and applicable real-API Playwright scenarios pass. If the scientific artifacts are unavailable, public examples and personal persistence can still be delivered truthfully; do not label them live science.

## 5. Suggested feedback checkpoints with the user

| Checkpoint | Show the user | Main feedback |
|---|---|---|
| After F1 | Public hero on laptop and phone | Composition, tone, main action, visual direction |
| After F2–F3 | Search → place → dated evidence | Findability, map behavior, information density |
| After F4 | Public comparison and source drawer | Understandability and the memorable synchronized interaction |
| After F5–F6 | First login and returning home | Setup friction, next action, daily usefulness |
| After F7 | Custom request and save/reopen | Form clarity, assumptions, recovery, trust |
| After F8–F9 | Full real-API walkthrough | Final polish and actual integration behavior |

These are opportunities for feedback, not mandatory approval gates for every small change. Continue independent work while waiting for optional suggestions.

## 6. Start prompt for the frontend agent

```text
Develop the Gaiapus frontend with me; I will give visual and UX suggestions.
Read:
Docs/2026-11-14-gaiapus-frontend-implementation-plan.md
Docs/2026-11-14-gaiapus-api-frontend-contract.md
Docs/2026-11-14-gaiapus-product-ux-and-implementation-plan.md

Another agent owns the API, Python adapter, Supabase migrations, shared
contracts, and root tooling. Own apps/web and tests/e2e. Use the M0 contract
baseline and validated HTTP mocks so API/scientific implementation does not
block the UI. Never create a competing backend or invent scientific values.

Start with the API/mock boundary and public hero, show working screens
early, and incorporate my feedback. Keep a small UX decision log. Request
shared contract changes only for real data/API/semantic needs. Later switch
the same client to Node and verify real authentication and persistence.
```

## 7. Definition of done

- [ ] Public exploration/example comparison is useful without credentials.
- [ ] First-time and returning users have deliberate, tested hero states.
- [ ] Source dates, scope, missingness, actual cutoffs, and evaluation boundaries remain visible.
- [ ] One frontend operates against either validated mocks or the real API through configuration.
- [ ] User suggestions are reflected in working screens and material decisions are recorded.
- [ ] Personal saves/reopens preserve context and do not leak across accounts.
- [ ] Browser evidence distinguishes mocked verification from real integration.
- [ ] The API agent can integrate the frontend without making visual decisions or rewriting page components.
