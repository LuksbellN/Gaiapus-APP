# Gaiapus

Personal agricultural evidence workspace: public published geography/history/examples, verified private places and immutable saved comparisons. The frontend is developed separately in `apps/web`; the Node API and internal Python adapter are independently runnable.

- [Primeiro deploy unificado](Docs/2026-11-15-primeiro-deploy.md)
- [Deploy Azure econômico: configuração e comandos](Docs/azure-deploy.md)
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

## How Gaiapus answers Field Shift

Case: Sorriso, MT (IBGE 5107925), agricultural years 2015/16 to 2020/21, screen `/#/field-shift`. Every value on the screen carries one of these labels: historical simulation, sensitivity test (not a climate projection), qualitative (literature, not simulated) or not assessed. Demo numbers: [Docs/field-shift-rotacoes/NUMEROS-DEMO.md](Docs/field-shift-rotacoes/NUMEROS-DEMO.md).

| What the brief asks | Where it is answered |
|---|---|
| At least 3 rotations, including the current one | Strategy list and table: A · current rotation (soy → second-season maize → fallow, the reference), B · soy → maize + brachiaria, C · soy → fallow (no second-season maize). Any of them can be the reference (`?ref=B`). |
| Why, evidence, benefits, gaps and risks for each rotation | One decision card per strategy (why · what the simulation shows · evidence · gaps · risks to review on site), with the footer "supports, does not replace, the decision of the farmer and the agronomist". |
| Farmer priorities shape the comparison | "Your priority" selector (margin, production, soil conservation), started from the saved plan when the address names it (`?plano=`). It reorders indicators and highlights what is read first, with one sentence quoting the numbers; it never creates a score and never changes the calculations. Margin is not calculated: the screen lists the inputs the farmer must provide. |
| Bare soil and vulnerable seasons | Card "Bare soil and vulnerable seasons": bare-soil days, bare-soil days in the rainy season (Nov–Apr) and rain falling on bare soil (an erosion-exposure proxy, not erosion). |
| How uncertainty is handled | Differences paired season by season with their range over 6 seasons; one-at-a-time sensitivity to the hypotheses (cover Kc, straw factor, soil class AD2/AD6, soy sowing ±15 days); "not assessed" instead of a number wherever there is no method (yield, carbon, nematodes, weeds). |
| Rain and temperature scenarios | Rain control with the calculated points −20%, historical and +20% (delta-change on historical weather, not a forecast), also applied to the bare-soil indicators. Temperature +1.5 °C is shown as not calculated, with the reason. |
| Simple explanation of ET, soil moisture and NDVI; satellite vs field data | Collapsible "How to read these numbers" guide on the same screen. |

**NASA data:** NASA POWER daily point data (weather and FAO-56 reference evapotranspiration inputs); GPM IMERG precipitation, read through NASA POWER; HLS v2 (Harmonized Landsat Sentinel-2) for NDVI of a demonstration field.
**Other sources:** IBGE (municipal boundaries and PAM municipal crop statistics); Open-Meteo ECMWF IFS (`ecmwf_ifs025`) daily forecast for the water projection.
**Methods:** FAO-56 reference evapotranspiration and single crop coefficient; daily soil-water bucket (AD4, 55 mm available water); delta-change rain sensitivity; retrospective Ridge regression with walk-forward validation for the municipal yield estimates (soy and second-season maize), separate from Field Shift.

**Limitations.** Field Shift is a historical simulation at one weather grid point, not a field measurement: the grid point is not the municipal mean nor a plot. Soil is a fixed hypothesis (AD4, 55 mm), not a measured profile. Yield, margin, soil carbon, infiltration, weeds, nitrogen, pests and nematodes are not simulated. C has fewer crops; it is not a diversified rotation. Crotalaria was not calculated for lack of validated parameters. Temperature scenarios are not calculated. The probes on the Probes screen are demonstrations with synthetic data and are never plotted against the model as validation.

### Use of Super Intelligence (SI)

The original idea, the scientific choices and the product direction are the team's. Code was written with the assistance of Claude (Anthropic), under the team's direction and review; every number shown comes from the published packages and scripts in this repository.
