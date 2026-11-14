# API handoff — contract 0.1.0

Shared-folder development: API owns root files/lockfile, `apps/api`, `packages/contracts`, `services/science-adapter`, `supabase`. Frontend owns `apps/web` and `tests/e2e`. Coordinate root dependency installs through API owner.

Scientific source: `https://github.com/LeandroJerse/Gaiapus_nasa`, pinned revision `ecae8c4457c0bd152915ea16495c83ad5097cfd4`. Only the agreed v6 yield/water contracts and four examples are exposed. `packages/contracts/upstream/pin.json` records original file hashes; no payload rewriting.

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
