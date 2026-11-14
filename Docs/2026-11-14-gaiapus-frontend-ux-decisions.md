---
title: Gaiapus Frontend UX Decisions
created: 2026-11-14
status: in-progress
tags:
  - gaiapus
  - frontend
  - design-decisions
---

# Gaiapus Frontend UX Decisions

Product reference: [[2026-11-14-gaiapus-product-ux-and-implementation-plan]].
Execution: [[2026-11-14-gaiapus-frontend-implementation-plan]].
Interfaces: [[2026-11-14-gaiapus-api-frontend-contract]].

## 2026-11-14 — Restore the original dark cyan direction

**User instruction:** “i didnt liked, follow the old more darker cyan reference”.

**Decision:** Reject the brighter white/daylight-field design exploration. Restore the original screenshot's midnight navy/cyan world, large Earth, left navigation, and right contextual analysis. Replace pixel art with realistic imagery and smooth purposeful motion. The bright mockups are not the frontend build target.

**Scope:** Frontend presentation only. Authentication, scientific meaning, API contracts, and database responsibilities are unchanged.

### Current reference files

- Original supplied screenshot: `apps/web/design/references/original-dark-reference.png`.
- Generated dark public composition: `apps/web/design/references/gaiapus-public-dark-v1.png`.
- Generation: built-in image generation, using the original screenshot as a visual reference. The generated image is a visual comp, not a running interface or verified scientific observation.

### Visual commitments

| Role | Direction |
|---|---|
| Canvas | Midnight navy `#060D1B` |
| Panels | Deep navy `#101E31` |
| Main text | `#F2F6FC` |
| Supporting text | `#AABBD0` |
| Selection/action | Cyan `#65CFFF`, with dark text on filled primary actions |
| Hero | Dominant realistic Earth, natural clouds, restrained blue atmosphere |
| Composition | Left navigation, central Earth, right context, shallow lower navigation/timeline strip |
| Typography | Proposed Manrope headings and Source Sans 3 body; verify actual font loading during implementation |
| Surfaces | Quiet thin borders, restrained depth, 12 px panels; flatten rows where possible |
| Motion | Interruptible geographic travel and coordinated date changes; reduced-motion alternative |

### Image-to-code analysis

- The globe occupies most of the center-left region and remains outside a rectangular card. Preserve that scale rather than reducing it to a decorative thumbnail.
- The reference has a roughly 190 px navigation rail, a flexible map stage, and an approximately 390 px information column. These are composition estimates, not fixed mobile dimensions.
- Search and sign-in live in one slim top bar. The Earth, location, and example action remain visible without a scrolling marketing header.
- One main contextual panel introduces the Sorriso retrospective example. Another explains availability. Do not add national weather measurements or unsupported planting suggestions from the original screenshot.
- Cyan marks navigation, geographic selection, and the primary action. Natural vegetation colors belong to the Earth imagery; they do not imply that planting is favorable.
- The generated Brazil outline and Sorriso marker are illustrative. Use actual geographic boundaries and coordinates from the published catalog in the application.
- The generated Earth is not a dated NASA observation. Use an attributed basemap/globe implementation and preserve acquisition/source labels for analytical imagery separately.
- Keep missing scientific observations as gaps, even when a generated comp draws an attractive continuous or dashed line.

### Implementation adjustments to retain

1. Keep map/layer controls keyboard accessible and provide a non-WebGL search/list path.
2. Use actual API coverage to populate the context panel; the screenshot does not prove local capability.
3. Preserve the explicit retrospective harvest-year label when opening yield examples.
4. Make all controls real HTML and the geography interactive through MapLibre; do not ship the full comp image as the interface.
5. Remove unnecessary bordered rows inside already bordered panels during implementation if they weaken hierarchy.
6. On mobile, collapse the rail, use a compact globe/map plus an analysis sheet, and preserve the dark cyan palette.

### Status

Dark palette and original reference direction are explicitly requested by the user. The user subsequently said the public dark composition “got better” and requested their actual logo plus references from SeuImposto. No React frontend or real authentication is claimed by this design record.

## 2026-11-14 — Actual logo and map-product craft references

**User instruction:** Add `Docs/logo gaiapus.jpg` and take design references from `seuimposto.com`.

**Decision:** Retain the approved dark Earth composition, introduce the original green/brown emblem in an ivory brand tile, and borrow compact toolbar controls, flat analysis groups, command-style location search, and an anchored bottom control dock.

**Evidence:** Live homepage and location-search inspection, including screenshots and computed CSS. See [[2026-11-14-gaiapus-seuimposto-design-reference]] for exact observations and their bounded roles.

**Current visual candidate:** `apps/web/design/references/gaiapus-public-dark-v2.png`.

**Canonical runtime logo:** `apps/web/public/brand/gaiapus-logo.jpg`, copied byte-for-byte from the supplied JPEG. Use this real file in the frontend rather than extracting the generated comp's approximate logo.

**Integration impact:** None. The application still consumes the same geography, coverage, example, account, and scientific contracts.

## 2026-11-14 — Stylized cartography and clearer public decisions

**User instruction:** Improve usability using the dark V2 image and make it less realistic.

**Decision:** Preserve navy/cyan and the supplied logo. Replace photographic clouds, terrain texture, glare, and star noise with smooth cartographic continent shapes and restrained sphere shading. The globe stays prominent but serves geographic orientation.

**Current candidate:** `apps/web/design/references/gaiapus-public-dark-v3.png`. This is a generated design reference, not an implemented or user-tested interface. V2 remains available for comparison.

### Usability changes

1. Consolidate geographic context into one breadcrumb above the globe and remove the redundant country selector.
2. Replace ambiguous crop rows with an explicit single-choice Soja/Milho control. The primary action names the selected crop: **Ver análise de soja**.
3. Replace generic availability explanation with actionable coverage and published-water-example links. Derive enabled states and reasons from the API's per-product capabilities.
4. Remove the large decorative lower breadcrumb banner and give the principal actions more breathing room.
5. Keep source/limitation inspection available without login and retain the retrospective harvest-year label.

### Interpretation and implementation constraints

- The generated globe/marker are illustrative. Render real geographic boundaries and coordinates through MapLibre; do not use the generated picture as an analytical map.
- The crop choice should be an accessible radio group with visible selected state and keyboard support.
- Use at least 44 px control hit targets, visible focus, readable body type, and an accessible list alternative to map clicking.
- On public mobile, use a compact cartographic globe and one evidence sheet; keep the selected location, crop, and main action reachable.
- In a returning account, open the monitored place directly. The orbital view remains an exploration option rather than a repeated task requirement.
- Treat screenshot-based findings as design hypotheses. Verify contrast, viewport fit, keyboard behavior, focus order, and task completion in the real frontend before claiming usability improvements are tested.

**Contract impact:** None. Crop selection maps to the existing published example IDs; unsupported products or input combinations remain unavailable with an explanation.

## 2026-11-14 — Richer dashboard, more colors, shadcn-style controls

**User instruction:** Reject the sparse V3 direction; add more colors, panels, dashboards, and improve the world map with shadcn-type styling.

**Decision:** Recompose the public example as a compact analytical dashboard. Keep the supplied logo and navy foundation. Introduce a metric row, a geographic panel with Mapa/Globo controls, analysis context, and linked water/rainfall charts. V3 is a retained exploration, not the current implementation target.

**Current candidate:** `apps/web/design/references/gaiapus-dashboard-dark-v4.png`.

**Primary UI references:** [shadcn dashboard](https://ui.shadcn.com/examples/dashboard), [area charts](https://ui.shadcn.com/charts/area), and [tabs](https://ui.shadcn.com/docs/components/tabs). Reviewed official examples/documentation for card hierarchy, compact controls, tabs, chart legends, and neutral dark surfaces. Prior SeuImposto map/search observations remain a bounded secondary reference.

### Visual roles

| Role | V4 direction |
|---|---|
| Canvas | Dark slate/navy `#090F1A` |
| Panels and controls | `#111B2B`, `#182438`, quiet `#27354A` borders, 12 px panel radius |
| Primary and supporting text | `#ECF2F8`, `#A5B4C8` |
| Selection and modeled reserve | Cyan `#38BDF8` |
| Rainfall | Blue `#60A5FA` |
| Climatological reference | Lime `#A3D56B`, dashed line and full text label |
| Modeled stress | Amber `#F5B642`, labeled flag/strip |
| Cartographic base | Muted natural green/olive/tan land, dark ocean, restrained borders and labels |

Color distinguishes data roles; it does not imply validated crop suitability. The reference-series color is an identity, not a favorable outcome. The geographic layer is a base map; its terrain colors do not represent modeled soil/yield/risk values.

### Dashboard organization

1. Compact brand/navigation and search.
2. Selected area/crop/period with a visible published-example label.
3. Four compact metric panels: initial reserve, projected rainfall, modeled stress days, and evaluated horizon.
4. A dominant world-map panel with projection/layer controls and selected-place context.
5. Linked reserve/reference/rainfall charts and a concise limits panel.

Use shadcn component patterns as the visual language. This design exploration does not itself add dependencies or change the scientific/API contracts. Preserve the existing SVG-chart implementation default unless a later implementation decision explicitly changes it.

### Figures verified against the current supplied example

The current local `packages/contracts/upstream/examples/water-soy-5107925-N10.json` was inspected before generating this reference. It currently serves six daily values, despite the historical N10 filename:

- Initial storage: 25.89 mm; assumed capacity: 55 mm.
- Served period: 2026-11-14 through 2026-11-19.
- Projected rainfall over those six days: 136.3 mm.
- Model stress flags: one of the six served days.
- Evaluated lead limit: seven days; six days are actually served in this captured response.
- Yield effect remains null.

Do not reuse older ten-day fixture assumptions merely because the filename contains N10. Read requested, served, and evaluated horizons from each actual response.

### Corrections required when translating the generated comp

- The initial reserve is the pre-decision state, not an extra value for the first daily bucket. Label it separately or plot its actual pre-decision date; plot the six served daily values against their six dates.
- The generated reference curve and rainfall bars are illustrative. Bind the actual `reference_days` and `days` arrays from the validated response rather than tracing the drawing.
- Use actual geography and coordinate references for Sorriso/Uberlândia. A map legend must distinguish a selected country, state, and municipality instead of naming one outline ambiguously.
- Keep Mapa/Globo as two projections of the same map controller; do not introduce a second visualization engine for the toggle.
- Avoid duplicate global navigation and local tabs that do the same thing. Global links change workspace context; local tabs preserve the selected place/product.
- The screenshot is a design reference, not proof of implemented shadcn components, responsive behavior, real API integration, or browser verification.

**Integration impact:** Existing response metadata supplies these panels. No new scientific product, economic inference, recommendation, or ingestion pipeline is introduced.

## 2026-11-14 — Implement the original illustrated composition

**Latest user instruction:** Reject the V4 dashboard direction; use the newly attached original illustrated reference and implement the first frontend structures according to the plan. The user subsequently requested continuing implementation.

**Active direction:** The original left navigation, large colorful illustrated Earth, right contextual/crop/regional panels, and shallow daily timeline. This replaces V1–V4 as the first-slice implementation target. Preserve the real Gaiapus logo. The earlier requirement to replace all pixel/game illustration with photorealism is superseded by this explicit reference selection.

**Implemented frontend paths:** `apps/web/src`, `apps/web/public/art`, `apps/web/public/brand`, and browser checks in `tests/e2e/frontend.spec.ts`. The API agent's source, contracts, root scripts, and root lockfile were not edited by this slice.

### Visual and scientific adaptation

- Built-in image generation produced separate transparent Earth and farm illustrations matching the supplied reference. Prompts and origins are in `apps/web/design/assets-provenance.md`.
- The illustration is decorative; it does not rotate as a scientific globe and its clouds do not represent actual forecasts. A separately identified MapLibre view provides real pan/zoom over local Brazil/state geometry.
- The original weather-panel composition becomes a dated water-balance example panel. National weather readings are not invented.
- The original planting-suggestion composition becomes published crop-example navigation. Green means example available, not recommendation to plant.
- The timeline uses actual supplied daily rainfall, reserve, and stress fields, with UTC bucket labels and the served/evaluated horizon distinguished.
- Search, URL restoration, source dialogs, crop-result inspection, daily selection, playback, data table, responsive menu, and reduced-motion behavior are implemented.

### Slice boundary

This is a working public frontend structure, not completion of all F0–F9. Personal accounts, saved comparisons, custom runs, full imagery history and all failure-scenario controls remain future slices. The sign-in panel states that account connection is pending. Browser development mocks are visibly labeled and production builds use HTTP.

### Verification and review

- State/API/chart tests cover abort/auth/error handling, strict dates and public-context restoration, and missing-date chart gaps.
- Chrome browser checks cover the reference layout at 1366 × 768, mobile at 390 × 844, location changes, crop examples, empty projection state, date selection, Back/Forward, dialogs, reduced motion, and MapLibre loading.
- Native in-app localhost access was unavailable; local installed Chrome through Playwright provided browser evidence.
- Independent review found history/source-context/chart-gap/mobile-keyboard issues. Fixes were applied; the review pass confirmed the first three original issues except a residual source/history association, then that association was addressed by closing and clearing source context on history restore.
- Impeccable's automated detector could not run because its bundled engine is not installed and its cache location was not writable. Manual screenshot and browser checks do not substitute for a claim that this detector passed.

See `apps/web/README.md` for exact run/check commands, present limitations, and the root-lockfile integration handoff.
