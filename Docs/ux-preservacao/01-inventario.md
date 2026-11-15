# 01 — Inventário

Revisão `2cf2881` (main), inspecionada em 14/11/2026. Marcas de evidência: [N] navegador, [C] código, [T] teste executado, [D] documentação, [H] hipótese.

## 1. Repositório e referência

| Item | Valor |
|---|---|
| Repositório | `https://github.com/LuksbellN/Gaiapus-APP`, branch única `main` |
| Commit auditado | `2cf2881` "Frontend integration", 14/11/2026 16:44 −03 |
| Histórico | 5 commits: contratos e API (`5d6cf0a`, `d41d7af`), primeira interface (`a6cd617`), Auth (`af57629`), integração do frontend aprovado (`2cf2881`) |
| Clone local | `Documents\Gaiapus-APP` (máquina do Leandro), limpo; único item novo é `Docs/ux-preservacao/` |
| Ferramentas | Monorepo pnpm 10.14.0, Node `>=22.23.4 <23`. Nesta máquina há Node 22.23.2: pnpm avisa e executa. Bun não foi usado; nenhum lockfile mudou |
| Scripts web | `dev`, `build`, `preview`, `typecheck`, `test`, `test:e2e` (`apps/web/package.json:6-13`) |

### Comparação com a versão anterior

A "versão completa" de referência é o protótipo `gaiapus-web` em `ba34a03`. [C] `diff -rq` entre `gaiapus-web/src` e `apps/web/src/teammate`:

| Situação | Arquivos |
|---|---|
| Idênticos | 11 páginas exceto `Account` e `Records`; `styles.css`; `map/`; `sim/`; `ui/`; `catalog`, `capabilities`, `format`, `units`, `lazyPage`; todos os dados em `data/` |
| Alterados por acréscimo | `App.tsx` (+9 −5: `authPage`, remontagem por conta), `store.ts` (+18 −4: chaves por usuário), `config.ts` (rótulo "Dados de exemplo"), `adapters/index.ts` (+50 −20: API), `pages/Account.tsx` (+27 −14: senha, confirmação, reenvio), `pages/Records.tsx` (+2 −2: cancelamento por troca de conta), 2 testes |
| Novos | `adapters/http.ts`, `adapters/session.ts` e 5 arquivos de teste |
| Removidos comprovadamente | **Nenhum** |
| Não trazidos do protótipo | Os dois builds (`dist` por arquivo e `dist-web`), `manualChunks`, pré-carga de fontes, `e2e/run.mjs` (50 jornadas) e `e2e/review.mjs` (118 verificações), `axe-core` |
| Situação desconhecida | A "limpeza no outro computador" citada no briefing: não há branch, commit ou artefato dela neste repositório |

A última linha da tabela importa: a cobertura de testes de navegador caiu de 168 verificações para 6. As funções continuam; a proteção contra regressão, não.

## 2. Arquitetura ativa

```text
index.html → src/main.tsx
  ├─ initializeAuth()            features/auth/client.ts:12   (Supabase PKCE, opcional)
  ├─ initializeSessionBridge()   teammate/adapters/session.ts:19
  └─ <HashRouter><App authPage?/> teammate/App.tsx:44
        ├─ header: marca · contexto · selos · tema · conta
        ├─ nav.rail: 9 destinos (+ "Mais" no celular)
        └─ main[key=userId|guest] → Routes (14 rotas)
```

| Camada | Arquivo | Papel | Cuidado |
|---|---|---|---|
| Transporte | `teammate/adapters/http.ts` | `request`, `publishedExample`, `backend.{coverage,geography,me,updateName}` | Falha vira `AdapterError`; nunca cai para fixture |
| Cliente | `lib/api/client.ts` | Prefixo `/v1`, `Authorization: Bearer` só com e-mail confirmado (`features/auth/client.ts:11`) | Mensagens em português fixo (`:43`, `:49`) |
| Adapters | `teammate/adapters/index.ts` | geografia, cobertura, água, imagem, rendimento, Field Shift, registros locais, sondas, conta | Mistura explícita de API e publicações empacotadas |
| Sessão | `teammate/adapters/session.ts` | `syncSession`, `authAccount.{signIn,signUp,recover,resend,signOut}` | Identidade só do Supabase; `/v1/me` complementa o nome |
| Estado | `teammate/store.ts` | `gaiapus.v1.guest` e `gaiapus.v1.user.<id>`; `accountScope` invalida gravações pendentes | Tema é a única preferência que atravessa contas (`:42`) |
| Auth | `features/auth/` | callbacks nativos, recuperação com marcador de 15 min em `sessionStorage` | `history.replaceState` apaga query e hash do callback (`AuthPage.tsx:22`) |

### Chamadas à API por tela [N]

| Tela | Chamadas observadas |
|---|---|
| Explorar (município) | `GET /v1/coverage?area_id=<ibge>`; para Uberlândia também `area_id=published-field-uberlandia` |
| Explorar (busca) | `GET /v1/geography?q=…&limit=100` |
| Visão geral, Alertas | `GET /v1/examples/water-soy-5107925-N10`, `…/yield-soy-5107925-day75` |
| Município | `…/examples/yield-*`, `/v1/observations?area_id=published-field-uberlandia…`, `…/examples/field-shift-sorriso` |
| Simulador, Field Shift, Planejar | `…/examples/water-soy…`, `…/yield-soy…`, `…/field-shift-sorriso` |
| Conta (com sessão) | `GET /v1/me` |

Rotas da API que a interface ativa **não usa** [C]: `/v1/scientific-catalog`, `/v1/examples` (lista), `/v1/places`, `/v1/comparisons`, `/v1/evidence-views`, `POST /v1/yield-estimates`, `POST /v1/water-balance/scenarios`.

Catálogo geográfico da API [N]: 12 áreas. `BR`; `BR-MT`, `BR-MG`, `BR-GO`, `BR-BA`; municípios `5107925` Sorriso, `3170206` Uberlândia, `5218805` Rio Verde, `2903201` Barreiras; recortes `published-field-uberlandia`, `-rio-verde`, `-barreiras`.

## 3. Controles globais

| ID | Controle | Comportamento | Evidência |
|---|---|---|---|
| G-01 | Link "Pular para o conteúdo" | Primeiro Tab; Enter foca `#conteudo` | [N] `App.tsx:56` |
| G-02 | Marca Gaiapus | Vai a `/explorar`; `translate="no"` | [C] `App.tsx:58` |
| G-03 | Contexto atual | Mostra propriedade · talhão · cultura · safra, ou "Demonstração · Sorriso, MT · soja"; abre `/registros` | [N] `App.tsx:60-63` |
| G-04 | Selo "Edição 2026" | Só em telas largas | [C] `App.tsx:66` |
| G-05 | Selo "Dados de exemplo" | Só em telas largas | [C] `App.tsx:67`, `config.ts:3` |
| G-06 | Alternar tema | Claro/escuro; persiste; atualiza `theme-color` | [N] `App.tsx:46,68` |
| G-07 | Conta | "Entrar" ou nome; vai a `/conta` | [N] `App.tsx:69` |
| G-08 | Navegação lateral (desktop) | 9 destinos, separador antes de Registros, pré-carga por intenção | [N] `App.tsx:25-35,72-75` |
| G-09 | Barra inferior (celular) | Explorar, Visão geral, Simulador, Registros, Mais | [N] |
| G-10 | Rolagem ao trocar de rota | `#conteudo` volta ao topo | [C] `App.tsx:47` |
| G-11 | Pré-carga em ociosidade | Só telas leves; desligada com economia de dados | [C] `App.tsx:53`, `lazyPage.tsx:25-31` |
| G-12 | Falha ao baixar uma tela | "Não foi possível abrir esta tela" + Tentar de novo | [C] `lazyPage.tsx:38` |
| G-13 | Saída do callback | Qualquer navegação por hash sai de `/auth/*` para `/` | [T] `App.tsx:48-51` |
| G-14 | Remontagem por conta | `main[key]` reinicia formulários ao trocar de usuário | [T] `App.tsx:76` |
| G-15 | Página não encontrada | Título + link para o explorador | [N] `App.tsx:92` |
| G-16 | Falha de inicialização | Texto fixo "Não foi possível iniciar…" | [C] `main.tsx:20-22` |

Ausentes hoje: seletor de idioma, ajuda/tutorial, título do documento por tela, gestão de foco na troca de rota. Não são remoções; nunca existiram.

## 4. Rotas e capacidades

Total de controles visíveis em `main`, por estado, na varredura [N] (desktop/celular).

### `/explorar` — `pages/Explore.tsx`, `map/ExplorerMap.tsx`

Parâmetros: `pais` (`BR` ou ADM0_A3), `uf` (2 dígitos), `mun` (7 dígitos), `semwebgl` (teste). Controles: 244 no mundo, 39 no Brasil, ~95 num estado com malha.

| ID | Capacidade | Evidência | Status real |
|---|---|---|---|
| E-01 | Globo MapLibre com projeção de globo, arrastar e aproximar | [N] `ExplorerMap.tsx:14-23,61` | funcional; mapa-base exige rede |
| E-02 | Clique: município → estado → país | [C] `ExplorerMap.tsx:83-88` | funcional |
| E-03 | Destaque do país, estado e município selecionados | [C] `:35-44` | funcional |
| E-04 | Câmera enquadra seleção, respeitando painéis | [C] `:45-54` | funcional |
| E-05 | Marcadores Sorriso e Uberlândia | [N] `Explore.tsx:13` | lista fixa no código |
| E-06 | Busca com teclado (setas, Enter, Esc), `combobox` | [N] `:162-179` | funcional; depende da API (D-01) |
| E-07 | Lista de 232 países com filtro | [N] `:82-87` | funcional local |
| E-08 | Lista de 27 estados, os com malha primeiro | [N] `:94-95` | funcional local |
| E-09 | Lista de municípios com filtro, 80 por vez | [N] `:97-104` | funcional local (MG, MT) |
| E-10 | Trilha Mundo › País › UF › Município | [N] `:76-78` | funcional |
| E-11 | Detalhe do município: selo, resumo, produtos, ações | [N] `:137-160` | integração real + mapa local de produtos |
| E-12 | Detalhe de país sem análise | [N] `:88-93` | funcional, sem números |
| E-13 | Camadas: limites, municípios com análise, imagem HLS | [C] `:115-119` | funcional |
| E-14 | Legenda de três estados | [C] `:120-124` | funcional |
| E-15 | Minha localização | [C] `:47-56` | funcional só dentro do Brasil |
| E-16 | Voltar ao Brasil, aproximar, afastar | [C] `:128-130` | funcional |
| E-17 | Atalhos Brasil, Sorriso, Uberlândia | [N] `:105-109` | funcional |
| E-18 | Painel inferior no celular em três alturas | [C] `:15,72-73` | funcional |
| E-19 | Sem WebGL: aviso + listas | [T] `:66` | funcional |
| E-20 | Falha ao baixar o mapa: aviso + Tentar de novo | [C] `:67` | funcional |
| E-21 | Mapa-base sem rede: aviso, limites continuam | [C] `:70` | funcional |
| E-22 | Código de país ou município desconhecido | [C] `:88,138` | funcional |
| E-23 | "Cadastrar propriedade aqui" leva município à rota | [C] `:153` | funcional |
| E-24 | Voltar/avançar e link direto | [T] | funcional |

### `/visao-geral` — `pages/Overview.tsx`

Parâmetro: `mun` (padrão Sorriso). 4 controles.

| ID | Capacidade | Evidência | Status real |
|---|---|---|---|
| V-01 | Título, cultura, dia do ciclo, estágio, semeadura | [N] `:26` | integração real (exemplo publicado); **título fixo** |
| V-02 | Selos "Previsão" e "Escala municipal" | [N] `:27` | funcional |
| V-03 | Aviso de demonstração | [N] `:29` | some quando há talhão (D-02) |
| V-04 | Cartão de alerta: motivo, período, o que fazer, incerteza | [N] `:32-41` | integração real |
| V-05 | Tabela dos próximos dias | [N] `:42-47` | integração real |
| V-06 | Linha do tempo chuva × reserva × climatologia | [N] `:48` | integração real |
| V-07 | Lacunas da previsão (6 de 10 dias) | [N] `:49` | integração real |
| V-08 | Déficit por fase, safra 2020/21 | [N] `:52-57` | publicação empacotada |
| V-09 | Reserva de água no solo | [N] `:60-65` | integração real |
| V-10 | Três atalhos de tarefa | [N] `:66-71` | funcional |
| V-11 | Próxima atividade | [N] `:72-75` | funcional local; ignora o talhão ativo (D-04) |
| V-12 | Rendimento de referência + teste do modelo | [N] `:76-83` | integração real + publicação empacotada |
| V-13 | Erro com Tentar de novo e "Escolher outro local" | [N] `:17` | funcional |

### `/municipio` — `pages/Municipality.tsx`

Parâmetros: `mun` (só Sorriso e Uberlândia; outro valor cai em Sorriso, `:18`), `aba`, `cultura`.

| ID | Capacidade | Evidência | Status real |
|---|---|---|---|
| M-01 | Seletor de município (2 opções) | [N] `:22` | lista fixa |
| M-02 | Abas Clima, Água, Safra, Imagem orbital na URL | [N] `:23` | funcional |
| M-03 | Clima: chuva e ET0 por ano agrícola (Sorriso) | [N] `:34-35` | publicação empacotada |
| M-04 | Clima: chuva diária e total (Uberlândia) | [C] `:36-39` | integração real |
| M-05 | Aviso de séries ainda não publicadas | [N] `:40` | funcional |
| M-06 | Água: linha do tempo por ano agrícola | [N] `:50-52` | publicação empacotada |
| M-07 | Água: resumo por ano agrícola | [N] `:53-54` | integração real |
| M-08 | Água: vazio explicado para Uberlândia | [C] `:45` | funcional |
| M-09 | Safra: seletor das 10 culturas | [N] `:62` | funcional |
| M-10 | Safra: cartões de estimativa do local | [N] `:71-74` | exemplo demonstrativo |
| M-11 | Safra: MLP regional (soja) | [N] `:75-76` | publicação empacotada |
| M-12 | Safra: exemplo em outro município, identificado | [N] `:77` | exemplo demonstrativo |
| M-13 | Safra: tabela de capacidades e situação científica | [N] `:78` | funcional |
| M-14 | Imagem: NDVI × chuva com lacunas | [N] `:88-91` | integração real, recorte publicado |
| M-15 | Imagem: RGB HLS e metadados da cena | [N] `:92-93` | integração real |
| M-16 | Imagem: vazio para Sorriso | [N] `:84` | funcional; texto desatualizado (D-08) |

### `/planejar` — `pages/Plan.tsx`

Parâmetro: `mun`. 19 controles.

| ID | Capacidade | Evidência | Status real |
|---|---|---|---|
| P-01 | Local: URL → propriedade ativa → Sorriso demonstração | [N] `:20-21` | funcional |
| P-02 | Cultura (9 plantáveis) | [N] `:43` | funcional local |
| P-03 | Área, irrigação, solo | [N] `:44-46` | funcional local |
| P-04 | Prioridade: margem, produção, conservação | [N] `:48` | só registrada |
| P-05 | Avisos de irrigação e de café perene | [C] `:49-50` | funcional |
| P-06 | Comparar três datas de semeadura | [N] `:52-59` | integração real; só soja em Sorriso |
| P-07 | Economia: rendimento, forma do café, unidade, saca, preço, data, fonte, custo | [N] `:60-70` | funcional local |
| P-08 | Receita e margem com a conta escrita | [N] `:71-74` | funcional local |
| P-09 | Salvar planejamento | [N] `:30-34,77` | funcional local |
| P-10 | Salvar e abrir no simulador | [N] `:33,77` | passa só cultura e município |
| P-11 | Planejamentos salvos e reabertura | [N] `:78` | mostra 5 (D-05) |
| P-12 | Completar cultura de plano antigo | [C] `:25,41` | funcional |
| P-13 | Capacidades e situação científica | [N] `:81-85` | funcional |
| P-14 | Rascunho automático | [C] `:22` | funcional local |

### `/simulador` — `pages/Simulator.tsx`, `sim/`

Parâmetros: `cultura`, `mun`, `modo`, `ano`, `ab`, `secao`, `cafezal`, `seed`. 18 controles.

| ID | Capacidade | Evidência | Status real |
|---|---|---|---|
| S-01 | Quatro tipos de dado: histórico, cenário, previsão, climatologia | [N] `:17-22,106` | publicação empacotada + integração real |
| S-02 | Ano agrícola (6 safras) | [N] `:23,108` | publicação empacotada |
| S-03 | Comparar A/B | [N] `:109` | funcional |
| S-04 | Campo 3D, com 2D de reserva | [T] `:115` | ilustrativo |
| S-05 | Falha do 3D: 2D + Tentar de novo | [C] `:116` | funcional |
| S-06 | Linha do tempo com cursor por ponteiro e teclado | [N] `:130` | funcional |
| S-07 | Reproduzir/pausar, ±1 dia, +1 semana, fase anterior/próxima | [N] `:122-127` | funcional |
| S-08 | Velocidade (3 opções) | [N] `:128` | funcional |
| S-09 | Indicadores do dia, acumulado, diferença B−A | [N] `:133-141` | funcional |
| S-10 | Rendimento fixo, com aviso de que não muda | [N] `:142-143` | integração real |
| S-11 | Hipóteses fixas | [N] `:110` | funcional |
| S-12 | Recolher configuração; abas no celular | [N] `:100-102` | funcional |
| S-13 | Tela "sem série compatível" por cultura e local | [N] `:36-58` | funcional |
| S-14 | Café: produção × implantação | [N] `:46-51` | funcional |
| S-15 | Cultura e local como seletores | [N] `:104-105` | funcional |
| S-16 | Estado inteiro na URL | [T] `:64-68` | funcional; **cursor não está na URL** |

### `/field-shift` — `pages/FieldShift.tsx`

| ID | Capacidade | Evidência | Status real |
|---|---|---|---|
| F-01 | Pergunta respondida e selos | [N] `:19` | integração real |
| F-02 | Três indicadores de destaque | [N] `:20-24` | integração real |
| F-03 | Aviso de dependência da hipótese de palhada | [N] `:25` | integração real |
| F-04 | Tabela A × B × B−A, 8 indicadores + rendimento "não avaliado" | [N] `:26-29` | integração real |
| F-05 | Dia a dia por ano agrícola | [N] `:30-31` | publicação empacotada |
| F-06 | Abrir no simulador | [N] `:32` | funcional |
| F-07 | Sensibilidade às hipóteses | [N] `:33-35` | integração real |

### `/propriedades` e `/registros` — `pages/Records.tsx`

| ID | Capacidade | Evidência | Status real |
|---|---|---|---|
| R-01 | Aviso de modo local ou armazenamento indisponível | [N] `:12` | funcional |
| R-02 | Lista de propriedades e talhões; talhão "Em uso" | [N] `:28-29` | funcional local |
| R-03 | Nova propriedade: nome, município por busca, área | [N] `:31-38` | funcional local; busca depende da API (D-01) |
| R-04 | Novo talhão: propriedade, nome, área, solo, irrigação, contorno | [N] `:39-45` | funcional local |
| R-05 | Recorte demonstrativo de Uberlândia | [C] `:43` | demonstrativo |
| R-06 | Município vindo do explorador | [N] `:16,20` | funcional |
| R-07 | Seletor de talhão | [N] `:69` | funcional |
| R-08 | Quatro tipos de registro | [N] `:11,70` | funcional local |
| R-09 | Plantio: cultura, cultivar, datas prevista e realizada, área, sistema, irrigação, anterior, idade e poda do cafezal | [C] `:106-108` | funcional local |
| R-10 | Manejo: 9 tipos, data, quantidade, unidade, observação | [C] `:109-110` | funcional local |
| R-11 | Colheita: data, área, quantidade, unidade, saca, forma, umidade, qualidade, perdas, origem; produtividade | [C] `:111-113` | funcional local |
| R-12 | Venda: preço, moeda (BRL, USD), situação, três custos; receita e margem | [C] `:114-115` | funcional local |
| R-13 | Validação por campo e foco no primeiro erro | [C] `:89-96` | funcional |
| R-14 | Rascunho por tipo e talhão; limpar rascunho | [N] `:84,105,117` | parcial (D-06) |
| R-15 | Histórico com safra, origem e revisão | [C] `:73-76` | funcional local |
| R-16 | Abrir, editar, excluir com confirmação | [C] `:75,78` | funcional local |
| R-17 | Completar cultura ambígua | [C] `:75,106` | funcional |
| R-18 | Gravação cancelada ao trocar de conta | [T] `:31,39` | funcional |

### `/dispositivos` e `/alertas` — `pages/Devices.tsx`

| ID | Capacidade | Evidência | Status real |
|---|---|---|---|
| D-S1 | Duas sondas com umidade, temperatura, profundidade, bateria, sinal, calibração, falha | [N] `:6-14` | sintético, identificado |
| D-S2 | Alerta de água: motivo, período, fonte, ação, incerteza | [N] `:15-22` | integração real; local fixo em Sorriso |
| D-S3 | Outros tipos de alerta: vazio explicado | [N] `:23` | sem suporte |

### `/conta`, `/conta/cadastro`, `/conta/recuperar` — `pages/Account.tsx`; `/auth/*` — `features/auth/AuthPage.tsx`

| ID | Capacidade | Evidência | Status real |
|---|---|---|---|
| C-01 | Entrar com e-mail e senha | [T] `:10-26` | integração real; não exercido contra Supabase |
| C-02 | Criar conta com nome; confirmação por e-mail | [T] `:13,18` | idem |
| C-03 | Reenviar confirmação | [C] `:23` | idem |
| C-04 | Recuperar acesso | [C] `:27-30` | idem |
| C-05 | Continuar sem conta | [N] `:21` | funcional |
| C-06 | Aviso "Contas indisponíveis" sem Supabase | [N] `:17` | funcional |
| C-07 | Perfil: nome, e-mail, "Conta conectada", perfil da API com Tentar de novo | [C] `:32-34` | integração real |
| C-08 | Aviso de modo local | [C] `:9` | funcional |
| C-09 | Contagem de dados e atalhos | [C] `:35` | funcional local |
| C-10 | Exportar JSON sem nome nem e-mail | [C] `:33`, `adapters/index.ts:242` | funcional local |
| C-11 | Consentimento de pesquisa, com data | [T] `:37` | funcional local; nada é enviado |
| C-12 | Sair | [T] `:39` | integração real |
| C-13 | Apagar todos os dados do aparelho, com confirmação | [C] `:39-40` | funcional local |
| C-14 | Callback de confirmação | [T] `AuthPage.tsx:34-44` | integração real |
| C-15 | Recuperação: nova senha em dois campos; retomada por 15 min | [T] `:48-59`, `recovery.ts` | integração real |
| C-16 | Erros de link expirado, usado ou incompleto | [N] `urls.ts:9-16` | funcional |

### `/mais` e `/design-preview`

| ID | Capacidade | Evidência | Status real |
|---|---|---|---|
| X-01 | Mais: Município, Planejar, Field Shift, Sondas, Alertas, Propriedades, Conta, Linguagem visual | [N] `More.tsx:4` | funcional |
| X-02 | Linguagem visual: cores com contraste medido, tipografia, controles, estados, abas, números | [N] `DesignPreview.tsx` | funcional |

`/propriedades` e `/design-preview` não têm entrada na navegação do desktop: só se chega por links dentro de outras telas ou pela URL [C] `App.tsx:25-35`.

## 5. Dados, contratos e persistência

| Dado | Origem | Onde fica | Sincroniza? |
|---|---|---|---|
| Países (232) | `data/geo/countries.json`, Natural Earth | pacote | — |
| Estados (27), municípios MG e MT | `data/geo/*.json`, IBGE | pacote, sob demanda | — |
| Cobertura por produto | `GET /v1/coverage` | rede | — |
| Rótulos e destinos dos produtos | `COVERAGE` local (`adapters/index.ts:67-75`) | pacote | — |
| Projeção hídrica, rendimento, Field Shift | `GET /v1/examples/:id` | rede | — |
| NDVI, chuva, imagem | `GET /v1/observations` + geometria local | rede + pacote | — |
| Série diária de Sorriso | `data/sorriso-daily.json` (444 kB) | pacote, sob demanda | — |
| Exemplos v7, matriz, teste selado, MLP | `data/fixtures/`, `data/*.json` | pacote | — |
| Sondas | geradas no adapter | código | — |
| Propriedades, talhões, registros, planos, rascunhos, talhão ativo | `localStorage` por conta | aparelho | **não** |
| Consentimento de pesquisa | `localStorage` por conta | aparelho | **não** |
| Tema | `localStorage`, atravessa contas | aparelho | não |
| Sessão | Supabase SDK | `localStorage` do SDK | sim |
| Nome de exibição | `/v1/me` | rede | sim |
| Marcador de recuperação e retorno | `sessionStorage` | aba | — |

Chaves de `localStorage` observadas [N]: `gaiapus.v1.guest`. A chave antiga `gaiapus.v1` é lida uma vez como origem do visitante (`store.ts:24`) e também pelo script de tema de `index.html:20`, que por isso **não vê** o tema salvo na chave nova (D-19).

## 6. Catálogo de culturas

10 IDs do contrato; 9 plantáveis (`catalog.ts:4-23`). Soja; milho 1ª e 2ª safra; feijão 1ª e 2ª safra; arroz; trigo; café arábica; café conilon; café total MG (coorte, não plantável). Braquiária e "Outra" existem só como opção de registro (`:29-31`). A API aceita apenas `soy` e `maize2` em `POST /v1/yield-estimates` [D]; o cadastro das nove permanece local e independente disso.

## 7. Testes existentes

| Suíte | Arquivos | Resultado nesta revisão |
|---|---|---|
| Unitários (`vitest`) | 15 arquivos em `apps/web/src` | **64 de 64** [T] |
| Navegador (`playwright`, Chrome) | `tests/e2e/frontend.spec.ts`, 6 cenários | **5 de 6**; falha o de hashes [T] |
| Typecheck | `tsc --noEmit` | limpo [T] |
| Build | `vite build` | concluído em 8,8 s [T] |

O que os 6 cenários de navegador cobrem: visão geral com API, mapa sem WebGL + busca + voltar, tema e fluxo local no celular, imagem + Field Shift + simulador, telas de conta e callbacks. Não cobrem: países, culturas, rascunhos, planos, economia, números, falha de API, acessibilidade.

Pacotes do build [T]: `index` 200 kB (67 gzip), `ExplorerMap` 948 kB (259), `Field3D` 842 kB (226), `mun-31` 535 kB (147), `sorriso-daily` 444 kB (73), `mun-51` 224 kB (66), `states` 107 kB (33). Mapa e 3D continuam fora do carregamento inicial.
