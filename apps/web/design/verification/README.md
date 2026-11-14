# First public frontend slice: verification

Date: 2026-11-14. Active reference: the user's original illustrated AgroClima composition, adapted to Gaiapus branding and the supplied scientific examples. This is not completion of the entire frontend plan.

## Fresh checks after implementation/review fixes

| Check | Result |
|---|---|
| `pnpm --filter @gaiapus/web build` | PASS, includes strict TypeScript and Vite production compilation |
| `pnpm --filter @gaiapus/web test` | PASS, 9 tests across state, HTTP boundary, and missing-date chart paths |
| `GAIAPUS_WEB_URL=http://127.0.0.1:5180 pnpm --filter @gaiapus/web test:e2e` | PASS, 4 Chrome scenarios, one worker |
| Original logo versus copied asset SHA-256 | Identical |
| Independent review | History restoration, source target binding, missing chart dates, and hidden mobile navigation findings addressed |

Browser scenarios verify desktop at 1366 × 768, mobile at 390 × 844, no document overflow, real art loading, day selection and table, source dialogs, Back/Forward, location changes, retrospective and null-estimate states, reduced motion, keyboard search, inert off-canvas navigation, and successful MapLibre worker/source loading.

## Captures

- `desktop-1366.png`: full public composition at laptop width.
- `mobile-390.png`: full stacked mobile composition.
- `geography-map.png`: separately identified local-geometry MapLibre view.

The native in-app browser could not access localhost. Installed Chrome via Playwright supplied the browser evidence. Network isolation required a network-capable Vite process and browser run. A resource-pressure shutdown interrupted one intermediate run; the final serial run passed after restarting the preview.

## Remaining limits

- Browser checks use development HTTP mocks backed by canonical shared fixtures. They do not prove real account persistence, scientific-service integration, or production provider behavior.
- Sign-in, monitored-place persistence, saved comparisons, custom run forms, complete historical imagery, and full geographic hierarchy workflows remain upcoming slices.
- The decorative Earth is not a rotatable geographic globe. The separate MapLibre base map provides real pan/zoom.
- The MapLibre chunk/worker is large but lazy-loaded. Further performance work belongs to the remaining F8 checks.
- The Impeccable automated detector could not start because its engine/cache setup was unavailable; no detector pass is claimed.
- Shared root lockfile integration belongs to the API/root owner. The frontend package was installed without rewriting that lockfile.

Preview command: `pnpm --filter @gaiapus/web exec vite --host 127.0.0.1 --port 5180 --strictPort`.
