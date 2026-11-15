# Núcleo global por lugar (BR + EUA) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** os 7 lugares (Sorriso, Uberlândia, Rio Verde, Barreiras, Story IA, York NE, Sumner KS) servem o mesmo núcleo de dados (limite, recorte, clima diário, balanço hídrico FAO-56 por safra, NDVI, previsão de 10 dias) por `/v1/locations/:id/core`. O frontend lê esse núcleo para qualquer lugar.

**Architecture:**
- O gerador Python no repositório científico produz um JSON por lugar mais um manifesto com hashes.
- O `Gaiapus-APP` fixa esses arquivos por hash em `packages/contracts/fixtures/location-core/`, valida com Ajv e serve em rotas públicas novas, só aditivas.
- O frontend troca a leitura fixa de Sorriso pelo adaptador `locations.core(id)`.

**Tech Stack:**
- ciência: Python 3.13, `unittest`, requests, rasterio (já usados);
- contratos: Node, Ajv 8, json-schema-to-typescript;
- API: Fastify;
- web: React 18, TypeScript estrito, Vitest, Playwright.

**Spec:** `Docs/2026-11-14-nucleo-global-lugares-design.md` (seções 5.1–5.7; a 5.7 prevalece).

**Repositórios:**
- `SCI` = `C:\Users\leand\OneDrive - Universidade Federal de Uberlândia\Área de Trabalho\ideias_nasa` (LeandroJerse/Gaiapus_nasa);
- `APP` = `C:\Users\leand\Documents\Gaiapus-APP`.

## Global Constraints

- **Sem treino nem mudanças científicas protegidas:** nenhum modelo é treinado. Não alterar `CROPS['soy']`, `CROPS['maize2']`, exemplos v6/v7, smoke cases nem pins existentes.
- **Ids:** `^(BR:ibge:[0-9]{7}|US:fips:[0-9]{5})$`, sempre texto. FIPS conferido na tabela oficial do Census, nunca de memória.
- **Proveniência e honestidade:**
  - toda camada `available` tem `source`, `period` e `rows` não vazias;
  - toda `unavailable` tem `reason_code` ∈ {`no_field_imagery`, `too_few_clear_scenes`, `forecast_not_in_publication`, `crop_calendar_unknown`, `out_of_season`, `source_unavailable`};
  - NDVI com nuvem fica `null`, nunca interpolado;
  - a previsão sempre leva `issued_at`.
- **Limites de coleta:**
  - nenhuma caixa geográfica une países;
  - imagens HLS lidas só por janela do recorte;
  - volume total do piloto ≤ 2 GB.
- **Segredos:** nenhuma chave, `.env` ou segredo em commit ou log. As fontes usadas não exigem chave.
- **Não quebrar o que existe:** endpoints existentes inalterados (`/v1/coverage`, `/v1/observations`, `/v1/examples`, `/v1/places` privado).
- **Frontend:**
  - textos novos nas cinco línguas;
  - mudança visual registrada com `node scripts/record-visual-change.mjs "<motivo>"` (em `apps/web`);
  - `pnpm --filter @gaiapus/web typecheck`, Vitest e Playwright verdes.
- **Git:**
  - commits pequenos por tarefa;
  - no `APP`, branch por etapa, PR para `main` e merge só com SonarCloud aprovado;
  - no `SCI`, branch local `feat/location-core`; os planos não commitados do Leandro nesse repo não são tocados.

## Review Focus

1. **Lugar dos EUA sem nenhum número do Brasil:** os testes de frontend comparam, campo a campo, que nenhum valor do núcleo de Sorriso aparece em `US:fips:*`.
2. **Previsão fora da safra:** em novembro, `maize1`/`soy` nos EUA → `forecast.status = unavailable`, `out_of_season`. Teste com a data de emissão fixada.
3. **FIPS com zero inicial e id malformado:** a API recusa `US:fips:9169` com 400, aceita `US:fips:19169` e responde 404 para um FIPS válido não publicado.
4. **Safra que atravessa o ano:** trigo de inverno de outubro a junho. O balanço precisa de um único ciclo contínuo e a janela de NDVI precisa cobrir os dois anos.
5. **Lugar brasileiro duplicado na Exploração:** com `legacy_area_id`, Sorriso aparece uma vez. Teste e2e na lista "Regiões com dados".

---

### Task 1 (APP): contrato `LocationCore` v1

**Files:**
- Modify: `packages/contracts/scripts/schema-definition.mjs` ($defs e `routes`)
- Generated: `packages/contracts/schemas/application.json`, `src/generated/types.ts`, `src/generated/routes.ts`
- Create: `packages/contracts/fixtures/location-core/test/BR_ibge_9999999.json` (sintético, só para teste)
- Create: `packages/contracts/src/location.test.ts`

**Interfaces — produz:**
- `$defs`:
  - `LocationId` (pattern acima);
  - `LocationIdParams { id }`;
  - `LocationSummary { id, country, scheme, code, name, admin1_code, admin1_name, centroid:[lon,lat], bbox:[w,s,e,n], legacy_area_id?, layers:{weather,water_balance,ndvi,forecast: LayerStatus} }`;
  - `LocationCore` (seção 5.2 com 5.7: `crops[]`, `water_balance.seasons[]`);
  - `LayerStatus = 'available'|'unavailable'`;
  - `LocationPageResponse`, `LocationCoreResponse`.
- Rotas: `['GET','/v1/locations',null,'PageQuery','LocationPageResponse',false]` e `['GET','/v1/locations/:id/core',null,'LocationIdParams','LocationCoreResponse',false]`.

- [ ] **Step 1:** testes em `location.test.ts`:
  - Ajv aceita o sintético;
  - recusa `US:fips:9169` e `XX:abc:1`;
  - recusa camada `available` com `rows: []`;
  - recusa `unavailable` sem `reason_code`;
  - recusa `reason_code` fora da lista.
- [ ] **Step 2:** `pnpm --filter @gaiapus/contracts test` → FALHA (defs inexistentes).
- [ ] **Step 3:** declarar os `$defs` e as rotas; `pnpm contracts:generate` (ou `pnpm --filter @gaiapus/contracts generate`).
- [ ] **Step 4:** testes e `generate:check` passam; `pnpm -r typecheck` verde.
- [ ] **Step 5:** commit `feat(contracts): LocationCore v1 schema and public routes (additive)`.

### Task 2 (SCI): culturas `maize1` e `wheat_winter` no balanço

**Files:** Modify `data/models/water_balance.py` (`CROPS`); Create `tests/test_water_balance_crops.py`.

**Interfaces — produz:** `CROPS['maize1']`, `CROPS['wheat_winter']` com `phase_days`, `kc_initial`, `kc_mid`, `kc_end` e `p_base`, valores da FAO-56 (tabelas 11, 12 e 22). Um comentário cita a linha usada:
- milho grão, "USA, Corn Belt" ou equivalente;
- trigo de inverno, "Central USA".

- [ ] **Step 1:** testes:
  - `CROPS['soy']` e `CROPS['maize2']` idênticos ao valor atual (snapshot);
  - `simulate()` aceita um ciclo exato das novas culturas e recusa ciclo curto;
  - `kc_mid` dentro da faixa da FAO-56.
- [ ] **Step 2:** rodar `python -m unittest tests.test_water_balance_crops` → FALHA.
- [ ] **Step 3:** adicionar as duas entradas.
- [ ] **Step 4:** teste novo e `tests/test_serving_contracts.py` passam.
- [ ] **Step 5:** commit.

### Task 3 (SCI): catálogo de lugares, limites e calendários

**Files:**
- Create: `data/serving/locations.v1.json`, `data/serving/location_catalog.py`, `tests/test_location_catalog.py`
- Saída: `data/serving/location-core/boundaries/*.geojson`

**Interfaces — produz:**
- `load_catalog() -> list[Location]`;
- `resolve_fips(state, county_name) -> str`, a partir do arquivo Census Gazetteer de condados 2024;
- `boundary(location) -> GeoJSON`: IBGE Malhas v4 para BR, Census cartographic boundary 500k para os EUA, condado e estado.

**Cada entrada do catálogo tem:**
- `id` e `legacy_area_id`;
- `field_bbox`:
  - reaproveita os `published-field-*` de Uberlândia, Rio Verde e Barreiras;
  - Sorriso e os condados: caixa de cerca de 800 m dentro de lavoura, escolhida com MapBiomas ou CDL, com a justificativa em `rationale`.
- `crops[]` = { `crop`, `season`, `sowing_date`, `harvest_date`, `calendar_source` }:
  - EUA: mediana do NASS Crop Progress do estado (citar o relatório);
  - MT/MG: calendário fixo atual;
  - GO/BA: ZARC; se não houver, `calendar_source: null`.
- `soil` = AD4 55 mm, como hipótese.

- [ ] **Step 1:** testes:
  - FIPS preserva o zero inicial;
  - os 3 FIPS resolvidos batem com a Gazetteer;
  - todo `field_bbox` está dentro do limite (máscara);
  - id malformado é recusado;
  - cultura sem calendário marca `crop_calendar_unknown`.
- [ ] **Step 2:** rodar → FALHA.
- [ ] **Step 3:** implementar. Pesquisar e registrar no JSON as datas do NASS Crop Progress e do ZARC, com URL e data de consulta.
- [ ] **Step 4:** passam.
- [ ] **Step 5:** commit.

### Task 4 (SCI): clima diário e balanço hídrico por safra

**Files:** Create `data/serving/location_weather.py`, `tests/test_location_weather.py`.

**Interfaces:**
- consome `live_features.fetch_power` e `water_balance.et0_daily`, `simulate`;
- produz:
  - `weather_rows(location, start, end) -> list[{date, rain_mm, et0_mm, tmin_c, tmax_c}]`, de 2015-01-01 a 2024-12-31, chuva POWER `IMERG_PRECTOT`;
  - `seasons(location, weather) -> list[Season]`, um `simulate` por safra completa dentro do período, armazenamento inicial igual ao do `water_balance_v1`.

- [ ] **Step 1:** testes:
  - balanço de Sorriso, soja 2023/24, com os insumos do `water_balance_v1`, reproduz `storage_end_mm` dentro de 0,1 mm;
  - safra incompleta no período é descartada, não truncada;
  - trigo out→jun forma um único ciclo;
  - dias sem chuva no POWER (`-999`) tornam a camada `unavailable` com `source_unavailable`, nunca zero.
- [ ] **Step 2:** rodar → FALHA.
- [ ] **Step 3:** implementar, com cache em `data/cache/power/<id>.json`.
- [ ] **Step 4:** passam.
- [ ] **Step 5:** commit.

### Task 5 (SCI): NDVI da safra no recorte

**Files:** Modify `data/ingest/field_imagery.py`; Create `tests/test_field_ndvi.py`.

**Interfaces:**
- extrair `field_ndvi(bounds, boundary_geojson, start, end) -> {observations, selected_scene}`, sem depender de `BR.geojson`, MG ou `city.geojson`;
- `build()` antigo passa a chamá-la, com o mesmo resultado para Uberlândia.

- [ ] **Step 1:** testes:
  - com menos de 3 datas limpas, status `unavailable`, `too_few_clear_scenes`;
  - cena com nuvem mantém `ndvi: null`;
  - recorte fora do limite levanta erro;
  - `build()` de Uberlândia produz o mesmo `field.json` (comparação com o arquivo publicado, por hash).
- [ ] **Step 2:** rodar → FALHA.
- [ ] **Step 3:** refatorar.
- [ ] **Step 4:** passam.
- [ ] **Step 5:** commit.

### Task 6 (SCI): previsão de 10 dias

**Files:** Create `data/serving/location_forecast.py`, `tests/test_location_forecast.py`.

**Interfaces:**
- `forecast(location, issued_on: date) -> Layer`:
  1. procura uma safra em curso em `issued_on`;
  2. se houver, faz o spin-up do balanço com o POWER desde a semeadura até `issued_on - 1`;
  3. avança 10 dias com Open-Meteo `ecmwf_ifs025` diário (`water_projection.advance`);
  4. se não houver safra em curso, devolve `unavailable` com `out_of_season`.

- [ ] **Step 1:** testes com rede simulada (fixtures):
  - milho dos EUA em 2026-11-15 resulta em `out_of_season`;
  - soja de Sorriso em 2026-11-15 resulta em `available` com `issued_at` e 10 linhas;
  - falha da Open-Meteo resulta em `source_unavailable`.
- [ ] **Step 2:** rodar → FALHA.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** passam.
- [ ] **Step 5:** commit.

### Task 7 (SCI): montar e publicar os 7 pacotes

**Files:**
- Create: `data/serving/location_core.py`, `tests/test_location_core.py`
- Saída: `data/serving/location-core/{BR_ibge_5107925,…,US_fips_20191}.json`, `manifest.json`

**Interfaces:**
- `python -m data.serving.location_core --issued-on YYYY-MM-DD` gera os 7 arquivos;
- o manifesto contém `{generator_commit, generated_at, files:[{id, path, sha256, bytes}]}`.

- [ ] **Step 1:** testes:
  - o pacote montado de um lugar sintético valida contra `APP/packages/contracts/schemas/application.json#/$defs/LocationCore`, com `jsonschema` sobre uma cópia lida em tempo de teste;
  - o hash do manifesto confere.
- [ ] **Step 2:** rodar → FALHA.
- [ ] **Step 3:** implementar e rodar a geração real dos 7 lugares, conferindo o tamanho (≤ 2 MB por lugar). Se passar disso, reduzir as linhas do balanço aos campos do contrato.
- [ ] **Step 4:** testes passam e os 7 arquivos validam.
- [ ] **Step 5:** commit no `SCI` (só código e pacotes de saída; o cache fica fora).

### Task 8 (APP): fixar os pacotes e servir as rotas

**Files:**
- Create: `packages/contracts/fixtures/location-core/{7 arquivos, manifest.json, pin.json}`
- Modify: `packages/contracts/src/fixtures.ts` (exporta `locations`, `locationCores`, validados por Ajv na carga)
- Create: `apps/api/public/publications/location-core-v1/*.geojson` (limites)
- Modify: `apps/api/src/modules/geography/public.ts`, registrar em `app.ts`
- Test: `apps/api/src/modules/locations.test.ts`

**Interfaces — produz:** handlers `GET /v1/locations` (paginado, `publicResult`) e `GET /v1/locations/:id/core`.

- [ ] **Step 1:** testes:
  - lista com 7 lugares;
  - `core` de `US:fips:19169` retorna 200;
  - `US:fips:9169` retorna 400;
  - `US:fips:01001` retorna 404;
  - ETag estável;
  - os testes atuais de `/v1/coverage`, `/v1/observations` e `/v1/places` continuam verdes.
- [ ] **Step 2:** rodar `pnpm --filter @gaiapus/api test` → FALHA.
- [ ] **Step 3:** copiar os pacotes do `SCI` (manifesto e hashes conferidos no `pin.json`) e implementar os handlers.
- [ ] **Step 4:** `pnpm -r test` e `pnpm -r typecheck` verdes.
- [ ] **Step 5:** commit, PR e merge após o SonarCloud.

### Task 9 (APP web): núcleo no frontend

**Files:**
- Modify: `apps/web/src/teammate/adapters/index.ts` (`locations.list`, `locations.core`; `dailySeries`/`waterProjection` deixam de estar fixos em Sorriso para os dados do núcleo)
- Modify: `geo/coverageIndex.ts` (une `/v1/locations` por `legacy_area_id`)
- Modify: `pages/Municipality.tsx` (abas Clima, Água e Imagem leem o núcleo), `pages/Explore.tsx` (EUA: estado → condado)
- Modify: `ui/ScopeStrip.tsx` (país, cultura, hipóteses)
- Modify: catálogos `i18n/messages/*.ts` (textos novos e "código oficial")
- Test: `adapters/locations.test.ts`, `tests/e2e/regressao/eua.spec.ts`

- [ ] **Step 1:** testes:
  - adaptador mapeia `unavailable` para o motivo traduzido;
  - Story, York e Sumner abrem com clima, balanço e NDVI;
  - nenhum valor do núcleo de Sorriso aparece num lugar dos EUA;
  - previsão mostra "emitida em";
  - Sorriso aparece uma vez em "Regiões com dados";
  - de/fr a 320 px sem rolagem horizontal;
  - Field Shift e rendimento de Sorriso inalterados.
- [ ] **Step 2:** rodar → FALHA.
- [ ] **Step 3:** implementar. Textos novos traduzidos pelo Codex com a terminologia do doc 08.
- [ ] **Step 4:** Vitest e Playwright verdes; registrar a mudança no manifesto.
- [ ] **Step 5:** commit, PR e merge após o SonarCloud; atualizar `Docs/ux-preservacao/09-status-implementacao.md` e o tutorial (`tour.explore.s1`).
