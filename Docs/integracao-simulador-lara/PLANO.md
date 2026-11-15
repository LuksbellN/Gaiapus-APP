# Integração Gaiapus + Lara — plano de implementação

> **For agentic workers:** use `superpowers:executing-plans` para implementar tarefa por tarefa. Leia a especificação e a auditoria antes de alterar código. Use as checkboxes para acompanhar o trabalho e registre evidências de cada entrega.

**Goal:** integrar visualização, cenários e cálculos auditados em uma única experiência de simulação Gaiapus, sem regressões funcionais ou exagero científico.

**Architecture:** Gaiapus-APP mantém UI, geografia, autenticação e API pública. Um motor científico Python versionado calcula resultados físicos; estimativas estatísticas permanecem um produto separado. O frontend transforma resultados imutáveis em gráficos e cenas, e Supabase persiste identidade, resumos e artefatos privados.

**Tech Stack:** TypeScript strict, React 18, Three.js/R3F nas versões do produto, Fastify, FastAPI/Python, contratos JSON Schema, Supabase Postgres/Storage, Vitest, Playwright e pytest. Preservar pnpm/lockfile existente no monorepo; usar uv para o ambiente Python quando compatível com a configuração local.

**Spec:** `ARQUITETURA.md`. Evidências: `AUDITORIA.md` e `evidencias/`.

## Global Constraints

- Não remover funcionalidades para simplificar a interface; reorganizar, explicar e oferecer divulgação progressiva.
- Não sobrescrever alterações concorrentes nem modificar `.env*`, segredos ou dependências instaladas manualmente.
- Não substituir package.json/lockfile pelo do Lara; portar para a stack vigente.
- Não modificar modelos congelados, registros prospectivos ou resultados de teste de rendimento.
- Não confundir clima retrospectivo, previsão e cenário hipotético.
- Não promover métodos para uso operacional por passar testes de software.
- Manter pt-BR, en, es, fr e de; manter exploração mundial e aviso de cobertura por capacidade.
- O contrato numérico é independente de idioma, câmera e velocidade da animação.
- Suportar 2D, teclado, movimento reduzido, erro de rede e WebGL indisponível.
- Toda migração é aditiva; todo resultado antigo mantém versão e interpretação.
- Nenhum arquivo bruto global precisa ser baixado para construir a integração.
- Retenção quente: 24–36 meses de clima e 10 anos de rendimentos, somente após auditoria das dependências; históricos maiores de ensemble ficam compactos e recuperáveis.

## Review Focus

1. Local pesquisável sem solo ou cultura suportados deve continuar acessível, sem cálculo fictício (tarefas 2 e 9).
2. Rotação atravessando anos, pousio e raízes mudando não pode criar/apagar água (tarefa 4).
3. Troca de cenário/local/idioma durante execução não pode exibir resposta anterior como atual (tarefas 6 e 9).
4. Histórico arquivado ou ausente não pode reduzir silenciosamente o ensemble nem alterar um resultado salvo (tarefas 3, 7 e 11).
5. Café novo, café adulto e cultura estatística agregada não podem compartilhar um ciclo produtivo fictício (tarefa 10).

## 0. Estrutura e responsabilidade dos arquivos

Os caminhos existentes foram inspecionados. Os marcados **novo** são propostas e devem ser reconciliados com o código que tiver sido alterado após esta análise.

| Repositório/caminho | Responsabilidade |
|---|---|
| APP `apps/web/src/teammate/pages/Simulator.tsx` | Orquestrar a tela existente, sem concentrar física/estado inteiro nela |
| APP `apps/web/src/teammate/sim/Field3D.tsx`, `field-state.tsx` | Preservar vista atual e compatibilidade |
| APP `apps/web/src/teammate/sim/scene-adapter.ts` **novo** | Resultado canônico → estado visual, sem inventar medidas |
| APP `apps/web/src/teammate/sim/SoilProfile3D.tsx` **novo** | Corte/raízes/fluxos inspirado no Lara |
| APP `apps/web/src/teammate/sim/useSimulationRun.ts` **novo** | Submissão, polling, cancelamento e rejeição de resposta obsoleta |
| APP `apps/web/src/teammate/sim/ScenarioForm.tsx` **novo** | Configuração validada, básica e avançada |
| APP `apps/web/src/teammate/sim/SimulationComparison.tsx` **novo** | A/B, membros pareados, deltas e limitações |
| APP `apps/web/src/teammate/sim/CoffeeSetup.tsx` **novo** | Implantação/produção, idade e fase inicial |
| APP `packages/contracts/schemas/application.json`, `openapi.json` | Contratos e rotas novas, geração de tipos |
| APP `apps/api/src/modules/simulation/` **novo** | Rotas, capacidades, jobs, acesso e relatório |
| APP `services/science-adapter/simulation_adapter.py` **novo** | Fronteira interna com a distribuição científica pinada |
| APP `services/science-adapter/simulation-pin.json` **novo** | Versão, origem e hashes do motor/parâmetros |
| APP `supabase/migrations/<timestamp>_crop_simulations.sql` **novo** | Persistência aditiva e políticas |
| CIÊNCIA `data/models/crop_simulation/{types,soil,calendar,engine,ensemble,economics}.py` **novos** | Implementação numérica canônica |
| CIÊNCIA `data/models/crop_simulation/parameters/` **novo** | Parâmetros revisáveis por cultura/região/versão |
| CIÊNCIA `data/serving/simulation_forcing.py` **novo** | Adaptar ingestão existente, qualidade e disponibilidade |
| CIÊNCIA `data/serving/simulation_product.py` **novo** | Executar produto e construir envelope científico |

O bucket atual em `data/models/water_balance.py` continua referência congelada. Não substituí-lo silenciosamente pelo novo motor.

## 1. Inventário atualizado e baseline

**Arquivos:** criar APP `Docs/integracao-simulador-lara/ESTADO-IMPLEMENTACAO.md`; ler entrypoint, Simulator, contratos, pins e testes atuais.

**Entrada:** checkout atual e esta pasta. **Saída:** revisão/working tree documentados, matriz de funcionalidades e comandos reais do projeto.

- [ ] Ler AGENTS.md/skills aplicáveis; usar Superpowers para execução. Aplicar Impeccable/web-design-guidelines na revisão visual se instalados; não inventar skills ausentes.
- [ ] Registrar HEAD e `git status --short` dos dois repositórios. Identificar donos das alterações abertas. Usar branch `codex/integracao-simulador-lara` ou worktree quando necessário para isolamento, sem perder mudanças locais que precisam entrar.
- [ ] Conferir `apps/web/src/main.tsx`: editar o frontend ativo, não o protótipo antigo.
- [ ] Registrar capacidades atuais por localidade/cultura; capturar Sorriso, Uberlândia, EUA, local sem cobertura, login, salvamento e idiomas.
- [ ] Rodar baseline atual do monorepo e testes científicos relevantes. Guardar falhas preexistentes separadas das novas.
- [ ] Conferir o snapshot do Lara contra o commit observado; preservar proveniência dos trechos portados.
- [ ] Commit apenas do inventário/documentação própria, se o fluxo da equipe autorizar; não incluir mudanças de outra sessão por `git add .`.

**Aceite:** é possível dizer quais componentes estão ativos, quais produtos calculam de verdade e quais ainda exibem fixtures. Não iniciar nova UI em paralelo à existente.

## 2. Contratos e matriz de capacidades

**Arquivos:** modificar APP schemas `application.json`, `openapi.json`, catálogo e módulos de capacidade existentes; criar `apps/api/src/modules/simulation/capabilities.ts`, `packages/contracts/src/simulation-contracts.test.ts`.

**Interfaces propostas:** `getSimulationCapabilities(locationId: string): SimulationCapabilities`; `SimulationRequestV1`, `SimulationResultV1`, `DailySimulationRow`, `SimulationError` gerados do schema.

- [ ] Escrever testes que falhem para datas impossíveis, NaN/inf, rendimentos negativos, janelas excessivas, `coffee` ambíguo, `coffee_total_mg` como plantio e local sem capacidade.
- [ ] Testar BR:ibge e US:fips como strings, preservando zeros à esquerda. País/estado pesquisável sem suporte não retorna produto de Sorriso por fallback.
- [ ] Definir limites de anos, culturas e tamanho de pedido no catálogo/configuração; não aceitar infinitos membros ou payloads livres.
- [ ] Implementar schema discriminado por modo e ciclo anual/perene, com unidades canônicas e erros acionáveis.
- [ ] Incluir capacidades distintas para físico, rendimento estatístico, perfil de solo, economia e forecast; não usar disponibilidade de clima como autorização geral.
- [ ] Gerar tipos com `pnpm contracts:generate`; verificar `pnpm contracts:check` e testes dos contratos.
- [ ] Revisar compatibilidade com análises/exemplos/snapshots atuais; adicionar fixtures de sucesso e erro explícitas.

**Aceite:** todos os clientes antigos continuam válidos; entradas fora de suporte falham antes de iniciar trabalho pesado.

## 3. Adaptador de forcing e manifesto temporal

**Arquivos CIÊNCIA:** criar `data/serving/simulation_forcing.py` e `tests/test_simulation_forcing.py`; reutilizar `location_weather.py` sem alterar resultados congelados.

**Interfaces propostas:** `build_forcing(request: ForcingRequest, catalog: SourceCatalog) -> ForcingBundle`; `validate_forcing(bundle: ForcingBundle, mode: SimulationMode) -> QualityReport`.

- [ ] Escrever testes de duplicidade de dia, sentinela, chuva ausente, 30 dias sem temperatura, troca de produto e unidade incompatível.
- [ ] Escrever teste de corte: `available_at > decision_at` é rejeitado; disponibilidade desconhecida não passa como operacional; previsão usa emissão e validade corretas.
- [ ] Implementar séries contínuas e modo estrito. Excluir membro incompleto com motivo, sem inventar zero ou interpolação futura.
- [ ] Resolver UTC/padrão diário explicitamente e auditar clima sobre fronteiras de safra; manter a convenção no resultado.
- [ ] Emitir manifesto com produto, versão, variável, resolução, geometria/ponto, transformação, obtenção, disponibilidade e hash.
- [ ] Reutilizar recortes existentes; criar cache sem colisão por coordenada arredondada e sem equivalente falso entre PRECTOTCORR/IMERG_PRECTOT/Early/Late/Final.
- [ ] Testar leitura de histórico arquivado e erro legível de arquivo ausente, sem substituição por dados de outro lugar.

**Execução:** ambiente Python configurado do repositório, `python -m pytest tests/test_simulation_forcing.py -q` (via `uv run` se esse for o ambiente adotado).

**Aceite:** o mesmo manifesto reproduz o mesmo forcing, e uma consulta operacional não acessa valores posteriores ao corte.

## 4. Motor físico conservativo e calendário contínuo

**Arquivos CIÊNCIA:** criar `data/models/crop_simulation/{types,soil,calendar,engine}.py`, `tests/test_crop_simulation_balance.py`, `tests/test_crop_simulation_calendar.py`; parâmetros separados e versionados.

**Interfaces propostas:** `simulate_daily(plan: CropPlan, forcing: ForcingBundle, soil: SoilProfile, initial_state: SoilState, management: ManagementSpec) -> SimulationTrajectory`; `validate_crop_plan(plan: CropPlan) -> ValidatedCropPlan`.

- [ ] Converter H01–H06 da auditoria em testes de regressão do novo motor, antes da implementação. Não “corrigir” o snapshot de evidência.
- [ ] Adicionar teste numérico simples: armazenamento inicial 20 mm + chuva 10 mm − ETa 3 mm, sem outros fluxos, deve terminar com 27 mm e resíduo zero.
- [ ] Adicionar casos de solo seco/cheio, ET0 zero, demanda extrema, irrigação excessiva e chuva no intervalo entre culturas.
- [ ] Validar datas reais, bissextos e sobreposição; intervalo de pousio também tem linhas diárias.
- [ ] Escolher e documentar ordem diária. Limitar extração à água disponível; calcular resíduo antes do arredondamento.
- [ ] Implementar perfil fixo ou primeira versão de bucket explicitamente limitado, conforme ARQUITETURA. Se há raízes dinâmicas, contabilizar estado do solo fora da zona radicular e testar a expansão/retração.
- [ ] Adicionar teste de troca de cultura sem alteração instantânea da água total do perfil; nenhum reset para capacidade de campo.
- [ ] Comparar ao bucket Gaiapus sob configuração equivalente e sem recursos novos, com fixtures determinísticas. Diferenças de semântica precisam ser explicadas, não compensadas por fator empírico.
- [ ] Meta inicial de resíduo em testes float64: absoluto ≤ 1e-8 mm/dia em casos simples; para casos complexos, definir tolerância numérica documentada e proporcional, nunca arredondar para esconder erro de 1 mm.
- [ ] Rodar testes novos e `tests/test_water_balance.py`, `test_water_balance_crops.py`, `test_location_weather.py`.

**Aceite:** nenhuma falha H01–H06 persiste; casos de conservação e calendário passam. O resultado continua classificado como físico experimental até validação agronômica.

## 5. Ensembles, cenários pareados e economia

**Arquivos CIÊNCIA:** criar `ensemble.py`, `economics.py`, `tests/test_simulation_ensemble.py`, `tests/test_simulation_economics.py` e `data/serving/simulation_product.py`.

**Interfaces propostas:** `run_ensemble(request: EnsembleRequest, members: list[ForcingBundle]) -> EnsembleResult`; `compare_paired(a: EnsembleResult, b: EnsembleResult) -> PairedComparison`; `compute_economics(yield_kg_ha: float, irrigation_gross_mm: float, spec: EconomicsSpec) -> EconomicResult`.

- [ ] Testar alternativas idênticas: deltas por membro e resumos devem ser zero.
- [ ] Testar que comparar quantis independentes não substitui quantis das diferenças; usar uma fixture em que esses números sejam diferentes.
- [ ] Testar conjuntos de anos diferentes: interseção explícita e motivos de exclusão, ou erro se cobertura insuficiente.
- [ ] Implementar cenários de chuva/temperatura com parâmetros identificados e unidades; nunca alterar dado original em cache.
- [ ] Implementar percentis, anos representativos e número de membros; nomear frequências como históricas, sem alegar probabilidade futura calibrada.
- [ ] Testar conversão mm→m³/ha, kg→saca, moedas e custo de irrigação por membro. Ponto de equilíbrio não vem só do primeiro ano.
- [ ] Separar saída física exploratória de rendimento estatístico. Se rendimento indisponível, receita/margem ficam indisponíveis, não zero.
- [ ] Não incluir suposto efeito monetário de carbono, erosão ou fertilização sem módulo próprio.

**Aceite:** comparações A/B são reprodutíveis por membro e não misturam métodos, preços ou unidades incompatíveis.

## 6. Fronteira Python e API Node

**Arquivos APP:** criar `services/science-adapter/simulation_adapter.py`, `simulation-pin.json`, `apps/api/src/modules/simulation/{routes,service,executor}.ts` e testes próximos; registrar rotas usando o padrão atual de `server.ts`/módulos.

**Interfaces propostas:** Python `execute_simulation(request: CanonicalSimulationRequest) -> SimulationResultV1`; Node `submitSimulation(ownerId, request, idempotencyKey)` e `getSimulation(ownerId, simulationId)` com tipos gerados.

- [ ] Criar testes de endpoint com timeout explícito. O teste HTTP do Lara não concluiu nesta auditoria; não transportar esse problema sem diagnóstico.
- [ ] Gerar pacote científico pinado e conferir hashes; não editar vendor antigo nem source-pin de produtos antigos para “fazer passar”.
- [ ] Implementar validação dupla: contrato público e validação científica interna, com autenticação entre serviços seguindo o padrão existente.
- [ ] Submissão retorna ID e estado; incluir idempotência por dono + entrada canônica + versão, sem confundir pedidos privados de usuários diferentes.
- [ ] Limitar concorrência, devolver estado de fila e erro de saturação; respeitar cancelamento e liberar recursos apenas quando a tarefa realmente encerrar.
- [ ] Testar resposta fora de ordem e reinício do worker. Erro não publica resultado parcial como pronto.
- [ ] Resultado contém contexto local/cultura igual ao pedido; manter as verificações atuais de envelope.
- [ ] Benchmark em CPU; não manter HTTP aberto aguardando ensemble demorado sem estratégia de recuperação.

**Aceite:** uma execução real de fixture determinística atravessa Node → Python → resultado, e erro de Python aparece como estado útil, sem página branca.

## 7. Persistência, histórico e relatórios

**Arquivos APP:** migração nova `supabase/migrations/<timestamp>_crop_simulations.sql`, `apps/api/src/modules/simulation/{repository,report}.ts`, testes em `apps/api/tests/simulation.database.test.ts`.

**Interfaces propostas:** `saveSimulationResult(ownerId, result)`; `loadSimulationResult(ownerId, id)`; `renderSimulationReport(resultId, ownerId, locale)`.

- [ ] Escrever teste RLS com usuários A/B: B não lê/edita run, objeto, relatório ou comparação de A; anônimo não acessa resultados privados.
- [ ] Criar tabelas/índices/políticas de forma aditiva. Não mudar nem apagar snapshots antigos.
- [ ] Gravar entrada, manifesto, hashes e resumo; séries maiores em objeto privado versionado com verificação de integridade.
- [ ] Testar reinício, retomada, idempotência, artefato ausente/corrompido e expiração de URL assinada.
- [ ] Gerar relatório pelo ID autorizado, não pelo corpo de um resultado arbitrário do browser.
- [ ] Relatório inclui local, modo, anos, culturas, data de decisão, fontes, parâmetros, qualidade, hipóteses, A/B e limitações. Idioma não muda números canônicos.
- [ ] Primeiro oferecer HTML/Markdown imprimível com CSS de impressão; PDF automático pode ser etapa separada, sem declarar que impressão do browser é serviço PDF pronto.
- [ ] Testar restauração de resultado com versões antigas; conservar o artefato necessário durante a política de retenção.

**Aceite:** o resultado salvo é recuperável por seu dono e reproduzível, e o relatório reflete o cálculo do servidor.

## 8. Integração visual sem recálculo

Esta tarefa pode ser entregue após contratos e fixtures, antes de concluir o novo motor. Ela usa o resultado atual e permanece limitada às suas capacidades.

**Arquivos APP:** novos `scene-adapter.ts`, `scene-adapter.test.ts`, `SoilProfile3D.tsx`; modificar `Field3D.tsx`, `field-state.tsx` e `Simulator.tsx` pontualmente.

**Interface proposta:** `toSceneState(row: DailySimulationRow, capabilities: SceneCapabilities): CropSceneState`. Estado visual inclui códigos de fase, água relativa e fluxos reais; campos desconhecidos são nulos.

- [ ] Testar dia/cultura/água/chuva iguais entre gráfico, painel e scene state; nulo não vira zero.
- [ ] Portar do Lara apenas geometria e linguagem visual compatíveis. Preservar materiais/controle/demand loop existentes quando atendem à necessidade.
- [ ] Implementar vistas “Talhão” e “Perfil do solo”; escala de profundidade só quando existe profundidade interpretável.
- [ ] Manter sondas virtuais claramente identificadas, ou ocultá-las se o motor só fornece água média. IoT real ocupa um bloco de observações separado.
- [ ] Fluxos visuais dependem de chuva/irrigação/drenagem do dia; partículas não geram física e sua quantidade não altera o resultado.
- [ ] Testar reduced-motion, teclado, WebGL indisponível, aba oculta, desmontagem/reabertura e mobile. Liberar recursos gráficos.
- [ ] Exibir “Ilustração do cenário”, sem simular precisão de plantas individuais ou renderizar dado inexistente.

**Aceite:** apresentação melhora sem alterar um único valor numérico do resultado legado; fallback 2D oferece as mesmas informações principais.

## 9. Jornada, comparação, internacionalização e tutorial

**Arquivos APP:** novos `ScenarioForm.tsx`, `useSimulationRun.ts`, `SimulationComparison.tsx`; modificar `Simulator.tsx`, `ui/PhaseTimeline.tsx`, `tours/scripts.ts`, traduções e cliente de API existente. Criar specs E2E na pasta indicada pelo Playwright atual.

**Interfaces propostas:** `useSimulationRun(request)` retorna estado, resultado, cancel/retry e indicador de obsolescência; o hook não confunde execução anterior com atual.

- [ ] Criar testes de jornada: mapa→Sorriso→soja→resultado; Uberlândia parcial; EUA por estado/condado; região sem suporte.
- [ ] Prefill de local e preferências com origem visível; não preencher solo presumido como medido.
- [ ] Formulário básico/avançado, resumo de hipóteses antes de executar, validação ao lado do campo e preservação de rascunho.
- [ ] Uma timeline controla gráficos, cards e 3D. Mudança de ano representativo atualiza todos juntos.
- [ ] Troca rápida de cenário cancela/ignora resposta antiga. Resultado anterior pode continuar visível apenas com identificação de desatualizado.
- [ ] Implementar comparação pareada e visualização de diferenças; não esconder hipóteses para deixar a tela mais limpa.
- [ ] Traduções em cinco idiomas, preferências persistentes compatíveis e números locais; trocar idioma não faz novo cálculo.
- [ ] Tutorial contextual reutiliza o sistema atual; é pulável, reabrível e não obriga login para explorar uma demo pública.
- [ ] Acessibilidade: foco, contraste, rótulos, descrição dos gráficos, teclas e foco após erro. Rodar axe e testes do projeto.

**Aceite:** todas as jornadas anteriores continuam disponíveis, e usuários sem conhecimento técnico distinguem histórico, cenário e previsão curta.

## 10. Café e expansão controlada de culturas

**Arquivos CIÊNCIA:** novos `data/models/crop_simulation/perennial.py`, parâmetros regionais de café e `tests/test_simulation_perennial.py`. **APP:** `CoffeeSetup.tsx`, catálogo/capacidades, traduções e testes.

- [ ] Começar por arábica MG; separar implantação e produção. Registrar quais parâmetros têm fonte e quais são hipóteses ainda não calibradas.
- [ ] Testar “café recém-plantado + 90 dias”: não apresentar colheita comercial ou rendimento anual fictício.
- [ ] Testar lavoura adulta: janela de 90 dias começa na fase informada, preserva idade e estado anterior e não reinicia raízes no dia 1.
- [ ] Modelar cronologia perene, safra e estados que cruzam anos; não usar simplesmente `days_since_sowing % 365`.
- [ ] Disponibilizar primeiro fases e balanço quando sustentados; rendimento físico/estatístico permanece indisponível se faltar suporte.
- [ ] Conilon recebe parâmetros e avaliação próprios. `coffee_total_mg` pode continuar em resultados estatísticos, mas não no seletor de espécie.
- [ ] Para demais culturas, exigir ficha com sistema de cultivo, fases, solo, água, calendário, método de rendimento e domínio. Arroz irrigado e trigo de inverno não herdam sem revisão a equação de soja.

**Aceite:** o catálogo representa a capacidade real, não a quantidade de nomes de culturas que a interface consegue listar.

## 11. Verificação integrada, desempenho e entrega

**Arquivos:** novos relatórios de testes/benchmark e atualização de `ESTADO-IMPLEMENTACAO.md`, catálogo e documentação de operação. Não escrever números de benchmark antes de medir.

- [ ] Rodar contratos, typecheck, testes API/web/Python e E2E apropriados à integração. Banco em ambiente de teste isolado, nunca limpando produção.
- [ ] Testar rede lenta/offline, retry, arquivo histórico ausente, WebGL indisponível, erro no worker e usuário sem autorização.
- [ ] Comparar fixtures legadas antes/depois: números e status científicos não mudam por refatoração visual.
- [ ] Verificar CPU: mesma versão/entrada gera mesmos resultados dentro da tolerância documentada; modelos existentes mantêm sua paridade já exigida.
- [ ] Medir execução fria/quente, p50/p95, RAM máxima, tamanho do pedido/resposta e objetos comprimidos para 1/10/24 membros. Registrar hardware, versão e comando.
- [ ] Medir cena e carregamento nos dispositivos de referência. Lazy-load de 3D; não baixar ensemble inteiro no primeiro render.
- [ ] Verificar hashes de todos os artefatos, proveniência e ausência de credenciais no pacote final, inclusive conteúdo descompactado.
- [ ] Entregar changelog de capacidades, limitações conhecidas, rollback e roteiro de demonstração. Não atribuir status “validado em campo” aos testes de software.
- [ ] Comitar apenas o escopo concluído conforme política do repositório; não fazer force push nem misturar mudanças de outra sessão.

### Comandos existentes confirmados no APP

Executar na raiz do monorepo, conferindo se os scripts permaneceram iguais:

```powershell
pnpm contracts:generate
pnpm contracts:check
pnpm typecheck
pnpm test
pnpm --filter @gaiapus/web test
pnpm --filter @gaiapus/web test:e2e
pnpm build
```

`pnpm test` da raiz não inclui automaticamente toda a suíte web, banco e ciência. Os scripts API `test:database` e `test:science` exigem seus serviços/ambiente de teste; ler instruções e configurar antes, sem reutilizar credenciais de produção. Os testes Python novos devem ser incluídos explicitamente na execução do repositório científico.

## 12. Roteiro de demonstração da entrega

1. Explorar o globo, entrar no Brasil, escolher MG/Uberlândia e ver capacidades disponíveis.
2. Abrir soja, escolher cenário histórico elegível e revisar as suposições de solo/clima.
3. Executar, percorrer uma fase crítica e alternar talhão/perfil. Todos os números se referem ao mesmo dia/membro.
4. Comparar sequeiro e manejo de irrigação suportado, verificando água, custo e limitações do rendimento.
5. Salvar resultado, abrir relatório e conferir origem/versões.
6. Abrir local dos EUA pelo estado e county; se faltar capacidade, a interface explica sem esconder a geografia.
7. Abrir café, distinguir implantação de lavoura adulta e demonstrar o que está disponível sem inventar colheita.
8. Trocar para inglês e outra língua; números científicos permanecem idênticos.
9. Desligar WebGL/rede em teste e verificar a recuperação e a alternativa 2D.

## 13. O que não entra nesta implementação

- Retreinar/promover modelos ou escolher hiperparâmetros usando testes já abertos.
- Garantir previsão diária do tempo para uma safra inteira.
- Afirmar ganho causal de braquiária, irrigação, poda ou adubação apenas com regressão municipal.
- Criar mecanismo completo de carbono, erosão, nutrientes, pragas ou gêmeo digital de plantas individuais sem dados/modelos próprios.
- Substituir todos os componentes e bibliotecas do produto por uma cópia do Lara.
- Apagar ou migrar arquivos de pesquisa para economizar espaço durante a integração.

Esses limites preservam uma entrega executável: boa visualização, cálculo auditável, identidade dos dados e ampliação por evidências.
