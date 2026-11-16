# Gaiapus — linguagem visual (DESIGN.md)

Formalização da direção do briefing de 14/11/2026. Fonte da verdade em código: `src/styles.css` (tokens) e `src/config.ts` (edição, movimento). A rota `#/design-preview` mostra tudo renderizado.

> Nota de processo: as skills locais (Hue, Taste, Impeccable, shadcn, Reanimate, web-design-guidelines) ficam em `C:/Users/leand/.claude/skills`, pasta que não pôde ser conectada a esta sessão. Este documento segue o papel que o briefing atribui ao Hue, mas **não é a saída da skill Hue**; rode-a sobre este arquivo se quiser a versão gerada por ela.

> Sessão 2 (14/11/2026, Claude Code local): Impeccable (`polish`) e web-design-guidelines foram executadas sobre este sistema; Hue continua não executada. Acréscimos: superfícies do navegador (seleção, cursor, rolagem, seta de `select`) vêm da paleta; o foco usa só `outline`, sem alterar o raio; o mapa usa oceano `#0a1a21`, continente `#1a2c24` e Brasil `#28503a`.

## 1. Conceito

Território, água e ciclo agrícola. A assinatura é a **linha do tempo de fases alinhada à chuva e à reserva de água** (`PhaseTimeline`): faixa de cultura, faixa de fase, barras de chuva, linha de reserva e marcas de déficit sobre o mesmo eixo de datas. Aparece na visão geral, no município, no Field Shift e no simulador, sempre com um único cursor.

## 2. Tokens de cor

| Papel | Variável | Escuro | Claro |
| --- | --- | --- | --- |
| Fundo | `--bg` | #0B1411 | #F2F6F3 |
| Superfície | `--surface` | #14231C | #FFFFFF |
| Superfície 2 (cabeçalho de tabela, hover) | `--surface-2` | #1B2E25 | #E7EFE9 |
| Texto principal | `--text` | #EAF2EB | #163C2D |
| Texto secundário | `--text-2` | #A7B8AE | #465E52 |
| Ação principal | `--action` / `--on-action` | #87C98F / #102218 | #176B4B / #FFFFFF |
| Água / precipitação | `--water` | #79BDD8 | #146B8A |
| Atenção | `--warn` | #E6B85C | #805700 |
| Risco | `--risk` | #F08C79 | #AF352E |
| Solo / cobertura seca | `--soil` | #B99975 | #765737 |
| Borda decorativa | `--border` | #2C4136 | #C7D3C9 |
| Borda de controle e foco | `--border-strong` / `--focus` | #6F8A7B / #EAF2EB | #71887B / #164B7A |

`--surface-2`, `--border`, `--border-strong` e os `--tint-*` foram acrescentados aos nove papéis do briefing. No escuro os tints são translúcidos (14–18%); no claro são opacos (`#E3F2E9`, `#E4F1F7`, `#FFF1D1`, `#FCE9E6`, `#F0E9DF`), para não mudarem com a pilha de fundos.

### Tema claro "Campo claro / verde mineral" e tokens de estado (renovação de 15/11/2026)

O claro passou a ser fundo frio muito claro, painéis brancos, texto verde profundo, ação verde concentrada, azul mineral para água e ocre para atenção (pesquisa em `Docs/visual-refresh/README.md`). O escuro manteve a base. Os tokens abaixo existem **nos dois temas** (um teste garante que nenhum é herdado por acidente):

| Papel | Variável | Escuro | Claro |
| --- | --- | --- | --- |
| Ação sob o ponteiro / pressionada | `--action-hover` / `--action-active` | #9FD6A4 / #A9DEAE | #11543A / #0C432E |
| Seleção secundária (fundo / texto) | `--selected` / `--on-selected` | #294B37 / #EAF2EB | #CFE7D9 / #163C2D |
| Seleção de texto | `--selection-bg` / `--selection-text` | #294B37 / #EAF2EB | #CFE7D9 / #163C2D |
| Halo do foco sobre mídia | `--focus-halo` | #0B1411 | #FFFFFF |
| Halo de séries e cursor nos gráficos | `--chart-halo` | #14231C | #FFFFFF |
| Céu da cena (topo / horizonte) | `--scene-sky-top` / `--scene-sky-bottom` | #0D1A22 / #12241C | #DDEEF3 / #EFF3E8 |
| Placa de texto sobre cena e mapa | `--scene-label-bg` / `--scene-label-text` | #14231C / #EAF2EB | #FFFFFF / #163C2D |
| Entorno do mapa e marcadores | `--map-space`, `--map-ocean`, `--map-pin`, `--map-draft`, `--map-sensor`, `--map-marker-border`, `--map-marker-ring` | valores de `map/palette.ts` | idem |

Regras de estado:

- **Primário** (normal, hover, `:active`, `aria-pressed=true`) tem sempre preenchimento sólido e texto `--on-action`. A regra de seleção secundária (`.btn[aria-pressed='true']`, fundo `--selected`) nunca o alcança: era ela que deixava "Pausar" branco sobre quase branco (1,16:1 no claro, 1,36:1 no escuro).
- **Seleção secundária** (botão, opção de `Seg`, item de lista, alternador de simulador) usa `--selected` + `--on-selected` e a borda `--action`.
- **Foco** continua `outline` de 2px em `--focus`; sobre mapa e cena o anel é de duas cores (`--focus` entre duas faixas `--focus-halo`), porque os pixels atrás variam.
- **Mapas**: as cores das camadas do MapLibre vêm de `map/palette.ts` (um objeto tipado por tema); trocar o tema repinta as camadas existentes, sem recriar o mapa. A legenda lê o mesmo objeto.
- **Gráficos**: chuva opaca; séries e cursor passam sobre um halo `--chart-halo`; B tracejada, C pontilhada; o cursor tem alça.
- **Cena**: céu por tokens, legenda e rótulos em placa opaca; nenhum texto direto sobre o solo (cuja cor acompanha a reserva de água do modelo).

### Contraste medido (WCAG 2.x)

| Par | Frente | Fundo | Razão |
| --- | --- | --- | --- |
| Texto principal / fundo (escuro) | #EAF2EB | #0B1411 | 16.39:1 |
| Texto principal / superfície (escuro) | #EAF2EB | #14231C | 14.30:1 |
| Texto secundário / fundo (escuro) | #A7B8AE | #0B1411 | 9.01:1 |
| Texto secundário / superfície (escuro) | #A7B8AE | #14231C | 7.86:1 |
| Texto secundário / superfície-2 (escuro) | #A7B8AE | #1B2E25 | 6.91:1 |
| Botão principal (escuro) | #102218 | #87C98F | 8.53:1 |
| Água / superfície (escuro) | #79BDD8 | #14231C | 7.84:1 |
| Atenção / superfície (escuro) | #E6B85C | #14231C | 8.84:1 |
| Risco / superfície (escuro) | #F08C79 | #14231C | 6.79:1 |
| Solo / superfície (escuro) | #B99975 | #14231C | 6.12:1 |
| Ação (link, indicador) / superfície (escuro) | #87C98F | #14231C | 8.38:1 |
| Borda forte de controle / fundo (escuro) | #6F8A7B | #0B1411 | 4.99:1 |
| Borda forte de controle / superfície (escuro) | #6F8A7B | #14231C | 4.35:1 |
| Foco / fundo (escuro) | #EAF2EB | #0B1411 | 16.39:1 |
| Texto principal / fundo (claro) | #163C2D | #F2F6F3 | 11.20:1 |
| Texto secundário / fundo (claro) | #465E52 | #F2F6F3 | 6.45:1 |
| Texto secundário / superfície (claro) | #465E52 | #FFFFFF | 7.04:1 |
| Texto secundário / superfície-2 (claro) | #465E52 | #E7EFE9 | 6.01:1 |
| Botão principal (claro) | #FFFFFF | #176B4B | 6.48:1 |
| Botão principal pressionado (claro) | #FFFFFF | #0C432E | 11.30:1 |
| Botão principal pressionado (escuro) | #102218 | #A9DEAE | 10.88:1 |
| Seleção secundária (claro) | #163C2D | #CFE7D9 | 9.36:1 |
| Seleção secundária (escuro) | #EAF2EB | #294B37 | 8.53:1 |
| Água / superfície (claro) | #146B8A | #FFFFFF | 6.00:1 |
| Atenção / superfície (claro) | #805700 | #FFFFFF | 6.40:1 |
| Risco / superfície (claro) | #AF352E | #FFFFFF | 6.23:1 |
| Solo / superfície (claro) | #765737 | #FFFFFF | 6.59:1 |
| Ação / fundo (claro) | #176B4B | #F2F6F3 | 5.94:1 |
| Borda forte de controle / fundo (claro) | #71887B | #F2F6F3 | 3.49:1 |
| Borda forte de controle / superfície (claro) | #71887B | #FFFFFF | 3.81:1 |

Os pares acima são medições de pares de cor, não uma certificação da interface. A lista completa (92 pares, incluindo estados, tints, foco, gráficos e mapa nos dois temas) é gerada dos tokens reais por `node scripts/contrast-report.mjs` e verificada em `src/teammate/theme-tokens.test.ts`; a página `/design-preview` calcula as razões ao vivo, a partir da folha de estilo em uso. Quatro pares de contorno do **mapa escuro** (costa, divisa estadual e limite municipal sobre os seus preenchimentos) ficam abaixo de 3:1 (1,83 a 2,98): são do mapa escuro original, que não foi redesenhado; seleção, rótulos e marcadores não dependem deles. Sobre mapa e cena, todo texto fica em superfície sólida (painéis, legenda, marcadores, placas). Cor nunca é o único sinal: selos trazem texto, fases trazem rótulo, déficit tem legenda, a série B é tracejada e o cursor tem alça.

## 3. Tipografia

- **Bricolage Grotesque 500/600** — marca, títulos de tela (24–26px), títulos de bloco (20px), números de destaque (24px).
- **Source Sans 3 400/500/600** — corpo 16px, metadados 13–14px, controles, tabelas.
- Números tabulares em todo o app; colunas numéricas alinhadas à direita.
- Fontes auto-hospedadas (`@fontsource`, subconjunto latin, só os cinco pesos usados). Carregamento conferido em teste (`document.fonts.check` e `font-family` computada).
- Sem título de marketing dentro do fluxo: cada tela abre com título contextual + próxima ação.

## 4. Geometria

Escala 4/8/12/16/24/32. Controles com 44px de altura (36px só em ações secundárias dentro de tabelas). Raio 8px em controles, 12px em painéis, 16px em diálogos. Sombra apenas em sobreposições (painéis do mapa, busca, diálogo).

## 5. Ícones

Lucide, traço único: Globe, Sprout, CloudRain, CalendarDays, SlidersHorizontal, Layers, Tractor, Droplets, Bell, CircleUserRound, MapPin, Sun/Moon. Sempre com texto ou `aria-label`.

## 6. Componentes e estados (`src/ui`)

| Componente | Papel | Estados cobertos |
| --- | --- | --- |
| `btn` (primária, secundária, ghost, perigo) | uma ação principal por bloco | hover, ativo, foco, desativado, pressionado |
| `Field`, `Seg`, `check` | formulários curtos por evento | dica, erro ligado por `aria-describedby`, inválido, desativado com motivo |
| `Pill` | natureza do dado: Previsão, Histórico, Simulação histórica, Retrospectivo, Dado sintético, Modo local | cinco tons + neutro |
| `Source` | origem em toda visualização | exemplo do pacote, ilustrativo, sintético, local |
| `Notice` | lacunas, hipóteses, erros | info, atenção, risco |
| `Loading`, `Empty`, `ErrorState` | carregando, vazio, erro (com "Tentar de novo"), sem conexão | — |
| `Tabs` | Clima / Água / Safra / Imagem orbital | selecionada, foco, teclado (setas, Home, End) |
| `Dialog` | confirmação destrutiva | `<dialog>` nativo: foco preso, Esc, retorno de foco |
| `PhaseTimeline` | assinatura | somente leitura (`role=img`) ou cursor (`role=slider`, setas e PageUp/Down) |
| `ExplorerMap` | globo MapLibre | seleção, cobertura, WebGL indisponível |
| `Field3D` / `Field2D` | campo ilustrativo: plantas por órgãos (soja, milho, braquiária) no estágio real da linha da simulação | WebGL 2, vista de perto, alternativa 2D com os mesmos órgãos, cultura sem planta nesta cena |
| `CropBoard` (`/design-preview`) | prancha demonstrativa dos arquétipos do catálogo, por fase | 3D (um renderer para todos os cartões) ou 2D; não habilita cultura nem série |

## 7. Adaptações do Taste (data-terminal) para agricultores

Mantido do estilo: superfícies mais escuras que o padrão de "card com brilho", dígitos tabulares, seleção marcada por uma linha de acento na borda existente (aba, item do trilho), gráfico sempre com escala e datas, sinal no texto (`+115`, `−0,35`).

Alterado de propósito:

| Taste data-terminal | Gaiapus | Motivo |
| --- | --- | --- |
| Corpo 13px, linha de 42px, controle de 34px | Corpo 16px, linha ≥44px, controle de 44px | toque e leitura ao ar livre |
| Trilho de ícones sem rótulo (50px) | Trilho de 88px com rótulo sob o ícone; barra inferior no celular | destino legível sem tooltip |
| Cor em menos de 3%, acento só como linha de 1px | Linha de 2–3px e selos com fundo tingido | risco hídrico e foco não podem sumir |
| Texto em caixa-preta neutra, tudo branco/cinza | Paleta verde-água do briefing; cor semântica para água, atenção, risco, solo | identidade agrícola pedida |
| Figuras em monoespaçada | Source Sans 3 com números tabulares | uma família a menos, mesma leitura em coluna |
| Só escuro | Escuro e claro, escolhidos pelo usuário e mantidos entre telas | leitura longa e sol forte |

## 8. Movimento

| Movimento | Valor | Origem |
| --- | --- | --- |
| Hover / foco | 140 ms | proposta do briefing |
| Indicador de aba | 300 ms, curva `linear()` com ultrapassagem de 5,8% | **medido** na referência ForgeUI (`.reanimate/gaiapus-tabs`) |
| Painel contextual e diálogo | 260 ms, deslocamento 12–16px | proposta do briefing |
| Voo do mapa | 1000 ms, `fitBounds` com padding dos painéis, interrompível | proposta do briefing |
| Linha do tempo | resposta direta, sem easing | proposta do briefing |

`prefers-reduced-motion`: transições e animações caem para 1 ms e o mapa vai direto à posição final. O campo 3D renderiza sob demanda (sem laço contínuo), sem partículas nem brilho.

### Plantas ilustrativas

Uma planta é um plano de órgãos (`sim/plants/*.ts`, dados puros) que vira uma geometria com cor por vértice. A cena e a alternativa 2D leem o mesmo plano. O que é desenhado vem de `sim/visual-state.ts`: cultura e cobertura da `land_cover` real, fase real, e posição dentro da fase só quando a série original traz o início e o fim dessa fase; sem isso a planta fica em pose fixa (uma janela de previsão de seis dias não percorre uma fase). Estresse hídrico do modelo não muda a cor das folhas: no perfil ele é uma faixa na linha do solo, com legenda. Palhada só existe na prancha (a série não informa resíduo). Café é perene: idade e fase dos frutos são dimensões separadas e a estrutura adulta não reinicia. Tamanhos, datas e número de órgãos são escolhas de desenho, sem validação agronômica.

## 9. Não fazer

- Texto direto sobre o mapa sem superfície.
- Número de rendimento sem "município", ano e "retrospectivo".
- Valor preenchido onde o dado falta: mostrar "—" ou "não fornecido" e dizer o que falta.
- Trocar de tema ao navegar.
- Aplicar a regra de seleção secundária ao botão principal, ou escrever hex novo em componente para contornar os tokens.
- Texto direto sobre o solo ou o céu da cena.
- Pintar estresse, doença ou morte na planta a partir da água do modelo; desenhar palhada sem sinal de resíduo; dar ciclo anual ao café.
- Tratar um modelo na prancha como suporte: cultura sem série continua sem simulação.
- Selo colorido sem texto.
