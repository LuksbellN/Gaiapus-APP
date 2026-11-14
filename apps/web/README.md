# Gaiapus web

The active frontend is the approved teammate handoff from `Nasa-Frontend`, integrated into this monorepo. Its CSS, public screens, map, charts, motion and 3D scene are preserved. Source documentation is archived under `design/teammate-handoff/`.

## Run

From the monorepo root:

```powershell
pnpm install
pnpm --filter @gaiapus/contracts build
pnpm --filter @gaiapus/api dev
# In another terminal:
pnpm --filter @gaiapus/web dev
```

Open `http://localhost:5173/#/explorar`. The frontend now uses the Node API by default. Vite proxies `/v1` and `/publications` to `http://127.0.0.1:3001`; the imported frontend does not start MSW or silently fall back to bundled scientific results when API calls fail.

## Integration boundaries

- `src/teammate/`: approved UI, routes, visual assets, local scientific publications and local record behavior.
- `src/teammate/adapters/http.ts`: Node transport via the existing typed bearer-aware client.
- `src/teammate/adapters/index.ts`: API coverage, geography search, water/yield examples, Field Shift and observations/imagery. Uberlandia imagery uses the explicit `published-field-uberlandia` scope, not municipal measurement.
- `src/teammate/adapters/session.ts`: real Supabase identity bridged into the UI, plus account-profile reads through `/v1/me`.
- `src/features/auth/`: existing Supabase PKCE client and native email callback/recovery routes, using the approved UI styles.
- `src/teammate/store.ts`: anonymous and per-user local storage buckets. Cached prototype identities never authenticate users. Account changes remount private forms and invalidate pending local mutations.

Properties, plots, field records, plans, drafts and research preference remain explicitly local. The current API has no matching synchronization endpoints. Devices remain identified synthetic demonstrations. Additional crop examples, model evaluations and daily historical simulation series remain identified bundled publications where the API does not expose those datasets. They are not presented as newly computed live results. The simulator, economic calculator, crop selection and scientific limitations retain the handoff behavior.

The former UI source remains in the repository for historical reference; `src/main.tsx` mounts only the imported teammate application.

## Authentication

Copy `.env.example` to `.env.local` in `apps/web` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the same project as the Node API. Restart Vite after environment changes. Never put a secret/service-role key in a `VITE_` variable.

Enable Email/password, allow new signups, and keep Confirm email enabled in Supabase. Register:

```yaml
Site URL: http://localhost:5173
Redirect URLs:
  - http://localhost:5173/auth/callback
  - http://localhost:5173/auth/recovery
```

Each actual development origin needs its own exact entries. The current integration preview uses `http://127.0.0.1:5181`; to test email there, add both callback/recovery paths for that origin. Prefer the standard localhost:5173 URL for the settings above.

Account routes are `#/conta`, `#/conta/cadastro`, `#/conta/recuperar`. Password fields and confirmation/resend status reuse the teammate's existing form styles. Email callbacks use pathname routes `/auth/callback` and `/auth/recovery` before returning to hash-based exploration. Open the latest email in the browser/device that initiated the PKCE flow. A session-bound marker allows recovery-form refresh for up to 15 minutes. The API verifies bearer identity and authorization independently.

Keep Supabase's default `{{ .ConfirmationURL }}` email verification links. Production hosting must serve `index.html` for the native auth paths. The existing Node server supports this fallback when serving `apps/web/dist`.

## Checks

```powershell
pnpm --filter @gaiapus/web test
pnpm --filter @gaiapus/web build
# Against a running API and frontend:
$env:GAIAPUS_WEB_URL = 'http://127.0.0.1:5181'
pnpm --filter @gaiapus/web test:e2e
```

Browser tests use installed Chrome. They cover actual API publications, map fallback/search/navigation, light/mobile layouts, planning, imagery, 3D, and account/callback routes. Auth-provider unit tests simulate the provider; real email delivery still needs a live signup/recovery check.

`design/teammate-source-manifest.json` records original SHA-256 hashes for unchanged visual source files. Browser checks verify these hashes without requiring the sibling folder. Matching-size screenshots and measured geometry/fonts/colors are in `design/verification/teammate-comparison.json` and the accompanying reference/integrated screenshots.

Production build: `pnpm --filter @gaiapus/web build`; restart the Node server after building so static asset routes are registered against the latest build. The standalone file:// handoff build is intentionally not used for API/auth integration.
