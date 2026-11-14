# Gaiapus — linguagem visual (DESIGN.md)

Formalização da direção do briefing de 14/11/2026. Fonte da verdade em código: `src/styles.css` (tokens) e `src/config.ts` (edição, movimento). A rota `#/design-preview` mostra tudo renderizado.

> Nota de processo: as skills locais (Hue, Taste, Impeccable, shadcn, Reanimate, web-design-guidelines) ficam em `C:/Users/leand/.claude/skills`, pasta que não pôde ser conectada a esta sessão. Este documento segue o papel que o briefing atribui ao Hue, mas **não é a saída da skill Hue**; rode-a sobre este arquivo se quiser a versão gerada por ela.

> Sessão 2 (14/11/2026, Claude Code local): Impeccable (`polish`) e web-design-guidelines foram executadas sobre este sistema; Hue continua não executada. Acréscimos: superfícies do navegador (seleção, cursor, rolagem, seta de `select`) vêm da paleta; o foco usa só `outline`, sem alterar o raio; o mapa usa oceano `#0a1a21`, continente `#1a2c24` e Brasil `#28503a`.

## 1. Conceito

Território, água e ciclo agrícola. A assinatura é a **linha do tempo de fases alinhada à chuva e à reserva de água** (`PhaseTimeline`): faixa de cultura, faixa de fase, barras de chuva, linha de reserva e marcas de déficit sobre o mesmo eixo de datas. Aparece na visão geral, no município, no Field Shift e no simulador, sempre com um único cursor.

## 2. Tokens de cor

| Papel | Variável | Escuro | Claro |
| --- | --- | --- | --- |
| Fundo | `--bg` | #0B1411 | #F5F7F2 |
| Superfície | `--surface` | #14231C | #FFFFFF |
| Superfície 2 (cabeçalho de tabela, hover) | `--surface-2` | #1B2E25 | #EDF1E9 |
| Texto principal | `--text` | #EAF2EB | #173326 |
| Texto secundário | `--text-2` | #A7B8AE | #506358 |
| Ação principal | `--action` / `--on-action` | #87C98F / #102218 | #21613F / #FFFFFF |
| Água / precipitação | `--water` | #79BDD8 | #236A85 |
| Atenção | `--warn` | #E6B85C | #865900 |
| Risco | `--risk` | #F08C79 | #B13D2D |
| Solo / cobertura seca | `--soil` | #B99975 | #795C3F |
| Borda decorativa | `--border` | #2C4136 | #D5DDD3 |
| Borda de controle e foco | `--border-strong` / `--focus` | #6F8A7B / #EAF2EB | #6B7F73 / #173326 |

`--surface-2`, `--border`, `--border-strong` e os `--tint-*` (fundos de selo a 10–18%) foram acrescentados aos nove papéis do briefing.

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
| Texto principal / fundo (claro) | #173326 | #F5F7F2 | 12.66:1 |
| Texto secundário / fundo (claro) | #506358 | #F5F7F2 | 5.96:1 |
| Texto secundário / superfície (claro) | #506358 | #FFFFFF | 6.43:1 |
| Texto secundário / superfície-2 (claro) | #506358 | #EDF1E9 | 5.62:1 |
| Botão principal (claro) | #FFFFFF | #21613F | 7.38:1 |
| Água / superfície (claro) | #236A85 | #FFFFFF | 6.05:1 |
| Atenção / superfície (claro) | #865900 | #FFFFFF | 6.10:1 |
| Risco / superfície (claro) | #B13D2D | #FFFFFF | 5.87:1 |
| Solo / superfície (claro) | #795C3F | #FFFFFF | 6.15:1 |
| Ação / fundo (claro) | #21613F | #F5F7F2 | 6.84:1 |
| Borda forte de controle / fundo (claro) | #6B7F73 | #F5F7F2 | 3.97:1 |
| Borda forte de controle / superfície (claro) | #6B7F73 | #FFFFFF | 4.28:1 |

Texto passa de 4,5:1 em todas as superfícies; bordas de controle e foco passam de 3:1. Sobre o mapa, todo texto fica em superfície sólida (painéis, legenda, marcadores). Cor nunca é o único sinal: selos trazem texto, fases trazem rótulo, déficit tem legenda.

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
| `Field3D` / `Field2D` | campo ilustrativo | WebGL ou alternativa 2D |

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

## 9. Não fazer

- Texto direto sobre o mapa sem superfície.
- Número de rendimento sem "município", ano e "retrospectivo".
- Valor preenchido onde o dado falta: mostrar "—" ou "não fornecido" e dizer o que falta.
- Trocar de tema ao navegar.
- Selo colorido sem texto.
