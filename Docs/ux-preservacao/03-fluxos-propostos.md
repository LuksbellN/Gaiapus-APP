# 03 — Fluxos propostos e matriz de preservação

Base: inventário em `01-inventario.md` e achados em `02-diagnostico.md`. Nada aqui foi implementado. Ganhos de esforço são **hipóteses** até serem medidos com agricultores.

## 1. O que se quer e o que não se quer

**Objetivo:** reduzir o esforço para entender e concluir cada tarefa, mantendo todas as capacidades acessíveis.

| | |
|---|---|
| **Metas** | Contexto de local, cultura e safra inequívoco em toda tela. Continuidade entre explorar, planejar, simular e registrar. Todos os destinos encontráveis no desktop e no celular. Ajuda opcional por tela. Mundo navegável com cobertura explícita. Cinco idiomas |
| **Fora de escopo** | Novo framework de componentes, nova identidade visual, sincronização de propriedades e registros com o backend, novos modelos ou métricas, cadastro de propriedade fora do Brasil |
| **O que tornaria isto um fracasso** | Uma função, campo, cultura, modo ou aviso científico deixar de existir ou ficar inalcançável. Um número mudar de valor por causa de idioma. Dados de uma conta aparecerem em outra. Um país deixar de ser selecionável por não ter análise. Sorriso aparecer como se fosse a lavoura do usuário |

Cada proposta abaixo responde às cinco perguntas do briefing: tarefa que melhora, problema observado e onde, capacidade que permanece, onde ela fica e como é descoberta, como verificar.

## 2. Abordagens consideradas

### A — Agrupar a navegação por tarefa, mantendo as rotas

Os 11 destinos atuais (9 da navegação + Propriedades + Conta) passam a aparecer em cinco grupos. Nenhuma rota muda.

```text
Explorar         Explorar o mundo · Município
Acompanhar       Visão geral · Alertas · Sondas
Planejar         Planejar plantio · Simulador · Field Shift
Minha lavoura    Propriedades e talhões · Registros
Conta e ajuda    Conta · Ajuda · Idioma · Linguagem visual
```

- **A favor:** resolve D-15 (Propriedades sem entrada); dá ao celular a mesma estrutura do desktop; os grupos coincidem com as jornadas.
- **Contra:** mexe na memória de quem já usa; nomes de grupo precisam ser testados; "Município" pode ser procurado em "Acompanhar".
- **Custo:** `App.tsx` (lista `NAV`), `More.tsx`, CSS da navegação. Sem tocar em páginas.

### B — Manter a navegação e acrescentar entradas por objetivo

A navegação fica como está. Entram quatro entradas de objetivo onde o usuário já está: "Explorar uma região", "Acompanhar minha safra", "Planejar um plantio", "Registrar atividade".

- **A favor:** menor mudança; o cartão "O que você quer fazer?" já existe na Visão geral (V-10) e pode ser reaproveitado.
- **Contra:** não resolve a ausência de Propriedades na navegação; mantém "Mais" como lista plana; a dispersão continua.

### C — Fundir telas (descartada)

Juntar Município à Visão geral, Field Shift ao Simulador, Alertas à Visão geral. Descartada: os problemas observados são de **contexto e continuidade**, não de quantidade de telas (D-02, D-04, D-05, D-14). Fundir exigiria remapear cada ação, URL e estado, que é exatamente o caminho que abriu espaço para perda de função na rodada anterior. Pode ser reavaliada depois, tela a tela, com a matriz desta pasta como contrato.

### Recomendação

**Primeiro contexto e continuidade; depois A, em duas etapas.**

1. **Etapa 1, sem mexer na navegação:** correções de contexto (B3), continuidade plano → simulador (O4), título e foco (O1), origem do dado (O2), entrada de Propriedades na navegação e "Mais" agrupado (O3, parte 1), entradas por objetivo da abordagem B reaproveitando V-10.
2. **Etapa 2, depois de observar uso:** separadores e nomes de grupo na navegação lateral (O3, parte 2).

A etapa 2 é decisão do Leandro (ver `05`, decisões pendentes). A etapa 1 não depende dela.

## 3. Navegação proposta

### Desktop (trilho lateral de 88 px)

```text
Hoje                          Proposto (etapa 1)              Proposto (etapa 2)
───────────────────────       ───────────────────────         ─────────────────────────
Explorar                      Explorar                        ▸ Explorar
Visão geral                   Visão geral                       Explorar · Município
Município                     Município                       ▸ Acompanhar
Planejar                      Planejar                          Visão geral · Alertas · Sondas
Simulador                     Simulador                       ▸ Planejar
Field Shift                   Field Shift                       Planejar · Simulador · Field Shift
───                           ───                             ▸ Minha lavoura
Registros                     Propriedades   ← novo             Propriedades · Registros
Sondas                        Registros                       ▸ Conta e ajuda
Alertas                       Sondas                            Ajuda
                              Alertas
                              ───
                              Ajuda          ← novo
```

- Os grupos da etapa 2 usam o separador `hr` que já existe (`App.tsx:73`) e `role="group"` com nome acessível. Rótulo visível de grupo só onde há largura ("Mais" no celular).
- Conta, tema e idioma continuam no cabeçalho.
- O trilho já rola quando não cabe (`styles.css:57`); conferir em 768 px de altura.

### Celular

A barra inferior **não muda**: Explorar, Visão geral, Simulador, Registros, Mais. "Mais" passa a listar **todos** os destinos, nos cinco grupos, incluindo os que já estão na barra, mais Idioma, Ajuda e "Sobre esta edição" (que hoje é invisível no celular: os selos G-04 e G-05 são ocultados).

```text
Mais
  Explorar          Explorar o mundo · Município
  Acompanhar        Visão geral · Alertas · Sondas
  Planejar          Planejar plantio · Simulador · Field Shift
  Minha lavoura     Propriedades e talhões · Registros
  Conta e ajuda     Conta · Idioma: Português · Ajuda · Sobre esta edição · Linguagem visual
```

### Cabeçalho

```text
Desktop   [Gaiapus] [contexto atual ……………………] [Edição 2026][Dados de exemplo] [Idioma: Português ▾] [☼] [Entrar]
Celular   [marca]   [contexto ……]                                              [PT ▾]               [☼] [conta]
```

- O seletor de idioma fica no cabeçalho em todas as larguras e antes do login. Quem encolhe é o botão de contexto (`min-width: 0`, texto com reticências), nunca abaixo de 96 px. Conferir em 320, 360 e 390 px.
- Detalhe do seletor em `07-idiomas.md`, seção 2.

## 4. Regra única de contexto

Hoje o cabeçalho mostra o **talhão em uso** e cada tela mostra o **lugar do dado**, sem relação declarada (D-02). Proposta: uma função só, usada por todas as telas de dado.

```text
lugarDoDado(tela) =
  1. o que a URL pede (mun, cultura)                      → origem "link"
  2. senão, o município do talhão em uso                  → origem "talhão"
  3. senão, a demonstração de Sorriso                     → origem "demonstração"
```

| Tela | Regra | Quando não há análise para o lugar resolvido |
|---|---|---|
| Visão geral | 1 → 2 → 3 | Estado "sem análise para esta seleção" com o lugar mantido e duas ações: "Ver a demonstração de Sorriso" e "Ver regiões com dados" |
| Alertas | 1 → 2 → 3 | Idem |
| Município | 1 → 2 → 3 | Abas mostram o que existe e explicam o que falta (já é assim por aba) |
| Planejar | 1 → 2 → 3 (já é assim, `Plan.tsx:20`) | Já explica por bloco |
| Simulador | 1 → 3 | Permanece a demonstração como padrão, **declarada**; ver nota |
| Field Shift | 1 → 3 | Idem |

**Nota sobre Simulador e Field Shift (decisão minha, corrigível):** são produtos que o próprio título define como "simulação histórica de Sorriso". Abrir pela navegação e cair numa tela "sem série compatível" porque o talhão é de outro município acrescentaria um passo para chegar à função principal. Por isso o padrão continua sendo a demonstração, com a faixa de escopo dizendo que não é o talhão do usuário.

### Faixa de escopo do dado

Abaixo do título de toda tela de dado, sempre visível, nunca dentro de expansor:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Dados de  Sorriso, MT · município inteiro · previsão de 14 a 19 nov 2026     │
│ Origem    Publicação da API · exemplo retrospectivo/projeção publicada       │
│ ⚠ Demonstração. Seu talhão em uso (Talhão A) fica em Uberlândia, MG.         │
│   [Ver o que existe para Uberlândia]  [Continuar na demonstração]            │
└──────────────────────────────────────────────────────────────────────────────┘
```

- A terceira linha só aparece quando o lugar do dado difere do talhão em uso, ou quando a origem é "demonstração".
- Substitui o aviso atual `Overview.tsx:29`, que some justamente quando mais importa.
- Reaproveita `Pill`, `Notice` e `Source`; sem componente novo de identidade.

## 5. Três níveis por tela

Regra: **Principal** responde "onde, o quê, e agora?"; **Contextual** sustenta a tarefa; **Detalhes** guarda método e métricas extensas. Tipo de dado, período, escala, origem resumida, estado experimental e a limitação que muda a leitura ficam no nível principal.

| Tela | Principal | Contextual | Detalhes (sempre acessíveis) |
|---|---|---|---|
| Explorar | Busca, trilha, lugar selecionado, selo de cobertura, próxima ação | Listas, regiões com dados, camadas, legenda, atalhos | Fonte da malha, versão da publicação |
| Visão geral | Faixa de escopo, alerta, reserva, "O que você quer fazer?" | Próximos dias (tabela e linha do tempo), próxima atividade | Déficit por fase, rendimento de referência e teste do modelo, incerteza, hipótese de solo |
| Município | Lugar, escala municipal, abas | Conteúdo da aba, seletor de cultura e de ano | Capacidades, situação científica em quatro partes, exemplo de outro município |
| Planejar | Lugar, cultura, "Seu plano", salvar | Comparação de datas, margem estimada, planos salvos | Capacidades, situação científica |
| Simulador | Tipo de dado, data, cultura e fase, campo, reproduzir | Linha do tempo, indicadores do dia, A/B, ano | Hipóteses fixas, rendimento e teste, fonte |
| Field Shift | Pergunta, três indicadores, aviso da hipótese | Tabela A × B, dia a dia | Sensibilidade, o que não foi simulado |
| Propriedades | Aviso de modo local, propriedades e talhão em uso | Formulários de propriedade e talhão | Contorno demonstrativo |
| Registros | Talhão, tipos de registro, histórico | Formulário do tipo escolhido, cálculo | Revisões, origem, consentimento |
| Sondas / Alertas | Selo sintético; alerta com motivo e ação | Leituras; período e fonte | Calibração; incerteza |
| Conta | Estado da conta, aviso de modo local | Seus dados, exportar | Consentimento de pesquisa, apagar dados |

Ordem no celular [C]: hoje `.cols` empilha a coluna principal e depois a lateral, então na Visão geral a reserva e "O que você quer fazer?" ficam depois de três cartões longos. Proposta: no celular a ordem vira alerta → reserva → ações → próximos dias → próxima atividade → déficit por fase → rendimento. Só ordem; nenhum bloco sai.

"Detalhes" não significa esconder: são seções com título no fim da tela ou expansores **abertos por padrão no desktop**. No celular, expansores fechados só para tabelas longas (sensibilidade, matriz de validação), com o resumo e o selo de estado sempre fora do expansor.

## 6. Fluxos antes e depois

Contagem = ações do usuário (digitar, escolher, clicar) no caminho mais curto. "Antes" foi observado no navegador; "depois" é projeção. Na maioria das jornadas o número de ações **não cai**: o ganho esperado está em achar a entrada, não chegar a um beco e ler o resultado certo.

### J1 — Primeira visita: achar um lugar e ver o que existe

```text
Antes   Explorar → digitar na busca → escolher → "Ver água e clima"                          3 ações
        Com a API fora: busca responde "Nada encontrado" para tudo (D-01)                    sem saída
        Lugar da API fora de MG/MT: "Município não encontrado" (D-07)                        sem saída
Depois  Explorar → busca (locais sempre; remotos quando houver) → escolher → ação do         3 ações
        estado de cobertura
        Atalho novo: "Regiões com dados" → escolher                                          2 ações
```

Preserva E-01 a E-24. Verificação: RT-01, RT-02, RT-04.

### J2 — Cadastrar propriedade e talhão, e passar a acompanhar

```text
Antes   Visão geral → link dentro do aviso (não há entrada na navegação) → propriedade       9 ações
        (nome, buscar município, escolher, salvar) → talhão (nome, área, salvar) → voltar
        à Visão geral pela navegação → continua mostrando Sorriso, agora sem aviso (D-02)
Depois  Navegação › Propriedades → propriedade (4) → talhão (3) → "Acompanhar este talhão"   9 ações
        → Visão geral resolvida pelo talhão: mostra o que existe para o município, ou o
        estado "sem análise" com a demonstração como ação explícita
```

Mesmo número de ações; mudam a entrada (visível na navegação) e o resultado (coerente com o talhão).

Preserva R-01 a R-06. Verificação: RT-06, RT-12.

### J3 — Planejar, simular, salvar e reabrir

```text
Antes   Planejar → cultura, área → (datas) → (economia) → "Salvar e abrir no simulador"      3 ações no mínimo
        → simulador abre sem dizer o que veio do plano (D-14)
        Reabrir: só 5 planos; município do plano não é aplicado (D-05)
Depois  Planejar (grupos: Seu plano · Comparar datas · Margem · Revisão) → "Salvar e abrir   3 ações no mínimo
        no simulador" → simulador mostra "Aberto a partir do plano de {data}: usados cultura
        e local" com link de volta
        Reabrir: lista completa; o plano traz o seu município e diz de onde veio
```

Preserva P-01 a P-14 e S-01 a S-16. Verificação: RT-09, RT-10.

### J4 — Registrar plantio, manejo, colheita ou venda

```text
Antes   Registros → tipo → campos obrigatórios → salvar
        Trocar de talhão no meio: o rascunho do talhão anterior não volta (D-06)
        Ponto decimal: valor dez vezes maior (D-03)
Depois  Mesmo caminho e mesmos campos. Rascunho por tipo e talhão recarregado na troca.
        Número lido pelo idioma escolhido; ambíguo é recusado com orientação. Área do
        talhão, cultura e irrigação do plantio ativo sugeridas e editáveis, com origem indicada
```

Preserva R-07 a R-18. Verificação: RT-12, RT-13, RT-14.

### J5 — Entrar, criar conta, recuperar acesso

```text
Antes   Conta → e-mail, senha → Entrar. Erro sob o campo de e-mail em qualquer falha (D-16)
Depois  Mesmo caminho e mesmas rotas (#/conta, #/conta/cadastro, #/conta/recuperar,
        /auth/callback, /auth/recovery). Erro de formulário acima do botão, com foco.
        Textos no idioma escolhido antes do login. Retorno para a tela de origem.
```

Nada muda em PKCE, `emailRedirectTo`, `safeReturnPath`, marcador de recuperação ou `currentAccessToken`. Preserva C-01 a C-16. Verificação: RT-15, RT-22, RT-27.

### J6 — Trocar de idioma

```text
Antes   Não existe.
Depois  Cabeçalho › Idioma › escolher. A tela continua na mesma rota, com o mesmo país,       2 passos
        cultura, modo, dia, plano, rascunho e passo de tutorial.
```

Verificação: RT-20, RT-21.

### J7 — Explorar um país sem análise

```text
Antes   Clique no país, ou busca (só em português) → "Sem análise nesta edição"               2 ações
        → "Ver o Brasil" ou "Escolher outro país"
Depois  Clique no país, ou busca (nome no idioma, nome original ou código) → estado com       2 ações
        a causa real → "Continuar explorando" · "Ver regiões com dados"
```

Detalhe em `06-exploracao-global.md`. Verificação: RT-01, RT-02, RT-05.

## 7. Preenchimento e automação seguros

| Automação | Origem | Como o usuário percebe | Como corrige | Depende de | Risco |
|---|---|---|---|---|---|
| Município, área, solo e irrigação do talhão em uso no plano | `Plot`, `Property` | Texto de apoio "do talhão {nome}" no campo | Edita; edição manual nunca é sobrescrita por resposta tardia | B3 | Baixo |
| Cultura e safra do plantio ativo como sugestão em colheita e venda | Último registro de plantio do talhão (`Records.tsx:63`) | "Do plantio de {data}" | Troca no campo | — | Médio: previsto ≠ realizado deve aparecer |
| Rascunho recuperado | `drafts[tipo:talhão]`, mesma conta | "Rascunho recuperado" + "Limpar rascunho" | Limpa ou edita | B5 | Baixo |
| Receita, margem, produtividade | Só valores digitados, peso da saca explícito | A conta escrita por extenso (já existe) | Edita os valores | B2 | Alto se o parser errar: por isso B2 vem antes |
| Seleção e retorno ao ponto anterior | URL tem precedência sobre o armazenamento | Trilha e título | Voltar do navegador | O1 | Baixo |
| Campos não aplicáveis ocultos (ex.: idade do cafezal fora do café) | Cultura escolhida | Aparecem ao escolher café (já é assim, `Records.tsx:108`) | — | — | Baixo; valores guardados não são apagados |

**Nunca preencher por inferência:** data real de plantio ou colheita, produção, preço, peso da saca, umidade ou CAD medida, espécie de café, consentimento, resultado de simulação. Preencher um campo é proposta de UX; não significa que o modelo científico usa o campo.

## 8. Matriz de preservação

Uma linha por capacidade do inventário (145). Colunas de **comportamento atual, dado, persistência, evidência e status real** estão em `01-inventario.md` sob o mesmo ID. Aqui ficam tarefa, proposta, destino, dependências, critério de aceite, teste e risco.

Legenda: **Igual** = mesma rota e mesma posição. Testes `RT-nn` estão definidos em `05-implementacao-e-aceite.md`, seção 5; `E2E-n` e arquivos `*.test.ts` já existem. Risco: B baixo, M médio, A alto.

### Controles globais

| ID | Tarefa do usuário | Proposta | Destino | Depende de | Critério de aceite | Teste | Risco |
|---|---|---|---|---|---|---|---|
| G-01 | Pular a navegação | Manter | Igual | — | Primeiro Tab; Enter leva ao conteúdo | RT-18 | B |
| G-02 | Voltar ao início | Manter | Igual | — | Vai a `/explorar`; marca não é traduzida | RT-18 | B |
| G-03 | Saber em que talhão estou | Manter; acrescentar município do talhão | Igual | B3 | Mostra propriedade · talhão · município · cultura · safra; abre Registros | RT-06 | M |
| G-04 | Saber a edição | Manter; no celular, também em "Mais › Sobre esta edição" | Cabeçalho + Mais | O3 | Visível em 1440 e alcançável em 390 | RT-18 | B |
| G-05 | Saber que são dados de exemplo | Manter; idem G-04 | Cabeçalho + Mais | O3 | Idem | RT-18 | B |
| G-06 | Trocar o tema | Manter; preferência do aparelho | Igual | B7 | Persiste após recarregar, com e sem conta; sem piscar na abertura | RT-27 | M |
| G-07 | Abrir a conta | Manter | Igual | — | "Entrar" ou nome; vai a `/conta` | RT-15 | B |
| G-08 | Ir a qualquer tela (desktop) | Acrescentar Propriedades e Ajuda; grupos na etapa 2 | Trilho lateral | O3 | Os 11 destinos alcançáveis em um clique; pré-carga por intenção preservada | RT-18 | M |
| G-09 | Ir a qualquer tela (celular) | Barra igual; "Mais" agrupado e completo | Barra + Mais | O3 | Todos os destinos em até dois toques | RT-18 | M |
| G-10 | Começar a nova tela do topo | Manter + título e foco | Igual | O1 | Rolagem no topo; `h1` com foco; título muda | RT-18 | B |
| G-11 | Navegar sem esperar | Manter | Igual | — | Mapa e 3D fora da pré-carga; desligada com economia de dados | RT-24 | B |
| G-12 | Recuperar de falha ao abrir tela | Manter | Igual | — | Mensagem + Tentar de novo; registros intactos | RT-16 | B |
| G-13 | Sair do callback de e-mail | Manter | Igual | — | Navegação por hash sai de `/auth/*` | E2E-6 | A |
| G-14 | Não ver formulário de outra conta | Manter | Igual | — | Formulários remontam ao trocar de conta | `session-boundary.test.tsx` | A |
| G-15 | Entender um endereço inválido | Manter | Igual | — | Título + link para o explorador | RT-18 | B |
| G-16 | Entender falha de inicialização | Manter; texto no idioma do aparelho | Igual | I6 | Mensagem aparece sem depender do catálogo carregado | RT-20 | M |
| G-17 | **Novo:** escolher o idioma | Acrescentar | Cabeçalho, Mais, Conta | I1, I2 | Cinco idiomas; antes do login; persiste | RT-20 | M |
| G-18 | **Novo:** pedir ajuda da tela | Acrescentar | Botão "Como usar esta tela" no título + Ajuda | H1 | Abre o roteiro da tela; nunca inicia sozinho | RT-23 | B |

### Explorar

| ID | Tarefa do usuário | Proposta | Destino | Depende de | Critério de aceite | Teste | Risco |
|---|---|---|---|---|---|---|---|
| E-01 | Ver o mundo e girar | Manter | Igual | — | Globo interativo; mapa-base com rede | RT-01 | B |
| E-02 | Escolher pelo mapa | Manter; subdivisão conforme a fonte | Igual | G1 | Clique seleciona município, estado ou país; nunca redireciona ao Brasil | RT-01 | M |
| E-03 | Ver o que está selecionado | Manter | Igual | — | Destaque em país, estado e município | RT-01 | B |
| E-04 | Enquadrar a seleção | Manter | Igual | — | Câmera coerente com painéis em 1440 e 390 | RT-01 | B |
| E-05 | Ver onde há dados | Marcadores vindos do catálogo | Igual | G2 | Um marcador por área com produto disponível; nenhum país inteiro pintado | RT-02 | M |
| E-06 | Buscar um lugar | Locais sempre; remoto sinalizado; aliases; ver todos | Igual | B1, G5 | Com a API fora, países, estados e municípios locais aparecem com aviso | RT-04, RT-05 | A |
| E-07 | Percorrer países | Manter; nomes no idioma | Igual | I7 | 232 itens; filtro por nome no idioma, original e código | RT-01, RT-05 | M |
| E-08 | Percorrer estados | Manter; selo passa a significar análise, não malha | Igual | G2 | "Com análise" só onde o catálogo indica | RT-02 | M |
| E-09 | Percorrer municípios | Manter; "Mostrar mais" | Igual | G5 | Todos os municípios alcançáveis sem digitar | RT-01 | B |
| E-10 | Saber onde estou | Manter; níveis com nomes locais | Igual | G1 | Mundo › País › Região › Localidade | RT-01 | B |
| E-11 | Ver o que dá para analisar | Estados de cobertura por produto | Igual | G2, G3 | Seis estados distintos; período e natureza de cada produto | RT-02 | A |
| E-12 | Entender um país sem análise | Texto com a causa real; duas ações | Igual | G3 | Lugar mantido; nenhum número; "Continuar explorando" e "Ver regiões com dados" | RT-02 | M |
| E-13 | Ligar camadas | Manter; imagem dos recortes do catálogo | Igual | G4 | Limites, cobertura e imagem; Uberlândia continua disponível | RT-02 | M |
| E-14 | Ler a legenda | Manter | Igual | — | Três estados com texto | RT-19 | B |
| E-15 | Usar minha posição | Manter; fora do Brasil seleciona o país | Igual | G6 | Nunca pedida pelo tutorial; negada → mensagem com saída | RT-01, RT-23 | M |
| E-16 | Voltar, aproximar, afastar | Manter | Igual | — | Três controles funcionam e ficam inativos sem mapa | RT-03 | B |
| E-17 | Atalhos | Manter; atalhos vêm do catálogo, Brasil permanece | Igual | G2 | Sorriso e Uberlândia presentes enquanto publicados | RT-02 | B |
| E-18 | Usar no celular | Manter | Igual | — | Três alturas; sem rolagem horizontal | RT-01 | B |
| E-19 | Usar sem WebGL | Manter | Igual | — | Aviso + listas e busca funcionam | E2E-3, RT-03 | A |
| E-20 | Recuperar o mapa | Manter | Igual | — | Aviso + Tentar de novo | RT-03 | M |
| E-21 | Mapa-base sem rede | Manter | Igual | — | Aviso; limites e listas continuam | RT-03 | M |
| E-22 | Código inválido | Manter; separar "não existe" de "não carregado" | Igual | G3 | Mensagens distintas para as duas causas | RT-02 | M |
| E-23 | Cadastrar propriedade aqui | Manter; só oferecida onde o contrato aceita | Igual | G1 | Só com município do IBGE; fora disso, explica | RT-12 | M |
| E-24 | Voltar, avançar, link direto | Manter; URLs atuais aceitas | Igual | G1 | `pais`, `uf`, `mun` antigos continuam abrindo o mesmo lugar | E2E-3, RT-01 | A |

### Visão geral

| ID | Tarefa do usuário | Proposta | Destino | Depende de | Critério de aceite | Teste | Risco |
|---|---|---|---|---|---|---|---|
| V-01 | Saber de onde e de quando é o dado | Título vindo do dado; faixa de escopo | Igual | B3 | Nome do lugar nunca escrito à mão; cultura, dia e estágio do resultado | RT-06 | A |
| V-02 | Saber o tipo de dado | Manter, dentro da faixa | Igual | B3 | "Previsão" e "Escala municipal" visíveis sem rolar | RT-06 | B |
| V-03 | Saber que é demonstração | Substituir pela faixa permanente | Faixa de escopo | B3 | Aviso presente sempre que o dado não é do talhão em uso | RT-06 | A |
| V-04 | Entender o alerta | Manter | Igual | — | Motivo, período, o que fazer, incerteza | RT-06 | B |
| V-05 | Ver os próximos dias | Manter | Igual | — | Tabela completa; rola de lado no celular | RT-06 | B |
| V-06 | Ver chuva e reserva | Manter | Igual | — | Linha do tempo com climatologia | RT-06 | B |
| V-07 | Saber as lacunas | Manter visível | Igual | — | "6 dos 10 dias" fora de expansor | RT-17 | M |
| V-08 | Ver déficit por fase | Manter; nível de detalhes | Mesma tela, depois dos blocos principais no celular | — | Tabela e selo "Histórico" | RT-06 | B |
| V-09 | Ver a reserva | Manter; sobe no celular | Mesma tela, logo após o alerta no celular | — | Valor, barra, origem | RT-06 | B |
| V-10 | Escolher a próxima tarefa | Manter; quatro entradas por objetivo | Mesma tela, antes dos próximos dias no celular | O3 | Planejar, Acompanhar, Registrar e Explorar | RT-18 | B |
| V-11 | Ver a próxima atividade | Filtrar pelo talhão em uso; dizer o talhão | Igual | B3 | Atividade de outro talhão não aparece como do atual | RT-06 | M |
| V-12 | Ver rendimento de referência | Manter; nível de detalhes | Igual | — | Município, ano, "Retrospectivo", MAE, teste do modelo | RT-17 | M |
| V-13 | Recuperar de erro | Manter; "sem análise" vira estado próprio | Igual | B3 | Falha → Tentar de novo; sem cobertura → duas saídas | RT-16 | M |

### Município

| ID | Tarefa do usuário | Proposta | Destino | Depende de | Critério de aceite | Teste | Risco |
|---|---|---|---|---|---|---|---|
| M-01 | Trocar de município | Lista vinda do catálogo; os dois atuais permanecem | Igual | G2 | Sorriso e Uberlândia presentes; novos entram pelo catálogo | RT-07 | M |
| M-02 | Trocar de aba | Manter; frase do que cada aba responde | Igual | — | Aba na URL; setas, Home, End | RT-07 | B |
| M-03 | Clima de Sorriso | Manter | Igual | — | Tabela por ano agrícola + fonte | RT-07 | B |
| M-04 | Chuva de Uberlândia | Manter | Igual | — | Gráfico, total e escopo da fonte | RT-07 | B |
| M-05 | Saber o que ainda não há | Manter | Igual | — | Aviso de séries não publicadas | RT-07 | B |
| M-06 | Água por ano | Manter | Igual | — | Linha do tempo e seletor de ano | RT-07 | B |
| M-07 | Resumo por ano | Manter | Igual | — | Tabela com o ano em destaque | RT-07 | B |
| M-08 | Entender ausência de balanço | Manter | Igual | — | Vazio explicado, com onde há | RT-07 | B |
| M-09 | Escolher a cultura | Manter; rótulos traduzidos, valores por ID | Igual | I4 | 10 culturas; cultura na URL | RT-08 | M |
| M-10 | Ver estimativas do local | Manter | Igual | — | Um cartão por resposta, com modelo, versão e escopo | RT-08, RT-17 | M |
| M-11 | Ver o MLP regional | Manter | Igual | — | Selo "Pesquisa · não liberado"; teste só de MG e MT | RT-17 | M |
| M-12 | Ver exemplo de outro lugar | Manter, separado e identificado | Igual | — | Título diz que não é deste município | RT-08 | M |
| M-13 | Ver capacidades e situação | Manter | Igual | — | Seis capacidades; quatro partes | RT-08 | B |
| M-14 | Ler NDVI e chuva | Manter; recorte vindo do catálogo | Igual | G4 | Lacunas preservadas; nenhum valor estimado | RT-07 | M |
| M-15 | Ver a imagem | Manter | Igual | G4 | Imagem, data, cena, pixels válidos | E2E-5, RT-07 | B |
| M-16 | Entender ausência de imagem | Texto conforme o catálogo | Igual | G4 | Nunca afirma "só Uberlândia" se houver outros recortes | RT-02 | M |

### Planejar

| ID | Tarefa do usuário | Proposta | Destino | Depende de | Critério de aceite | Teste | Risco |
|---|---|---|---|---|---|---|---|
| P-01 | Saber para onde é o plano | Manter; origem do lugar declarada | Igual | B3, B4 | Selo diz o lugar e se veio do link, do talhão, do plano ou da demonstração | RT-09 | M |
| P-02 | Escolher a cultura | Manter | Grupo "Seu plano" | I4 | 9 plantáveis; coorte agregada ausente | RT-08 | B |
| P-03 | Informar área, irrigação, solo | Manter; sugestão do talhão em uso | Grupo "Seu plano" | B2 | Sugestão editável e identificada | RT-09 | M |
| P-04 | Dizer o que pesa mais | Manter; dizer que é só registrada | Grupo "Seu plano" | — | Texto de apoio declara que não altera cálculos | RT-09 | B |
| P-05 | Ler avisos de irrigação e café | Manter | Igual | — | Avisos aparecem nas mesmas condições | RT-08 | B |
| P-06 | Comparar datas | Manter | Grupo "Comparar datas" | — | Só soja em Sorriso; fora disso, explicação | RT-09 | M |
| P-07 | Informar números da economia | Manter todos os campos | Grupo "Margem (opcional)" | B2 | 8 campos; forma do café e peso da saca condicionais | RT-09, RT-14 | A |
| P-08 | Ver receita e margem | Manter | Igual | B2 | Conta por extenso; "Falta: …" quando incompleto | RT-09, RT-14 | A |
| P-09 | Salvar | Manter | Grupo "Revisão" | B4 | Plano gravado com cultura, lugar e todos os campos | RT-09 | M |
| P-10 | Salvar e simular | Manter; simulador declara o que veio do plano | Igual | O4 | Linha "Aberto a partir do plano…" com link de volta | RT-09 | M |
| P-11 | Reabrir um plano | Lista completa; plano traz seu município | Igual | B4 | Todos os planos acessíveis; município do plano aplicado | RT-09 | A |
| P-12 | Completar cultura antiga | Manter | Igual | I4 | "Café" e "Milho" pedem complemento; nada é adivinhado | `crops.test.ts`, RT-08 | M |
| P-13 | Ver capacidades e situação | Manter | Igual | — | Idem M-13 | RT-08 | B |
| P-14 | Não perder o que digitei | Manter | Igual | B5 | Rascunho volta ao reabrir | RT-13 | M |

### Simulador

| ID | Tarefa do usuário | Proposta | Destino | Depende de | Critério de aceite | Teste | Risco |
|---|---|---|---|---|---|---|---|
| S-01 | Escolher o tipo de dado | Manter os quatro | Igual | — | Histórico, cenário, previsão, climatologia; selo no campo | RT-10 | A |
| S-02 | Escolher o ano | Manter | Igual | — | Seis safras | RT-10 | B |
| S-03 | Comparar A/B | Manter | Igual | — | Segunda série e diferença B−A | RT-10 | M |
| S-04 | Ver o campo | Manter 3D e 2D | Igual | — | 3D com WebGL; 2D sem; legenda de ilustração | E2E-5, RT-10 | M |
| S-05 | Recuperar o 3D | Manter | Igual | — | 2D + Tentar de novo | RT-16 | B |
| S-06 | Mover no tempo | Manter | Igual | — | Ponteiro, setas, PageUp/Down, Home, End | RT-10 | A |
| S-07 | Reproduzir e saltar | Manter os sete controles | Igual | — | Reproduzir/pausar, ±1 dia, +1 semana, fases | RT-10 | M |
| S-08 | Mudar a velocidade | Manter | Igual | — | Três velocidades | RT-10 | B |
| S-09 | Ler indicadores | Manter | Igual | — | Dia, acumulado, diferença | RT-10 | M |
| S-10 | Ver rendimento | Manter com o aviso | Igual | — | Não muda com cursor nem cenário; teste do modelo | RT-17 | A |
| S-11 | Ler as hipóteses | Manter | Igual | — | Rotação, solo, reserva, irrigação | RT-10 | B |
| S-12 | Recolher painel; abas no celular | Manter | Igual | — | Campo, Indicadores, Configurar | RT-10 | B |
| S-13 | Entender ausência de série | Manter | Igual | — | Nenhuma curva de soja sob outro nome | RT-08 | A |
| S-14 | Café: produção ou implantação | Manter | Igual | — | Dois textos; nada desenhado | RT-08 | M |
| S-15 | Trocar cultura e local | Manter | Igual | I4 | Seletores levam à tela correta | RT-08 | B |
| S-16 | Compartilhar o cenário | Manter; acrescentar o dia | Igual | O5 | Link reabre modo, ano, A/B, seção e dia | RT-10 | M |

### Field Shift

| ID | Tarefa do usuário | Proposta | Destino | Depende de | Critério de aceite | Teste | Risco |
|---|---|---|---|---|---|---|---|
| F-01 | Entender a pergunta | Manter; faixa de escopo | Igual | B3 | Pergunta, "Simulação histórica", 6 safras | RT-11 | B |
| F-02 | Ver o resultado central | Manter | Igual | — | Três indicadores com sinal | RT-11 | B |
| F-03 | Saber o limite | Manter visível | Igual | — | Aviso da palhada fora de expansor | RT-17 | A |
| F-04 | Comparar A e B | Manter as nove linhas | Igual | — | "Efeito no rendimento: não avaliado" presente | E2E-5, RT-11 | A |
| F-05 | Ver dia a dia | Manter | Igual | — | Seletor de ano e duas reservas | RT-11 | B |
| F-06 | Abrir no simulador | Manter | Igual | — | Leva ao simulador | RT-11 | B |
| F-07 | Ver a sensibilidade | Manter; expansor só no celular | Igual | — | Todas as linhas; linha sem palhada destacada | RT-11 | M |

### Propriedades e Registros

| ID | Tarefa do usuário | Proposta | Destino | Depende de | Critério de aceite | Teste | Risco |
|---|---|---|---|---|---|---|---|
| R-01 | Saber onde ficam meus dados | Manter | Igual | — | "Modo local" ou "Armazenamento indisponível" | RT-12 | A |
| R-02 | Ver e ativar talhão | Manter | Igual | — | "Em uso" e "Usar" | RT-12 | B |
| R-03 | Cadastrar propriedade | Manter; busca local resiliente | Igual | B1 | Município escolhido com a API fora | RT-04, RT-12 | A |
| R-04 | Cadastrar talhão | Manter | Igual | B2 | Seis campos; validação | RT-12 | M |
| R-05 | Usar recorte demonstrativo | Manter | Igual | — | Opção presente e identificada | RT-12 | B |
| R-06 | Chegar com o município escolhido | Manter | Igual | G1 | Campos preenchidos pela rota | RT-12 | B |
| R-07 | Trocar de talhão | Manter | Igual | B5 | Rascunho do talhão escolhido aparece | RT-13 | M |
| R-08 | Escolher o tipo de registro | Manter os quatro | Igual | — | Plantio, manejo, colheita, venda | RT-12 | B |
| R-09 | Registrar plantio | Manter todos os campos | Igual | I4, B2 | 10 campos; café mostra idade e poda | RT-12 | A |
| R-10 | Registrar manejo | Manter | Igual | I4 | 9 tipos; observação | RT-12 | M |
| R-11 | Registrar colheita | Manter | Igual | B2 | 10 campos; produtividade com a conta | RT-12, RT-14 | A |
| R-12 | Registrar venda | Manter | Igual | B2 | Moeda explícita; margem só com os três custos | RT-12, RT-14 | A |
| R-13 | Corrigir erros | Manter | Igual | — | Erro por campo; foco no primeiro | RT-19 | B |
| R-14 | Não perder o que digitei | Corrigir troca de chave | Igual | B5 | A → B → A recupera o rascunho de A | RT-13 | A |
| R-15 | Ver o histórico | Manter | Igual | — | Data, tipo, resumo, safra, origem, revisão | RT-12 | B |
| R-16 | Editar e excluir | Manter | Igual | — | Confirmação antes de excluir | RT-12 | A |
| R-17 | Completar cultura antiga | Manter | Igual | I4 | "Completar cultura" aparece; nada adivinhado | `crops.test.ts`, RT-08 | M |
| R-18 | Não gravar na conta errada | Manter | Igual | — | Gravação pendente rejeitada ao trocar de conta | `scope.test.ts` | A |

### Sondas e Alertas

| ID | Tarefa do usuário | Proposta | Destino | Depende de | Critério de aceite | Teste | Risco |
|---|---|---|---|---|---|---|---|
| D-S1 | Ler as sondas | Manter; separar falha de sonda de alerta agronômico no texto | Igual | — | Selo "Dado sintético"; 8 campos; falha visível | RT-26 | M |
| D-S2 | Entender o alerta | Manter; lugar pela regra de contexto | Igual | B3 | Motivo, período, fonte, ação, incerteza | RT-26 | M |
| D-S3 | Saber o que não há | Manter | Igual | — | Vazio explicado; nenhum alerta inventado | RT-26 | B |

### Conta e autenticação

| ID | Tarefa do usuário | Proposta | Destino | Depende de | Critério de aceite | Teste | Risco |
|---|---|---|---|---|---|---|---|
| C-01 | Entrar | Manter; erro no lugar certo | Igual | B6, I6 | Mesma chamada ao provedor; senha nunca gravada | `session.test.ts`, RT-15 | A |
| C-02 | Criar conta | Manter | Igual | I6 | Confirmação exigida; `emailRedirectTo` igual | `session.test.ts`, RT-15 | A |
| C-03 | Reenviar confirmação | Manter | Igual | I6 | Mensagem neutra | RT-15 | M |
| C-04 | Recuperar acesso | Manter | Igual | I6 | Mensagem neutra; `redirectTo` igual | RT-15 | A |
| C-05 | Continuar sem conta | Manter | Igual | — | Exploração e registros locais sem login | E2E-4 | B |
| C-06 | Saber que contas estão fora | Manter | Igual | — | Aviso; botão inativo | E2E-6 | B |
| C-07 | Ver meu perfil | Manter | Igual | — | Nome, e-mail, estado, nova tentativa do perfil | RT-15 | M |
| C-08 | Saber o que é local | Manter visível | Igual | — | "Modo local" na conta conectada; nunca "salvo na nuvem" | RT-15 | A |
| C-09 | Ver meus dados | Manter | Igual | — | Contagem e três atalhos | RT-15 | B |
| C-10 | Exportar | Manter | Igual | — | JSON sem nome nem e-mail | RT-15 | A |
| C-11 | Consentir com pesquisa | Manter; separado e voluntário | Igual | — | Desmarcado por padrão; data; nunca marcado pelo tutorial | `scope.test.ts`, RT-23 | A |
| C-12 | Sair | Manter | Igual | — | Falha ao sair não apaga a sessão | `session.test.ts` | A |
| C-13 | Apagar dados do aparelho | Manter | Igual | — | Confirmação; só o balde da conta ativa | RT-15 | A |
| C-14 | Confirmar e-mail | Manter | Igual | I6 | PKCE intacto; código removido do histórico | `AuthPage.test.tsx`, RT-22 | A |
| C-15 | Definir nova senha | Manter | Igual | I6 | Duas senhas; retomada por 15 min | `recovery.test.ts`, RT-22 | A |
| C-16 | Entender link inválido | Manter | Igual | I6 | Três mensagens distintas; duas saídas | E2E-6, RT-22 | M |

### Mais e Linguagem visual

| ID | Tarefa do usuário | Proposta | Destino | Depende de | Critério de aceite | Teste | Risco |
|---|---|---|---|---|---|---|---|
| X-01 | Achar o que não está na barra | Agrupar; listar tudo | Igual | O3 | Todos os destinos; cinco grupos | RT-18 | M |
| X-02 | Conferir a linguagem visual | Manter a rota; entrada em "Conta e ajuda" | Igual | O3 | `/design-preview` abre e mede contraste | RT-18 | B |

### Conferência da matriz

| Grupo | Linhas no inventário | Linhas na matriz |
|---|---|---|
| Globais | 16 | 16 + 2 novas |
| Explorar | 24 | 24 |
| Visão geral | 13 | 13 |
| Município | 16 | 16 |
| Planejar | 14 | 14 |
| Simulador | 16 | 16 |
| Field Shift | 7 | 7 |
| Propriedades e Registros | 18 | 18 |
| Sondas e Alertas | 3 | 3 |
| Conta e autenticação | 16 | 16 |
| Mais e Linguagem visual | 2 | 2 |
| **Total** | **145** | **145 + 2 novas** |

Nenhuma linha tem proposta "remover". Mudanças de posição: V-03 (vira faixa de escopo), V-08, V-09 e V-10 (ordem no celular), G-04 e G-05 (ganham segundo lugar no celular). Todas as rotas e parâmetros de URL atuais continuam válidos.

## 9. Compatibilidade de links

| Link de hoje | Depois |
|---|---|
| `#/explorar?pais=BR&uf=51&mun=5107925` | Abre o mesmo lugar |
| `#/explorar?pais=ARG` | Abre o mesmo país |
| `#/visao-geral`, `#/visao-geral?mun=…` | Igual; sem `mun`, resolve pelo talhão em uso |
| `#/municipio?mun=…&aba=…&cultura=…` | Igual |
| `#/planejar?mun=…` | Igual |
| `#/simulador?cultura=…&mun=…&modo=…&ano=…&ab=1&secao=…&cafezal=…` | Igual; `dia` é acréscimo opcional |
| `#/field-shift`, `#/propriedades`, `#/registros?novo=…`, `#/dispositivos`, `#/alertas`, `#/mais`, `#/design-preview` | Igual |
| `#/conta`, `#/conta/cadastro`, `#/conta/recuperar` | Igual |
| `/auth/callback`, `/auth/recovery` | Igual; nenhum parâmetro novo |

O idioma **não** entra na URL (ver `07-idiomas.md`, seção 3): um link compartilhado abre no idioma de quem recebe.
