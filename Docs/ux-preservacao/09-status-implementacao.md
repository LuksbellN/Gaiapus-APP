# 09 — Status da implementação

Data: 14/11/2026. Branch local `ux-preservacao`, sem push e sem deploy. Escopo tocado: `apps/web`, `tests/e2e`, lockfile (`@axe-core/playwright`) e `Docs/`. API, contratos, Supabase, migrações e catálogo científico não foram alterados.

## Resultado por tarefa

| Tarefa | Situação | Observação |
|---|---|---|
| T1 manifesto | feito | Normaliza fim de linha; mudanças deliberadas registradas em `apps/web/design/teammate-source-history.json` com `node scripts/record-visual-change.mjs "<motivo>"` |
| T2 rede de regressão | feito | `tests/e2e/regressao/*`, axe-core sem violações sérias |
| B1–B8 (D-01…D-28) | feito | Cada D-item tem teste |
| O1–O5 | feito | Cinco grupos na navegação, título e foco por tela, plano → simulador declarado, dia na URL |
| G1–G6 | feito | Cobertura a partir do catálogo da API, 232 países em cinco línguas, busca multilíngue, Rio Verde e Barreiras |
| I1–I4 | feito | Núcleo i18n, seletor, códigos gravados com migração aditiva, culturas e opções por ID |
| I5 telas | feito | Todas as telas do `src/teammate`, incluindo Conta, Ajuda, Linguagem visual e mapa |
| I6 auth/transporte/boot | feito | `/auth/callback` e `/auth/recovery` guardam só chaves de mensagem (fluxo PKCE intacto); `index.html` escolhe o idioma de boot antes do React; falha de inicialização nas cinco línguas |
| I7 países | feito | `data/geo/countries.json` |
| I8 revisão e cobertura | parcial | RT-21 (`i18n/coverage.test.ts`) e RT-25 (de/fr a 320, 768 e 1440 px) passam. Catálogos en/es/fr/de gerados pelo Codex a partir do pt-BR com a terminologia do `08`. **Falta revisão por falante nativo**, prioridade em `help.glossary.*`, `account.research.*`, `account.del.*`, `auth.*`, `errors.*`, `tour.sim.s5`, `tour.fs.s4` |
| H1 motor e Ajuda | feito | `teammate/tours/{storage,scripts,TourProvider,TourPopover}`; painel carregado sob demanda |
| H2 roteiros | feito | 10 roteiros (9 + simulador sem série), 41 âncoras `data-tour` |
| Abertura automática | feito | Pedido do Leandro (14/11/2026): o tutorial abre sozinho na primeira abertura do app e na primeira visita após criar a conta; "Pular" pula todos. "Apagar todos os dados" limpa o progresso, mas não faz o tutorial reabrir sozinho |

## Desvios em relação ao plano (decisões minhas)

1. **Convite e botão "Como usar esta tela"** ficam numa faixa discreta no topo do conteúdo, alinhada à direita, em vez de ao lado de cada título. Motivo: um único ponto no shell, sem tocar no cabeçalho de 13 telas. No Explorar, a faixa flutua sobre o mapa (canto superior direito; no celular, canto inferior direito).
2. **"Experimente: …" e avanço automático pela ação** não foram implementados: todo passo avança por Avançar ou `Alt+→`. O texto de cada passo já diz o que fazer.
3. **"Abrir a demonstração de Sorriso para este passo" / "Voltar para {lugar}"** não foram implementados. Sem dado, o passo mostra o texto e "Este controle não está visível agora".
4. Passos de outra aba do Município (`aba=safra`, `aba=imagem`) trocam a aba sozinhos; nunca trocam o lugar selecionado. Passos de outra tela (`farm.3–5` em Registros, `mon.3` em Alertas) abrem a tela sem fechar o tutorial.
5. O motor (provider, roteiros e armazenamento, ~3 kB) entra no pacote inicial; só o painel é carregado sob demanda.
6. `AuthPanel.tsx` (componente do app antigo, não montado por `main.tsx`) não foi traduzido.

## Correção encontrada durante o trabalho

`useDraftForm` gravava o rascunho na store dentro do atualizador do `useState`, o que gera o aviso do React "Cannot update a component while rendering a different component" ao preencher Propriedades. Corrigido em `ui/form.tsx` (gravação fora do atualizador).

## Testes

- Unitários (Vitest): 184 passando (início: 64).
- E2E: 79 passando (início: 6).
- E2E (Playwright, Chrome instalado): `frontend.spec.ts` + `regressao/{explorar,dados,planejar,registros,navegacao,idiomas,tutoriais}.spec.ts`.
- Rodar: API (`pnpm dev:api`), web (`pnpm --filter @gaiapus/web dev`), depois `GAIAPUS_WEB_URL=http://127.0.0.1:5173 npx playwright test` em `apps/web`.

## Pendências fora desta máquina

1. Supabase real: entrar, cadastrar, confirmar e-mail, recuperar senha com o idioma trocado (RT-22 cobre só as rotas sem Supabase); conferir que o tutorial abre na primeira entrada de uma conta recém-criada e não abre para conta antiga.
2. Aparelhos reais: iOS Safari e Android Chrome, zoom de 200 %, leitor de tela (NVDA/VoiceOver) no painel do tutorial.
3. Revisão linguística nativa (ver I8).
