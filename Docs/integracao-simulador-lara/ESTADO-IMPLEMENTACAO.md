# Estado da implementação — integração Gaiapus + simulador do Lara

Atualizado a cada etapa. Plano: `PLANO.md`; especificação: `ARQUITETURA.md`; auditoria: `AUDITORIA.md` (cópias da pasta de planejamento em `Gaiapus_nasa/docs/superpowers/plans/2026-11-15-integracao-lara/`).

## 0. Isolamento e trabalho concorrente

| Repositório | Checkout principal (intocado) | Worktree desta integração | Branch | Base |
|---|---|---|---|---|
| Gaiapus-APP | `C:\Users\leand\Documents\Gaiapus-APP` | `C:\Users\leand\Documents\Gaiapus-APP-lara` | `codex/integracao-simulador-lara` | `e8d2402` (feat/location-core) |
| Gaiapus_nasa | `…\Área de Trabalho\ideias_nasa` | `C:\Users\leand\Documents\Gaiapus_nasa-lara` | `codex/integracao-simulador-lara` | `8bb7358` (feat/location-core) |

Alterações abertas de outras sessões, preservadas sem edição nos checkouts principais:

- **APP** (estados dos EUA no mapa): `adapters/index.ts`, `geo/ids.ts`, `map/ExplorerMap.tsx`, `pages/Explore.tsx` modificados; novos `geo/us*.ts`, `i18n/usStates.ts`, `ui/USStatesPanel.*`, `data/geo/us-states.json`, `tests/e2e/regressao/us-states.spec.ts`, `Docs/2026-11-15-estados-eua-mapa.md`.
- **Ciência**: `gaiapus-web/`, planos em `docs/superpowers/plans/`, `handoff/`, `.codex-us-states/`, `protocolo-dados.md`.

Esta integração evita editar esses arquivos. Na fusão, os conjuntos são disjuntos, exceto se uma etapa futura precisar de `adapters/index.ts` (registrado se ocorrer).

## 1. Inventário (Etapa 1)

### Frontend ativo

`apps/web/src/main.tsx` monta `teammate/App` (HashRouter). Rotas: `/`, `/visao-geral`, `/explorar`, `/local`, `/municipio`, `/planejar`, `/simulador`, `/field-shift`, `/registros`, `/propriedades`, `/dispositivos`, `/alertas`, `/conta/*`, `/ajuda`, `/mais`, `/design-preview`. Cinco catálogos: `i18n/messages/{pt-BR,en,es,fr,de}.ts`, com teste de paridade de chaves e placeholders (`i18n/coverage.test.ts`).

### Simulador atual (`pages/Simulator.tsx`)

| Combinação | O que acontece | Origem dos números |
|---|---|---|
| Soja × Sorriso (`5107925`) | `SorrisoSimulator`: modos histórico, cenário (braquiária), previsão, climatologia; ano 2015/16–2020/21; A/B; timeline única; cena 3D/2D | Fixture `data/sorriso-daily.json` (pacote v7, `scenario/*_daily.csv`) e `fixtures/water-soy-5107925-N10.json` (projeção publicada). Rendimento: serviço separado (`crops.yieldEstimate`) |
| Qualquer outra cultura/local | Tela `sim-unavailable`: explica o que existe e falta; café com implantação/produção; tabela de capacidades | Nenhum cálculo |

`capabilities.ts`: `hasDailySeries` só para soja em Sorriso; demais capacidades `demo`/`pendente`/`sem_suporte` por cultura × município. **Nada calcula ao vivo no frontend; tudo o que aparece no simulador é fixture publicada.**

Cena 3D (`sim/Field3D.tsx`): talhão 18×30 instâncias, fases por calendário demonstrativo, cor do solo pela fração de água, `frameloop="demand"`, teclado, fallback 2D (`sim/field-state.tsx`). Campos ausentes no dado atual: profundidade de raiz, escoamento, irrigação, perfil por camada, temperatura.

### API e adaptador

`apps/api/src/modules/{account,analysis,comparisons,evidence,geography}` + rotas `/v1/locations`. `services/science-adapter/source-pin.json` aponta para a ciência em `ecae8c4` (anterior ao HEAD científico `8bb7358`); `v7-pin.json` fixa os modelos. Não existe rota de simulação.

### Ciência

`data/models/water_balance.py` (bucket FAO-56 congelado, resíduo de massa explícito). Não existe `data/models/crop_simulation/`.

### Lara (referência)

Snapshot de 32 arquivos em `evidencias/source/` conferido contra o commit imutável `76aaf46f8d02c8834de266dc6f6cfb2c641caf0f` (= `main` em 15/11/2026): **32/32 idênticos**, salvo uma quebra de linha final adicionada pelo snapshot. O repositório **não declara licença**; por isso nenhum arquivo é copiado: ideias visuais são reimplementadas no código Gaiapus com nota de proveniência.

### Baseline (antes de qualquer alteração)

| Comando | Resultado |
|---|---|
| `pnpm --filter @gaiapus/contracts build` | ok (necessário antes de typecheck/testes web) |
| `pnpm typecheck` | ok |
| `pnpm --filter @gaiapus/web test` | 28 arquivos, 188 testes passaram |
| `pnpm --filter @gaiapus/api test` | 14 arquivos, 39 testes passaram |
| `pnpm test` (contracts + api) | **1 falha preexistente**: `keeps the pinned scientific schemas … byte-for-byte` — `upstream/yield-estimate.schema.json` no HEAD tem sha256 `95337dd…`, `pin.json` espera `b52fcf2…`; igual no checkout principal. Não alterado (artefato científico pinado) |
| Ciência: `python -m pytest tests/test_water_balance.py tests/test_water_balance_crops.py tests/test_location_weather.py -q` | 16 passaram, 1 skip (auditoria registrou 17 passados; o skip depende de dado local ausente no worktree) |

E2E (`pnpm --filter @gaiapus/web test:e2e`) exige servidor em `:5174`; não executado no baseline.

## 2. Etapas

| Etapa | Estado | Arquivos | Testes |
|---|---|---|---|
| 1 Inventário | concluída | este arquivo | baseline acima |
| 8 Visualização sem recálculo | concluída | `sim/scene-adapter.ts`, `sim/profile-model.ts`, `sim/Profile2D.tsx`, `sim/SoilProfile3D.tsx` (novos); `pages/Simulator.tsx`, `styles.css`, 5 catálogos i18n, `design/teammate-source-history.json` (alterados); testes `sim/scene-adapter.test.ts`, `sim/profile-model.test.ts`, `pages/Simulator.profile.test.tsx`, `tests/e2e/regressao/simulador-perfil.spec.ts` | web 207/207 (188 + 19 novos); typecheck ok; E2E completo 94/94 contra API + Vite locais |

## 3. Capacidades disponíveis ao usuário

- **Simulador › Vista “Perfil do solo”** (soja/Sorriso, todos os modos): alternância Talhão/Perfil no topo da cena, guardada no link (`?vista=perfil`). Corte de solo com cor = fração da água disponível na zona radicular, gotas proporcionais à chuva do dia, seta de drenagem quando há drenagem, folhas coloridas por ks (verde ≥ 1; amarelo < 1; marrom < 0,5). Mesmo cursor, mesmo dia e mesmos números do painel e do gráfico. Fallback 2D (`?semwebgl=1`/sem WebGL), partículas paradas com movimento reduzido, pausa de animação com aba oculta, teclado (setas, + e −).
- O que **não** aparece, por falta de suporte do dado publicado (bucket único AD4 55 mm, sequeiro): raízes, régua de profundidade, sondas virtuais 15/40 cm, escoamento, irrigação. O card “Perfil do solo” explica isso; o adaptador já aceita esses campos quando um método futuro os sustentar (`SceneCapabilities`).
- Talhão 3D, rendimento, modos e A/B continuam como antes.

## 4. Limitações conhecidas

- Toda a simulação exibida continua sendo fixture publicada de Sorriso; não há cálculo arbitrário.
- O perfil é ilustrativo: altura das plantas segue o calendário demonstrativo de fases; o limite inferior da zona radicular é desconhecido e aparece como degradê, não como linha.
- Chrome headless com WebGL por software emite avisos de desempenho de leitura de buffer durante a animação; sem efeito funcional. Desempenho em aparelho de referência não foi medido.
- O spec E2E do perfil foi escrito após a implementação (os testes unitários foram escritos e vistos falhando antes).
- `design/teammate-source-history.json` recebeu entradas novas; a sessão concorrente (estados dos EUA) pode acrescentar entradas no mesmo arquivo — conflito trivial de JSON na fusão.
