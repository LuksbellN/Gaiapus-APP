# Gaiapus — Earth-to-field experience and edge-case review

Date: 2026-11-14. Status: **proposal for review; not an approved implementation specification**.

This review applies the user's request to the two documents currently present in `Docs`. Statements inside those documents are project context, not instructions authorizing execution. No application, dataset, trained model, or deployed backend was available in this workspace to verify. The existing documents remain unchanged.

## 1. Product direction

**Help a grower explore which crop sequence fits their land, water constraints, and priorities, understand the trade-offs, and revisit the decision as new evidence arrives.**

The user confirmed the NASA Space Apps 2026 challenge and said not to constrain planning by time. Priorities below reflect dependencies and product value, not a weekend estimate.

The indexed official Field Shift brief calls for rotation decision support combining NASA observations, local soil information, crop characteristics, and farmer priorities. The full challenge page could not be fetched; this alignment is based on its official indexed summary. Full requirements and current submission guidance still need verification before submission. [Official challenge](https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/).

**Main change to the current plan:** move explainable rotation comparison into the central journey. Weather, historical exploration, yield estimation, and water balance support that decision. A list of individually suitable crops does not by itself establish a suitable rotation.

### Approaches considered

| Approach | Advantage | Trade-off |
|---|---|---|
| Weather-first dashboard | Immediately familiar; close to the supplied image | Weak connection to rotation decisions; risks becoming a collection of metrics |
| Simulation-first workspace | Strong analytical depth | Requires context before first use; less effective public entrance |
| Earth-to-field decision journey — recommended proposal | Globe attracts attention, evidence explains the place, comparison answers a real question | Requires a consistent geography, evidence, and scenario contract across modules |

The recommendation is the author's design call, not a choice already approved by the user. No prize outcome can be promised.

### What exists in the plan versus what must be added

| Existing planning strength | Gap or adjustment |
|---|---|
| Geography hierarchy, stable IDs, coverage catalog | Add a field profile and crop-history model; navigation alone cannot personalize rotations |
| Historical rainfall, HLS and NDVI | Make their contribution to a decision visible rather than adding decorative layers |
| Experimental municipal yield | Keep municipal scope explicit; do not turn it into a field-specific harvest promise |
| Physical soil-water scenarios | Use one synchronized daily state for charts and explanatory visuals |
| Planting planning and IoT in a later phase | Rotation planning becomes core; IoT enriches it without being required to use it |
| Source, quality and version metadata | Extend to economic assumptions, rule explanations, uncertainty, and saved scenario snapshots |
| Hardware/software protocol | Resolve sequence collisions, event timing, calibration lineage, and rainfall aggregation before production ingestion |

## 2. Reference lock and visual direction

This is design research and a proposed direction, not a pixel-perfect target approved for implementation.

| Reference | Preserve or borrow | Boundary |
|---|---|---|
| User's AgroClima screenshot — primary visual reference | Earth as the main visual, midnight-blue environment, local summary beside geography, weather/planting relationship | Replace pixel art with realistic imagery and readable contemporary UI; do not copy its sample values or brand |
| [NASA Eyes](https://science.nasa.gov/eyes/) — secondary conceptual reference | Immersive Earth exploration tied to scientific information | Borrow the globe-to-evidence idea, not NASA branding or an assumption that our data is live |
| [NASA Worldview guide](https://earthdata.nasa.gov/s3fs-public/2025-03/worldview-booklet.pdf?VersionId=vkMI8sbfY1WdDGqFKFSUus_orr4xsYnv) — secondary interaction reference | Explicit layer dates, timeline, and layer information | Based on indexed guide content; full PDF fetch was blocked. Do not claim a direct live UI audit |
| Refero bundled craft and motion guidance | Keyboard focus, URL state, readable forms, interruptible motion, reduced-motion alternatives | No live Refero MCP was available; no Refero screens or flows were inspected |

### Proposed design commitments

- Use Gaiapus as the working product name, as in the current project plan. AgroClima is the screenshot's branding.
- Midnight navy canvas; low-noise star field only in the distant globe view. Near the field, imagery and useful overlays own the screen.
- Realistic Earth texture and restrained atmosphere. Satellite overlays must have actual source dates; decorative Earth texture is labeled as a basemap when inspected.
- Neutral sans-serif UI, tabular numbers, strong contrast, consistent units. Start with a 16 px body and 12 px minimum supporting metadata; validate on actual laptop and phone displays.
- Cyan denotes navigation and selection. Green denotes an eligible/favorable state only when supported. Amber and red communicate explicit caveats and risks. A scenario always has a text label and line pattern as well as color.
- Thin borders and mostly flat panels; avoid neon outlines on every component, stacked cards, decorative gauges, and an equal-weight wall of statistics.
- Tokens proposed for exploration: canvas `#060D1B`, surface `#101E31`, primary text `#F2F6FC`, secondary text `#AABBD0`, selection `#65CFFF`, favorable `#72D59A`, caution `#F5C46B`, risk `#FF8B8B`. Verify contrast in each actual pairing before adoption.
- Micro-feedback about 120 ms, panel changes about 200 ms; camera travel may be longer when useful, skippable, and interruptible. Reduced motion replaces travel with a direct view change. No forced globe intro.
- The desktop composition must work at 1366 × 768 without shrinking text to reproduce the dense reference. At 390 px, use a compact map plus a full-width analysis panel, with tabs for Explore, Compare, and Timeline. No permanent desktop sidebar on phones.

## 3. Visitor journey: useful before login

The public experience is an interactive product entrance, not a conventional marketing page followed by a separate tool.

```text
Gaiapus                      Search municipality       Explore example     Sign in

                          EARTH / SELECTED REGION       Plan the next season
                          realistic, navigable          Choose a place to explore
                          geography                     its evidence and options.

                          boundaries / coverage         [Search a place]
                                                       [Explore a published example]

Selected place / breadcrumb        Layer · period · source · spatial scope
```

1. Show a responsive Earth immediately, with location search and a named published example. Do not request geolocation on arrival.
2. Choosing Brazil changes the view, not the weather to a fictitious national temperature. A local weather summary appears only after choosing a supported place and period.
3. Selecting a municipality opens a concise evidence panel: what data exists, what changed within the available record, and what can be compared.
4. Show a rotation preview using a published example or inputs explicitly entered by the visitor. Name its assumptions. It is not personalized to a field merely because a municipality was selected.
5. Allow visitors to inspect sources, compare public example strategies, and run an ephemeral supported scenario. Require login to save private fields, connect devices, retain history, or save a scenario to an account.
6. On sign-in, preserve the place, current comparison, and unsaved draft. Ask whether to save the draft to the selected workspace; do not silently attach it to the wrong farm.

Primary copy proposal: **“Explore your land. Compare your next seasons.”**

The first panel should answer: **Where am I? What evidence is available? What decision can I explore?** It should not attempt to show every available data product.

## 4. Logged-in journey: the field is the working context

Keep the same globe and map engine. Returning growers enter their last authorized field view; “Explore Earth” remains available. Do not require replaying an orbital animation to inspect a reading.

```text
Farm / Field / Season         Evidence freshness         Explore Earth    Account

FIELD MAP + dated layer       Decision summary
selected boundary            What changed / what needs attention
                             [Compare rotations] [Open timeline]

Current sequence  |  Alternative A  |  Alternative B
Shared comparison: water risk · soil considerations · economics · evidence gaps

Timeline: observations — decision date | scenario days — season sequence
```

### First-use setup

Ask progressively: location and field boundary or municipality-only scope; area; current/recent crop sequence and dates; known soil information; irrigation availability; farmer priorities. Make “unknown” a real option, not a default zero. Connecting the estaca is optional.

Offer priorities such as water resilience, expected economic return under entered assumptions, soil protection, and operational feasibility. Hard constraints — for example no irrigation equipment or an unavailable crop — are enforced before preference ranking.

Distinguish saved farm, field, season, and scenario. A device belongs to an authorized field for a stated interval; a user can have several fields with different crops and soils.

### Rotation comparison

Propose a three-season comparison initially: current sequence and up to two locally supported alternatives. Three seasons is an author proposal, not a verified NASA requirement. Add longer horizons only when crop calendars and rules support them.

- Render each strategy as a dated crop sequence, including fallow or cover-crop periods where locally supported. No example sequence is an agronomic endorsement until reviewed.
- Always compare on a shared time horizon, geographic scope, weather basis, accounting basis, and input version.
- Show reasons, trade-offs, failed constraints, and missing information for every alternative. Include why the current sequence remains competitive where appropriate.
- Use a comparison table and sequence timeline as the main visualization. Radar charts obscure units and should not be the primary comparison.
- Prefer objective-specific ordering initially. If a composite score is introduced, publish normalization, direction, weights, handling of missing criteria, rule version, and sensitivity. The score is a preference aid, not a probability of success.
- Do not silently reweight when economic or soil information is missing. Offer a clearly labeled partial comparison or ask the user to exclude that criterion explicitly.
- Keep the selected strategy stable while new evidence is reviewed. Explain what changed before applying a new ranking.

### Benefits and economics

Each claim needs a basis: measured, model-derived, rule-based, farmer-provided, or unknown.

| Benefit | What to show | What is required |
|---|---|---|
| Water | Simulated reserve, deficit, stress days, and differences versus baseline | Versioned water-balance model, inputs and applicable thresholds |
| Soil | Relevant local soil constraints and sourced qualitative rotation considerations | Soil source, date/depth, crop history and locally reviewed rules |
| Revenue | Price assumption × yield assumption, with units | Compatible quantity/unit, region, date, currency and provenance |
| Margin under assumptions | Revenue minus listed costs, per hectare and for the entered area | Explicit included/excluded costs and shared accounting horizon |
| Robustness | How strategy comparisons respond to changed assumptions | Repeated comparable scenarios; no statistical confidence claim without evaluation |

Do not present NDVI, sensor moisture, or a short simulation as measured improvements in soil health, fertility, carbon, or disease resistance. Show qualitative evidence or “not evaluated” where a validated model is absent.

For exploratory economics, allow user-entered low/base/high prices, yields and costs. Use `revenue_per_ha = yield_kg_per_ha × price_per_kg` and `margin_under_assumptions = revenue_per_ha − included_costs_per_ha`. Call it margin under assumptions rather than net profit when costs are incomplete. Sacas require an explicit crop-specific mass conversion. Missing information stays missing. Municipal yield estimates retain their scope even if used as a named exploratory assumption.

Do not infer a yield increase or financial saving from a changed water-balance curve unless that causal integration has been evaluated. Multi-season totals require a common time horizon and explicit treatment of costs and timing.

## 5. Simulation experience: the signature interaction

The memorable moment is an understandable cause-and-effect comparison: change one assumption, run the scenario, scrub the days, and see the same simulated state everywhere.

1. Start from a named baseline snapshot, selected rotation and date. Inputs distinguish observed, forecast, historical replay, user assumption, and model default.
2. Offer only model-supported controls: planting date, soil water capacity, initial water, rainfall perturbation, crop/stage, or an available issued weather forecast. Label percentage changes as hypothetical stress tests.
3. Show pending changes and an explicit Run comparison action. Keep the previous result visibly tied to its previous inputs until the new run completes.
4. Display a synchronized water-reserve line chart, rainfall bars, daily stress strip, and a simple soil profile. A 3D cutaway may supplement these after the meaning and performance work in 2D.
5. Provide play/pause, slider, keyboard step, reset, and direct day selection. Tooltip values, cross-section and summaries all use the same day index.
6. Show baseline and alternative together with the same axes. State which assumptions changed. Do not render unevaluated confidence bands.
7. End with “What differs?”, “Why?”, “What remains uncertain?” and “Save comparison.” Saving is not a command to irrigate or plant.

Separate the **daily water-model horizon** from the **multi-season rotation horizon**. Long-term climate exploration needs documented historical ensembles or appropriate climate scenarios; extending a short-term forecast does not establish long-term adaptation. Qualitative rotation rules must not silently become simulated daily soil-health values.

Any crop animation is schematic unless driven by an evaluated growth model. A visual that turns green because a slider moved must not imply validated yield recovery.

## 6. Timeline and estaca integration boundary

Hardware construction and firmware are outside this proposal. The software must still preserve the meaning of its events.

- Keep 15 cm and 40 cm readings as separate series. Show raw moisture until calibration is available; never substitute raw oscillator counts for a volumetric percentage.
- Plot by observation time, not arrival time; show delayed arrival separately. Gateway reconstruction from `received_at − idade_min` is approximate because age is minute-granular and gateway/network timing may differ.
- Distinguish satellite acquisition, local sensor measurements, rainfall intervals, field operations, calibration events, and saved decisions. Do not silently interpolate all sources into an apparent common measurement.
- Show device connection, latest received packet, latest valid observation, battery, sensor quality, and calibration as separate states.
- A 30-minute default reporting interval can inform a proposed freshness policy, but the actual thresholds must be configured from expected cadence and delivery tolerance. “Online” is not equivalent to “reading is valid.”
- With no device, retain all supported satellite and scenario features. With no current reading, retain dated history and prevent automatic initialization from stale values unless the user explicitly selects that assumption.

### Protocol review findings

1. `seq` is uint16. `device_id-seq-depth` collides after wrap or a reboot/reset. It is not a globally safe event identity. Agree a boot/session epoch or another durable monotonic identity with the gateway/backend; receiver-only epoch inference cannot reliably disambiguate arbitrary late buffered packets. Preserve this as an explicit unresolved contract dependency.
2. `node_id` uses only the lower 32 MAC bits. Provision a backend registry identity and detect radio-ID collisions. Do not treat it as proof of ownership or authentication.
3. The wire schema declares version 1, but the JSON omits protocol version. Carry protocol version, gateway identity and ingestion schema version into the envelope for decoding and evolution.
4. Store a packet once, with nested depth observations or linked child events. Rainfall is packet-level: expanding one event per depth must not count precipitation twice.
5. Define the rainfall interval start/end, rain conversion version, and replay semantics. Without interval identity and coverage, daily totals can double-count overlaps or confuse missing packets with dry weather.
6. Define retry timing: does `idade_min` update on every buffered resend? Retain original event identity and observation estimate, and define duplicate merge rules. Do not let later receipt time move an existing observation forward.
7. Store raw readings, original flags, calibration version and derived quality. Recalibration creates a new derived version; saved comparisons retain their original lineage.
8. Define invalid/sentinel values and ranges; reject unsupported versions and truncated 25-byte payloads. The current sensor-error flag is packet-wide: it cannot identify which depth or variable failed. Mark the affected packet's sensor values uncertain unless variable-level evidence identifies the failure; per-sensor validity would require an agreed envelope/protocol extension. Handle reserved flag bits and downlink interval zero explicitly. No hardware control path is needed for the proposed demo.

## 7. Backend additions that support the experience

Preserve the proposed React/TypeScript/MapLibre and FastAPI/Pydantic direction. Their availability here has not been verified. Do not add a second globe engine before demonstrating a specific missing capability.

### Data ownership and provenance

| Layer | Responsibility |
|---|---|
| Ingestion workers | Fetch and validate providers; retain raw provenance; handle retries outside interactive API calls |
| Published evidence catalog | Declare actual coverage by variable, time, geometry, scale, quality and version |
| Farm workspace | Own private fields, crop history, soil inputs, devices and membership authorization |
| Crop and rotation rules | Version local calendars, constraints, supporting sources, review status and explanations |
| Comparison service | Apply constraints, compute available metrics, explain trade-offs and preserve missingness |
| Simulation service | Run reproducible scenarios with pinned input/model versions and supported horizons |
| Read API / frontend adapter | Return coherent, display-ready bundles and partial statuses without inventing values |

Each decision-relevant value needs unit, provenance, spatial support, time support, quality and availability. An observed value, model estimate, forecast and farmer assumption are different types, not just different tooltip text. Metadata can reference shared source records rather than repeat every field per point.

Keep `observed_at`, interval bounds, forecast issue/valid times, ingestion time, and result generation time separate. Display local dates with a named timezone; keep UTC in transport. Publication version and model/rule/calibration versions are pinned in saved results.

### Proposed capability contracts, to agree before implementation

Existing geography, coverage, observations, yield, and water-balance routes remain useful. Add resource contracts for farm/field profiles, crop history, crop/rule catalogs, rotation comparisons, economic assumptions, saved scenarios, device assignment, and timeline queries. Exact route names remain a builder choice after review.

A rotation-comparison result should expose:

```text
comparison_id, field_or_area_scope, baseline_sequence, alternatives[]
decision_at, comparison_period, farmer_priorities, hard_constraints
input_snapshot_ref, evidence_version, rule_version, model_versions
per_strategy: eligibility, reasons, failed_constraints, missing_inputs
per_metric: value_or_null, unit, basis, source_refs, applicable_scope
scenario_refs, warnings, generated_at
```

Use independent `availability`, `freshness`, `quality`, and `execution_state` fields. A result can be ready yet stale, or available only for some criteria. Add machine-readable reasons and a useful recovery action where possible; keep a versioned mapping to localized interface text.

- Partition private caches by authorized workspace; never share private field payloads through public regional cache keys.
- Use request-context keys and cancellation so slow responses cannot overwrite a newer place, field or scenario selection.
- Persist long-running runs with queued/running/succeeded/failed/cancelled states and expiry. Polling is sufficient initially; streaming is not inherently necessary. Cancel or detach intentionally on navigation.
- Snapshot inputs and use idempotency for save/run retries. Reopening a saved result must not silently recompute it with newer data.
- Rate-limit public scenario runs, bound geography and horizons, and keep provider credentials server-side.
- Apply object-level authorization on every private resource and linked observation, export, run and device assignment. UI hiding is insufficient.
- Preserve the existing empty-coverage / 404 / 422 / 503 semantics; add explicit authorization and throttling responses. Partial provider failures should not blank unrelated evidence.

## 8. Edge-case map

Priority: **P0** means a correctness, privacy, or credibility gate for the affected feature. **P1** means important resilience and usability. **P2** means later refinement. These are release gates, not calendar estimates.

| ID | Priority | Trigger | User experience | Backend / acceptance behavior |
|---|---|---|---|---|
| GEO-01 | P0 | Region is valid but has no package | “No published analysis here”; offer a named covered example | Empty coverage with reason; never substitute a nearby location silently |
| GEO-02 | P0 | Rapid region changes; older response arrives last | Only current selection appears | Cancel/request-key guard; reject mismatched context |
| GEO-03 | P1 | Duplicate municipality names | Show state, country, stable identity | Resolve by codes, not display name |
| GEO-04 | P1 | Field overlaps municipalities or coverage edges | Show usable portion and unsupported products | Explicit coverage intersection and aggregation policy; no nearest-centroid shortcut |
| GEO-05 | P1 | Invalid polygon, wrong coordinate order or area units | Highlight invalid geometry/field | Validate coordinates, topology, area and bounded request size |
| GEO-06 | P1 | Geolocation denied or inaccurate | Search stays available; ask user to confirm place | No fabricated precise location |
| DAT-01 | P0 | Zero rain versus missing or partial day | Different labels and chart marks | Preserve null, zero and interval completeness |
| DAT-02 | P0 | Provider stale, down or rate-limited | Dated cached evidence or product-level retry | Freshness policy, bounded retry, partial response; no false “live” |
| DAT-03 | P0 | NDVI scene clouded or insufficient valid pixels | Dated gap and quality explanation | Apply declared quality rules; no implied continuous observation |
| DAT-04 | P0 | Source resolution is coarser than the field | “Regional context” next to the value | Retain original spatial support despite map zoom |
| DAT-05 | P0 | Sensor and regional satellite signal disagree | Show both scopes/times and possible mismatch | Do not average incompatible depths/supports without a defined method |
| DAT-06 | P1 | Day boundary, timezone or cross-year season | One clear local timeline with UTC details | Correct interval grouping; no duplicated or missing midnight events |
| ROT-01 | P0 | Crop history, soil or priority unknown | Partial comparison; ask only what unlocks next step | Null inputs preserved; no invented farm profile |
| ROT-02 | P0 | Individually suitable crops form an invalid sequence | Show sequence constraint and alternative | Check predecessor rules, calendars, overlapping seasons and operations |
| ROT-03 | P0 | Every candidate violates a hard constraint | “No supported option with these constraints” | No forced winner or silent relaxation |
| ROT-04 | P0 | Farmer requires unavailable irrigation/equipment/market | Explain feasibility failure | Hard constraints precede scoring |
| ROT-05 | P0 | Soil benefit lacks evaluated model | Qualitative sourced rationale or “not evaluated” | Never invent numeric soil-health gain |
| ROT-06 | P1 | Strategies tie or one is better only on one objective | Show trade-offs and ties honestly | Stable ordering; no spurious precision |
| ROT-07 | P0 | Priority changes or some criteria are missing | Explain changed ordering and missing basis | Version weights; no silent reweighting |
| ROT-08 | P0 | Long-term plan exceeds environmental/model horizon | Separate qualitative plan from modeled period | Reject unsupported daily projection; label historical ensembles |
| SIM-01 | P0 | CAD, water, dates or horizon invalid | Inline error with units and supported range | Domain validation; no silent clamping |
| SIM-02 | P0 | Assumed rainfall mistaken for forecast | Persistent “hypothetical scenario” label | Scenario type and input basis required |
| SIM-03 | P0 | 60/90-day yield cutoff mistaken for days ahead | Explain observation cutoff separately | Distinct yield-cutoff and forecast-horizon fields |
| SIM-04 | P0 | Inputs edited while old result remains | “Inputs changed — run again” | Result keyed to immutable input snapshot |
| SIM-05 | P0 | User infers yield or profit gain from water curve | Show only evaluated outputs | No unsupported coupling between models |
| SIM-06 | P1 | Slow, failed or cancelled run | Keep draft, status, retry and last dated result | Idempotent retries; durable run state; no duplicate save |
| SIM-07 | P1 | Chart scrub changes but plant visual does not | All views show selected day | Shared daily state; no independent animation timeline |
| ECO-01 | P0 | Price/cost absent, stale or wrong market | “Enter assumptions”; show date/source | No zero substitution; normalize units explicitly |
| ECO-02 | P0 | kg/t/saca or per-field/per-ha mismatch | Conversion visible; totals labeled | Explicit conversion factors, crop and area basis |
| ECO-03 | P0 | Negative margin or incomplete costs | Show loss or partial margin honestly | No clipping negatives or calling revenue profit |
| ECO-04 | P0 | Different rotation lengths compared | Common horizon and cost timing shown | Comparable accounting window or mark non-comparable |
| IOT-01 | P0 | Sensor uncalibrated | Raw readings, calibration needed | Derived volumetric moisture null |
| IOT-02 | P0 | Duplicate/resend/out-of-order packet | One historical event in correct position | Deduplicate by durable identity; preserve observation estimate |
| IOT-03 | P0 | Sequence wraps/resets; radio node ID collides | Avoid merged histories; flag ingestion issue | Session identity and registered device mapping required |
| IOT-04 | P0 | Delayed buffer arrives now | “Received now; measured earlier” | Received and observed times remain separate |
| IOT-05 | P0 | Rain appears in both depth events | One rainfall interval | Packet-level rainfall aggregation, not sum of child readings |
| IOT-06 | P0 | Invalid reading or packet-wide sensor-error flag | Specific failed value unavailable when identifiable; otherwise packet sensor values marked uncertain | Keep raw payload/flags; do not infer which sensor failed from the shared flag |
| IOT-07 | P1 | Device offline, low battery, no readings yet | Distinct helpful states; dated history remains | Configured cadence/freshness policy; no false “all clear” |
| IOT-08 | P0 | Calibration or device-field assignment changes | History labels the applicable version/field | Effective-dated assignments and derivation lineage |
| SEC-01 | P0 | User opens someone else's field/run/device ID | No private data disclosed | Object-level authorization including cache/export paths |
| SEC-02 | P0 | Logout or workspace switch | Clear private data and selected private field | Revoke access context; partition and clear private caches |
| SEC-03 | P1 | Login fails/expires during save | Preserve safe draft and resume intentionally | No silent loss or save into another account |
| SEC-04 | P0 | Public share contains private geometry/device details | Explicit public snapshot and preview | Allowlisted public fields; revocable sharing where implemented |
| UX-01 | P1 | WebGL unavailable/context lost | Search/list and 2D or text analysis remain useful | Capability fallback; no blank application |
| UX-02 | P1 | Phone, keyboard, screen reader or reduced motion | Equivalent navigation and table data | Visible focus, reachable controls, no color-only meaning |
| UX-03 | P1 | Back/refresh/share of public analysis | Restore place, period and selected layer | URL state; do not put private secrets in URLs |
| UX-04 | P1 | Poor network or cached offline view | Explicit last-updated/offline status | Never imply an offline scenario used new provider data |
| DEM-01 | P0 | Demo uses curated replay or synthetic data | Persistent mode badge and exact dates | Separate live, cached observation, replay and synthetic modes |
| DEM-02 | P0 | Demo/example uses private farm information | Public sample with permission or synthetic field | No accidental private export or public account access |

## 9. Demonstration narrative and evidence

Create one rehearsable reference journey with a published region, a documented baseline sequence, locally reviewed alternatives and version-pinned scenarios. Uberlândia is named in the existing plan, but its data coverage here is unverified. Choose it only after confirming the package.

1. **Explore:** globe → supported municipality → public example field. Establish the place and grower's decision.
2. **Understand:** show the dated NASA evidence that influences the analysis and its spatial limitations. Add soil facts and a farmer priority.
3. **Compare:** current crop sequence versus two supported alternatives; explain the trade-off rather than presenting a mysterious winner.
4. **Simulate:** change a supported rainfall assumption; run; scrub daily water states; identify which comparison conclusions remain stable.
5. **Observe:** open the estaca timeline, distinguishing a fresh valid reading from an illustrative replay. Connect the reading to the next scenario only where its use is defined.
6. **Decide:** save a comparison with its evidence and assumptions. Show what the grower still needs to verify locally.

The differentiator to demonstrate is the chain **NASA evidence → local context → rotation trade-off → scenario → revisitable decision**. A realistic globe provides the entrance; the chain provides the substance.

Use the 2025 judging guide only as background: it discusses impact, creativity, validity, relevance and presentation. Do not assume its submission limits or eligibility rules apply unchanged in 2026. The current guide URLs were found but could not be fetched. [2025 background guide](https://spaceapps-v2-staging.s3.amazonaws.com/media/documents/Final_Space_Apps_2025_Judging_Guidelines_for_web.pdf), [current judging guide](https://www.spaceappschallenge.org/resources/judging-awards-guide/), [current submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/).

Suggested product evidence for evaluation: a target grower can identify the place, explain one rotation trade-off, distinguish a simulation from an observation, and find a result's source without facilitator help. Record observed usability results; do not invent success percentages or field impact.

The walkthrough length should fit the actual presentation setting once verified. Make an English-accessible public example route so judges can inspect the core experience without access to a private farm.

## 10. Dependency-based delivery sequence

This is a product roadmap, not an implementation task plan. A detailed implementation plan follows design approval under Superpowers.

| Stage | Outcome | Exit evidence |
|---|---|---|
| A. Evidence inventory and contract | Confirm actual published region, source metadata, supported models and reviewed rules | One auditable package; documented gaps; compatible example responses |
| B. Public Earth-to-region slice | Search/globe/list navigation and coverage-aware panel | Works at laptop/phone sizes, by keyboard, and without WebGL |
| C. Rotation decision slice | Profile, sequence comparison, priorities and explanations | Baseline plus reviewed alternatives; invalid/no-option cases handled |
| D. Daily scenario slice | Reproducible water comparison with synchronized visualization | Saved snapshot reproduces curves; no unsupported claims |
| E. Account and private workspace | Save field/history/scenario and resume exploration | Object authorization, logout and workspace switching verified |
| F. Telemetry enrichment | Honest depth-aware timeline | Duplicate, late, invalid, uncalibrated and offline paths verified |
| G. Economics and extended adaptation | Explicit assumptions and longer-horizon comparisons where supported | Unit/accounting consistency; uncertainty and limits visible |
| H. Visual and usability finish | Reference-aligned polish and reliable public walkthrough | Browser review against selected visual target and observed user task completion |

Teams may work independently against versioned fixtures after agreeing contracts. A fixture proves integration shape, not live scientific capability. If economics is demonstrated earlier, restrict it to explicit assumptions until its evidence contract is ready.

### Acceptance scenarios for the eventual build

- Visitor completes example comparison without login; sign-in preserves the draft.
- Selecting a second location during loading cannot show values from the first.
- No coverage, missing soil, no valid rotation and unavailable economics each offer useful next actions.
- The same pinned simulation reproduces the same outputs; editing inputs marks old outputs stale.
- Sensor replay produces one event per actual observation and one rainfall interval, independent of depth count.
- Unauthorized field, scenario and device requests disclose no private payload.
- No current provider data is labeled live when the app is using cached, replayed or synthetic input.
- Laptop and phone layouts keep the primary action and the selected place visible; charts have an accessible data alternative.

## 11. Decisions still needing review

1. Approve or change the recommended Earth-to-field direction and rotation-centered scope. This affects the existing architecture document's phase order.
2. Confirm the initial region, real data/model packages and source-reviewed crop alternatives. These materials are referenced but absent here; no agronomic ranking can be finalized from these two documents alone.
3. Confirm the desired first visual target: a realistic dark globe-led entrance as proposed, followed by a detailed field workspace. This proposal does not yet contain an approved high-fidelity mockup.
4. Resolve the durable telemetry identity and rainfall-interval contract with the gateway integration owner before implementing ingestion correctness.

Builder discretion after approval: exact route names, chart library, token refinements after contrast checks, responsive breakpoints and job polling mechanism. These do not need separate product decisions unless a constraint emerges.
