# Gaiapus — planejamento integrado de frontend e backend

## Objetivo e estado do projeto

O Gaiapus ajuda agricultores e equipes técnicas a explorar clima, vegetação e risco hídrico por região. O MVP da NASA Space Apps usa um globo navegável, análises históricas nos recortes publicados, estimativas experimentais de rendimento municipal para soja e milho safrinha e simulação de água no solo por fase. A aplicação pode crescer para outros países por meio do catálogo geográfico. A cobertura agrícola da competição é brasileira e cada produto tem sua própria área de cobertura.

O protótipo em `gaiapus-mvp/` usa React e MapLibre e serve de referência. A base experimental v5, a coleta IMERG e o trabalho de expansão v6 são descritos no [guia de dados e modelos](gaiapus-24-coleta-subset-e-mlp.md). A disponibilidade de um modelo na pesquisa e sua liberação no app são decisões distintas. O catálogo da API é a referência para o que a interface oferece em cada região.

### Perguntas que a interface precisa responder

| Uso | Entrada | Saída |
|---|---|---|
| Explorar histórico | Área e período | Chuva, NDVI e imagem nas áreas com pacote publicado, com datas, unidades e fontes |
| Estimar rendimento na colheita | Município, cultura, semeadura ou calendário documentado e corte suportado | Estimativa em kg/ha, data de corte, erro de validação e versão do modelo |
| Projetar risco hídrico | Área, cultura, fase, configuração do solo e dias à frente | Reserva de água, déficit e estresse diários, com origem das entradas e hipóteses |
| Planejar plantio | Município, cultura, safra, solo e manejo | Janelas e opções justificadas por regras agrícolas versionadas, em etapa posterior |
| Acompanhar o campo | Dispositivo e talhão vinculados | Histórico de leituras com altura ou profundidade, unidade, qualidade e calibração, em etapa posterior |

**Dois horizontes.** Em rendimento, 60 ou 90 dias após a semeadura representam o corte dos dados usados para estimar a colheita. Em risco hídrico, N dias à frente representam o período simulado a partir de uma data de decisão. A API deve declarar os cortes que avaliou e o limite validado por antecedência. Um cenário experimental pode ter um limite de execução próprio, claramente exibido. Quando houver previsão meteorológica, mostrar a hora de emissão e a validade. Estimar efeito de uma intervenção sobre o rendimento exige uma avaliação específica dessa integração.

## Frontend

**Proposta de stack.** React com TypeScript, MapLibre para o globo, componentes acessíveis e uma biblioteca de gráficos escolhida após o protótipo. Reaproveitar geometria, esquema visual e interações verificadas no app atual. Usar identidade visual em tokens de cor, tipografia, espaçamento e estados. A aparência é cartográfica, com globo 3D, painel de análise legível e imagens reais quando disponíveis.

### Globo e navegação por território

| Nível | Ao selecionar | O que carregar |
|---|---|---|
| Mundo | Escolher país por clique, busca ou lista | Limites nacionais simplificados e nomes. Destacar Brasil como recorte inicial da competição |
| País | Enquadrar o contorno do país e abrir a lista de estados ou divisões equivalentes | Limites da divisão seguinte, com destaque de cobertura quando existir |
| Estado | Enquadrar o estado e habilitar municípios | Malhas simplificadas por estado ou tiles, com código e nome |
| Município | Enquadrar o limite e abrir o painel | Disponibilidade por produto e lista de recortes publicados |
| Talhão ou recorte | Mostrar contorno e detalhes | Imagem HLS, índices e observações vinculadas ao polígono, quando liberados |

- Disponibilidade por município vem do catálogo, independentemente da resolução do satélite. A malha permite identificar um município, enquanto a fonte pode contribuir com uma célula que cobre área maior. O painel explica essa diferença.
- A seleção usa IDs estáveis e hierarquia. Usar ISO para país e códigos IBGE para UF e município brasileiros. Nomes servem à leitura e busca. Outros países podem ter profundidades administrativas diferentes.
- Breadcrumb clicável, voltar e busca devem alterar o mesmo estado do mapa. Guardar a seleção na URL para compartilhar um recorte. Trocar de nível limpa as seleções filhas; trocar de município cancela a requisição anterior e esconde o painel antigo.
- Carregar limites sob demanda e usar geometrias leves na visão distante. Fazer a câmera respeitar movimento reduzido. Seletores e listas precisam funcionar por teclado e substituir o mapa quando WebGL estiver indisponível.
- Fora da área de cobertura, o mapa permite explorar a geografia e o painel informa quais análises existem. Mostrar legenda com unidades, fonte, escala e período para cada camada. Evitar sugerir detalhe de talhão ao ampliar chuva regional.

### Telas e interações

1. **Exploração.** Globo, busca por país/UF/município, breadcrumb, legenda e painel de cobertura. Desktop usa mapa e painel lado a lado. Em celular, mapa e painel devem ser acessíveis em espaço reduzido sem rolagem horizontal.
2. **Histórico.** Imagem HLS datada com contorno do recorte, gráfico de NDVI e gráfico de chuva no mesmo eixo temporal, filtros de período e tabela acessível. Exibir fonte e resolução. Distinguir 0 mm de chuva, observação ausente e dia incompleto. Cenas inválidas ficam fora do índice.
3. **Rendimento.** Seleção de soja ou milho safrinha, calendário de semeadura e corte suportado. Exibir kg/ha, data de referência, cobertura, modelo e erro de validação. Se a API informar disponibilidade experimental, aplicar o rótulo junto ao resultado. Intervalos de previsão só aparecem quando calculados e avaliados.
4. **Risco hídrico.** Formulário de cultura, fase, solo/CAD, água inicial e horizonte, com os valores assumidos visíveis. Comparar cenário de referência com redução de chuva ou projeção meteorológica disponível. Mostrar séries diárias e permitir navegar por dia. A visualização 3D futura usa os estados diários do simulador e acompanha os gráficos.
5. **Planejamento e IoT.** Acrescentar janelas ZARC e manejo após o fluxo de análise funcionar. Vincular sensor a um talhão autorizado. Mostrar última leitura, horário, profundidade e qualidade. Leituras antigas precisam aparecer com sua data.

Estados obrigatórios em todas as telas de análise: carregando, pronto, sem cobertura, dados incompletos, erro temporário e entrada inválida. Uma opção desabilitada mostra o motivo e indica um caminho útil quando existir.

## Backend

**Proposta de stack.** FastAPI e Pydantic em `apps/api/`, com contrato OpenAPI e validação de entrada e saída. No MVP, usar catálogo versionado e derivados locais. Banco espacial e armazenamento de objetos entram quando houver volume ou atualização concorrente que justifique. Aquisição e treino rodam em processos separados da API.

| Módulo | Responsabilidade |
|---|---|
| Geografia | Resolução da hierarquia, busca, IDs e limites por nível |
| Catálogo e publicação | Resolver cobertura e versão ativa por área, período e produto. Verificar integridade, qualidade e elegibilidade antes de ativar pacote |
| Observações | Servir precipitação, HLS, NDVI e seus metadados. Preservar ausência e escala de cada série |
| Rendimento | Ler artefato aprovado e transformar entradas com o schema treinado. Validar cultura, corte, município e qualidade da entrada |
| Balanço hídrico | Executar o motor físico com CAD, cultura, estágio e meteorologia explícitos. Versionar hipóteses e fornecer séries por dia |
| Provedores | Gerenciar ingestão e cache de NASA, IBGE e Meteomatics. Aplicar limites, registrar tempos e evitar expor credenciais |
| Planejamento e sensores | Evoluir para ZARC versionado e ingestão de telemetria por dispositivo autorizado |

### Contrato inicial proposto

| Rota | Entradas | Resultado esperado |
|---|---|---|
| `GET /v1/geography` | Nível, ID pai, busca e paginação | IDs, nomes, hierarquia, extensão geográfica e referência da geometria |
| `GET /v1/coverage` | ID geográfico | Produtos, culturas, datas, cortes e horizontes suportados e motivo de indisponibilidade |
| `GET /v1/observations` | Área ou recorte, variável, início e fim | Pontos em UTC com unidade, qualidade, origem, cobertura e referências de imagem |
| `POST /v1/yield-estimates` | Município, cultura, semeadura e corte | Estimativa municipal em kg/ha, versão, data dos insumos, escopo e referência da avaliação |
| `POST /v1/water-balance/scenarios` | Área, cultura, plantio, CAD, água inicial, tipo de cenário e horizonte | Estado diário, cenário de referência, hipóteses, emissão meteorológica quando aplicável e aviso de cobertura |
| `GET /health` | — | Estado do serviço e versão ativa, com detalhes operacionais restritos |

Campos comuns sugeridos: `status`, `area_id`, `spatial_scope`, `data_version`, `source_refs`, `coverage`, `observed_through`, `generated_at` e `warnings`. Estimativas incluem `model_version` e `days_after_sowing`. Projeções incluem `decision_at`, `forecast_issued_at` quando aplicável, `forecast_days` e `scenario_type`. Esquemas de exemplo devem ser acordados entre as equipes antes da integração.

Área válida sem pacote retorna catálogo de cobertura vazio ou status `no_data`, com motivo explícito. IDs inexistentes retornam 404; parâmetros inválidos, 422; indisponibilidade transitória, 503. O backend valida se o recorte pertence ao município e rejeita pedido acima dos limites publicados. Versionar e cachear dados por área, período e versão. Registrar latência, cobertura e falhas por produto sem dados sensíveis nos logs.

### Dados, inferência e publicação

- **Ingestão.** Registrar fonte, versão, hash, grid, unidade, observação e primeira obtenção. Para previsões registrar também emissão e validade. Manter jobs reiniciáveis e testar cada recorte novo contra a fonte de referência.
- **Cruzamento.** Vincular por código IBGE, cultura e safra. Agregar na escala da fonte, com pesos de área comprovados quando disponíveis. Preservar a resolução e as lacunas. NCAR/IMERG, NASA POWER, HLS e IBGE abastecem derivados distintos conforme o catálogo.
- **Treino.** Publicar manifesto de features, pré-processamento, escala, artefato, cortes e validação. Comparar MLP, Ridge e baselines por cultura e horizonte. Manter a divisão por safra e municípios reservados. Disponibilidade na data de decisão é condição para afirmar avaliação operacional. Comparar projeções meteorológicas por antecedência com arquivos de emissão histórica.
- **Publicação.** Ativar um pacote de dados e modelos como versão única. A API só oferece o produto para o qual há dados, contrato e avaliação compatíveis com o escopo declarado. Preservar a versão anterior para reversão. Credenciais, brutos volumosos e dados privados ficam fora do Git.

## Ordem de implementação e aceite

| Etapa | Frontend | Backend e dados | Demonstração de aceite |
|---|---|---|---|
| 1. Estrutura e contrato | Criar layout, rotas e adaptador de dados de exemplo | Criar esquema OpenAPI, catálogo mínimo e exemplos versionados | Web e API concordam em IDs, unidades e estados |
| 2. Globo e exploração | Implementar câmera, busca, breadcrumb e navegação por lista | Entregar hierarquia, geometrias e cobertura | Brasil → MG → Uberlândia; voltar; abrir país sem análise; repetir pelo teclado |
| 3. Histórico real | Exibir imagem e séries com lacunas e legenda | Servir pacote curado de exemplo com fonte, data e escala | Trocar de região sem misturar dados e conferir chuva/NDVI com os derivados |
| 4. Análise agrícola | Integrar formulários de rendimento e risco hídrico | Conectar simulador e inferência onde habilitada, com limites e manifesto | Reproduzir cenário de referência, variar chuva e mostrar o erro do modelo disponível por corte |
| 5. Entrega | Revisar desktop, celular e navegação por teclado | Testar contratos, indisponibilidade e reversão de pacote | Rodar o fluxo completo com dados publicados e explicar cobertura e limites |
| 6. Expansão | Acrescentar recomendações, visualização diária e IoT | Integrar regras, telemetria e validação operacional | Ativar cada novo produto por área a partir de evidência verificável |

Para começar em paralelo, o frontend implementa etapas 1 e 2 com fixtures versionadas. O backend entrega o catálogo e o esquema de disponibilidade. A equipe de dados prepara um pacote histórico e um cenário hídrico reproduzível para a primeira integração. A interface de rendimento pode ser construída com resposta de exemplo enquanto os resultados reais passam pela avaliação.

Referências locais: [contrato inicial](2026-11-14-gaiapus-01-produto-contrato.md), [frontend](2026-11-14-gaiapus-03-frontend.md), [backend](2026-11-14-gaiapus-04-backend.md), [globo e NDVI](2026-11-13-gaiapus-globo-ndvi.md), [balanço hídrico](gaiapus-19-balanco-hidrico-et0.md) e [disponibilidade IMERG](gaiapus-21-imerg-operacional-e-disponibilidade.md).
