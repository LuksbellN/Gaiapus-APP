# Simulação calculada 2027/2028 — estado (fora dos EUA) e raízes no perfil

Plano: `Gaiapus_nasa/docs/superpowers/plans/2026-11-15-gaiapus-simulacao-preditiva-2027-2028.md`. EUA: sessão paralela, entrando por dados no mesmo contrato.
Branches (sem push): APP `codex/simulacao-2027-2028` (worktree `Documents/Gaiapus-APP-2028`), ciência `codex/simulacao-2027-2028` (worktree `Documents/Gaiapus_nasa-2028`), ambos a partir de `origin/main`.

## O que funciona de ponta a ponta

Navegador → `Simulator` (`?modo=planejamento`) → `adapters/simulations.ts` → API `/v1/simulations/*` → artefatos publicados e verificados por sha256 → mesmos números no painel, gráfico, Talhão e Perfil do solo.

| Lugar | Culturas calculadas | Execuções (run_id) | Outras culturas (motivo) |
|---|---|---|---|
| Sorriso (BR:ibge:5107925) | soja; soja→milho 2ª | sim_0ef0f2562258c91c5a13ffff, sim_9ddd1c9949dbe442b92e9ac5 | arroz (inundado não representado), feijão 1ª/2ª (sem parâmetros no motor) |
| Uberlândia (BR:ibge:3170206) | soja; soja→milho 2ª | sim_88fd3ea122a8ad02ced3f899, sim_fd61ab4118a4e32398a12156 | milho 1ª, trigo, feijão (sem parâmetros), café arábica (perene sem motor), café total MG (agregado) |
| Rio Verde (BR:ibge:5218805) | soja; soja→milho 2ª | sim_33af8558ac1ce3bd53f064ec, sim_e269df77be6e76cb588194fc | milho 1ª, trigo, feijão, arroz |
| Barreiras (BR:ibge:2903201) | soja | sim_9cd555885306ffcd15715546 | milho 1ª, trigo |

Cada execução cobre as colheitas de **2027 e 2028** em simulação contínua (aquecimento observado, culturas e pousio no mesmo reservatório, 29/02/2028 incluído).

- **Informação até** 31/08/2026 (último dia com POWER/IMERG completo nos 4 pontos; set–nov/2026 ausentes por latência). Emitido em 15/11/2026.
- **Clima futuro:** 22 trajetórias por blocos análogos 2001–2022 (`historical_analog_blocks_v1`), cobertura padrão. Não é previsão diária; 2027 ≈ 2028 é o esperado.
- **Rendimento:** referência municipal PAM (média dos últimos ≤5 anos publicados até o `as_of`); último ano utilizável 2021, pois 2022–2024 são o teste selado e **não são lidos**. Milho 2ª em Uberlândia/Rio Verde: indisponível (sem rótulos no conjunto lido).
- **Status:** balanço hídrico `physical_experimental`; nenhum modelo promovido; MLPs não usados (são modelos de marco da safra, não de pré-plantio).

## Medições (máquina de publicação; Python)

Por execução: 4,7–5,5 s; pico Python (tracemalloc) 42–48 MiB; série 3,1–3,7 MB JSON → 0,95–1,20 MB gzip; 22 membros × 1.122–1.273 dias. Total publicado 7,7 MB.
Cena (Chrome, 1440×900, perfil, soja dia 70): 21 draw calls, ~6,2 mil triângulos; raízes em 1 InstancedMesh (≤ 96 segmentos/planta, ≤ 576 instâncias).

## Raízes

Todas **ilustrativas** com o motor atual (`crop-simulation-v1` é um reservatório único e devolve `root_depth_m = null`); sem centímetros, rótulo “Raízes ilustrativas”. Arquiteturas: soja pivotante com laterais, milho e braquiária fasciculados, café perene por idade. Crescimento determinístico e monótono no ciclo (não encolhe na maturação); sem raízes após a colheita e no pousio; nova cultura recomeça no estabelecimento. Caminho calculado (valor + origem modelada/observada, rótulo em cm, marca “continua abaixo”, valor nunca alterado) implementado e testado, sem uso até o motor fornecer profundidade. Controles: mostrar raízes, solo em corte (translúcido), estaca, régua; fallback 2D.

## Persistência (Supabase)

Migração aditiva `supabase/migrations/202611150001_future_simulations.sql`: `simulation_runs` (imutável após sucesso), `simulation_artifacts`, `regional_simulation_publications` (só regionais, sanitizadas, uma corrente por lugar×plano), `simulation_jobs` (fila com lease: claim/complete/fail só por service_role), RLS e buckets `simulation-public`/`simulation-private`. Testada em Postgres 17 isolado (`node supabase/tests/simulations.policies.test.mjs`): leitura pública só de regionais publicadas, privada só do dono, sem escrita do cliente, publicação de privada recusada, lease expirado e conclusão tardia de worker antigo recusada. **Não aplicada em nenhum projeto Supabase.**

## Testes

Ciência: `python -m pytest tests/test_weather_ensemble.py tests/test_future_simulation.py tests/test_future_simulation_publish.py tests/test_crop_simulation_*.py tests/test_simulation_*.py tests/test_water_balance*.py tests/test_location_weather.py`.
APP: web 239/239, API 43/43, contracts 20/21 (falha preexistente: pin byte a byte de `upstream/yield-estimate.schema.json`, já falhava antes), typecheck ok, Playwright completo 99/99 contra API + Vite locais, políticas Supabase ok.

## Reproduzir a publicação

```powershell
cd <Gaiapus_nasa-2028>
python -m data.serving.future_simulation_publish --places data/serving/future-simulation/places.json `
  --history-dir <ideias_nasa>/data/raw/training_v6/power --observed-dir <ideias_nasa>/data/processed/future_simulation_v1/observed `
  --labels <ideias_nasa>/data/processed/training_v5/labels.csv <ideias_nasa>/data/raw/training_v7/labels_all.csv `
  --out <saida> --as-of 2026-08-31T23:59:00+00:00 --seed 42
cd <saida>; node <Gaiapus-APP-2028>/packages/contracts/scripts/pin-future-simulation.mjs
```
`observed/BR_ibge_<código>.json` são cópias dos arquivos `data/cache/power/<lat>_<lon>_20250101_20261114.json` dos pontos do núcleo de lugares. Mesma entrada → mesmo `run_id` e mesmos bytes (gzip com mtime 0).

## Ainda não feito (impedimentos específicos)

1. Upload para Supabase Storage/Postgres e leitura pela API a partir do Supabase: falta script de upload e credenciais de projeto de teste; a API serve hoje os artefatos fixados no repositório.
2. Execuções privadas (`POST /v1/simulations`) e worker Python que consome `simulation_jobs`: tabela e funções prontas e testadas; rota e worker não implementados.
3. Demais ~1.000 municípios brasileiros com POWER 2001–2024 (`training_v6/v7`): calculáveis com o mesmo publicador, mas o `as_of` seria 31/12/2024 (sem observação recente) e não foram executados.
4. Adaptador sazonal (ECMWF/C3S): não implementado; o futuro é só climatológico, como o protocolo exige até haver avaliação local.
5. Culturas além de soja/milho 2ª: exigem conjunto de parâmetros versionado no motor; café exige motor perene.
6. Avaliação retrospectiva do sistema completo (protocolo congelado em `data/frozen/future_simulation_v1_protocol.json`): não medida.
7. Profundidade radicular calculada: o motor não modela raízes; as raízes são ilustrativas.
