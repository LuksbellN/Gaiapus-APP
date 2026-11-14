# Start Supabase for Gaiapus

The API is already usable for public evidence without a Supabase project. These steps enable real identity and durable personal records. Use a dedicated development project for the first setup and integration tests.

## 1. Create the project

1. Open [Supabase Dashboard](https://supabase.com/dashboard), create an organization if necessary, and create a project named `gaiapus-dev`.
2. Choose a region suitable for your users (Brazil if offered). Generate and store the database password securely. The Node application does not need that password for ordinary requests.
3. Wait for provisioning, then open the project's **Connect** dialog. Copy its **Project URL** and **publishable key** (a legacy **anon** key is also supported). Do not use a secret key or `service_role` key in these environment settings.

Official reference: [React quickstart and project connection](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs).

## 2. Configure identity

In **Authentication → Providers / Sign In**, enable email/password and keep **Confirm email** enabled. In **Authentication → URL Configuration**, use:

```text
Site URL: http://localhost:5173
Redirect allowlist:
http://localhost:5173/auth/callback
http://localhost:5173/auth/recovery
```

The frontend agent must implement those routes, preserve allowed public context, and reject external `returnTo` destinations. If it selects different paths, change the allowlist to those exact paths. For production, replace the Site URL with the actual HTTPS application origin and add its exact callback/recovery URLs; do not leave a broad production wildcard.

Official reference: [redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls). The browser signs in with Supabase Auth and sends its access token to Node. Node verifies it through `getUser`; it derives the owner and uses the same user's bearer token for database access.

## 3. Create the application tables

For a new development project, open **SQL Editor → New query**, paste the full contents of `supabase/migrations/202611140001_personal.sql`, and run it once. It creates the catalog target registry, five private tables, ownership policies, restricted grants, immutable snapshot guards, and scoped transaction functions.

Do not disable RLS. Do not grant anonymous access to private tables. This migration is an initial versioned migration, not a script to rerun against an already migrated project.

For CLI-managed migrations, install/use the official Supabase CLI, run `supabase login`, `supabase link --project-ref YOUR_DEV_PROJECT_REF`, then inspect `supabase db push --dry-run` before `supabase db push`. Future migrations belong in `supabase/migrations`.

Local development alternative, with Docker running: `supabase start`. Use its local URL/key in the configuration below. `supabase db reset` rebuilds the **local development database** and reapplies migrations; it destroys that local database's data. Never pass a remote database URL for this reset workflow. The included `supabase/config.toml` keeps email verification enabled; open the local email viewer address printed by the CLI to confirm test signups.

## 4. Configure server-attested storage

Generate a random 32-byte key locally, for example with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Store it in Node's `.env` as `APP_STORAGE_SIGNING_KEY`. It is **not** a browser key, Supabase publishable key, or service-role key.

In the development project's SQL Editor, configure that same key once using this template (replace the placeholder privately):

```sql
insert into app_private.signing_config(singleton,secret)
values(true,'REPLACE_WITH_THE_GENERATED_SERVER_ONLY_KEY')
on conflict(singleton) do update set secret=excluded.secret;
```

Authenticated users cannot read this private table or directly insert snapshots/review records. Narrow transaction functions verify Node's signature and its bound owner before writing; this prevents fabricated client scientific JSON and arbitrary review versions from bypassing the application. Node still uses the user's bearer identity rather than a service-role client. Keep the Node/database keys synchronized when rotating them; durable already-saved snapshots do not need re-signing.

## 5. Configure the application

Copy `.env.example` to `.env` in the repository root and fill in:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
APP_STORAGE_SIGNING_KEY=YOUR_GENERATED_SERVER_ONLY_KEY
SCIENCE_MODE=fixture
```

The API reads that file when started with `pnpm dev:api` or its package start script. Keep it uncommitted; it is ignored.

Give the frontend agent the same URL/key. Its own `apps/web/.env.local` can use:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_APP_API_MODE=http
```

The frontend owns the exact variable names it reads. No service key is needed in either browser or ordinary Node handlers. Configure Vite to proxy `/v1` and `/publications` to `http://localhost:3001` during development. Production serves both through Node on one origin.

## 6. Check the first real account

1. Run `pnpm --filter @gaiapus/contracts build`, then `pnpm dev:api`.
2. Register through the frontend and confirm the email link. A signed-in but unconfirmed account must still be rejected by private operations.
3. Send `GET /v1/me` with `Authorization: Bearer ACCESS_TOKEN`. The response initializes profile/preferences once and contains your verified user ID.
4. Save `area_id: "5107925"` through `POST /v1/places`; retry and check that the same record is returned.
5. Save a public example through `POST /v1/comparisons` with an `Idempotency-Key`, then reopen it through its private GET route. `apps/api/requests.http` provides request examples without secrets.

## 7. Run hosted ownership checks

Create two dedicated test accounts in the development project, confirm both emails, and give them **no real user data**. The integration test creates/deletes places and snapshots for those accounts and signs them out afterward. It must never use a privileged key. Set these environment variables only in your local terminal or secret configuration:

```text
SUPABASE_TEST_URL
SUPABASE_TEST_PUBLISHABLE_KEY
SUPABASE_TEST_USER_A_EMAIL
SUPABASE_TEST_USER_A_PASSWORD
SUPABASE_TEST_USER_B_EMAIL
SUPABASE_TEST_USER_B_PASSWORD
SUPABASE_TEST_STORAGE_SIGNING_KEY
```

Run `pnpm test:database`. Missing configuration deliberately fails the test, so an unconfigured project is never reported as a verified integration. The separately executed PostgreSQL policy harness verifies real RLS roles locally but does not substitute for this Supabase Auth/PostgREST run.

After these checks, coordinate the frontend's real sign-in → place save → example save → reopen walkthrough. The API agent does not modify frontend components or browser tests.
