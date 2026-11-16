# Renovação visual — tema claro "Campo claro / verde mineral" e cultivos por órgãos

Entrega de 15/11/2026, ramo `feat/visual-refresh`. Implementa o briefing
`docs/frontend-claude/visual-refresh-2026-11-15/IMPLEMENTACAO-CLAUDE.md` (repositório `ideias_nasa`) **no monorepo
Gaiapus-APP** (`apps/web/src/teammate`), que é o aplicativo ativo; o protótipo `gaiapus-web/` citado no briefing não
foi tocado.

## O que mudou

**Tema**

- Tokens do tema claro trocados pela paleta pesquisada; tints claros opacos. Tokens novos de estado, foco, gráfico,
  cena e mapa declarados nos dois temas (`styles.css`).
- "Pausar" (primário pressionado) mantém preenchimento sólido nos dois temas. Seleção secundária tem par próprio.
- Os dois mapas MapLibre (Explorar e Minha área) leem `map/palette.ts` e repintam as camadas ao trocar o tema, sem
  recriar o mapa. A legenda do Explorar lê o mesmo objeto. Sobre a imagem orbital o contorno do talhão é duplo.
- Gráficos: chuva opaca, halo sob séries e cursor, cursor com alça.
- Cena: céu, carregamento, legenda e rótulos por tokens, em placa opaca; anel de foco de duas cores no canvas e nos mapas.
- `theme-color`, tela de abertura (`index.html`) e seleção de texto acompanham o tema. A preferência continua em
  `gaiapus.prefs`.
- `/design-preview` lê as cores e calcula o contraste ao vivo, para os dois temas ao mesmo tempo.

**Cultivos**

- `sim/visual-state.ts`: cultura e cobertura vêm da `land_cover` real; a posição dentro da fase só é usada quando a
  série original traz o início e o fim daquela fase. Previsão e climatologia (janela curta, sem fronteiras) ficam em
  pose fixa por fase e a legenda diz isso.
- `sim/plants/`: plantas descritas por órgãos (dados puros), malhadas em uma geometria com cor por vértice.
  Soja, milho e braquiária entram na cena do simulador; feijão, arroz, trigo, café arábica, café conilon e palhada
  ficam só na prancha demonstrativa de `/design-preview`.
- `sim/Field3D.tsx`: lotes instanciados por variante e nível (bloco de detalhe + talhão/distante), poses em cache,
  solo com camalhões, sombra de contato, luz por tema, botão "Ver as plantas de perto", detecção de WebGL 2,
  captura de erro do renderer e de perda de contexto com queda para a vista 2D.
- Vistas 2D (talhão e perfil) desenham os mesmos planos de órgãos.
- Perfil do solo: mesmas plantas; o estresse do modelo (ks) virou uma faixa na linha do solo, com legenda, em vez
  de recolorir as folhas.

## Onde o checkout real diferiu do briefing

| Briefing | Checkout real | O que foi feito |
| --- | --- | --- |
| Projeto `gaiapus-web/` | App ativo é `apps/web/src/teammate` do monorepo | Tudo implementado no monorepo |
| Bun | pnpm 10.14 com lockfile e CI | pnpm; lockfile intacto; nenhuma dependência nova |
| Build `file://` em `dist/` (IIFE) além do HTTP | Só existe o build web (Vite, chunks ES) | Não foi criado; critério "abrir do disco" não se aplica |
| `e2e/review.mjs`, `e2e/run.mjs` | Playwright em `tests/e2e` | Suíte existente + `regressao/visual-refresh.spec.ts` |
| `.sim__stage canvas { outline: none }` sem foco | Já havia `:focus-visible` de 2px numa cor só | Anel de duas cores (foco + halo) |
| `(window as any).__gaiapusField` | Idem | Tipado |
| Um mapa (`ExplorerMap`) | Dois mapas (Explorar e Minha área) | Paleta única para os dois |
| Um simulador | Histórico (`Simulator.tsx`) e planejamento (`PlanningSimulator.tsx`), mais a vista Perfil do solo com a estaca real | Os três usam o mesmo estado visual |
| Tema padrão não citado | Padrão é o escuro; claro é escolha gravada | Mantido |
| Cores do perfil (folhas por estresse) não citadas | Folhas coloridas por ks, com legenda | Faixa na linha do solo; legenda reescrita nos cinco idiomas |

## Decisões onde o briefing deixou escolha

Ver a seção "Decisões" do relatório de entrega; as principais estão comentadas no código (`visual-state.ts`,
`Field3D.tsx`, `plants/*.ts`, `map/palette.ts`).

## Verificação

- `pnpm --filter @gaiapus/web test`, `typecheck`, `build`; `playwright test` com `GAIAPUS_WEB_URL=http://127.0.0.1:5178`.
- Contraste dos tokens reais: [contraste-tokens-reais.md](contraste-tokens-reais.md) (`node scripts/contrast-report.mjs`).
- Desempenho: [desempenho.md](desempenho.md) (`node scripts/perf-field.mjs gpu|swiftshader`).
- Modelos de estudo (13 GLB) inspecionados: `apps/web/design/assets-provenance.md`.

## Evidências (`evidencias/`)

- `*-antes.jpg` / `*-depois.jpg`: Explorar, Município, Visão geral, Simulador (talhão, perfil, planejamento), Field
  Shift, Minha área e Design preview, claro e escuro, desktop (1440×900) e celular (390×844).
- `pausar-*-antes|depois.jpg`: botão "Pausar" durante a reprodução, nos dois temas.
- `cultivo-<cultura>-<fase>-talhao|detalhe-*-depois.jpg`: soja e milho em cada fase, consórcio, cobertura viva e
  solo exposto, na vista do talhão e na vista de perto.
- `simulador-talhao-2d-*`, `simulador-perfil-2d-*`: alternativas sem WebGL.
- `prancha-*.jpg`: prancha demonstrativa inteira (claro/escuro, desktop/celular) e cada linha nas quatro vistas
  (`prancha-<cultura>-obliqua|frontal|silhueta|detalhe.jpg`).

Scripts: `apps/web/scripts/shots-visual-refresh.mjs`, `shots-board-rows.mjs`, `perf-field.mjs`,
`contrast-report.mjs`, `inspect-crop-glbs.mjs`.

## Limites que permanecem

- As plantas são ilustrações estilizadas, sem validação por agrônomo nem por cultivar. Datas, porte, densidade e
  número de órgãos são parâmetros de desenho.
- A espiga do milho é um volume envolto em palha com cabelos na ponta; não há grãos nem palha em folhas separadas.
- As flores da soja só existem no nível de detalhe; na vista do talhão a mudança de fase se lê pela copa, pelas
  vagens e pela senescência.
- O nível de detalhe é por posição (um bloco fixo de 14 plantas na frente do talhão), não por distância da câmera.
- Palhada só na prancha: a série publicada não tem sinal de resíduo.
- No simulador de planejamento, culturas fora de soja/milho (trigo, arroz, feijão, café) continuam sem planta na
  cena; a legenda diz isso.
- Quatro contornos do mapa escuro ficam abaixo de 3:1 (mapa escuro original, não redesenhado).
- Contraste foi medido por pares de tokens e em estados reais selecionados; não é uma auditoria WCAG completa.
