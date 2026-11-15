# 05 — Implementação e aceite

> **Para quem for executar:** usar `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans`, tarefa por tarefa. Os passos usam caixas `- [ ]`. **Nada deste plano começa sem autorização explícita do Leandro.**

**Objetivo:** corrigir os riscos de leitura e de dado (P0), dar continuidade às jornadas, tornar o mundo pesquisável com cobertura explícita, oferecer cinco idiomas e tutoriais opcionais, sem retirar nenhuma capacidade da matriz de `03`.

**Arquitetura:** tudo dentro de `apps/web/src/teammate` e `tests/e2e`. Os adapters continuam a fronteira com a API; uma camada `i18n/` com formatação `Intl` e catálogo próprio; preferências do aparelho numa chave fora dos baldes de conta; tutoriais declarativos carregados sob demanda.

**Tecnologia:** React 18, TypeScript estrito, Vite 7, React Router 6 (HashRouter), MapLibre 5, Three/R3F, Vitest, Playwright (Chrome instalado). pnpm 10.14 do monorepo.

**Especificação:** os documentos `01` a `04`, `06` e `07` desta pasta.

## Restrições globais

- Não tocar em `apps/api`, `packages/contracts`, `services/`, `supabase/`, `.env*`. Leandro e Lucas são donos do repositório: dependências novas do frontend (ex.: `axe-core`) podem entrar no lockfile da raiz sem pedir autorização (decisão de 14/11/2026), sempre com `pnpm add --filter @gaiapus/web`, sem regenerar o lockfile do zero.
- Bun é a preferência do Leandro para Node/JS; o monorepo é pnpm. Usar os scripts existentes com `pnpm --filter @gaiapus/web …`.
- Ambiente: a implementação e as verificações que faltaram nesta auditoria (Supabase real, e-mail, Safari, Firefox, aparelho físico, leitor de tela) serão feitas em outra máquina; não exigem configuração nesta.
- Nenhuma linha da matriz de `03` pode perder destino ou teste. Retirada de função é decisão separada do Leandro.
- Falha de API nunca vira número local; publicação empacotada continua identificada como tal.
- Nenhum ID científico, código geográfico, valor de usuário ou resposta de modelo muda com o idioma.
- Endpoints que exigem IBGE só recebem `ibge:mun:`.
- Supabase Auth, PKCE, `/auth/callback`, `/auth/recovery`, `safeReturnPath`, marcador de recuperação, `currentAccessToken` e isolamento por conta ficam como estão.
- Mapa, 3D, catálogos de idioma não-pt e tutoriais fora do carregamento inicial.
- Mudança em arquivo do manifesto (`styles.css`, `Explore.tsx`, `Overview.tsx`, `Simulator.tsx`, `Plan.tsx`, `ui/index.tsx`, `ExplorerMap.tsx`, `Field3D.tsx`) é registrada no histórico do manifesto (T1), nunca por atualização silenciosa de hash.
- Commits pequenos numa branch (`ux-preservacao`), sem push nem deploy sem autorização.

## Foco de revisão

Situações que a especificação implica e que podem escapar aos testes de cada tarefa. Cada linha tem teste na tarefa dona.

1. **Rascunho antigo digitado em pt-BR aberto com o idioma em inglês** deve continuar lendo `10,5` como 10,5 → teste em B2 (`parseDraftValue usa __locale do rascunho`).
2. **Resposta tardia da API depois de trocar de talhão, cultura ou idioma** não pode sobrescrever o que o usuário já editou nem trocar o lugar exibido → teste em B3 (`latestOnly descarta resposta de lugar anterior`) e I2 (`troca de idioma não refaz pedidos`).
3. **Usuário entra numa conta com o tour aberto ou com rascunho de visitante** → nada do visitante aparece na conta → teste em H1 e em B7.
4. **Link antigo com `pais=BRA`, `uf` sem `mun`, `mun` de UF sem malha** abre o lugar certo com o estado certo → teste em G1.
5. **Armazenamento local bloqueado** (modo privado) → idioma e tema funcionam na sessão, aviso de persistência continua, nada quebra → teste em B7.

---

## 1. Ordem e dependências

```text
Fase 0  T1 manifesto ─┐
        T2 rede de regressão ──────────────────────────────┐ (base de tudo)
Fase 1  B2 parser ── B7 preferências ── B1 busca ── B3 contexto ── B4 planos ── B5 rascunhos ── B6 auth ── B8 pequenos
Fase 2  O1 título/foco ── O2 origem ── O3 navegação ── O4 plano→simulador ── O5 dia na URL
Fase 3  G1 IDs ── G2 índice de cobertura ── G3 estados ── G4 recortes ── G5 busca multilíngue ── G6 posição
Fase 4  I1 núcleo i18n ── I2 seletor ── I3 códigos gravados ── I4 culturas/opções ── I5 telas ── I6 auth/transporte ── I7 países ── I8 revisão
Fase 5  H1 motor de tutorial + Ajuda ── H2 roteiros
```

Dependências cruzadas: B2 antes de qualquer I*; B7 antes de I2; G5 depende de I7 para nomes; H2 depende de I1 (textos por chave) e dos `data-tour` colocados nas fases 2–3.

Separação pedida no briefing: **correção de bug** = T1, B1–B8; **reorganização** = O1–O5; **exploração global** = G1–G6; **idiomas** = I1–I8; **nova ajuda** = H1–H2; **integração futura do backend** = seção 6.

## 2. Tarefas

### Fase 0 — antes de qualquer mudança visível

#### T1: Manifesto de integridade que funciona em qualquer checkout

**Arquivos:** modificar `tests/e2e/frontend.spec.ts:7-13`; criar `apps/web/design/teammate-source-history.md`.
**Decisão prévia:** com quem integrou a interface (D-18). Proposta: hash calculado sobre conteúdo com fim de linha normalizado para LF; os hashes do manifesto continuam os originais (calculados com CRLF), e o teste converte LF → CRLF antes do hash, provando identidade com a entrega original sem alterar o manifesto.

- [ ] Escrever o teste `manifesto confere com fim de linha normalizado` (mesma asserção de hoje, com normalização).
- [ ] Rodar `pnpm --filter @gaiapus/web test:e2e -g "approved stylesheet"` num clone limpo → PASS (hoje FALHA).
- [ ] Criar o histórico: cada mudança deliberada futura num arquivo do manifesto registra tarefa, motivo e novo hash; o teste aceita o hash original **ou** o último registrado no histórico.
- [ ] Commit.

**Aceite:** a suíte de 6 cenários fica verde num clone novo. **Reversão:** reverter o commit.

#### T2: Rede de regressão antes de reorganizar

**Arquivos:** criar `tests/e2e/regressao/*.spec.ts` (um arquivo por grupo da seção 5), `tests/e2e/helpers.ts`; modificar `apps/web/playwright.config.ts` (`testMatch` passa a `**/*.spec.ts`); adicionar `@axe-core/playwright` como devDependency de `@gaiapus/web` (`pnpm add -D --filter @gaiapus/web @axe-core/playwright`; autorizado).
**Base:** portar as verificações de `gaiapus-web/e2e/run.mjs` e `review.mjs` (168) para Playwright Test, contra API real local; capturas vão para `test-results/`, nunca sobre `design/verification/` (a suíte atual sobrescreve três capturas versionadas; mudar o caminho delas também).

- [ ] Escrever RT-01 a RT-19 e RT-24, RT-26 descrevendo o comportamento **atual** (onde o atual é o defeito de `02`, escrever o teste do comportamento desejado como `test.fixme` com o ID do achado).
- [ ] Rodar contra a revisão atual → os testes ativos PASSAM; os `fixme` ficam listados.
- [ ] Commit.

**Aceite:** relatório lista N ativos verdes e os `fixme` mapeados para D-01…D-28. **Reversão:** só testes; reverter não afeta o app.

### Fase 1 — correções de bug

#### B2: Leitura de números por idioma (D-03, P0)

**Arquivos:** criar `teammate/i18n/number.ts`, `teammate/i18n/number.test.ts`; modificar `teammate/ui/form.tsx:11` (`num` passa a chamar `parseLocaleNumber(s, 'pt-BR')` enquanto I1 não existe), `Plan.tsx`, `Records.tsx` (mensagem de erro quando `ok: false`).
**Interfaces — produz:**
`parseLocaleNumber(text: string, locale: Locale): { ok: true; value: number } | { ok: false; reason: 'empty' | 'ambiguous' | 'invalid'; hint: string }`
`num(s: string | undefined, locale?: Locale): number | null` (assinatura atual + locale opcional; `null` em qualquer falha).

- [ ] Testes com a tabela de `07`, seção 6 (8 entradas × 5 locales) e: `num('1.234,5') === 1234.5` (teste atual preservado); `num('10.5') === null` em pt-BR; `parseLocaleNumber('10.5','pt-BR').hint` contém "10,5".
- [ ] Teste do foco de revisão 1: `parseDraftValue({ area: '10,5', __locale: 'pt-BR' }, 'en') === 10.5`.
- [ ] Rodar `pnpm --filter @gaiapus/web test -- number` → FALHA.
- [ ] Implementar com `Intl.NumberFormat(locale).formatToParts(1234.5)` para descobrir separadores.
- [ ] Campos numéricos mostram a dica no erro do campo (`Field error=`); a margem do plano mostra "Falta: área (use vírgula para decimais)".
- [ ] RT-14 deixa de ser `fixme`. Rodar unitários e RT-14 → PASS. Commit.

**Aceite:** tabela de D-03 dá o valor correto ou recusa. **Risco:** usuários que digitam `1.5` em pt-BR passam a ver erro em vez de valor errado (desejado). **Reversão:** `num` volta à linha antiga.

#### B7: Preferências do aparelho fora dos baldes de conta (D-20)

**Arquivos:** criar `teammate/prefs.ts`, `teammate/prefs.test.ts`; modificar `store.ts:42` (tema deixa o estado da conta), `App.tsx:46,68`, `index.html:20`.
**Interfaces — produz:** `getPrefs(): Prefs`, `setPrefs(patch: Partial<Prefs>): void`, `usePrefs<T>(sel)`; `type Prefs = { v: 1; theme: 'dark' | 'light'; locale: Locale | null; lastExplore: string | null }`; chave `gaiapus.prefs`.

- [ ] Testes: tema claro escolhido na conta A sobrevive à recarga (reproduz o script de `02`, D-20); trocar de conta não muda tema; migração copia `theme` do balde ativo uma vez; `localStorage` que lança erro → valores em memória, sem exceção (foco de revisão 5).
- [ ] FALHA → implementar → PASS. `index.html` lê `gaiapus.prefs`.
- [ ] RT-27. Commit.

**Aceite:** D-20 resolvido; baldes de conta intactos. **Reversão:** reverter; o tema volta a morar no estado.

#### B1: Busca resiliente (D-01, P0)

**Arquivos:** modificar `adapters/index.ts:43-62`, `Explore.tsx:162-179`, `Records.tsx:19`; teste em `adapters/search.test.ts`.
**Interfaces — produz:** `geography.search(q, signal): Promise<{ places: Place[]; total: number; remote: 'ok' | 'failed' | 'skipped' }>`. **Consome:** `latestOnly` (`core.ts:24`).

- [ ] Testes: com `fetch` rejeitando, `search('argentina')` devolve Argentina e `remote: 'failed'`; com 503 idem; com sucesso, resultados da API entram sem duplicar; `AbortError` continua propagando.
- [ ] FALHA → implementar com `Promise.allSettled` só para a parte remota → PASS.
- [ ] Lista mostra a linha "A consulta de lugares publicados falhou…" (texto em `02`, D-01) quando `remote === 'failed'`; "Nada encontrado" só quando local e remoto responderam vazio.
- [ ] RT-04. Commit.

**Aceite:** captura `probe-busca-api-fora.png` passa a mostrar resultados. Água, rendimento e cobertura continuam falhando sem fallback (`http.test.ts` intacto).

#### B3: Regra única de contexto e faixa de escopo (D-02, D-04, D-21, P0)

**Arquivos:** criar `teammate/context.ts`, `teammate/ui/ScopeStrip.tsx`, `teammate/context.test.ts`; modificar `Overview.tsx` (título do dado, faixa, próxima atividade, estado sem análise), `Devices.tsx` (`Alerts`), `Municipality.tsx:18`, `Simulator.tsx`, `FieldShift.tsx`, `Plan.tsx:20-21`.
**Interfaces — produz:** `resolvePlace(params: URLSearchParams, ctx: ActiveContext): { code: string; name: string; uf: string; origin: 'link' | 'plot' | 'demo' }`; `ScopeStrip({ place, period, scale, origin, kind, plotPlace? })`.

- [ ] Testes: URL vence talhão; talhão vence demonstração; Simulador e Field Shift ignoram o talhão (decisão em `03`, seção 4); `upcomingActivity(records, plotId)` filtra pelo talhão; resposta de lugar anterior descartada (foco de revisão 2).
- [ ] RT-06: perfil com talhão em Uberlândia → Visão geral **não** mostra "Hoje em Sorriso" sem a faixa de demonstração; mostra estado "sem análise" com "Ver a demonstração de Sorriso" e "Ver regiões com dados"; próxima atividade do Talhão A não aparece com o B ativo.
- [ ] FALHA → implementar → PASS. Registrar no histórico do manifesto (`Overview.tsx`, `Simulator.tsx`, `Plan.tsx`).
- [ ] Commit.

**Aceite:** captura `probe-contexto-udi-visao-geral.png` refeita mostra o estado correto. **Risco:** M (toca três arquivos do manifesto). **Reversão:** reverter; a faixa é aditiva.

#### B4: Todos os planos e o município do plano (D-05)

**Arquivos:** `Plan.tsx:30-34,78`; teste em RT-09.
- [ ] RT-09: 7 planos → 7 acessíveis ("Mostrar todos (7)"); reabrir plano de Uberlândia sem `mun` na URL → selo "Uberlândia, MG · do plano"; salvar mantém `municipio: 3170206`; "Salvar e abrir no simulador" navega com `mun=3170206`.
- [ ] FALHA → implementar (`f.load` também define o lugar do plano via estado local que tem precedência sobre talhão e demo, abaixo da URL) → PASS. Commit.

#### B5: Rascunho por chave (D-06)

**Arquivos:** `ui/form.tsx:4-10`, `ui/form.test.tsx` (novo).
- [ ] Teste A → B → A em componente (`useDraftForm` com chave trocada): valor de A volta, "Rascunho recuperado" aparece, nenhum rascunho é sobrescrito com vazio.
- [ ] RT-13 no navegador (reproduz a sondagem de `02`).
- [ ] FALHA → implementar (efeito da troca de chave lê `getState().drafts[key]`) → PASS. Commit.

#### B6: Erros de autenticação no lugar certo (D-16)

**Arquivos:** `pages/Account.tsx:10-30`, `adapters/session.ts:31-48`.
**Interfaces — produz:** `AdapterError.code` de autenticação: `signin_failed`, `signup_failed`, `reset_failed`, `resend_failed`, `signout_failed`, `identity_unavailable` (já existem; passam a ser mapeados por chave em I6).
- [ ] Teste de componente: falha de login mostra mensagem acima do botão com `role="alert"` e foco; o campo e-mail não fica `aria-invalid`; mensagem não revela se o e-mail existe.
- [ ] `session.test.ts` e `AuthPage.test.tsx` continuam verdes sem alteração.
- [ ] Commit.

#### B8: Pequenos (D-22, D-23, D-24, D-25, D-28)

**Arquivos:** `ui/index.tsx:20-24` (`network` × `api_unreachable`, frase única), `adapters/http.ts:11` (código `api_unreachable`), `Devices.tsx:21` (key), `styles.css` (alvo mínimo 24 px em links de bloco; foco visível no contêiner do 3D; atribuição recolhida no celular), `ExplorerMap.tsx` (afastamento de marcadores).
- [ ] RT-16 (mensagens distintas), RT-19 (alvos, foco), RT-26 (sem aviso no console). Histórico do manifesto para `styles.css`, `ui/index.tsx`, `ExplorerMap.tsx`. Commit.

### Fase 2 — organização e continuidade

#### O1: Título do documento e foco por tela (D-12)

**Arquivos:** criar `teammate/ui/usePageTitle.ts`; modificar `App.tsx:47` e o `h1` de cada página (`tabIndex={-1}`, `data-page-title`).
**Interfaces — produz:** `usePageTitle(parts: string[])` → `document.title = [...parts, 'Gaiapus'].join(' · ')`.
- [ ] RT-18: navegar pela trilha muda `document.title` (ex.: "Planejar plantio · Gaiapus"; "Sorriso, MT · Explorar · Gaiapus") e põe o foco no `h1`; mudar só parâmetros na mesma rota (ex.: aba) não move o foco.
- [ ] FALHA → implementar → PASS. Commit.

#### O2: Origem do dado precisa (D-13)

**Arquivos:** `adapters/core.ts:3` (`Kind` ganha `'publicacao'`), `adapters/http.ts:17`, `adapters/index.ts:90,105,127`, `ui/index.tsx:6`.
- [ ] Teste: `publishedExample` devolve `kind: 'publicacao'` com `note` contendo `publication_version`; fixtures empacotadas continuam `fixture`.
- [ ] RT-17: detalhe de Sorriso mostra "Publicação da API · {versão}", não "Dado de exemplo do pacote". Commit.

#### O3: Navegação com todos os destinos (D-15)

**Arquivos:** `App.tsx:25-35,72-75`, `pages/More.tsx`, `styles.css` (separadores e grupos), rota `/ajuda` (vazia até H1, com glossário de `07`).
- [ ] RT-18: no desktop os 11 destinos + Ajuda alcançáveis em um clique; no celular, "Mais" lista todos nos cinco grupos, com "Sobre esta edição" e (após I2) "Idioma".
- [ ] Etapa 2 (grupos rotulados no trilho) **só** depois da decisão pendente 2.
- [ ] Commit.

#### O4: Plano → simulador declarado (D-14)

**Arquivos:** `Plan.tsx:33` (acrescenta `plano=<id>` à URL), `Simulator.tsx` (linha "Aberto a partir do plano…" com link de volta), `Plan.tsx:48` (dica "A prioridade fica registrada no plano; não altera os cálculos").
- [ ] RT-09 (continuação): simulador com `plano=` mostra a linha e o link; sem `plano=`, nada muda. Commit.

#### O5: Dia do simulador na URL (D-27)

**Arquivos:** `Simulator.tsx:67,83`.
- [ ] RT-10: `?dia=120` abre no dia 120; mover o cursor atualiza `dia` com `replace` (sem empilhar histórico); reproduzir não escreve na URL a cada quadro. Commit.

### Fase 3 — exploração global

#### G1: Identificadores com origem (D-10)

**Arquivos:** criar `teammate/geo/ids.ts`, `teammate/geo/ids.test.ts`; modificar `Explore.tsx:24-25`, `adapters/index.ts:57`, `ExplorerMap.tsx:85-87`, `map/types.ts`.
**Interfaces — produz:** `type GeoId = string` no formato de `06`, seção 4; `fromUrl(params): Selection`, `toUrl(sel): URLSearchParams`, `toApiAreaId(id: GeoId): string | null`, `ufOf(id): string | null` (só para `ibge:mun:`).
- [ ] Testes: tabela de compatibilidade de `03`, seção 9; `toApiAreaId('ne:ARG') === null`; `ufOf('ne:ARG') === null`; município da API usa `state_id`, não o prefixo; foco de revisão 4.
- [ ] RT-01 com os links antigos. Commit.

#### G2: Índice de cobertura a partir do catálogo (D-09)

**Arquivos:** criar `teammate/geo/coverageIndex.ts` (+ teste); modificar `adapters/index.ts:65-96` (lista `COVERAGE` vira só rótulo e destino por `product_id`), `Explore.tsx:13,85,95`, `Municipality.tsx:13`, `Plan.tsx:15`, `Simulator.tsx:27` (nomes vêm do índice).
**Interfaces — produz:** `coverageIndex.load(signal): Promise<{ areas: CoverageArea[]; publication: string; status: 'ok' | 'failed' }>`; `CoverageArea = { id: GeoId; apiId: string; name: string; parent: GeoId | null; kind; products: { id; availability; reasonCode; periods; kind: 'previsao' | 'historico' | 'simulacao' | 'observacao' }[] }`.
- [ ] Testes com resposta real da API gravada como fixture **de teste**: 5 áreas com produto (Sorriso, Uberlândia e 3 recortes); selo de UF só em MT, MG, GO, BA; falha → `status: 'failed'` e nenhuma área marcada "sem análise".
- [ ] RT-02 (marcadores, lista "Regiões com dados"). Commit.

#### G3: Seis estados de cobertura (D-07, D-21)

**Arquivos:** criar `teammate/ui/CoverageState.tsx`; modificar `Explore.tsx:88-93,137-160` (separar "não encontrado" de "não carregado"), `Overview.tsx` (usa o mesmo componente).
- [ ] RT-02: um caso por estado da matriz de `06`, seção 3 (Sorriso disponível; Uberlândia parcial; Belo Horizonte sem análise; área do pacote com `404` não consultável; Rio Verde geografia detalhada não carregada com cobertura do catálogo; rede bloqueada falha temporária). Nenhum mostra número. Commit.

#### G4: Recortes publicados de Rio Verde e Barreiras (D-08)

**Arquivos:** `adapters/index.ts:84-87,115-129` (`imagery.series(areaId)` aceita qualquer `pub:`), `Municipality.tsx:82-95`, `capabilities.ts:43-45`, `Explore.tsx` camada imagem.
- [ ] RT-07: Município de Rio Verde → aba Imagem mostra NDVI e chuva do recorte (jun–jul 2024) com o escopo "recorte, não o município"; Uberlândia continua igual (E2E-5 verde); Sorriso continua "sem imagem", com o texto vindo do catálogo. Commit.

#### G5: Busca e lista multilíngues (D-11)

**Arquivos:** criar `teammate/geo/searchIndex.ts` (+ teste); modificar `adapters/index.ts:43-62`, `Explore.tsx:61,85,101-102`.
**Consome:** nomes de I7. **Produz:** `searchPlaces(q, locale, opts): { places; total }`.
- [ ] Testes: tabela de equivalências de `06`, seção 2.3 resolve o mesmo ID nos cinco idiomas; `DEU` → Alemanha primeiro; `de` não esconde países; `total` > 12 aciona "Ver todos os N resultados"; municípios além de 80 alcançáveis por "Mostrar mais".
- [ ] RT-05. Commit.

#### G6: Minha posição fora do Brasil (D-26)

**Arquivos:** `Explore.tsx:47-56`.
- [ ] RT-01 com geolocalização simulada em Buenos Aires: seleciona Argentina e explica o que existe; permissão negada continua com a mensagem e as saídas atuais. Commit.

### Fase 4 — idiomas

#### I1: Núcleo i18n e formatação

**Arquivos:** criar `teammate/i18n/{index.ts,format.ts,messages/pt-BR.ts,messages/en.ts,messages/es.ts,messages/fr.ts,messages/de.ts,i18n.test.ts}`; modificar `teammate/format.ts` (passa a delegar a `fmt` do locale ativo, mantendo as mesmas funções exportadas para não mexer nas telas de uma vez).
**Interfaces — produz:** `Locale`, `useI18n()`, `t(key, vars)`, `fmt.{n0,n1,n2,signed,pct,dShort,dFull,dMonth,dWeek,dTime,money}` com as assinaturas atuais de `format.ts`.
- [ ] Testes: `fmt.n1(1234.5)` igual a `new Intl.NumberFormat(locale,{min:1,max:1}).format(1234.5)` nos cinco; `dFull('2026-11-14')` nunca vira dia 13 em fuso negativo; plural (`{count}` 0, 1, 2) correto em pt e de; chave inexistente acusa em `tsc`.
- [ ] Commit.

#### I2: Seletor, preferência e troca sem perda

**Arquivos:** criar `teammate/ui/LanguageSelect.tsx`; modificar `App.tsx` (cabeçalho), `More.tsx`, `pages/Account.tsx`, `index.html` (lang e título iniciais a partir de `gaiapus.prefs`).
- [ ] RT-20: escolher Deutsch no cabeçalho antes do login → `html[lang=de]`, título em alemão, rota e parâmetros iguais; com simulador em `modo=previsao&ab=1&dia=3`, plano em edição e passo 2 do tutorial aberto, trocar idioma mantém os três; recarregar mantém alemão; entrar e sair da conta mantém alemão; troca não dispara nova requisição à API (foco de revisão 2).
- [ ] Commit.

#### I3: Valores gravados como códigos

**Arquivos:** criar `teammate/options.ts` (tabelas de `07`, seção 5); modificar `store.ts:22-23` (migração aditiva, `schema: 2`), `Records.tsx:51-56,102,106-115`, `Plan.tsx:22,45-46,49`, `adapters/index.ts:223,242`.
- [ ] Testes de migração: registro antigo `irrigacao: 'Sequeiro'` ganha `irrigacao_code: 'rainfed'` sem perder o texto; texto desconhecido fica sem código; exportação traz os dois; nova gravação escreve os dois; `Plan.tsx` compara `irrigacao_code === 'irrigated'`.
- [ ] `crops.test.ts` continua verde. Commit.

#### I4: Culturas e opções traduzidas por ID

**Arquivos:** `catalog.ts` (`name` vira chave; `cropName(id, t)`), `format.ts:17-19` (`STAGE`, `LAND`, `CROP` por chave), `capabilities.ts`, `ui/Crops.tsx`, `ui/SealedTest.tsx`.
- [ ] Testes: `cropIdFromName` continua aceitando nomes antigos em pt-BR (`'Milho safrinha'` → `maize2`); "Café" continua ambíguo em qualquer idioma; nenhuma frase usa `.toLowerCase()` sobre nome traduzido.
- [ ] Commit.

#### I5: Telas (uma subtarefa e um commit por tela)

Ordem: Explorar → Visão geral → Município → Planejar → Simulador → Field Shift → Registros/Propriedades → Sondas/Alertas → Conta → Mais/Linguagem visual/404 → `lazyPage`, `ui/index.tsx`, `PhaseTimeline` (eixos e legendas), `DualChart`.
- [ ] Para cada tela: trocar literais por `t()`; frases com marcação por chave com placeholder; `aria-label` e `sr-only` por chave; RT da tela rodando em `pt-BR` **sem mudança de texto** (teste de igualdade das capturas de texto antes/depois) e em `de`.
- [ ] Histórico do manifesto para cada arquivo listado.

#### I6: Autenticação, transporte e inicialização

**Arquivos:** `features/auth/{AuthPage.tsx,urls.ts}`, `adapters/session.ts`, `adapters/http.ts`, `lib/api/client.ts:43,49`, `main.tsx:21` (texto embutido nas cinco línguas, escolhido por `gaiapus.prefs`/`navigator.languages`, sem depender do catálogo).
**Mapeamento de códigos da API para chaves:** `errors.api.<code>` para `invalid_input`, `not_found`, `unauthenticated`, `email_verification_required`, `identity_unavailable`, `dependency_failure`, `dependency_busy`, `database_unavailable`, `upstream_invalid`, `unsupported_input`, `fixture_not_available`, `rate_limited`, `result_expired`, `internal_error`, `api_unreachable`, `network`; desconhecido → `errors.api.unknown` com o código entre parênteses.
- [ ] RT-22: `/auth/callback?error=access_denied` em `de` mostra a mensagem em alemão; trocar idioma na tela de recuperação não altera `location.href` nem o estado `ready`; `AuthPage.test.tsx`, `recovery.test.ts`, `auth.test.ts` verdes sem alteração de asserção de comportamento.
- [ ] Commit.

#### I7: Nomes de países nas cinco línguas

**Arquivos:** criar `apps/web/scripts/build-countries.mjs` (porta do protótipo, gera `name` por locale e `aliases`), regenerar `teammate/data/geo/countries.json` (formato: `{ code, names: {pt-BR,en,es,fr,de}, aliases: string[], continent, bbox }`).
- [ ] Teste: 232 países, nenhum `names.*` vazio; Somalilândia, Chipre do Norte e Kosovo com nome manual; tabela de equivalências de `06` presente nos `aliases`.
- [ ] Commit.

#### I8: Revisão e cobertura de chaves

**Arquivos:** criar `teammate/i18n/coverage.test.ts`.
- [ ] RT-21: toda chave de `pt-BR` existe nas outras quatro; mesmas variáveis `{…}` em cada tradução; nenhuma tradução idêntica ao pt-BR fora de uma lista de exceções (nomes próprios, siglas); chaves marcadas `review: true` listadas no relatório.
- [ ] RT-25: telas principais em `de` e `fr` a 390 px sem rolagem horizontal, sem botão principal cortado, trilho com rótulos legíveis.
- [ ] **Revisão humana** das chaves `science.*`, `account.consent.*`, `account.delete.*`, `auth.*`, `errors.*` antes de publicar (decisão pendente 4).
- [ ] Commit.

### Fase 5 — tutoriais

#### H1: Motor de tutorial e página Ajuda

**Arquivos:** criar `teammate/tours/{engine.tsx,TourPopover.tsx,storage.ts,types.ts,engine.test.tsx}`, `pages/Help.tsx`; modificar `App.tsx` (provedor, rota `/ajuda`, carregamento sob demanda), páginas (botão "Como usar esta tela" e convite).
**Interfaces — produz:** `type TourStep = { id; route; target: string; key: MessageKey; entry?: (s) => boolean; expect?: 'input' | 'click' | 'urlParam'; skipWhen?: (s) => boolean }`; `type Tour = { id: string; version: number; steps: TourStep[] }`; `useTour(tourId)`; chave `gaiapus.tours`.
- [ ] Testes: alvo ausente não trava (mostra `tour.targetMissing` em ≤ 3 s); `Esc` fecha e devolve foco; trocar de rota fecha e guarda `in_progress`; convite não reaparece após "Agora não"; nada em `gaiapus.v1*` muda durante um tour; trocar de conta com tour aberto fecha o tour (foco de revisão 3); "Apagar todos os dados" limpa `gaiapus.tours`.
- [ ] RT-23 e RT-24 (o tour não entra no pacote inicial). Commit.

#### H2: Nove roteiros

**Arquivos:** `teammate/tours/{explore,overview,municipality,plan,simulator,fieldShift,farm,monitoring,account}.ts`; `data-tour` nos alvos listados em `04`, seção 6.
- [ ] RT-23 por roteiro: abre, percorre, pula, conclui; nenhum salva, envia, marca consentimento ou pede localização (verificado por `localStorage` e rede antes/depois). Commit por roteiro.

## 3. Arquivos prováveis por fase

| Fase | Arquivos do app tocados | Arquivos do manifesto |
|---|---|---|
| 0 | `tests/e2e/*`, `playwright.config.ts` | nenhum |
| 1 | `ui/form.tsx`, `store.ts`, `App.tsx`, `index.html`, `adapters/index.ts`, `adapters/http.ts`, `Explore.tsx`, `Records.tsx`, `Overview.tsx`, `Devices.tsx`, `Municipality.tsx`, `Simulator.tsx`, `FieldShift.tsx`, `Plan.tsx`, `Account.tsx`, `session.ts`, `ui/index.tsx`, `styles.css`, `ExplorerMap.tsx` | 7 de 8 |
| 2 | `App.tsx`, `More.tsx`, páginas (`h1`), `core.ts`, `http.ts`, `Plan.tsx`, `Simulator.tsx` | 4 |
| 3 | `geo/*` (novo), `adapters/index.ts`, `Explore.tsx`, `ExplorerMap.tsx`, `Municipality.tsx`, `capabilities.ts` | 2 |
| 4 | `i18n/*` (novo), todas as páginas, `features/auth/*`, `lib/api/client.ts`, `main.tsx`, `data/geo/countries.json` | 8 |
| 5 | `tours/*` (novo), `Help.tsx`, páginas (`data-tour`) | 5 |

## 4. Critérios de aceite da etapa inteira

1. Todas as 145 linhas da matriz de `03` com destino e teste verde, ou `fixme` justificado e aprovado.
2. 64 testes unitários originais verdes; 6 cenários originais verdes (após T1).
3. D-01, D-02, D-03 reproduzidos antes e não reproduzidos depois, com captura.
4. Nenhuma requisição a endpoint IBGE com código estrangeiro (interceptação de rede no RT-01 e RT-02).
5. Cinco idiomas com cobertura de chaves 100 % e revisão humana registrada para as chaves críticas.
6. Pacote inicial (`index-*.js`) com no máximo +15 % sobre os 200 kB atuais; mapa, 3D, tour e catálogos não-pt fora dele.
7. Nenhuma rolagem horizontal em 320, 360, 390 e 1440 px nos cinco idiomas.

## 5. Testes de regressão

Grupos de Playwright em `tests/e2e/regressao/`, contra API real local (`pnpm dev:api`) e frontend em `GAIAPUS_WEB_URL`. Cada um roda em 1440 × 900 e 390 × 844, tema escuro e claro onde indicado. Itens 1–17 da matriz do briefing mapeados entre parênteses.

| ID | Grupo | Cobre | Itens do briefing |
|---|---|---|---|
| RT-01 | Navegação geográfica | País, estado, município, câmera, trilha, URL, voltar/avançar, links antigos, posição simulada | 1, 3, 12 |
| RT-02 | Estados de cobertura | Seis estados, marcadores do catálogo, regiões com dados, nenhum número em país sem análise | 1, 13 |
| RT-03 | Mapa indisponível | `semwebgl`, falha do pacote do mapa, mapa-base offline | 10 |
| RT-04 | Busca com API fora | Abort e 503 em `/v1/geography`; resultados locais e aviso | 10, 13 |
| RT-05 | Busca multilíngue | Equivalências, códigos, "ver todos", 80+ municípios | 12 |
| RT-06 | Contexto | Talhão × demonstração em Visão geral, Alertas, próxima atividade | 2 |
| RT-07 | Município | Abas na URL, culturas, recortes de Uberlândia e Rio Verde, vazios | 3, 6 |
| RT-08 | Culturas e capacidades | 10 culturas × Sorriso/Uberlândia; nenhuma curva de soja em outra cultura; café | 6 |
| RT-09 | Planos | Todos acessíveis, reabrir com município, salvar e simular, prioridade declarada | 4 |
| RT-10 | Simulador | 4 modos, 6 anos, A/B, cursor por teclado e ponteiro, reproduzir, fases, `dia` na URL, 2D | 3, 7 |
| RT-11 | Field Shift | Tabela, rendimento "não avaliado", sensibilidade, abrir no simulador | 6 |
| RT-12 | Propriedades e registros | Criar, editar, excluir com confirmação, quatro tipos, café, sem rede para salvar local | 5 |
| RT-13 | Rascunhos | A → B → A, recarga, limpar, troca de conta | 5 |
| RT-14 | Números | Tabela do parser nos cinco idiomas, dicas, margem e produtividade | 16 |
| RT-15 | Conta | Telas com provedor simulado (rota de teste com `supabase` falso), exportar sem nome, consentimento, apagar dados | 5, 11 |
| RT-16 | Falhas | API fora por tela, import lazy falho + nova tentativa, mensagens distintas | 10 |
| RT-17 | Ciência | Status do teste pertence ao modelo exibido, lacunas visíveis, origem "Publicação da API", `yield_effect:null` | 6 |
| RT-18 | Navegação e foco | 11 destinos + Ajuda, "Mais" completo, título e foco por tela | 9 |
| RT-19 | Acessibilidade | Nomes acessíveis, contraste, alvos ≥ 24 px, foco visível, `axe` (se aprovado) | 9 |
| RT-20 | Idioma | Seletor antes/depois do login, persistência, troca preservando rota, país, cultura, modo, dia, plano, rascunho, tutorial | 14 |
| RT-21 | Catálogo | Chaves e variáveis nas cinco línguas | 15 |
| RT-22 | Callback e idioma | Callback e recuperação em `de`; PKCE e URL intactos | 14 |
| RT-23 | Tutoriais | Convite, pular, fechar, reabrir, retomar, alvo ausente, troca de rota, nenhum efeito colateral | 8 |
| RT-24 | Carregamento | Pacotes do mapa, 3D, tour e idiomas só quando usados; economia de dados | 11 |
| RT-25 | Texto longo | `de` e `fr` em 320–1440 px | 15 |
| RT-26 | Sondas e alertas | Selo sintético, falha de sonda separada de alerta, sem aviso no console | 13 |
| RT-27 | Preferências | Tema e idioma fora do balde de conta; troca de conta não vaza dados nem rascunhos | 14, 17 |

Item 17 do briefing (IDs e respostas não mudam com o idioma) é verificado em RT-20 por comparação: mesmas requisições e mesmos `crop_id`, `area_id` e valores numéricos gravados em `pt-BR` e `de`.

Medição de esforço (fora da automação): para J1–J4 de `03`, contar ações, campos repetidos, becos sem saída e tempo com 3 a 5 agricultores da equipe ou piloto, antes da fase 1 e depois da fase 2. Até lá, os ganhos são hipóteses.

## 6. Dependências futuras do backend

| Item | Para quê | Bloqueia |
|---|---|---|
| `Preferences.locale` com `es`, `fr`, `de` em `/v1/me` | Sincronizar idioma com a conta | Só a sincronização; I1–I8 funcionam sem |
| Cobertura em lote ou resumo em `/v1/geography` | Montar "Regiões com dados" com uma chamada | Nada; G2 faz N chamadas com cache |
| Geometria dos recortes via `geometry_ref` | Contorno de Rio Verde e Barreiras no mapa | Só o contorno; G4 mostra dados sem ele |
| Sincronização de propriedades, talhões, registros, planos | Dados entre aparelhos | Nada nesta etapa; textos continuam "neste aparelho" |
| Áreas fora do Brasil no catálogo (`country_id`) | Análise fora do Brasil | Nada; países continuam só geografia |
| Templates de e-mail por idioma no Supabase | E-mails de confirmação nas cinco línguas | Nada no frontend |
| Lista de culturas por produto no catálogo (`supported_crops`) | Capacidades vindas da API, não de `capabilities.ts` | Nada; tabela local continua identificada |

## 7. Reversão

- Cada tarefa é um commit (ou uma série curta) revertível isoladamente. As fases 1 e 2 não dependem da 4.
- Mudanças de armazenamento são aditivas: `gaiapus.prefs` e `gaiapus.tours` são chaves novas; `_code` e `schema: 2` não apagam campos. Voltar a uma versão anterior continua lendo os dados.
- Rotas e parâmetros antigos aceitos em todas as fases.
- Se uma tradução sair errada em produção, o seletor continua oferecendo português e o texto pt-BR é a fonte.

## 8. Decisões pendentes

| # | Decisão | Opções | Minha recomendação | O que muda |
|---|---|---|---|---|
| 1 | Idioma de reserva | — | **Decidido: inglês** | — |
| 2 | Grupos no trilho do desktop | Etapa 2 com cinco grupos · manter só a etapa 1 | Etapa 1 agora; etapa 2 depois de observar uso | Memória de quem já usa |
| 3 | Fonte para regiões fora do Brasil | Adiar · geoBoundaries (CC BY 4.0) · outra | Adiar | Navegação abaixo de país |
| 4 | Revisão das traduções críticas | — | **Decidido:** revisão feita por mim com apoio do Codex; resultado em `08-revisao-traducoes.md` | — |
| 5 | Manifesto de hashes | Normalizar fim de linha + histórico (T1) · outra regra | T1 | Se a suíte volta a ficar verde |
| 6 | `axe-core` na suíte | — | **Decidido: adicionar** (donos do repositório, sem autorização prévia) | — |
| 7 | Inglês: formato `en-US` ou `en-GB` | `en-US` · `en-GB` · seguir o navegador | Seguir o navegador quando for `en-*`; `en-US` como padrão | Datas e separadores em inglês |
| 8 | Simulador e Field Shift seguem o talhão? | Demonstração declarada (proposto) · tela "sem série" quando o talhão é de outro lugar | Demonstração declarada | Um passo a mais ou não para chegar à simulação |

## 9. Autorização

Esta pasta conclui o planejamento. Nada foi implementado, removido, publicado ou enviado. A próxima etapa começa com T1 e T2 depois da autorização explícita do Leandro para implementar e das decisões 2 e 5. As decisões 1, 4 e 6 já foram tomadas.
