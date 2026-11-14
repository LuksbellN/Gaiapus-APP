# Culturas no frontend — matriz de capacidades e pendências de backend

Estado em 14/11/2026. Gerado a partir de `src/catalog.ts`, `src/capabilities.ts`, dos exemplos em `contracts/examples/` e de `data/frozen/test_2022_2024_v7.json`. Nenhum treino, avaliação ou arquivo congelado foi alterado.

## Legenda

| Estado | Significado |
| --- | --- |
| **Local** | Funciona, com dados digitados pelo agricultor e salvos só neste aparelho. |
| **Demo** | Mostra um exemplo real do pacote/contrato (retrospectivo), identificado como demonstração. Não é consulta ao vivo. |
| **Pendente** | O frontend não consegue consultar: falta serviço HTTP ou contrato. Não significa que o modelo não cubra a cultura ou o município. |
| **Sem suporte** | Não existe o dado ou a representação nesta edição; nada é mostrado no lugar. |

## Matriz cultura × funcionalidade

| Cultura (ID) | Cadastro e registros | Planejamento e margem | Estimativa de rendimento | Simulação hídrica e timeline | Imagem / NDVI | Cena 3D | Histórico municipal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Soja (`soy`) | Local | Local; comparação de datas **Demo** só em Sorriso | **Demo**: Sorriso (Ridge nacional 1.0.0 e MLP regional 1.1.0), Uberlândia (antes do 1º corte), IBGE 4100103 | **Demo** só em Sorriso (projeção de 6 dias e histórico 2015/16–2020/21) | Demo só no recorte de Uberlândia | **Demo** ilustrativa, só em Sorriso | Pendente |
| Milho 1ª safra (`maize1`) | Local | Local | **Demo**: Uberlândia (referência histórica) | Pendente | idem | Sem suporte | Pendente |
| Milho 2ª safra (`maize2`) | Local | Local | **Demo**: Sorriso (Ridge 1.0.0; 1.1.0 antes do 1º corte) | **Demo** só dentro da rotação da soja em Sorriso; sem série própria | idem | Demo dentro da rotação de Sorriso | Pendente |
| Feijão 1ª safra (`bean1`) | Local | Local | Demo em outro município (IBGE 3100302); **Pendente** em Sorriso e Uberlândia | Pendente | idem | Sem suporte | Pendente |
| Feijão 2ª safra (`bean2`) | Local | Local | Demo em outro município (IBGE 4101309, antes do 1º corte); **Pendente** aqui | Pendente | idem | Sem suporte | Pendente |
| Arroz (`rice`) | Local | Local | Demo em outro município (IBGE 4300406); **Pendente** aqui | Pendente | idem | Sem suporte | Pendente |
| Trigo (`wheat`) | Local | Local | Demo em outro município (IBGE 3119302, fora da safra); **Pendente** aqui | Pendente | idem | Sem suporte | Pendente |
| Café arábica (`coffee_arabica`) | Local, com idade, poda e forma do produto | Local, com forma do café explícita | Demo em outro município (IBGE 3100302); **Pendente** aqui | Pendente; tela explica implantação × produção, sem fases | idem | Sem suporte | Pendente |
| Café conilon (`coffee_conilon`) | Local, idem | Local, idem | Demo em outro município (IBGE 3200102, referência histórica); **Pendente** aqui | Pendente, idem | idem | Sem suporte | Pendente |
| Café total MG (`coffee_total_mg`) | **Sem suporte** — coorte estatística, não é espécie | Só na análise agregada do café arábica | Pendente (sem exemplo municipal) | Sem suporte | — | Sem suporte | Pendente |
| Braquiária (cobertura, sem ID) | Local, como cobertura do solo | — | **Nunca** (não é cultura de rendimento) | Demo como cenário da rotação de Sorriso | — | Demo na rotação de Sorriso | — |

"Demo em outro município" aparece em Município → Safra numa seção separada, com o código IBGE e o aviso de que não é dado do município aberto.

## Situação científica por cultura (não é um selo único)

Teste selado 2022–2024, pacote v7, escala municipal, avaliado uma vez. MAE em kg/ha: modelo contra histórico ajustado. MAE é erro médio, não intervalo.

| Cultura | Escolha da validação 2019–2021 | Teste 2022–2024 (nacional) | Recorte regional | Uso operacional |
| --- | --- | --- | --- | --- |
| Soja | Ridge | 582,1 × 714,4 — ganho confirmado | MG e MT, MLP regional: 252,7 × 247,7 — **não confirmado** | Não liberado |
| Milho 2ª safra | Ridge | 973,5 × 1.039,1 — confirmado | — | Não liberado |
| Milho 1ª safra | referência histórica | 1.375,7 × 1.487,9 — confirmado | — | Não liberado |
| Trigo | HGB | 569,3 × 643,6 — confirmado | — | Não liberado |
| Arroz | HGB | 412,4 × 427,8 — confirmado | — | Não liberado |
| Feijão 1ª safra | referência histórica | 305,4 × 322,3 — confirmado | — | Não liberado |
| Feijão 2ª safra | HGB | **não confirmado** | — | Não liberado |
| Café arábica | HGB | 453,6 × 426,0 — **pior que a referência** | — | Não liberado |
| Café conilon | referência histórica | confirmado | — | Não liberado |
| Café total MG | HGB | **não confirmado** | — | Não liberado |

A interface lê esses desfechos de `src/data/sealed-test-2022-2024.json` (cópia reduzida do arquivo congelado). O v8 não é mostrado em lugar nenhum: há retreino e avaliação em andamento.

## Pendências concretas para o backend

Contratos **existentes** que precisam de serviço HTTP:

1. `GET` rendimento — `contracts/yield-estimate.schema.json` (1.1.0) e `yield-error.schema.json`. O frontend já consome a forma da resposta (`crops.yieldEstimate`, `crops.yieldExamples`) e trata `ready`, `before_first_cutoff`, `outside_season`, `invalid_crop`, `invalid_municipality_code`, `municipality_not_covered`. Falta: consulta por cultura × município × data (`as_of`). Trocar o corpo de `yieldExamples` por `fetch` mantém as telas.
2. Projeção hídrica — `contracts/water-projection.schema.json`. Hoje só há resposta para soja em Sorriso.
3. Field Shift — `contracts/field-shift.schema.json`. Idem, só Sorriso.

**Propostas** (não existem; nomes e formas são sugestões a validar):

4. Catálogo de culturas servido pelo backend (ID, nome, plantável, perene, safras), para substituir `src/catalog.ts`, hoje local e provisório.
5. Catálogo de cobertura por cultura × município × safra × corte × versão do modelo, distinguindo "coberto", "fora da cobertura" e "sem dados de entrada". Hoje `coverage.get` é um mock e o frontend só consegue dizer "integração pendente".
6. Série histórica municipal (IBGE PAM: área e rendimento por cultura e ano).
7. Série diária do balanço hídrico e calendário de fases por cultura e município (o que o simulador precisa para qualquer cultura além da rotação de Sorriso). Para café: fases de cultura perene, com idade e poda como entradas.
8. Resultado do teste e da validação por modelo como recurso consultável (hoje copiado de `data/frozen/` por `bun run data:test`).
9. Persistência de propriedades, talhões, registros e planos por usuário, com `cultura_id` do contrato; fatores de conversão documentados entre café cereja, coco e beneficiado, se a equipe quiser converter.
10. Séries municipais de clima (temperatura, umidade, radiação, vento, ET0) e previsão com mínima/máxima e probabilidade de chuva.
