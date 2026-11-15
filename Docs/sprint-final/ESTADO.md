# Sprint final Field Shift — estado

Atualizado a cada marco. Plano: `ideias_nasa/docs/superpowers/plans/2026-11-15-sprint-final-field-shift-consolidado.md`. Matriz de achados: [MATRIZ.md](MATRIZ.md).

## Base (15/11/2026, 15h40 BRT)

| Repositório | Caminho | Branch | HEAD no início | Situação |
|---|---|---|---|---|
| APP (este) | `Documents/Gaiapus-APP-ux` | `codex/revisao-ux` | `50c828c` (lote 1 `aa5ba36` + merge do `main` `38069a3`) | limpo; local, sem push |
| APP, `main` remoto | `origin/main` | `main` | `b649cd7` ("guidelines", só `Docs/azure-github-domain.md`) | publicado no Azure pelo workflow `Deploy Azure` (18:34 UTC) |
| APP, worktree do Codex | `.codex/worktrees/gaiapus-supabase-runtime/Gaiapus-APP-eua` | `codex/habilitar-supabase-runtime` | `603b31d` | não alterado por esta sessão |
| Ciência | `ideias_nasa` | `feat/us-v2` | `1083646` | 2 arquivos de plano modificados e pastas não versionadas de outras sessões: não tocados |

`603b31d` (Codex) × lote 1: o commit do Codex altera três arquivos — `PlanningSimulator.tsx`, seu teste dos EUA e `VALIDACAO-RUNTIME-SUPABASE.md`; nenhuma mudança de API. O lote 1 já tinha `local=`, seleção por safra, rendimento sem série e abas. Faltava **uma** garantia: só desenhar quando publicação, execução e série têm o mesmo `run_id` e o lugar pedido. Foi portado o comportamento (não o arquivo) e o documento de validação.

## Produção, lida sem credenciais

- `GET https://gaiapus.space/health` → 200 `{"status":"ok"}`.
- `GET https://gaiapus.space/v1/simulations/capabilities` → 4 lugares `BR`, 0 `US`, safras 2027 e 2028.
- Conclusão: os EUA estão **habilitados localmente** (API 3010 do Codex, fonte Supabase: 4 BR + 245 US) e **desligados no Azure**. O lote não precisa ser recriado; falta `SIMULATION_US_SOURCE=supabase` e a URL/chave publicável no serviço — ver `Docs/integracao-eua/VALIDACAO-RUNTIME-SUPABASE.md`. É mudança de configuração do operador, não deste branch.
- A produção **não** contém o lote 1 de UX nem este sprint: o branch não foi enviado.

## Comandos reais deste checkout

| O quê | Comando |
|---|---|
| Web, unidade | `pnpm --filter @gaiapus/web test` |
| Web, tipos e build | `pnpm --filter @gaiapus/web typecheck` · `pnpm --filter @gaiapus/web build` |
| API | `pnpm --filter @gaiapus/api test` (exclui `*.database.test.ts` e `*.science.test.ts`) |
| Contratos | `pnpm --filter @gaiapus/contracts test` · `pnpm contracts:check` |
| Navegador | em `apps/web`: `pnpm exec vite --port 5174` (proxy para a API em 3001) e `pnpm exec playwright test` |

## Marcos

### M0 / P0 — identidade da execução e comparação hídrica

**Mudou**
- `PlanningSimulator.tsx`: só publicações do lugar pedido são elegíveis; a tela só desenha quando `publicação.run_id === run.run_id === series.run_id`, o `location_id` é o pedido e a safra existe na execução. Fora disso, carregamento. Publicação ausente para uma capacidade "pronta" vira aviso, não carregamento sem fim.
- `sim/planning-model.ts`: `waterSatisfaction` (por trajetória, ETa ÷ ETc do ciclo; depois a mediana das trajetórias), `highestSatisfaction` (sem destaque em empate ou com uma única cultura calculada), `comparableRuns` (mesmo lugar, solo e conjunto de anos).
- Comparação de culturas: estresse do ciclo e estresse reprodutivo em linhas separadas; valor ausente aparece como "não calculado"; calendário e duração de cada cultura; selo "Maior atendimento hídrico" (não "melhor"); texto dizendo que atendimento hídrico não indica rendimento, margem nem adequação agronômica. Cinco idiomas.

**Por que a métrica mudou sem novo pacote:** cada execução já publica, por trajetória, `crop_eta_mm` e `crop_etc_mm` (Brasil) ou `crop_eta_mm` e `crop_deficit_mm` (EUA) em `seasons[].members`. O déficit do motor é `ETc − ETa` dia a dia (`data/models/water_balance.py`); nas 7 execuções brasileiras fixadas, `|ETc − ETa − déficit|` ≤ 5,7e-14 mm em 440 trajetórias. A razão por trajetória é calculada com o `run.json` já carregado; nenhuma série completa é baixada.

**Preservado:** lote 1 inteiro (seletores, janela da safra, ajuda das trajetórias, abas, `dia` com `replace`), Brasil, EUA, rendimento sem série (2026 e Kansas 2027), cinco idiomas.

**Testes** — ver a seção "Verificação" do marco no fim deste arquivo.

#### Verificação do M0 (15/11/2026, 16h10 BRT, neste checkout)

| Comando | Resultado |
|---|---|
| `pnpm --filter @gaiapus/web test` | 40 arquivos, **288 testes, 288 passaram** (280 do lote 1 + 5 de `planning-model` + 3 de identidade) |
| `pnpm --filter @gaiapus/web typecheck` | sem erros |
| `pnpm exec playwright test regressao/jornada.spec.ts` (Vite 5174 → API 3001) | **6 de 6** (5 do lote 1 + 1 de rede lenta) |

Vermelho antes da correção, no HEAD `50c828c`: "changing place while answers are late…" mostrava `sim_398456425c79190084246453` (Story 2027) sob o título "Soja em Uberlândia"; "changing the harvest year…" mantinha o cartão da safra anterior. Os 5 testes novos de `planning-model` falhavam por função inexistente.

Não executado neste marco: suíte completa do navegador (111 jornadas do lote 1), build, API e contratos — nada disso foi tocado; rodam no fechamento.

**Rota para conferir:** `/#/simulador?modo=planejamento&local=BR:ibge:3170206&cultura=soy&safra=2027` → cartão "Comparar culturas".
**Situação:** commit local; sem push, sem PR, sem produção.
**Limitação:** o atendimento hídrico compara culturas com calendários diferentes sob o mesmo solo hipotético (AD4, 55 mm); não é rendimento nem recomendação.
