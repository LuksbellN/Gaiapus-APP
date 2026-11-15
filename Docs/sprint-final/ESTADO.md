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

### M1 / P1 — terceira estratégia histórica e pacote coerente

**Ciência** (`ideias_nasa`, branch `feat/us-v2`, commits `56b1af3` e `22f67ad`, locais):
- `data/ingest/field_shift_case.py`: cenário `soy_long_fallow` (C: soja → pousio até a próxima soja, sem milho); milho ausente vira `None` em vez da soma vazia que dava zero; traço diário sem arredondamento opcional. A e B não mudaram.
- `data/ingest/field_shift_v2.py`: indicadores do v1 + janelas comuns às três estratégias (ano agrícola inteiro e pós-colheita da soja), diferenças pareadas safra a safra com `n`, média e faixa, sensibilidade de chuva e de hipóteses, pacote imutável com manifesto.
- `data/models/field_shift_forcing.py`: `transform_rain` (cópia com a chuva escalada); o `simulate(rain_multiplier=…)` antigo, de seca por fase, não foi tocado.
- `contracts/field-shift-v2.schema.json`: esquema versionado do resumo; o v1 continua válido para a publicação v1.

**Pacote:** `field-shift-v2-0d12285bf7a9` (identidade = clima + código + parâmetros; não depende do relógio).

| Arquivo | SHA-256 |
|---|---|
| `manifest.json` | `be28296a0f4f48b6f1e31088b2f5f5c5757417a03d460c7a6b0a905ac94e2fab` |
| `summary.json` | `6d45197f4885265cb189e5f4e3562d57c618aa97ab7710dfb65880995478d432` |
| `series.json` | `8524adef2ae954506c2a706c0f26a76478b5f7c8ce0940d67ca143130081b284` |

Entrada: NASA POWER diário de Sorriso (ponto, chuva IMERG conforme a fonte do pacote), 8.766 dias de 2001-01-01 a 2024-12-31, SHA-256 do forçante `e775dc6d…203b`; 6 safras válidas (2015/16 a 2020/21), inclusive com semeadura deslocada em ±15 dias. Solo AD4, 55 mm, reserva inicial 0,7 da capacidade, contínua entre safras; pousio com Kc 0,30.

**A/B preservados:** o manifesto registra `reproduction_v1` — A e B recalculados pelo código novo são iguais, valor a valor, às tabelas publicadas do v1 (6 safras e 2.192 dias cada). Os arquivos do v1 e o exemplo `field-shift-sorriso.json` mantêm o hash `33477192…c548`. O pacote `d47aa512c3fb`, gerado antes de um ajuste e nunca publicado, ficou só no disco local.

**O que o pacote mostra (médias de 6 safras; simulação, sem medição em campo):**

| Indicador | A · pousio | B · braquiária | C · pousio prolongado |
|---|---:|---:|---:|
| Dias com cultura ou cobertura | 235,0 | 350,3 | 115,0 |
| Água usada no ano agrícola (mm) | 748,8 | 749,5 | 596,2 |
| Água drenada no ano agrícola (mm) | 1.205,5 | 1.205,1 | 1.358,1 |
| Reserva antes da próxima soja (mm) | 44,2 | 43,9 | 44,2 |
| Déficit da soja (mm) | 12,6 | 12,3 | 12,6 |
| Déficit do milho (mm) | 54,1 | 54,1 | não cultivado |

C não melhora nem piora a água da soja seguinte neste modelo (a reserva na semeadura é a mesma de A); muda o que acontece entre a colheita e a semeadura: menos água usada e mais água drenada, com o solo sem cultura por 250 dias. Drenagem aqui não mede erosão, lixiviação nem infiltração.

**APP** (este branch):
- Pacote fixado em `apps/web/src/teammate/data/field-shift-v2/` (bytes preservados por `.gitattributes`); `simulations.fieldShiftStrategies` só entrega resumo e séries quando os três arquivos têm o mesmo `package_id`.
- `/field-shift`: lista das três estratégias (C descrita como "menos culturas — não é uma rotação diversificada"), referência escolhível (A é "referência da demonstração"), tabela A/B/C por janela com diferenças pareadas e faixa entre safras, milho de C como "não cultivado", gráfico diário com as três reservas.
- Pacote recusado → aviso e a publicação anterior (A/B, v1) continua na tela. A publicação v1 pela API não mudou; o lote dos EUA não foi tocado.
- `PhaseTimeline`: terceira série opcional; histórico e planejamento usam a mesma interface de antes.

**Decisão registrada:** o pacote v2 entra empacotado no frontend, como já acontecia com a série diária do Field Shift (`sorriso-daily.json`), em vez de um novo caminho na API. Resumo e série passam a vir do mesmo pacote; o importador v7 (pin `bb111a29…`) não foi alterado.

#### Verificação do M1 (15/11/2026)

| Comando | Resultado |
|---|---|
| Ciência: `python -m pytest tests/test_field_shift_forcing.py tests/test_field_shift_extension.py tests/test_water_balance.py tests/test_water_balance_crops.py` | **33 passaram** (inclui a reprodução de A/B do v1 sobre o cache real do NASA POWER) |
| `pnpm --filter @gaiapus/web test` | 42 arquivos, 303 testes: **301 passaram**; os 2 restantes eram os testes de prioridade do M2, escritos antes do helper e apanhados no meio da execução. Reexecução focada depois do helper: `field-shift-decision.test.ts` + `FieldShift.test.tsx` **15 de 15**. A suíte inteira roda de novo no M2 |
| `pnpm --filter @gaiapus/web typecheck` | sem erros |
| `pnpm exec playwright test` (suíte inteira do navegador) | **112 de 112** depois de registrar a mudança de `styles.css` no histórico de fontes visuais |

Vermelho antes: os 4 testes de `FieldShift.test.tsx` falhavam por não existir a tabela das três estratégias; no produtor, os testes falhavam por módulo inexistente e, depois, o teste de valores por safra nos pontos de chuva.

**Rota para conferir:** `/#/field-shift` (referência B ou C: `/#/field-shift?ref=C`).
**Situação:** commits locais nos dois repositórios; sem push, sem PR, sem produção.
**Limitações:** três estratégias de manejo, das quais C tem menos culturas — não são três rotações diversificadas; crotalária (D) não foi calculada por falta de parâmetros validados; no celular a tabela rola dentro do próprio quadro.

### M2 / P1 — prioridade do produtor, cartões de decisão e guia de leitura

**Mudou**
- Seletor "Sua prioridade" em `/field-shift` (margem, produção, conservação). Origem: escolha explícita (`?prioridade=`), senão o plano salvo indicado no endereço (`?plano=<id>`, só planos da conta em uso), senão conservação como padrão visível. O plano mais recente nunca é usado em silêncio; rascunho não conta.
- A prioridade reordena os grupos de indicadores da tabela e as linhas de cada cartão. Não muda clima, modelo, números nem o pacote (testado: os mesmos valores e o mesmo `package_id` antes e depois).
- Um cartão por estratégia: Por quê · O que a simulação mostra · Evidência · Lacunas · Riscos para revisar no local. Todo número vem do pacote, com a diferença em relação à referência escolhida. Em C, a linha do milho diz "não é cultivado" — não há zero que vença.
- Margem: não é calculada (o cenário não simula rendimento); a tela lista o que o produtor precisa informar e não usa nenhum valor padrão.
- Matriz agronômica qualitativa: 5 aspectos × 3 estratégias, todos "não avaliado", com o motivo (a fonte da Embrapa consultada é de hortaliças e não se aplica automaticamente à soja; nenhuma das três tem leguminosa de cobertura).
- `ui/ScienceReadingGuide.tsx`: ET0, ETc, ETa, déficit, reserva (mm de água disponível, não umidade volumétrica nem leitura de sonda) e escala do ponto de grade.

**Preservado:** tabela e gráfico do M1, publicação A/B anterior como reserva, tutorial da tela (âncoras `fs-*`), cinco idiomas.

#### Verificação do M2

| Comando | Resultado |
|---|---|
| `vitest run FieldShift.test.tsx field-shift-decision.test.ts i18n` | **85 de 85** (10 da página, 11 do helper, 64 de idiomas) |
| `pnpm --filter @gaiapus/web typecheck` | sem erros |

Vermelho antes: os 6 testes novos da página falhavam (sem seletor, cartões, matriz e guia); os 2 do helper falhavam por função inexistente. Suíte inteira (unidade e navegador): roda no fechamento do M3, sobre o mesmo código.

**Rota para conferir:** `/#/field-shift?prioridade=producao` · `/#/field-shift?ref=B`.
**Situação:** commit local; sem push, sem PR, sem produção.
**Limitações:** a prioridade ordena a leitura, não recomenda estratégia; não há margem nem avaliação agronômica quantitativa.

### M3 / P1 — sensibilidade de chuva

**Mudou**
- Controle "Chuva" em `/field-shift` com os três pontos calculados no pacote: −20%, histórica e +20% (`?chuva=-20|20`). São botões de opção, alcançáveis por teclado; não há controle deslizante, porque não existe resultado entre os pontos. Valor não calculado no endereço cai na chuva histórica.
- Em cada ponto, tabela e cartões mostram A, B e C recalculados pelo produtor com a mesma sequência diária e a água do solo contínua; as diferenças são as pareadas daquele ponto. O gráfico diário continua mostrando o clima histórico e diz isso.
- Rótulo fixo: "Teste de sensibilidade sobre o clima histórico — não é previsão climática." Temperatura aparece como não calculada, com o motivo.

**O que o pacote mostra** (médias de 6 safras; tabela completa gerada em `ideias_nasa/docs/submission/field-shift-numbers.md`):

| Chuva | Chuva no ano (mm) | Água usada A / B / C (mm) | Drenada A / B / C (mm) | Déficit da soja A / B / C (mm) |
|---|---:|---|---|---|
| −20% | 1.565 | 723,4 / 722,6 / 588,2 | 841,7 / 842,9 / 977,0 | 16,8 / 16,3 / 16,8 |
| histórica | 1.956 | 748,8 / 749,5 / 596,2 | 1.205,5 / 1.205,1 / 1.358,1 | 12,6 / 12,3 / 12,6 |
| +20% | 2.347 | 768,7 / 771,2 / 602,3 | 1.576,3 / 1.573,8 / 1.742,7 | 9,8 / 9,4 / 9,8 |

**Preservado:** nenhum peso ou modelo de rendimento foi tocado; o `simulate(rain_multiplier=…)` antigo segue aceitando só 0–1.

#### Verificação do M3 e regressão do conjunto (15/11/2026)

| Comando | Resultado |
|---|---|
| `pnpm --filter @gaiapus/web test` | 42 arquivos, **312 de 312** |
| `pnpm --filter @gaiapus/api test` | 17 arquivos, **56 de 56** |
| `pnpm --filter @gaiapus/contracts test` · `pnpm contracts:check` | **28 de 28** · contratos gerados conferem |
| `pnpm --filter @gaiapus/web typecheck` · `build` | sem erros · build concluído |
| `pnpm exec playwright test` (Vite 5174 → API 3001, dados de exemplo) | **117 de 117** (111 do lote 1 + 1 de rede lenta + 5 de `field-shift.spec.ts`) |

O que apareceu no caminho, para constar:
- Primeira passada da suíte web: 311 de 312. O teste "Brazil → US → Brazil" (criado no M0) estourou a espera padrão de 1 s com a máquina ocupada; passou 3 vezes isolado. Recebeu espera de 8 s e a suíte inteira foi repetida: 312 de 312.
- Primeira passada do navegador: 115 de 117. Dois testes antigos procuravam o cabeçalho "A · Pousio" na página inteira e passaram a encontrar dois (tabela de estratégias e matriz agronômica). Ganharam `.first()`; nenhuma outra asserção antiga mudou.
- Vermelho antes da implementação: os 3 testes de chuva da página.

Não executado: testes com banco (`*.database.test.ts`) e com o serviço Python ao vivo (`*.science.test.ts`), que dependem de contas e serviço não configurados aqui; smoke contra o build hospedado com fonte real dos EUA; leitor de tela e aparelhos reais.

**Rota para conferir:** `/#/field-shift?chuva=-20` · `/#/field-shift?chuva=20&prioridade=producao&ref=C`.
**Situação:** commit local; sem push, sem PR, sem produção.
**Limitações:** sensibilidade de uma variável por vez; o parâmetro `?lang=` não existe no app — o idioma vem do navegador ou da preferência salva.

### Revisão final do branch (revisor independente, 15/11/2026)

Sem achados críticos. Conferências independentes do revisor: o pareamento em TypeScript bate com o do produtor em Python (0 diferenças em 18 métricas × 2 estratégias × 3 pontos de chuva); os bytes do pacote no app são os do pacote gerado; o código da ciência no HEAD bate com `manifest.identity.code`.

**Corrigido (2 importantes):**
1. A tela, já com o pacote v2, ainda mostrava a tabela "Sensibilidade às hipóteses" e o aviso de hipótese da publicação v1 — outra versão, só B − A, com números diferentes para a mesma grandeza (ex.: Kc 0,75, déficit da soja −0,36 no v1 contra −0,37 pareado no v2). Agora, com o v2 na tela, hipóteses, safras e sensibilidade de parâmetros vêm do pacote, com B − A e C − A; a tabela do v1 só aparece no modo de reserva. Teste novo falhou antes e passa depois.
2. O manifesto registra `base_git_revision = 56b1af3`, mas esse commit gera outro pacote; o código que gera `0d12285bf7a9` é o de `22f67ad`. Os documentos de submissão agora identificam o código pelos digests e dizem de qual commit reproduzir. O produtor ainda não registra nem recusa árvore suja — lacuna conhecida; mudá-lo alteraria o id do pacote já fixado.

**Mantido por decisão:** a tela continua exigindo a publicação v1 da API para abrir (com a API fora, mostra erro e nenhum número — é o comportamento coberto pelo teste RT-16). O revisor sugeriu torná-la independente; ficou registrado como escolha, não como defeito.

**Menores, não corrigidos (para decidir depois):** possível quadro de "indisponível" ao trocar de lugar antes do carregamento; carregamento sem fim se a execução não tiver a safra pedida; cultura irmã sem publicação some da comparação sem aviso; a frase "A e B reproduzem a publicação anterior" é fixa em vez de ler o manifesto; com referência B ou C as diferenças são pareadas no navegador (mesma operação do produtor, sobre valores publicados); `n` por linha não aparece; o guia atribui a escala de ~0,5° a todo o clima sem separar a chuva IMERG; títulos dos cartões (h3) antes do primeiro h2, cabeçalhos de linha como `td`, traço sem texto para leitor de tela; prioridade de um plano de outro município é aceita; `field_shift_case.main()` (v1, anterior a este sprint) ainda regravaria o exemplo v1 se alguém o executasse; README de submissão usa `python -m pytest` em vez de `uv run`.

#### Verificação final

| Comando | Resultado |
|---|---|
| `pnpm --filter @gaiapus/web test` | 42 arquivos, **314 de 314** na última execução |
| `pnpm exec playwright test` | **117 de 117** |
| `pnpm --filter @gaiapus/web typecheck` · `build` | sem erros · concluído |
| API e contratos | sem mudança de código desde 56/56 e 28/28 |

**Teste intermitente, declarado:** em 4 execuções completas da suíte web depois do M3 houve 2 com uma falha cada, sempre em testes de identidade criados neste sprint ("Brazil → US → Brazil" e "changing the harvest year…"), nunca isolados (passaram em todas as repetições individuais e em 4 execuções simultâneas). O primeiro era espera curta; o segundo não teve a mensagem capturada e a causa não foi determinada. Ambos passaram a esperar pelo estado de carregamento com prazo maior. Se voltar a falhar no CI, é esse o ponto a olhar.
