# Gaiapus — revisão do produto e das telas (15/11/2026)

**Pedido de Leandro:** a pessoa deve conseguir escolher a região, ver os dados, simular, simular o futuro, escolher a cultura e ter indicação do que é mais indicado. Hoje isso está complicado. Este documento registra o que existe, o que falta e a ordem das melhorias.

**Como foi feita:** leitura do código de `apps/web/src/teammate`, capturas de 19 rotas em 1440×900 e 390×844 sobre o `main` (`13a140d`), a auditoria de interface da sessão anterior (Web Interface Guidelines) e os catálogos publicados. Nenhum erro de console nas 38 capturas.

## 1. A jornada que o produto deveria oferecer

```mermaid
flowchart LR
  A[Escolher a região] --> B[Ver os dados do lugar]
  B --> C[Simular a safra]
  C --> D[Trocar cultura, ano e clima]
  D --> E[Comparar culturas]
  E --> F[Registrar o plano]
```

Hoje cada caixa existe, mas as setas não. Cada tela começa de novo em Sorriso/soja e os caminhos entre elas dependem de editar o endereço.

## 2. Respostas diretas às perguntas

| Pergunta | Causa | O que muda |
|---|---|---|
| Por que o Simulador não abre no planejamento? | `/simulador` abre a demonstração histórica de Sorriso; o planejamento só existe com `?modo=planejamento`. O único botão é pequeno, fica dentro do painel e aponta sempre para Sorriso/soja. | O Simulador passa a abrir no planejamento da safra futura. As safras passadas viram a segunda aba, visível nas duas telas. |
| Por que não dá para escolher cultura e local? | A tela de planejamento lê os dois só do endereço (`mun`, `cultura`). | Seletor de lugar (país → estado → lugar, com busca) e de cultura, mostrando o que está calculado e o motivo do que não está. |
| Por que quase tudo é solo exposto? | A execução vai de 01/01/2025 a 13/03/2028 (1.153 dias). O início é aquecimento com clima observado; o motor só calcula soja e milho safrinha, e fora do ciclo considera pousio. | A tela abre na janela da safra escolhida. A execução inteira continua disponível, com a explicação do aquecimento e do pousio. Cobertura de entressafra depende do motor científico (seção 6). |
| O que é trajetória climática? | Um ano real inteiro (de 22, entre 2001 e 2022) reaplicado sobre o calendário futuro. Central, mais seca e mais úmida são três desses anos. A tela só dizia "trajetórias inteiras do conjunto". | Explicação em linguagem simples, com o ano de origem de cada trajetória. |
| Por que Município não tem "Simular"? | Não havia ligação: Explorar só leva ao Simulador em um caso (comparação de estratégia), e para a demonstração. | Botão "Simular safra" em Município e no cartão do lugar em Explorar, levando o lugar e a cultura. |
| E a recomendação do mais indicado? | Não há base científica para recomendar cultura (seção 6). | Comparação lado a lado das culturas calculadas, com um indicador hídrico explícito e os limites escritos. |

## 3. O que existe hoje, tela a tela

| Tela | O que faz | Estado |
|---|---|---|
| Explorar | Globo e mapa: país → estado → município ou condado; busca; cartão com o que há no lugar | Funciona. Não leva à simulação. Brasil seleciona no mapa e EUA navega para outra tela. Busca não acha condados. Três vocabulários para "tem dados". |
| Município | Clima, água, safra e imagem orbital do lugar; seletor de lugar | Funciona para os 4 municípios e os 3 condados publicados. Sem ação para simular. Aba Safra mostra "exemplo retrospectivo" sem dizer o que fazer depois. |
| Visão geral | "Hoje em Sorriso": reserva de água e próximos dias | Só Sorriso (demonstração). |
| Alertas / Sondas | Estados vazios com explicação | Sem dados reais; corretos como espera. |
| Planejar | Cadastro de plano (cultura, área, irrigação, solo, prioridade) e comparação de datas de semeadura | A comparação é só de Sorriso, com safras passadas. Não usa o planejamento 2027/2028. |
| Simulador (histórico) | Rotação de soja em Sorriso, 2015–2021, com A/B de braquiária, talhão 3D e perfil do solo | Funciona; é uma demonstração de um lugar. |
| Simulador (planejamento) | Safras 2027/2028 calculadas: 4 municípios, soja e milho safrinha; 22 trajetórias; talhão e perfil | Funciona, mas escondido e sem seletores. No celular não dá para trocar ano ou trajetória nem ver resultados. |
| Field Shift | Pousio × braquiária em Sorriso | Demonstração. |
| Propriedades / Registros | Cadastro local de propriedade, talhão e eventos | Funciona neste aparelho. |
| Ajuda, Conta | Tutoriais, login | Funcionam. |

Dados publicados para planejamento:

| Lugar | Culturas calculadas | Culturas listadas sem cálculo (com motivo) |
|---|---|---|
| Sorriso, MT | soja, milho safrinha | arroz, feijão 1ª e 2ª |
| Uberlândia, MG | soja, milho safrinha | milho 1ª, trigo, feijão 1ª e 2ª, café |
| Rio Verde, GO | soja, milho safrinha | milho 1ª, trigo, arroz, feijão 1ª e 2ª |
| Barreiras, BA | soja | milho 1ª, trigo |
| EUA (245 condados) | soja, milho, trigo de inverno | Só aparecem quando a fonte dos EUA estiver ligada na API (hoje desligada). |

## 4. Problemas, por prioridade

### Críticos (impedem a jornada)

1. O Simulador abre numa demonstração; o planejamento futuro não tem entrada visível.
2. Planejamento sem seletor de lugar nem de cultura.
3. Planejamento no celular: os painéis de configuração e de resultados ficam ocultos e não há abas.
4. Município e Explorar não levam à simulação.
5. A linha do tempo abre com 1.153 dias, quase todos de pousio.
6. Cada passo da linha do tempo do planejamento cria uma entrada no histórico do navegador.

### Altos (confundem)

7. O cabeçalho mostra sempre "Demonstração · Sorriso, MT · soja", inclusive nas telas de outro lugar.
8. "Trajetória climática" sem explicação; a origem do clima (observado × cenário) aparece só num rótulo pequeno.
9. Os controles de vista, estaca, raízes e corte cobrem a cena (129 de 518 px no desktop; no celular sobram 52–100 px).
10. O planejamento só entende municípios brasileiros (`BR:ibge`); condados dos EUA não abrem.
11. Explorar: clique em lugar tem dois comportamentos (Brasil seleciona, EUA navega); a busca não acha condados; Sorriso não tem marcador.
12. Rendimento no planejamento do Brasil aparece como "indisponível" ou referência, sem dizer o que isso significa para a decisão.

### Médios (acabamento)

13. `h1` com tamanho fixo e salto h1 → h3; "Copiar link" sem retorno; identificador da execução sem `translate="no"`; carregamento do 3D sem texto.
14. Perfil 2D e 3D: rótulos que colidem; textos de 11 px no celular; texto fixo em português na vista 2D.
15. Planejar não aproveita o planejamento calculado.
16. Visão geral, Field Shift e Simulador histórico são só de Sorriso, sem dizer na navegação que são exemplos.
17. `index.html` com `lang="en"` inicial; `outline: none` no seletor de idioma.

## 5. O que falta em relação ao produto pretendido

| Capacidade | Hoje | Falta |
|---|---|---|
| Escolher a região | Explorar e seletor de lugar | Levar o lugar escolhido adiante em todas as telas |
| Ver os dados | Município | Ligação com a simulação; linguagem menos técnica na aba Safra |
| Simular o passado | Só Sorriso | Outros lugares dependem de séries diárias publicadas |
| Simular o futuro | 4 municípios, 2 culturas (e EUA, com a fonte ligada) | Entrada visível, seletores, celular; mais culturas dependem do motor |
| Escolher a cultura | Lista por lugar no catálogo | Mostrar na tela, com o motivo das não calculadas |
| Indicação do mais indicado | Não existe | Comparação de culturas agora; recomendação depende de regra aprovada (seção 6) |
| Escolher data de plantio | Calendário fixo do estado | Exige cálculo novo no motor para cada data; hoje só há execuções publicadas |
| Solo e manejo do usuário | Hipótese única (55 mm, sequeiro) | Exige execução sob demanda (fila de simulações já prevista no banco) |

## 6. Limites que a interface precisa respeitar

- **Recomendação de cultura.** O rendimento do Brasil no planejamento é uma referência histórica que não muda com o cenário, ou está indisponível. Nos EUA, só o trigo de inverno do Kansas confirmou ganho. Não há preço, custo nem solo real. O que dá para afirmar com os dados publicados é qual cultura calculada teve melhor atendimento hídrico nos cenários. Uma recomendação exige uma regra explícita aprovada (por exemplo: água + rendimento esperado + preço informado pelo usuário).
- **Solo exposto.** A entressafra é pousio porque o motor não simula cobertura. Simular braquiária na entressafra é trabalho do repositório científico.
- **Trajetórias.** São anos passados, não previsão. A frequência de um evento entre as trajetórias não é probabilidade calibrada.
- **Data de plantio, solo e irrigação.** Mudar qualquer um exige recalcular. A interface não pode fingir esse cálculo sobre uma execução publicada.

## 7. Plano de melhorias

| Lote | Conteúdo | Estado |
|---|---|---|
| 1 — A jornada | Ver seção 8 | Feito neste PR |
| 2 — Explorar | Um só comportamento de clique; busca de condados; vocabulário único de disponibilidade; marcador de Sorriso; "Simular safra" também no painel de condado | A fazer |
| 3 — Cena e perfil | Rótulos que colidem, textos no celular, vista 2D traduzida, legenda que cobre a cena no celular, menos leitura de layout por quadro | A fazer |
| 4 — Planejar e Visão geral | Planejar usando o planejamento calculado do lugar; telas de demonstração identificadas como exemplo | A fazer |
| 5 — Depende da ciência | Cobertura de entressafra, mais culturas, data de plantio e solo do usuário (execução sob demanda), regra de recomendação | Requer decisão e trabalho no repositório científico |

## 8. O que o lote 1 entregou

| Problema (seção 4) | O que foi feito |
|---|---|
| 1. Simulador abre numa demonstração | `/simulador` abre no planejamento da safra futura. As safras passadas ficam na aba "Safras passadas" (`?modo=historico`), presente nas duas telas. |
| 2. Sem seletor de lugar e cultura | Seletor país → estado → lugar com busca, seletor de cultura e ano de colheita. Culturas sem cálculo ficam listadas, desabilitadas, com o motivo. |
| 3. Celular sem configuração e resultados | Abas Campo, Indicadores e Configurar, como no simulador de safras passadas. |
| 4. Município e Explorar não levam à simulação | Botão "Simular safra aqui" em Município (ou "Ver lugares com simulação" quando o lugar não tem cálculo) e "Simular safra futura" no cartão do município em Explorar. |
| 5. Linha do tempo com 1.153 dias de pousio | Abre na janela da safra: 30 dias antes da semeadura até 14 dias depois da colheita. "Execução inteira" continua disponível, com a explicação do aquecimento e do pousio. Um link para um dia fora da safra abre a execução inteira, sem mover o dia. |
| 6. Histórico empilhado | O dia escolhido substitui a entrada do histórico. |
| 7. Cabeçalho com "Sorriso" fixo | O contexto sem propriedade diz "Sem propriedade cadastrada", sem citar um lugar. |
| 8. Trajetória sem explicação | Bloco "O que é a trajetória climática?", com o número de anos, o período e o ano de origem da trajetória na tela. |
| 9. Controles cobrindo a cena | Estaca, raízes e corte foram para o menu "Camadas", recolhido. |
| 10. Só municípios brasileiros | O planejamento aceita `?local=BR:ibge:…` e `?local=US:fips:…`; o endereço antigo `?mun=` continua valendo. Condados só aparecem com a fonte dos EUA ligada na API. |
| 12. Rendimento sem contexto | O cartão de rendimento mostra valor, momento da emissão, situação científica e as duas faixas separadas. Anos só com rendimento (2026 nos EUA, trigo do Kansas 2027) mostram a estimativa e dizem por que não há simulação diária. |
| 13. Acabamento | Um `h1` por tela e títulos em ordem; "Copiar link" confirma; identificador da execução com `translate="no"`; carregamento do 3D com texto. |
| Indicação do mais indicado | Cartão "Comparar culturas": atendimento hídrico (ETa ÷ ETc), dias com estresse, déficit e rendimento das culturas calculadas no lugar, com a de melhor atendimento hídrico marcada e a frase de que não é recomendação de plantio. |

Também mudou: tutorial próprio do planejamento (4 passos, 5 idiomas); os atalhos de Visão geral, Field Shift e da tela "sem série" apontam para as safras passadas.

Verificação: 277 testes unitários do web, 111 testes de navegador (5 novos em `tests/e2e/regressao/jornada.spec.ts`), typecheck e build.

Não entrou neste lote: itens 11, 14, 15, 16 e 17 da seção 4.
