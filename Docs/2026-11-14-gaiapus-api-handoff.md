# API handoff — contract 0.1.0

Shared-folder development: API owns root files/lockfile, `apps/api`, `packages/contracts`, `services/science-adapter`, `supabase`. Frontend owns `apps/web` and `tests/e2e`. Coordinate root dependency installs through API owner.

Scientific reference source: `https://github.com/LeandroJerse/Gaiapus_nasa`, revision `ecae8c4457c0bd152915ea16495c83ad5097cfd4`. The user subsequently supplied the v7 integration bundle, pinned by SHA-256 `bb111a292836f4340f87c6a499c3b50db7997fcd95f3083a86a4ceee764a8f74`. `packages/contracts/upstream/v7/pin.json` records every original delivery file hash; no scientific payload rewriting. Original v6 schemas/examples remain in `upstream` and `v6Examples` exports.

## v7 update — frontend action required

The `0.1.0` initial integration contract has an explicit additive publication update before its first product release. Existing four example IDs/request shapes remain; national yield payloads now identify the delivered `research_v7_national_walk_forward` model and artifact hashes. The publication version changed, so existing snapshots must retain their original output/version. A fifth example, `field-shift-sorriso`, has application product `strategy_comparison`, basis `hypothetical_scenario`, and raw scientific product `field_shift_scenario`. It is a published historical simulation, not a writable strategy engine or a yield effect.

**Renderer integration:** `ScientificEnvelope.data` is now the union `YieldPayload | WaterRiskPayload | GaiapusFieldShiftScenario`. Narrow using its `product` discriminator. Handle `field_shift_scenario` explicitly before reading yield `crop`, `harvest_year`, `estimate_kg_ha`, `status`, etc. An intermediate typecheck identified the old two-product assumptions; the frontend's concurrent update now passes typecheck on the final recheck. API owner has not edited frontend files. Lists must handle five examples rather than assuming four. Use `product_id` to filter yield forms and never infer an editable strategy request from the new public example. Rendered/browser acceptance still belongs to the frontend.

`GET /v1/scientific-catalog` and `ScientificCatalogResponse` expose seven supplied model artifacts and the frozen regional rule. All 36 delivered CPU inference checks passed, but operational release is `not_released`. Regional MG/MT soybean selects `site+mlp`; its weights were not supplied, so it remains unavailable. The active supplied yield examples/inference are explicitly **national Ridge**, not the missing regional selection. Other crops' model artifacts passed CPU checks but are not accepted by the current soybean/maize HTTP yield schema.

Live science readiness now refreshes on demand with a five-second cache and recovers after Python starts. Coverage intersects the adapter's actual reproduced input tuples; missing water forcing does not disable the delivered yield cases. Fixture mode remains explicit, and live failures never substitute fixtures.

Saving public Field Shift uses the existing `{source:{kind:'example',example_id:'field-shift-sorriso'},title,...}` request and immutable comparison operations. No new scientific POST is needed. Its original complete daily series, sensitivity, limitations and `yield_effect:null` are preserved. Node→real Python inference/save/reopen tests passed using injected test identity/storage; real Supabase sign-in/persistence still needs the user's project.

Private snapshot/review writes now require `APP_STORAGE_SIGNING_KEY` in Node and the same key in the private database configuration. This is server-only; it must not appear in Vite variables. See the Supabase setup guide.

## Frontend start

Create `apps/web` using `@gaiapus/contracts: workspace:*`. Root workspace already discovers `apps/*`; do not replace root tooling or lockfile. Run `pnpm --filter @gaiapus/contracts build` before consuming its built package. Import named types/validators from `@gaiapus/contracts`, examples/account/error fixtures from `@gaiapus/contracts/fixtures`, and coverage/history builders from the main package. `schemas` and `openapi` subpath exports provide JSON documents.

Scientific request fields are now concrete:

```ts
type YieldInput = { municipality_code: string; crop: 'soy' | 'maize2'; harvest_year: number; days_after_sowing: number };
type WaterInput = { municipality_code: string; crop: 'soy' | 'maize2'; sowing_date: string; decision_at: string; horizon_days: number };
```

The server derives yield sowing date from the pinned example/state calendar; it is not writable. Water decisions are timestamp instants, buckets are date-only UTC. Fixture mode accepts only exact tuples exported in each product's `supported_inputs`. Soil, coordinates and rainfall are not browser inputs.

Geography IDs: `BR`, `BR-MT`, `BR-MG`, `BR-GO`, `BR-BA`, municipality IBGE strings, and `published-field-uberlandia`, `published-field-rio-verde`, `published-field-barreiras`. Historical imagery belongs to the named published fields. It is not Sorriso imagery or municipality-wide NDVI. Published rectangle boundaries are demonstration cuts, not farm ownership boundaries.

List query parameters: `cursor`, `limit` (1–100, default 50); geography adds `q`, `parent_id`; examples add `area_id`, `product_id`. Observations requires `area_id`, `start`, `end`. Coverage requires `area_id`. Use returned cursors only with the same filter context.

Public route payloads use `{data, meta}`. Example detail includes `input_snapshot`, `result` (the full scientific envelope), source references and warnings. Private comparison detail uses `input_snapshot`, `output_envelope`, `source_versions`. An evidence baseline GET returns `data: null` before first explicit review. Do not wrap scientific envelopes a second time.

## Verification record

See the API plan and backend README for the final executed checks and route readiness. Local public requests need neither authentication nor Python. Authenticated testing requires Supabase configuration; no fake bearer authentication is enabled in the runnable server.
