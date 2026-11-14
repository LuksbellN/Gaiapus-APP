# Gaiapus frontend

First public frontend slice, following the supplied illustrated AgroClima composition: sidebar, illustrated Earth, contextual water/crop/regional panels, and a daily timeline. The user's Gaiapus logo is used unchanged.

## Run

From the monorepo root after installing workspace dependencies:

```powershell
pnpm --filter @gaiapus/contracts build
pnpm --filter @gaiapus/web dev
```

Development defaults to HTTP mocks based on the canonical `@gaiapus/contracts` publication/examples. The visible development label identifies this mode. No API process, Supabase credentials, provider credentials, or model artifacts are necessary for this preview.

To use the Node API instead:

```powershell
$env:VITE_APP_API_MODE = 'http'
pnpm --filter @gaiapus/web dev
```

Vite proxies `/v1` and `/publications` to `http://127.0.0.1:3001`. Production builds use HTTP; explicitly building with browser mock mode is rejected. The mock worker is generated using `pnpm --filter @gaiapus/web exec msw init public --no-save`.

## Checks

```powershell
pnpm --filter @gaiapus/web test
pnpm --filter @gaiapus/web typecheck
pnpm --filter @gaiapus/web build
$env:GAIAPUS_WEB_URL = 'http://127.0.0.1:5180'
pnpm --filter @gaiapus/web test:e2e
```

The browser suite uses the installed Chrome channel and an already running Vite server. Use `pnpm --filter @gaiapus/web exec vite --host 127.0.0.1 --port 5180 --strictPort` for the documented verification URL. Screenshots are written to `design/verification`. Browser checks may require network-capable execution when a restricted environment isolates loopback access.

Frontend dependencies are confined to this package. During the first implementation they were installed with `--lockfile=false` to avoid competing with the API agent's lockfile ownership. The shared-root owner must integrate this package into `pnpm-lock.yaml` before using frozen-lockfile CI. No root package scripts or backend source were edited by this frontend slice.

## Implemented

- Reference-based illustrated Earth/farm artwork, navy/cyan visual system, responsive panels and navigation.
- One typed API client, explicit development-only MSW handlers, shared contract fixtures.
- Location search, public context in the URL, refresh and Back/Forward restoration.
- Published water result, six-day example timeline, day stepping/playback, table, source inspection.
- Soybean/maize retrospective examples and the before-first-cutoff state without a fabricated estimate.
- Source-aware water/reference chart, preserving missing reference dates as gaps.
- A separately identified MapLibre Brazil/state geography view using local published boundary assets; graceful map failure messaging.
- Focus-managed dialogs, reduced motion, closed-mobile-menu keyboard isolation, local font loading.

## Next slices

Real Supabase sign-in, personal onboarding, monitored places, immutable saved comparisons, custom scientific run forms, and complete historical imagery workflows remain unimplemented. The sign-in action explains this status instead of simulating a real account. The public example experience is useful without them.

The illustrated Earth is a decorative raster, not a rotatable scientific globe. Its zoom controls enlarge/reduce the illustration; use **Mapa** for real geographic pan/zoom. The regional silhouette uses published Brazil geometry; its green/blue fill is decorative and is not a data layer.

## Component boundaries

- `src/App.tsx`: current public shell, example selection, panel composition, and dialogs.
- `src/features/explore`: URL/state reducer and lazy geographic map.
- `src/features/compare`: source-aligned charts and chart-path logic.
- `src/lib/api`: typed transport, abort/auth/error behavior.
- `src/mocks`: shared-fixture HTTP handlers, loaded only during development.
- `src/components`: reusable panel and focus-managed dialog.
- `src/styles`: visual tokens and responsive application styles.

## Assets and evidence

`public/brand/gaiapus-logo.jpg` is a byte-identical copy of the supplied `Docs/logo gaiapus.jpg`. Generated artwork provenance is in `design/assets-provenance.md`. Geographic files derive from the pinned independent scientific/prototype publication; keep source attribution when publishing. Generated art is never used as dated satellite evidence.

See `../../Docs/2026-11-14-gaiapus-frontend-implementation-plan.md` and the UX decision log for scope and superseded design candidates.
