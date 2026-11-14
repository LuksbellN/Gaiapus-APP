# gaiapus-web — frontend da Gaiapus

Aplicação React + TypeScript + Vite. Mapa em MapLibre GL (globo), campo 3D em React Three Fiber, ícones Lucide. Sem Tailwind/shadcn: os controles são componentes próprios em `src/ui` sobre CSS com tokens (ver DESIGN.md).

## Rodar

```sh
bun install
bun run dev        # desenvolvimento, com recarga
bun run build      # verifica tipos e gera os dois builds (dist/ e dist-web/)
bun run preview    # serve dist-web/ em http://localhost:4173  ← preview para revisar
bun run test       # testes unitários (Vitest)
```

Para revisar: `bun install && bun run build && bun run preview` e abra `http://localhost:4173`. Sem servidor, abra `dist/index.html` com duplo clique.

### Os dois builds

Saem do mesmo código (`vite.config.ts`):

| Pasta | Comando | Para quê |
| --- | --- | --- |
| `dist/` | `bun run build:file` | Um único script clássico (3,8 MB; 978 kB gzip): `dist/index.html` abre direto do disco, sem servidor. Tudo embutido. |
| `dist-web/` | `bun run build:web` | Módulos ES com divisão de código, para hospedar por HTTP. Mapa e 3D só chegam na tela que os usa. |

### Carregamento do build hospedado (medido em 14/11/2026, `evidence/review-rede.json`)

Chromium, sem cache, preview local sem compressão; a coluna gzip é o que um servidor com compressão enviaria. Tiles do mapa-base são tráfego externo (demotiles.maplibre.org).

| Momento | Pedidos | Próprios, bruto | Próprios, gzip | Externo | MapLibre | Three.js |
| --- | --- | --- | --- | --- | --- | --- |
| Primeira carga em `#/visao-geral` | 16 | 766 kB | 226 kB | 0 | não | não |
| Ócio, 8 s sem interação | 12 | 120 kB | 43 kB | 0 | não | não |
| Entrada no mapa | 32 | ≈1.210 kB | ≈330 kB | 457 kB | sim | não |
| Entrada no simulador | 2 | 819 kB | 219 kB | 0 | não | sim |
| Primeira carga na rota padrão `#/explorar` | 56 | ≈1.650 kB | ≈525 kB | 457 kB | sim | não |
| Ócio com "Economia de dados" ligada | 0 | 0 | 0 | 0 | não | não |
| Ponteiro sobre o link "Simulador" | 3 | 34 kB | 12 kB | 0 | não | não |

- Da primeira carga em `#/visao-geral`, 434 kB brutos (73 kB gzip) são a série diária de Sorriso que a própria tela usa, e 68 kB são fontes. A casca do aplicativo (HTML, CSS, React, roteador) fica em cerca de 75 kB gzip.
- Nas linhas do mapa o medidor registra também 478 kB do worker do MapLibre, que é um blob criado em memória e não um download; os valores acima já o descontam (por isso o "≈").
- Pré-carga: 3 s depois da primeira tela, com o navegador ocioso, são baixados só os arquivos leves das outras telas (o "ócio" da tabela), para a navegação resistir à queda de rede. MapLibre e Three.js nunca entram nessa pré-carga. Passar o ponteiro, focar ou tocar num link do menu baixa só o arquivo daquela tela. Com `navigator.connection.saveData` ou rede 2G, nada é baixado antes da navegação.
- Falha de download de uma tela, do mapa ou do 3D mostra aviso com "Tentar de novo"; a tentativa refaz o download sem recarregar a página nem tocar no armazenamento local.

O mapa-base precisa de internet; limites do IBGE, dados e fontes estão embutidos.

### Testes de navegador (Playwright)

Na primeira vez: `bunx playwright install chromium`. Com `bun run preview` rodando:

```sh
node e2e/run.mjs explorar|registros|dados                                  # jornadas sobre dist/ (file://) → evidence/e2e-*.json
GAIAPUS_URL=http://localhost:4173/ node e2e/run.mjs explorar               # as mesmas sobre o preview → evidence/e2e-*-web.json
GAIAPUS_URL=http://localhost:4173/ node e2e/review.mjs rede|retry|url|culturas|paises|a11y   # revisão de entrega → evidence/review-*.json
GAIAPUS_URL=http://localhost:4173/ node e2e/shots.mjs all dark             # capturas por rota → evidence/capturas/
GAIAPUS_URL=http://localhost:4173/ node e2e/shots-culturas.mjs             # capturas das telas por cultura
```

`review.mjs`: `rede` mede o tráfego por fase; `retry` provoca falha real de download e testa "Tentar de novo"; `url` cobre link direto, voltar e avançar; `culturas` cobre cadastro, planejamento, Safra e simulador por cultura, migração e unidades; `a11y` roda axe-core, sobreposição de painéis, fontes e alvos de toque em Explorar, Visão geral, Planejar e Simulador (1440 e 390 px, escuro e claro).

## Culturas

`src/catalog.ts` é o catálogo único (dez IDs do contrato de rendimento; nove plantáveis). `src/capabilities.ts` diz, por cultura e município, o que é cadastro local, exemplo demonstrativo, integração pendente ou sem suporte. A matriz completa e as pendências de backend estão em [CULTURAS.md](CULTURAS.md).

## Dados

Os scripts abaixo leem pastas do repositório `Gaiapus_nasa` (um nível acima); só funcionam com `gaiapus-web/` dentro dele. Build, testes e preview não dependem disso: os dados já estão em `src/data`.

- `bun run data:test` — copia o resultado do teste selado 2022–2024 de `data/frozen/`.
- `node scripts/build-countries.mjs` — gera `src/data/geo/countries.json` (código, nome em português, continente e enquadramento de 232 países e territórios) a partir do tile 0/0/0 do mapa-base. Precisa de internet; não depende do repositório pai.
- `node scripts/sync-contract-examples.mjs` — copia os exemplos `yield-v7-*.json` de `contracts/examples/` para `src/data/fixtures/v7/`.

`node scripts/prepare-data.mjs [pasta-do-pacote-v7] [raiz-do-repo]` regenera `src/data` a partir de `data/processed/handoff_v7/gaiapus-v7` (ZIP de integração extraído) e de `gaiapus-mvp/data`. A malha municipal de MT vem da API de Malhas do IBGE.

## Rotas

`#/explorar` (`?pais=BR&uf=31&mun=3170206`; outros países: `?pais=ARG`, código ADM0_A3 do mapa-base), `#/visao-geral`, `#/municipio?mun=&aba=clima|agua|safra|imagem&cultura=<id>`, `#/planejar?mun=`, `#/simulador?cultura=<id>&mun=&modo=historico|cenario|previsao|climatologia&ano=2020-2021&ab=1&secao=campo|indicadores|configurar`, `#/field-shift`, `#/registros`, `#/propriedades`, `#/dispositivos`, `#/alertas`, `#/conta` (`/cadastro`, `/recuperar`), `#/design-preview`.

Parâmetros de teste: `?semwebgl=1` (força falha de WebGL), `?latencia=700` (atraso dos adapters, ms), `?seed=7` (semente do campo 3D).

## Adapters (`src/adapters/index.ts`)

Cada função é assíncrona, aceita `AbortSignal` e devolve `{ data, meta }`, em que `meta.kind` é `fixture` (pacote v7), `mock` (ilustrativo), `sintetico` ou `local`. Para integrar o backend, troque o corpo da função por `fetch` mantendo assinatura e `meta`.

| Adapter | Função | Hoje | Contrato / origem |
| --- | --- | --- | --- |
| geography | `states`, `municipalities(uf)`, `search(q)` | embutido | IBGE Malhas v4 + Localidades; MG e MT com municípios |
| geography | `countries()` | embutido | Natural Earth via MapLibre demotiles; só geografia, sem dado agrícola por país |
| coverage | `get(code)` | mock | catálogo de cobertura (a definir no backend) |
| weather | `waterProjection(code)` | fixture | `contracts/water-projection.schema.json` |
| weather | `dailySeries(code)` | fixture | `scenario/*_daily.csv` |
| imagery | `series(code)` | fixture | `gaiapus-mvp/data/field.json` (HLS + IMERG) |
| crops | `yieldEstimate({crop, municipalityCode})` | fixture | `contracts/yield-estimate.schema.json`; erros `invalid_crop` (400), `invalid_municipality_code` (400), `municipality_not_covered` (422) |
| crops | `regionalMlp(code)`, `matrix()` | fixture | `smoke/soy_mg_mt.json`, `metrics/crop_matrix.csv` |
| crops | `yieldExamples({crop, municipalityCode?})` | fixture | `contracts/examples/yield-v7-*.json` (1.1.0) + exemplos 1.0.0; modelo, versão e abrangência vêm da resposta |
| crops | `sealedTest()` | fixture | `data/frozen/test_2022_2024_v7.json` (teste selado 2022–2024); atualizar com `bun run data:test` |
| simulations | `fieldShift(code)` | fixture | `contracts/field-shift.schema.json` |
| seasons | `saveProperty`, `savePlot`, `saveRecord` | localStorage | IDs estáveis, `event_at`/`recorded_at`/`updated_at`, origem, revisão |
| devices | `list()` | sintético | telemetria de `data/fake` |
| account | `signIn`, `signOut`, `setConsent`, `exportData` | local | sem senha; depende do serviço de contas |

`latestOnly()` (`src/adapters/core.ts`) descarta respostas de pedidos antigos; é o que impede dados de Sorriso sob o título de Uberlândia.

## Licenças e atribuições

MapLibre GL JS (BSD-3) · tiles de demonstração MapLibre / Natural Earth (domínio público), atribuição no mapa · limites: IBGE · React, React Router, Three.js, React Three Fiber, Lucide (MIT/ISC) · Bricolage Grotesque e Source Sans 3 (SIL OFL 1.1) · imagem HLS: NASA, via Microsoft Planetary Computer. Nenhum componente foi copiado de ForgeUI, Vengeance UI, Animate UI, Uiverse ou Uilora; da ForgeUI só se mediu o tempo de um movimento.
