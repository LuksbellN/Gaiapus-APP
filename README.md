# Gaiapus

Personal agricultural evidence workspace: public published geography/history/examples, verified private places and immutable saved comparisons. The frontend is developed separately in `apps/web`; the Node API and internal Python adapter are independently runnable.

- [API startup, routes and deployment](apps/api/README.md)
- [Create/configure Supabase](Docs/2026-11-14-gaiapus-supabase-setup.md)
- [API/frontend handoff and v7 renderer change](Docs/2026-11-14-gaiapus-api-handoff.md)
- [Scientific adapter, supplied v7 models and remaining gates](services/science-adapter/README.md)
- [Implementation/check record](Docs/2026-11-14-gaiapus-api-implementation-plan.md)

```powershell
pnpm install --frozen-lockfile
pnpm --filter @gaiapus/contracts build
pnpm dev:api
```

Node `22.23.4`, pnpm `10.14.0`, Python `3.13`. Copy `.env.example` to `.env` for server configuration. Public reads require no credentials. Private routes require real confirmed Supabase identity and the migration. v7 scientific outputs remain retrospective, with explicit national/regional scope and publication provenance; no automated planting recommendation or yield effect is inferred from water/Field Shift simulations.
