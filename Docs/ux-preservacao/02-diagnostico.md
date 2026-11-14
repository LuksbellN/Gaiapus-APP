# 02 — Diagnóstico

Revisão `2cf2881`. Cada achado foi conferido no caminho ativo (`apps/web/src/teammate`), não herdado do briefing. Marcas: [N] navegador, [C] código, [T] teste executado, [D] documentação, [H] hipótese.

Prioridades:

- **P0** — número errado, perda de dado ou leitura enganosa de um resultado.
- **P1** — a tarefa trava, perde continuidade ou depende de informação escondida; e o que precisa ser decidido antes de traduzir.
- **P2** — acabamento e robustez.

Nenhum achado pede remover função. Onde a correção muda o lugar de algo, o destino está em `03-fluxos-propostos.md`.

## Resumo

| ID | P | Achado | Evidência | Tarefa em `05` |
|---|---|---|---|---|
| D-01 | P0 | Busca devolve "Nada encontrado" para tudo quando `/v1/geography` falha | [N] | B1 |
| D-02 | P0 | Visão geral mostra Sorriso sob o contexto de um talhão de outro município, sem aviso | [N] | B3 |
| D-03 | P0 | `10.5` é lido como 105; `10e2` como 1000 | [N] | B2 |
| D-04 | P1 | Próxima atividade ignora o talhão ativo | [N] | B3 |
| D-05 | P1 | Só 5 planejamentos visíveis; plano reaberto perde o município | [N] | B4 |
| D-06 | P1 | Rascunho não volta ao alternar de talhão e pode ser sobrescrito | [N] + [C] | B5 |
| D-07 | P1 | Município publicado pela API fora de MG/MT termina em "não encontrado" | [N] | G3 |
| D-08 | P1 | Imagens de Rio Verde e Barreiras publicadas pela API são inalcançáveis | [N] + [C] | G4 |
| D-09 | P1 | Destaque de cobertura vem de listas escritas no código | [C] | G2 |
| D-10 | P1 | UF deduzida do prefixo do identificador | [C] | G1 |
| D-11 | P1 | Busca só entende nomes em português e corta em 12 resultados | [N] | G5 |
| D-12 | P1 | Título do documento fixo; foco não acompanha a troca de tela | [N] | O1 |
| D-13 | P1 | Resposta da API rotulada "Dado de exemplo do pacote" | [N] | O2 |
| D-14 | P1 | "Salvar e abrir no simulador" leva só cultura e município, sem dizer isso | [N] | O4 |
| D-15 | P1 | Propriedades e Linguagem visual sem entrada no desktop; "Mais" sem grupos | [N] + [C] | O3 |
| D-16 | P1 | Erros de autenticação aparecem sob o campo de e-mail | [C] | B6 |
| D-17 | P1 | Texto, formatos e valores gravados presos ao português | [C] | I1–I8 |
| D-18 | P1 | Conferência de hashes falha em qualquer checkout com fim de linha LF | [T] | T1 |
| D-19 | P1 | Proteção de regressão no navegador caiu de 168 verificações para 6 | [C] + [T] | T2 |
| D-20 | P1 | Tema escolhido por uma conta volta ao padrão depois de recarregar | [T] ad hoc | B7 |
| D-21 | P2 | `/visao-geral?mun=<outro>` responde com erro e um "Tentar de novo" que nunca resolve | [N] | B3 |
| D-22 | P2 | "Sem conexão. Sem conexão."; API fora é descrita como falta de rede | [N] | B8 |
| D-23 | P2 | Aviso de chave duplicada do React em Alertas | [N] | B8 |
| D-24 | P2 | Links de texto com alvo de 20 a 22 px de altura | [N] | B8 |
| D-25 | P2 | No celular a atribuição do mapa fica sob os controles; marcadores se sobrepõem | [N] | B8 |
| D-26 | P2 | "Minha localização" fora do Brasil não seleciona o país | [C] | G6 |
| D-27 | P2 | Cursor da linha do tempo fora da URL | [C] | O5 |
| D-28 | P2 | Campo 3D recebe foco de teclado sem indicador visível | [C] | B8 |

## P0

### D-01 — A busca some inteira quando a consulta remota falha

- **Onde:** `adapters/index.ts:43-62`. Os resultados locais (27 estados, municípios de MG e MT, 232 países) são montados nas linhas 46–53 e só então a linha 54 faz `await backend.geography(q, signal)`. Se a chamada rejeita, a função inteira rejeita. `Explore.tsx:164` trata a rejeição como lista vazia. `Records.tsx:19` não trata.
- **Reprodução [N]:** bloquear `**/v1/geography**` (conexão abortada e, separadamente, resposta 503). Abrir `/#/explorar`. Buscar `argentina`, `sorriso`, `mato grosso`. Resultado nas três: "Nada encontrado. A busca cobre países, os estados do Brasil e os municípios de MG e MT." Captura: `evidencias/2cf2881/capturas/probe-busca-api-fora.png`.
- **Impacto:** com a API fora, não se chega a nenhum lugar pela busca, embora todos estejam no pacote. No cadastro de propriedade, a escolha do município (única forma de preencher o código) deixa de funcionar, o que bloqueia uma função declarada local.
- **A mensagem também engana:** afirma que nada existe, quando a consulta falhou.
- **Preservar:** cancelamento e descarte de respostas fora de ordem (`latestOnly`, `core.ts:24-31`), ranking atual, resultados da API quando ela responde.
- **Proposta:** resultados locais sempre; consulta remota em paralelo com falha isolada e sinalizada na lista ("A consulta de lugares publicados falhou. Mostrando os lugares deste aplicativo."). Isso é geografia, não fallback de resultado científico: `http.test.ts:13-17` continua valendo para água, rendimento e cobertura.

### D-02 — Sorriso apresentado como se fosse a propriedade do usuário

- **Onde:** `Overview.tsx:13` (`mun` da URL ou Sorriso), `:26` (título fixo "Hoje em Sorriso, MT"), `:29` (aviso de demonstração condicionado a `!ctx.plot`).
- **Reprodução [N]:** perfil vazio. Cadastrar a propriedade "Sítio Teste" em Uberlândia e o "Talhão A". Abrir `/#/visao-geral`. O cabeçalho passa a dizer "Sítio Teste · Talhão A · sem plantio registrado"; a tela continua "Hoje em Sorriso, MT", soja, dia 40 do ciclo, reserva de 47%; o aviso "Você está vendo a demonstração de Sorriso" desaparece. Captura: `probe-contexto-udi-visao-geral.png`.
- **Impacto:** o agricultor lê alerta de água, previsão de chuva e rendimento de outro município sob o nome do seu talhão. É a leitura enganosa mais grave encontrada.
- **O mesmo padrão, com menor risco [N]:** Simulador ("Simulador de safra — Sorriso, MT"), Município (abre Sorriso), Alertas ("Sorriso, MT · soja") e Field Shift mantêm Sorriso, mas dizem isso no título. Só Planejar acompanha a propriedade (`Plan.tsx:20`).
- **Preservar:** todos os blocos da tela (V-01 a V-13); o parâmetro `mun`.
- **Proposta:** uma regra de local única (URL → talhão ativo → demonstração), o nome do local vindo do dado, e uma faixa permanente de "de onde é este dado" que nunca depende de haver talhão. Sem análise para o município do talhão: dizer isso e oferecer a demonstração como ação explícita.

### D-03 — Ponto decimal multiplica o valor por dez

- **Onde:** `ui/form.tsx:11`: `Number(s.replace(/\./g, '').replace(',', '.'))`. Todo ponto é apagado antes da conversão.
- **Reprodução [N]:** `/#/planejar`, unidade de preço "R$ por kg", rendimento 3000, preço 2, custo 0, data do preço preenchida.

| Área digitada | Receita exibida | Receita correta |
|---|---|---|
| `10,5` | R$ 63.000,00 | R$ 63.000,00 |
| `10.5` | **R$ 630.000,00** | R$ 63.000,00 |
| `1.5` | **R$ 90.000,00** | R$ 9.000,00 |
| `1,000.5` | **R$ 6.003,00** | R$ 6.003.000,00 |
| `10e2` | **R$ 6.000.000,00** | entrada inválida |
| `1 000,5` | "Falta: área" | R$ 6.003.000,00 |

  A nota do cálculo repete o texto digitado ("× 10.5 ha"), então o erro não aparece na conferência. Captura: `probe-numero-ponto.png`.
- **Alcance [C]:** `num()` é usada em área, rendimento, preço, saca e custo do plano (`Plan.tsx:28`), área de propriedade e talhão (`Records.tsx:21-22`), quantidade, área, saca, umidade, preço e custos dos registros (`Records.tsx:87-95`). Teclados de celular em inglês e planilhas coladas produzem ponto decimal.
- **Relação com idiomas:** traduzir os rótulos sem trocar este parser faria qualquer usuário em inglês gravar valores dez vezes maiores. Por isso está em P0 e vem antes de qualquer texto traduzido.
- **Preservar:** `1.234,5` → 1234,5 em português (`form.test.ts:4`); valores já gravados como texto.
- **Proposta:** parser por locale, que recusa entrada ambígua com orientação e nunca adivinha a magnitude. Especificação em `07-idiomas.md`, seção 6.

## P1

### D-04 — Próxima atividade de qualquer talhão

`Overview.tsx:21` filtra `records` só por data. **Reprodução [N]:** registrar um manejo para 10/01/2027 no Talhão A, ativar o Talhão B, abrir a Visão geral: aparece "Emergência em 10 jan 2027" sob o contexto do Talhão B. **Proposta:** filtrar pelo talhão ativo e dizer o talhão na linha; sem talhão ativo, manter o comportamento atual com o nome do talhão ao lado.

### D-05 — Planejamentos escondidos e município perdido

`Plan.tsx:78` usa `plans.slice(0, 5)`, sem ação para ver os demais. **Reprodução [N]:** salvar 7 planos; a lista mostra 5; os outros 2 continuam no armazenamento. Reabrir um plano salvo para Uberlândia a partir de `/#/planejar` (sem `mun`): o item diz "Uberlândia, MG", mas o selo da página volta para "Sorriso, MT · demonstração", porque `f.load` carrega os campos e o município vem só da URL ou do contexto (`:20`). Salvar em seguida grava o plano com `municipio: 5107925` (`:32`) e "Salvar e abrir no simulador" navega para `mun=5107925`. **Impacto:** um plano de Uberlândia vira um plano de Sorriso sem aviso. **Proposta:** lista completa com "Mostrar todos (N)"; reabrir aplica o município do plano e mostra de onde ele veio; nada é apagado.

### D-06 — Rascunho por talhão

`ui/form.tsx:6`: ao mudar a chave com o componente montado, os valores voltam ao inicial e o rascunho da nova chave não é lido. **Reprodução [N]:** dois talhões; em Registros, plantio no Talhão A, cultivar "CULTIVAR-DO-A"; trocar para o Talhão B (campo vazio, correto); digitar "CULTIVAR-DO-B"; voltar ao Talhão A: campo **vazio**, embora o rascunho exista no armazenamento. Só reaparece depois de recarregar a página. [C] Se o usuário digitar qualquer campo antes de recarregar, `form.tsx:7` grava o estado atual sobre o rascunho antigo, que se perde. **Proposta:** ao trocar a chave, carregar o rascunho da chave nova e indicar "Rascunho recuperado"; teste A → B → A.

### D-07 — Município da API tratado como inexistente

**Reprodução [N]:** buscar "rio verde" e escolher "Rio Verde, GO 5218805" (resultado vindo de `/v1/geography`). A URL vira `pais=BR&uf=52&mun=5218805`; o título fica "Município"; a trilha mostra "GO › 5218805"; o painel diz "Municípios ainda não carregados"; o detalhe diz **"Município não encontrado. O código 5218805 não existe na malha carregada."** Captura: `probe-rio-verde.png`. O mesmo ocorre com Barreiras, BA. **Causa [C]:** o frontend só tem malha de MG e MT (`adapters/index.ts:26-29`) e `Explore.tsx:138` confunde "malha não carregada" com "código inexistente". A cobertura nem chega a ser mostrada (`:140` exige o nome vindo da malha). **Proposta:** estado próprio "geografia detalhada ainda não carregada", com o nome vindo do catálogo e a cobertura consultada normalmente.

### D-08 — Imagens publicadas e inalcançáveis

[N] `GET /v1/coverage?area_id=published-field-rio-verde` responde `history: available` (1 jun a 31 jul 2024); o mesmo para Barreiras. [C] O frontend só consulta `published-field-uberlandia` (`adapters/index.ts:84-87,119-120`), o seletor de Município tem duas opções fixas (`Municipality.tsx:13`), a tabela de capacidades só conhece Uberlândia (`capabilities.ts:43`) e o estado vazio afirma "Nesta edição há NDVI apenas para o recorte demonstrativo de Uberlândia, MG" (`Municipality.tsx:84`). **Impacto:** dois dos três recortes com imagem não aparecem, e a tela diz que não existem. **Proposta:** recortes vindos de `GET /v1/geography?parent_id=<município>` e `…/coverage`; geometria do recorte pelo `geometry_ref` da API. Escopo do recorte preservado: o NDVI é do recorte, não do município.

### D-09 — Cobertura escrita no código

[C] `coverage.covered` é `Object.keys(COVERAGE)` com dois municípios (`adapters/index.ts:67-77`); os marcadores do globo são uma constante (`Explore.tsx:13`); "análise em MG e MT" e o selo "Com análise" por UF dependem de `geography.ufsWithMunicipalities`, que é a lista de malhas carregadas, não de onde há análise (`Explore.tsx:85,95`); `PLACES`/`PLACE` repetem os dois nomes em `Municipality.tsx:13`, `Plan.tsx:15`, `Simulator.tsx:27`. **Impacto:** ter malha vira "ter análise" (hoje todo MG e MT ganha o selo); um município novo no catálogo não aparece. **Proposta:** um índice de cobertura montado do catálogo da API, com a lista local servindo apenas de rótulo e rota para produtos já conhecidos.

### D-10 — Identidade geográfica por prefixo

[C] `adapters/index.ts:57` faz `area.area_id.slice(0, 2)` para obter a UF de um município vindo da API, que já informa `state_id` e `parent_id`. `Explore.tsx:24` deduz `uf` de `mun.slice(0, 2)` e `ExplorerMap.tsx:85` faz o mesmo no clique. Vale para códigos do IBGE; com identificadores de outro país, produziria UF e trilha falsas. **Proposta:** identificador com sistema de origem explícito (`06-exploracao-global.md`, seção 6) e dedução por prefixo restrita a `ibge:`.

### D-11 — Busca monolíngue e truncada

**Reprodução [N]:**

| Consulta | Resultado |
|---|---|
| `alemanha` | Alemanha · País · Europa |
| `germany`, `deutschland`, `allemagne`, `alemania` | Nada encontrado |
| `united states`, `japan` | Nada encontrado |
| `usa` | Estados Unidos (casou com o código, não com o nome) |
| `DEU` | Madre de Deus de Minas, depois Alemanha |
| `de` | 12 municípios; não há como ver o restante |
| `são` | 12 de dezenas; idem |

[C] `adapters/index.ts:53` compara só `c.name` (português) e o código; `:61` corta em 12. A lista de municípios corta em 80 com a instrução "Digite para filtrar" (`Explore.tsx:101-102`). **Proposta:** aliases por idioma e nome original, ranking que privilegia correspondência exata, e "Ver todos os N resultados".

### D-12 — Título e foco na troca de tela

**Reprodução [N]:** o título é "Gaiapus · Água, clima e safra" nas 34 telas e estados visitados. Depois de clicar em "Planejar" na navegação, `document.activeElement` continua sendo o link; nada anuncia a nova tela. [C] `App.tsx:47` só rola o conteúdo. **Impacto:** quem usa leitor de tela não sabe que a tela mudou; abas e histórico do navegador ficam indistinguíveis. **Proposta:** título por rota e contexto, foco no `h1` da nova tela, sem roubar foco em mudanças de parâmetro dentro da mesma tela.

### D-13 — Origem rotulada de forma imprecisa

[N] O detalhe de Sorriso no explorador diz "**Dado de exemplo do pacote** · Fonte: Catálogo de cobertura da API Gaiapus". [C] `adapters/http.ts:18` e `adapters/index.ts:90` devolvem `kind: 'fixture'` para o que veio da rede, e `ui/index.tsx:6` traduz `fixture` como "Dado de exemplo do pacote". **Impacto:** a interface não distingue publicação servida pela API de arquivo embutido no aplicativo, distinção que o README do repositório considera essencial. **Proposta:** novo tipo de origem `publicacao` (servida pela API, com versão da publicação) ao lado de `fixture` (empacotada); o texto e o selo passam a dizer qual é.

### D-14 — Plano e simulador sem continuidade declarada

[N] "Salvar e abrir no simulador" navega para `#/simulador?cultura=soy&mun=5107925`. Área, solo, irrigação, data de semeadura escolhida e prioridade ficam no plano e não chegam ao simulador (`Plan.tsx:33`). [C] `prioridade` não é lida em nenhum outro ponto do código. O simulador usa hipóteses fixas e diz isso em "Hipóteses fixas" (`Simulator.tsx:110`), mas não relaciona com o plano que acabou de ser salvo. **Proposta:** uma linha no simulador, "Aberto a partir do plano de {data}: usados cultura e local; área, solo, irrigação e data ficam registrados no plano e não alteram esta simulação", com link de volta. Nenhum efeito científico novo.

### D-15 — Destinos difíceis de achar

[C] `App.tsx:25-35` lista 9 destinos. `/propriedades` só é alcançado por links em Registros, na Visão geral e na Conta; `/design-preview` só por "Mais", que não existe no desktop. [N] No celular, "Mais" lista 8 itens em sequência plana: Município, Planejar, Field Shift, Sondas, Alertas, Propriedades e talhões, Conta, Linguagem visual. **Impacto:** a primeira tarefa de quem chega (cadastrar a propriedade) não tem entrada na navegação. **Proposta:** `03-fluxos-propostos.md`, seção 3.

### D-16 — Erros de autenticação no campo errado

[C] `Account.tsx:19` passa `error={err}` ao campo de e-mail para qualquer falha: credencial incorreta, cadastro recusado, falha no reenvio. `session.ts:33` usa um texto só para senha errada e e-mail não confirmado. O caso "nome ausente" citado no briefing deixou de ocorrer no navegador: os campos agora são `required` e o formulário não tem `noValidate` [N]. **Proposta:** mensagem de formulário acima do botão, com foco, e erro de campo só quando a causa é o campo; códigos de erro mapeados para textos traduzíveis, sem revelar se o e-mail existe.

### D-17 — Tudo pressupõe português

[C] Contagem no código ativo (`teammate` + `features`): cerca de 480 trechos de texto em JSX e 330 literais com acento; `'pt-BR'` fixo em 12 arquivos; `format.ts:2,9,15` fixa locale e meses; `index.html:2,8` fixa `lang` e título; mensagens em `lib/api/client.ts:43,49`, `adapters/http.ts:11`, `adapters/session.ts:27-51`, `features/auth/urls.ts:12-14`, `AuthPage.tsx`, `main.tsx:21`.

Três pontos pedem decisão antes de qualquer tradução:

1. **Valores gravados são rótulos.** Registros e planos guardam `'Sequeiro'`, `'Plantio direto'`, `'Emergência'`, `'Beneficiado'`, `'Pesagem'`, `'Realizado'`, `'Não sei'` e o nome da cultura (`Records.tsx:51-56`, `Plan.tsx:22`). A lógica compara por rótulo em `Plan.tsx:49` (`=== 'Irrigado'`).
2. **Frases montadas por pedaços.** 15 usos de `.toLowerCase()` sobre nomes (`CROPS[crop].name.toLowerCase()` em `Municipality.tsx:68,71,73,77,78` e outros). Em alemão, substantivo em minúscula é erro.
3. **Números e datas** (D-03 e `format.ts`).

Detalhe e migração em `07-idiomas.md`.

### D-18 — Manifesto de integridade falha fora da máquina de origem

**Reprodução [T]:** `pnpm --filter @gaiapus/web test:e2e` num clone novo: 5 aprovados, 1 reprovado, `frontend.spec.ts:7`. Esperado `dc8dd907…`, recebido `75e4ae54…` para `styles.css`. **Causa [T]:** `.gitattributes` define `* text=auto eol=lf`; os hashes do manifesto foram calculados sobre arquivos com CRLF. Recalcular o arquivo do clone com CRLF reproduz exatamente os hashes do manifesto (`dc8dd907…`, `59510975…`, `f81aa0d3…`). O conteúdo é idêntico ao protótipo. **Impacto:** a suíte nunca fica verde em CI ou em outra máquina; e qualquer mudança deliberada em `styles.css`, `Explore.tsx`, `Overview.tsx`, `Simulator.tsx`, `Plan.tsx`, `ui/index.tsx`, `ExplorerMap.tsx` ou `Field3D.tsx` reprova o teste por desenho. **Proposta:** decisão com o responsável pela integração (ver `05`, T1): normalizar fim de linha antes do hash e registrar cada mudança deliberada num histórico do manifesto, em vez de atualizar hashes em silêncio.

### D-19 — Proteção de regressão reduzida

[C] O protótipo tinha `e2e/run.mjs` (50 jornadas) e `e2e/review.mjs` (rede 7, nova tentativa 11, URL 13, culturas 31, países 16, acessibilidade 40). Nenhum dos dois veio para o monorepo. [T] Restam 6 cenários. Sem cobertura hoje: seleção de país, culturas e capacidades, rascunhos, planos, economia, falha de rede por tela, link direto e voltar/avançar por tela, acessibilidade automatizada. **Impacto:** reorganizar telas sem essa rede é o risco que esta rodada quer evitar. **Proposta:** portar as verificações para `tests/e2e/` **antes** de qualquer mudança de interface (`05`, T2).

### D-20 — Preferência de tema não sobrevive à recarga numa conta

**Reprodução [T] ad hoc** (módulo real `store.ts`, armazenamento simulado): conta A ativa, escolher tema claro; o valor é gravado em `gaiapus.v1.user.A`. Recarregar: o estado inicial vem do balde do visitante (escuro) e `activateAccount` mantém o tema em memória (`store.ts:42`), descartando o da conta. Resultado: **escuro**. [C] Além disso `index.html:20` lê a chave antiga `gaiapus.v1`, que não é mais escrita: o visitante com tema claro vê a tela inicial escura por um instante. **Por que importa agora:** o idioma é a próxima preferência; se seguir o mesmo caminho, o usuário escolhe alemão, recarrega e volta ao português. **Proposta:** preferências do aparelho numa chave própria, fora dos baldes de conta (`07-idiomas.md`, seção 3).

## P2

| ID | Detalhe | Proposta |
|---|---|---|
| D-21 | [N] `/#/visao-geral?mun=3170206` mostra "Não foi possível carregar. Este município é válido, mas ainda não tem análise publicada" e "Tentar de novo", que repete o mesmo resultado (`Overview.tsx:17`) | Estado "sem análise para esta seleção", com o lugar mantido e duas saídas |
| D-22 | [N] Com a API fora, as telas dizem "**Sem conexão. Sem conexão.** Os dados já carregados…" (`ui/index.tsx:23-24`), inclusive quando só a API falhou (`http.ts:11`) | Separar `network` de `api_unreachable`; uma frase só |
| D-23 | [N] Console: "Each child in a list should have a unique key" em `Alerts` (`Devices.tsx:21`) | Chave no fragmento |
| D-24 | [N] Alvos de 20 a 22 px de altura: "Cadastre sua propriedade e talhão" (Visão geral), "Criar conta" e "Recuperar acesso" (Conta), três links do simulador sem série | Altura mínima de 24 px nos links de texto em bloco; botões já têm 44 px |
| D-25 | [N] Em 390 px, a atribuição do mapa abre estendida sob os botões de camadas e zoom; "Sorriso" e "Uberlândia" se sobrepõem na visão do mundo (`explorar-mundo-mobile.png`) | Atribuição recolhida no celular; marcadores com afastamento ou agrupamento em zoom baixo |
| D-26 | [C] `Explore.tsx:52`: posição fora do Brasil só gera a frase "limites disponíveis só para o Brasil", embora qualquer país seja selecionável | Selecionar o país da posição e explicar o que existe |
| D-27 | [C] `Simulator.tsx:67`: modo, ano, A/B e seção estão na URL; o dia selecionado não | Parâmetro `dia`, atualizado sem empilhar histórico a cada passo |
| D-28 | [C] `sim/Field3D.tsx:17` torna o canvas focável (`tabIndex = 0`, setas giram a vista) e `styles.css:195` remove o contorno: quem navega por teclado não vê onde está | Contorno de foco no contêiner do campo, com os tokens existentes |

## Reconciliação com os achados do briefing

| Achado do briefing | Situação nesta revisão |
|---|---|
| `Overview.tsx:13,26,29` | Confirmado e reproduzido (D-02) |
| `Overview.tsx:21` | Confirmado e reproduzido (D-04) |
| `Plan.tsx:33` | Confirmado (D-14) |
| `Plan.tsx:78` | Confirmado e reproduzido; achado adicional de troca de município (D-05) |
| `Plan.tsx:48` | Confirmado: a prioridade é só registrada (D-14) |
| `ui/form.tsx:6` | Confirmado e reproduzido (D-06) |
| `Account.tsx:13` | Mudou: agora linha 19; o caso do nome não ocorre mais; os demais erros continuam no e-mail (D-16) |
| `App.tsx:47` | Confirmado e reproduzido (D-12) |
| `format.ts:2` | Confirmado (D-17) |
| `ui/form.tsx:11` | Confirmado e reproduzido (D-03) |
| `adapters/index.ts:14` | Confirmado em `:16-17`: `BR` ou ADM0_A3 |
| `adapters/index.ts:40` | Confirmado em `:53,61` (D-11) |
| `store.ts:4` | Confirmado; `Records.tsx:21` exige 7 dígitos |
| `catalog.ts:28` | Confirmado; ampliado para todos os valores gravados (D-17) |
| Sem sistema de tutorial | Confirmado: nenhum componente, chave ou rota de ajuda |
| Sem camada de idiomas | Confirmado: nenhuma dependência, catálogo ou seletor |

## Evidência positiva a conservar

| O que funciona | Evidência |
|---|---|
| Estado do simulador na URL; cursor único para gráfico, indicadores e 3D | [N] `Simulator.tsx:64-68,84-86` |
| Isolamento por conta: baldes separados, remontagem de formulários, gravação pendente cancelada | [T] `store.integration.test.ts`, `session-boundary.test.tsx`, `scope.test.ts` |
| Falha de API nunca vira número local | [T] `http.test.ts:13-17`; [N] nenhuma tela mostrou valor com a API bloqueada |
| Identidade só com e-mail confirmado; senha nunca gravada | [T] `session.test.ts` |
| Callback limpa o código da URL e do histórico | [N] `AuthPage.tsx:22` |
| Campos com rótulo e erro associados; abas por teclado; diálogo nativo | [C] `ui/index.tsx:26-48` |
| Carregamento sob demanda com nova tentativa; economia de dados respeitada | [C] `lazyPage.tsx`; [T] build |
| Sem rolagem horizontal em 390 px em nenhuma das 34 telas | [N] |
| Nenhum controle sem nome acessível nas 34 telas | [N] (os 192 da lista de países são efeito de `content-visibility` na medição) |
| Identidade visual, temas, foco, movimento reduzido | [D] `DESIGN.md`; [C] `styles.css` |

## Diretrizes de interface

Regras buscadas em 14/11/2026 na fonte indicada pela skill e aplicadas ao código ativo. Formato `arquivo:linha`.

```text
apps/web/src/teammate/format.ts:2          locale 'pt-BR' fixo em Intl.NumberFormat
apps/web/src/teammate/format.ts:9          nomes de mês em array; usar Intl.DateTimeFormat
apps/web/src/teammate/format.ts:15         moeda formatada com locale fixo
apps/web/src/teammate/ui/form.tsx:11       parser remove todo ponto; valor muda de magnitude
apps/web/src/teammate/App.tsx:47           troca de rota sem foco nem título
apps/web/index.html:2                      lang fixo
apps/web/index.html:20                     tema lido de chave que não é mais escrita
apps/web/src/teammate/pages/Account.tsx:19 erro de formulário preso ao campo de e-mail
apps/web/src/teammate/pages/Explore.tsx:85 lista de 232 itens sem virtualização (mitigada por content-visibility)
apps/web/src/teammate/pages/Explore.tsx:101 lista cortada em 80 sem ação para o restante
apps/web/src/teammate/pages/Plan.tsx:78    lista cortada em 5 sem ação para o restante
apps/web/src/teammate/pages/Devices.tsx:21 fragmento sem key
apps/web/src/teammate/ui/index.tsx:24      mensagem de erro não diz o próximo passo quando a API falha
apps/web/src/teammate/styles.css:195       outline: none num canvas focável (sim/Field3D.tsx:17), sem substituto
apps/web/src/teammate/styles.css:42        outline: none em .main (alvo do link de salto; aceito, o foco passará ao h1)
```

Aprovado sem achado: `transition: all` ausente; `color-scheme` definido nos dois temas (`styles.css:15,22`); `theme-color` acompanha o tema; `touch-action: manipulation` (`:38`); `overscroll-behavior: contain` em painel e diálogo (`:148,161`); imagens com dimensões (`Municipality.tsx:92`); estado na URL em explorador, município e simulador; confirmação em ações destrutivas; link de salto; números tabulares.

## Lacunas desta inspeção

- **Sem Supabase configurado.** Entrar, criar conta, e-mail de confirmação, recuperação, sair e troca de conta não foram exercidos no navegador. O que se afirma sobre eles vem do código e dos testes unitários com provedor simulado.
- **Sem Safari, Firefox, aparelho físico, leitor de tela ou zoom de 200%.**
- **Sem medição com usuários.** Nenhuma contagem de ações, tempo ou erro por tarefa foi feita com agricultores.
- **Servidor de desenvolvimento.** A varredura usou `vite dev`; tamanhos de pacote vêm do build, não de medição de rede.
- **Node 22.23.2** em vez de `>=22.23.4`: pnpm avisou e executou; nenhum teste falhou por isso.
- **"Limpeza no outro computador".** Não há vestígio dela neste repositório. Se ocorreu noutra cópia, não foi publicada aqui.
