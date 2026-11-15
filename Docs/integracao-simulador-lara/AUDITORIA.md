# Auditoria comparativa das simulações

Análise de código e inspeção da demonstração publicada em 15/11/2026. Repositórios e revisões estão em `LEIA-PRIMEIRO.md`. Os caminhos de arquivos abaixo são relativos ao respectivo repositório.

## 1. O que cada implementação faz melhor

| Área | Gaiapus atual | Lara atual | Decisão proposta |
|---|---|---|---|
| Produto e navegação | Mapa, localidades, contas, resultados, fontes, cinco idiomas, tutoriais e integração com outras telas | Jornada de simulação concentrada | Preservar estrutura Gaiapus e simplificar a configuração dentro dela |
| Geografia | Identificadores BR/US e exploração global; cobertura variável por produto | Serviço restringe coordenadas ao recorte brasileiro; demo centrada em Uberlândia | Usar resolução geográfica e capacidades da Gaiapus |
| 3D | Talhão amplo, soja/milho/braquiária, cobertura, teclado e fallback 2D | Corte de solo, raízes, escala de profundidade, chuva, irrigação, drenagem e estresse visual | Duas vistas do mesmo resultado: talhão e perfil de solo |
| Linha do tempo | Cursor sincroniza números, gráficos e cena; estado na URL e comparação | Playback, seleção de ano representativo e detalhes diários | Uma única timeline e um único estado temporal |
| Simulação histórica | Séries locais de Sorriso e produtos publicados; motor científico separado | Reexecuta a mesma decisão em múltiplas safras climáticas | Incorporar ensemble histórico depois de corrigir o motor |
| Rendimento | Modelos estatísticos, referências e resultados de avaliações explícitos | Rendimento potencial parametrizado com penalização hídrica simplificada | Exibir estimativas separadas, com método e escala |
| Irrigação e solo | Balanço com conservação explícita e dados rastreáveis; visualização mais simples | Manejos rainfed/deficit/full, raízes dinâmicas e tipos de solo | Preservar invariantes Gaiapus e portar recursos após auditoria |
| Economia | Contexto de planejamento e exemplos do produto | Custos, receita, margem e indicadores por cenário no motor | Reutilizar conceitos e implementar contratos/unidades consistentes |
| Rotação | Referência soja/milho/braquiária, visão de cobertura e comparação | API para sequência de até três culturas, com falhas de continuidade | Construir calendário contínuo; manter exemplos antigos como referência |
| Relatórios | Resultados com identidade e contexto de análise | Markdown e impressão no navegador | Gerar relatório de resultado imutável salvo no servidor |
| Robustez | Contratos, autenticação, pin de ciência, testes e fronteira Python | Bons testes unitários e degradação visual; lacunas físicas e de validação | Fazer integração por adaptadores e gates verificáveis |

Não há um vencedor único. O Lara está mais avançado na **explicação visual do sistema solo–planta e na experiência de cenários**. A Gaiapus está mais avançada na **estrutura do produto e no vínculo entre dados, modelos, geografia e resultados científicos**.

## 2. Evidências na Gaiapus

### Frontend ativo

- `apps/web/src/main.tsx` monta a aplicação em `teammate/App`, não a aplicação antiga de `src/App`.
- `apps/web/src/teammate/pages/Simulator.tsx`: modos histórico/cenário/previsão/climatologia, URL, controles, comparação e consumo de exemplos.
- `apps/web/src/teammate/capabilities.ts`: a série diária completa do simulador está habilitada para soja em Sorriso. Isso não significa que todas as culturas do catálogo tenham motor diário disponível.
- `apps/web/src/teammate/data/sorriso-daily.json`: referência histórica local que sustenta parte da visualização.
- `apps/web/src/teammate/sim/Field3D.tsx` e `sim/field-state.tsx`: cena com instâncias, fases ilustrativas, estado hídrico e fallback.
- `apps/web/src/teammate/ui/PhaseTimeline.tsx`: componente de timeline a preservar.
- `apps/web/src/teammate/catalog.ts`: inclui soja, milho 1ª/2ª safra, feijão 1ª/2ª, arroz, trigo, arábica, conilon e café total MG. O último é uma agregação estatística, não uma espécie para plantar.
- `i18n/messages/{pt-BR,en,es,fr,de}.ts` e `tours/`: estruturas existentes, não criar sistemas concorrentes.

A projeção hídrica e o rendimento de Sorriso usam exemplos publicados. Não foi encontrado ali um fluxo completo de cálculo arbitrário para qualquer cultura/data/região. Não substituir silenciosamente esses exemplos por números novos.

### API e adaptador científico

- `apps/api/src/modules/analysis/`: validação, executor, capacidades e identidade das análises existentes.
- `services/science-adapter/adapter.py`: FastAPI interno, modelos CPU, controles de concorrência e verificação de artefatos.
- `services/science-adapter/source-pin.json`: referencia ciência na revisão `ecae8c4457c0bd152915ea16495c83ad5097cfd4`, anterior ao HEAD científico observado. Portanto, o código local de pesquisa e o serviço empacotado **não são automaticamente a mesma versão**.
- `services/science-adapter/v7-pin.json`: pin dos modelos. Deve ser respeitado até uma atualização explícita e testada.
- A requisição de rendimento inspecionada restringe culturas e a safra de exemplo; não é um construtor universal de features operacionais.
- O contrato hídrico já distingue data de decisão e disponibilidade do forcing. O novo produto deve preservar isso.
- `packages/contracts/schemas/application.json` e `openapi.json`: fontes dos contratos; tipos gerados não devem ser editados manualmente.
- `supabase/migrations/202611140001_personal.sql`: persistência e políticas de usuário existentes. A comparação salva possui restrições de produtos que precisam de migração aditiva para novas simulações.

### Ciência reaproveitável

No repositório científico:

- `data/models/water_balance.py`: balanço com armazenamento limitado, ETa limitada pela água disponível e resíduo de conservação.
- `data/serving/location_weather.py`: qualidade, ET0 e ingestão diária com parâmetros explícitos.
- `data/serving/location_catalog.py` e `location_core.py`: localidades, calendários e produtos geográficos.

O motor Gaiapus usa, em seus conjuntos atuais, soja de 115 dias e milho safrinha de 120 dias. O Lara usa 120 e 125 dias, respectivamente. As classes de água disponível e os solos também diferem. As séries não devem coincidir sem alinhar parâmetros. Diferença entre curvas não é, por si, bug nem melhora.

## 3. Evidências no Lara

### Motor e API

Em `apps/api/simulation/`:

- `engine.py`: balanço, fases, raízes e resposta hídrica.
- `weather.py`: NASA POWER, cache e preenchimento.
- `scenarios.py`, `service.py`: ensembles e sequências de cultivo.
- `soil.py`, `crops.py`: parâmetros simplificados.
- `economics.py`, `impact.py`, `reports.py`: margens, indicadores e texto.
- `schemas.py`, `router.py`: entradas e endpoints `/v1/simulations`, `/rotation`, `/report` e catálogo.

O conjunto histórico padrão do simulador cobre decisões em 2001–2024, com extensão climática para culturas que atravessam anos. A demo publicada usa resultados pré-calculados: não comprova execução ao vivo para qualquer entrada.

### Visualização e UX

- `apps/web/src/features/twin/CropTwin3D.tsx`: corte, raízes, partículas e fluxos visuais.
- `twinModel.ts`: transforma saídas do motor em propriedades da cena.
- `usePlayback.ts`: controle temporal.
- `features/simulate/`: formulário, cards de percentis e comparações.
- `features/report/ReportPanel.tsx`: relatório com impressão.
- `data/dataSource.ts`: distinção entre API e fixture, sem recorrer silenciosamente a outra configuração.

Há boas decisões a portar: renderização sob demanda, amostragem determinística, limite de plantas, cancelamento de requisição anterior, estado de resultado desatualizado e fallback visual. Os marcadores de umidade a 15/40 cm são representações do modelo simplificado; **não são observações de sensores nem um perfil de umidade medido**.

Inspeção visual da [demo do Lara](https://larallc.github.io/Hackathon-Nasa-SpaceApps/): Uberlândia, soja/milho, datas e solos restritos, cenários pré-calculados e café desabilitado na interface. Valores econômicos não estavam ativos no pacote demonstrado. A API possui mais recursos que essa interface; não declarar que tudo está pronto para o usuário.

## 4. Problemas reproduzidos: corrigir antes de integrar o motor

O script `evidencias/probe_findings.py` usa dados sintéticos exclusivamente como testes diagnósticos. Seus resultados estão em `evidencias/probe-results.json`.

| ID | Caso | Resultado observado | Correção necessária |
|---|---|---|---|
| H01 | Semeadura `02-31` | Entrada aceita e convertida em `2020-02-28` | Rejeitar data impossível; nunca corrigir silenciosamente |
| H02 | Adicionar 300 mm de chuva no intervalo entre culturas | Resultado da rotação permanece idêntico | Executar todos os dias, inclusive pousio, e transportar estado hídrico |
| H03 | Segunda cultura antes da colheita da primeira | Colheita A em 11/02 e semeadura B em 01/02 do mesmo ano | Validar intervalo real; rejeitar sobreposição em sequência simples |
| H04 | 30 dias de temperatura ausente e chuva faltante | Série interpolada; chuva ausente vira zero | Política explícita de lacunas; precipitação faltante não equivale a seca |
| H05 | Caso extremo: ET0 20 mm/dia, armazenamento 5,25 mm | ETa 6,45 mm e armazenamento final 0; resíduo −1,20 mm | Limitar remoção à água disponível e testar conservação antes do arredondamento |
| H06 | Requisição de rotação inválida | Aceita janela de 80 anos, `99-99` e rendimento −10 | Reutilizar validação forte nos schemas de rotação e limitar recursos |

H05 é um teste de estresse numérico, não um evento climático observado em MG/MT. Ele demonstra uma propriedade inválida do algoritmo, não quantifica o erro em condições usuais.

## 5. Riscos adicionais identificados na leitura

1. **Raízes e água inicial:** ampliar raízes assume água disponível na nova camada; isso precisa de hipótese explícita ou perfil de solo. Reduzir profundidade entre culturas não pode apagar o déficit nem recriar água.
2. **Ordem diária:** chuva, irrigação, estresse e ET precisam seguir uma convenção documentada. Os dois motores usam ordens diferentes. Escolher e versionar, com testes de chuva/irrigação no dia do estresse.
3. **Potencial de rendimento:** valores padrão de 4.000/6.000/1.800 kg/ha são parâmetros do Lara, não rendimentos calibrados de qualquer região. Percentis que atingem esse teto não demonstram precisão.
4. **Dano acumulado:** `relative_yield_so_far` depende de médias por fase que podem mudar posteriormente; não rotular como perda final irreversível.
5. **Temperatura:** exibir um alerta de calor não significa que o modelo reduza a produção por calor. Não prometer simulação de geada, pragas, salinidade ou encharcamento sem equações e calibração específicas.
6. **Água verde/azul:** os indicadores atuais são aproximações contábeis. Irrigação aplicada não equivale a consumo; fontes se misturam no solo. Não apresentar pegada hídrica certificada ou erosão medida.
7. **Comparações:** diferença entre P50 de A e P50 de B não substitui a distribuição das diferenças pareadas por safra.
8. **Economia:** custo de irrigação varia por safra. Ponto de equilíbrio não pode vir apenas do primeiro ano; peso da saca e moeda devem ser explícitos por produto.
9. **Cache:** arredondamento diferente entre coordenadas de consulta e chave pode colidir. Versão e hash do conteúdo climático devem integrar a identidade do resultado.
10. **Cronologia:** obtido em determinada data não prova que o dado já estava publicado no corte histórico. Interpolação que olha o futuro é incompatível com modo operacional.
11. **Relatório:** aceitar resultados arbitrários enviados pelo cliente permite salvar/exportar conteúdo diferente do cálculo do servidor. Usar ID de resultado autorizado.
12. **Rotação:** dias de cobertura divididos por 365 são inadequados para um intervalo que atravessa mais de um ano. Calcular união dos dias cobertos sobre o intervalo real.

## 6. Compatibilidade técnica

| Dependência | Gaiapus-APP inspecionado | Lara, package.json inspecionado |
|---|---|---|
| React | 18.3.1 | 19.3.1 |
| React Three Fiber | 8.17.10 | 9.8.2 |
| Three.js | 0.170.0 | 0.187.x |
| React Router | 6.28.0 | 7.x |
| Vite | 7.3.8 | 8.x |

São versões declaradas, não garantia de compatibilidade de instalação. **Não copiar package.json nem lockfile do Lara.** Portar componentes para a stack Gaiapus. Uma atualização de versões maiores, se inevitável, deve ser um trabalho separado com regressões próprias. Não adicionar Drei apenas para evitar pequenas adaptações de geometria/controle já existentes.

## 7. Verificações realizadas e limites

| Verificação | Resultado |
|---|---|
| Lara: `python -m pytest tests/test_simulation.py -q -k 'not test_api_endpoints'` | 20 passaram; 1 excluído |
| Lara: suíte incluindo endpoint HTTP | A execução não concluiu no ambiente; interrompida. Endpoint não validado nesta análise |
| Gaiapus ciência: `tests/test_water_balance.py`, `tests/test_water_balance_crops.py`, `tests/test_location_weather.py` | 17 passaram |
| Probes H01–H06 | Executados; JSON incluído |
| Demo pública do Lara | Interface e cena inspecionadas no navegador |
| Build completo do frontend Lara | Não executado; snapshot é subconjunto de auditoria |
| Validação agronômica em talhão | Não realizada por esses testes |
| Alterações no produto e no banco | Nenhuma aplicada nesta entrega |

Passar testes de software demonstra as propriedades testadas. Não valida rendimento, efeito de irrigação ou resposta de uma cultura em novas regiões.
