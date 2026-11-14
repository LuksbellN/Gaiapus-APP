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

Frontend dependencies are confined to this package. No backend source is changed by this frontend slice.

## Supabase email authentication

Copy `apps/web/.env.example` to `apps/web/.env.local`, fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` with the same project's public browser credentials, and restart Vite. These browser variables are separate from the Node API's root `.env`. Never put a secret/service-role key in any `VITE_` variable. To exercise authenticated API calls, also set `VITE_APP_API_MODE=http` and configure the API against the same Supabase project.

In Supabase **Authentication → Sign In / Providers → Email**, enable email/password, allow new signups, and keep **Confirm email** enabled. In **URL Configuration**, use:

```yaml
Site URL: http://localhost:5173
Redirect URLs:
  - http://localhost:5173/auth/callback
  - http://localhost:5173/auth/recovery
```

Open the frontend at `http://localhost:5173` when using these entries. Redirects use `window.location.origin`: `localhost` and `127.0.0.1` are different origins, as are different ports. If using the current verification preview, also allow these exact URLs:

```text
http://127.0.0.1:5180/auth/callback
http://127.0.0.1:5180/auth/recovery
```

The Entrar dialog supports sign-in, signup, resending confirmation, sign-out, and requesting password recovery. `/auth/callback` exchanges the one-use PKCE confirmation code. `/auth/recovery` exchanges the code before showing the new-password form. A session-bound recovery marker allows refresh for up to 15 minutes; completion/sign-out clears it. Open email links in the browser/device used to request them. Newer requests can invalidate an earlier PKCE flow; use the latest email. Expired/reused links show a recovery action without exposing tokens or raw provider errors. Codes are removed from browser history. The Node API remains responsible for token verification and authorization.

Keep the default Supabase confirmation/recovery templates using `{{ .ConfirmationURL }}`. Customized templates must preserve Supabase's verification step and the requested redirect; do not replace the verification URL with a direct application link. Production hosting must serve the SPA entry point for both auth routes, and its exact HTTPS callback/recovery URLs must be allowlisted separately.

Manual live check: create a test account → confirm the email in the same browser → return to exploration → sign out → sign in → request password recovery → open the latest email → save a new password → verify the old password fails and the new one works. Automated checks mock the auth provider; email delivery and dashboard settings require this live check.

References: [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [password authentication](https://supabase.com/docs/guides/auth/passwords), [PKCE constraints](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

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

Personal onboarding, monitored places, immutable saved comparisons, custom scientific run forms, and complete historical imagery workflows remain unimplemented. Supabase email authentication is implemented and requires the environment/dashboard configuration above. The public example experience remains available without an account.

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
