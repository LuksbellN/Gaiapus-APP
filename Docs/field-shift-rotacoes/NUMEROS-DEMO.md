# Field Shift — números da demonstração (Sorriso, MT)

Todos os números de A, B e C vêm do pacote v2 que está na tela (`apps/web/src/teammate/data/field-shift-v2/`). Da extensão `sorriso-field-shift-rotations.json` (gerada por `services/science-adapter/field_shift_rotations.py`, mesmo motor FAO-56) entram só os dias de solo nu na estação chuvosa, a chuva sobre solo nu e a sensibilidade dessas duas métricas. As tabelas abaixo foram geradas a partir dos JSONs versionados, sem número digitado à mão, com o mesmo arredondamento da tela.

Tudo aqui é **simulação histórica** (balanço hídrico em balde, médias de 6 safras), não medição em campo. Rendimento, margem e efeitos agronômicos não são simulados.

- A · rotação atual (referência): soja → milho safrinha → pousio.
- B · braquiária: soja → milho safrinha + braquiária.
- C · sem milho safrinha: soja → pousio até a próxima soja (menos culturas; não é uma rotação diversificada).

## Médias das 6 safras

Pacote `field-shift-v2-0d12285bf7a9` · NASA POWER daily point (IMERG rain), retrospective · safras 2015/2016 a 2020/2021 · solo AD4, 55 mm.

| Indicador | A · atual (referência) | B · braquiária | C · sem milho safrinha | B − A | C − A |
|---|---:|---:|---:|---:|---:|
| Dias com solo coberto | 235,0 | 350,3 | 115,0 | +115,3 | −120,0 |
| Dias de solo nu | 130,3 | 15,0 | 250,3 | −115,3 | +120,0 |
| Água usada no ano agrícola (mm) | 748,8 | 749,5 | 596,2 | +0,8 | −152,6 |
| Água drenada no ano agrícola (mm) | 1.205,5 | 1.205,1 | 1.358,1 | −0,4 | +152,6 |
| Reserva antes da próxima soja (mm) | 44,2 | 43,9 | 44,2 | −0,4 | 0,0 |
| Déficit da soja (mm) | 12,63 | 12,27 | 12,63 | −0,37 | 0,00 |
| Dias de estresse da soja | 7,5 | 7,5 | 7,5 | 0,0 | 0,0 |
| Déficit do milho safrinha (mm) | 54,1 | 54,1 | — | 0,0 | — |
| Dias de estresse do milho | 26,3 | 26,3 | — | 0,0 | — |
| Déficit na implantação da soja seguinte (mm) | 1,57 | 1,22 | 1,57 | −0,35 | 0,00 |

### Solo nu e estações vulneráveis (extensão, mesmo motor)

| Indicador | A | B | C |
|---|---:|---:|---:|
| Dias de solo nu na estação chuvosa (nov–abr) | 0,0 | 0,0 | 93,3 |
| Chuva sobre solo nu (mm/ano) — proxy de exposição à erosão, não erosão | 114,8 | 75,9 | 1.032,4 |

### Sensibilidade de chuva (delta-change; teste de sensibilidade, não é projeção climática)

Pacote v2 (A, B e C recalculados em cada ponto):

| Chuva | Chuva no ano (mm) | Água usada A / B / C (mm) | Drenada A / B / C (mm) | Déficit da soja A / B / C (mm) |
|---|---:|---|---|---|
| −20% | 1.565 | 723,4 / 722,6 / 588,2 | 841,7 / 842,9 / 977,0 | 16,8 / 16,3 / 16,8 |
| histórica | 1.956 | 748,8 / 749,5 / 596,2 | 1.205,5 / 1.205,1 / 1.358,1 | 12,6 / 12,3 / 12,6 |
| +20% | 2.347 | 768,7 / 771,2 / 602,3 | 1.576,3 / 1.573,8 / 1.742,7 | 9,8 / 9,4 / 9,8 |

Extensão (só as duas métricas de solo nu; diferenças contra A):

| Chuva | Comparação | Dias de solo nu nov–abr | Chuva sobre solo nu (mm) |
|---|---|---:|---:|
| −20% | B − A | 0,0 | −31,1 |
| −20% | C − A | +93,3 | +734,0 |
| +20% | B − A | 0,0 | −46,7 |
| +20% | C − A | +93,3 | +1.101,1 |

Temperatura +1,5 °C: não calculada (`not_calculated`). Motivo registrado no pacote: "a temperature shift needs FAO-56 ET0 recomputed with a declared humidity policy; not part of this package".

## Leitura

Tirar o milho safrinha (C) não muda a água da soja seguinte neste modelo: a reserva na semeadura é a mesma de A. Mas C deixa o solo nu cerca de 93 dias por ano na estação chuvosa (nov–abr) e expõe cerca de 9× mais chuva ao solo descoberto que A. A braquiária (B) reduz essa exposição em cerca de um terço em relação a A. "Chuva sobre solo nu" é proxy de exposição à erosão, não estimativa de erosão. A drenagem também não mede erosão, lixiviação nem infiltração.

## Nota: déficit na implantação, 1,57 (tela) × 1,88 (extensão)

A tela e esta tabela mostram o déficit na implantação da soja seguinte do pacote v2: **1,57 mm** em A, média das 6 safras. A extensão calcula a mesma grandeza só nas 5 transições que têm a semeadura seguinte dentro da série (a série acaba antes da semeadura 2021/22), o que dá 1,88 mm em A. Os dois valores vêm do mesmo motor; diferem só no conjunto de safras da média. O 1,88 não aparece na interface.

## Ressalvas

- As janelas de "entressafra" diferem entre as rotações (em C começam logo após a soja); compare pelos indicadores anuais.
- Temperatura +1,5 °C **não** foi calculada (motivo acima). Sensibilidade de chuva é uma variável por vez, sobre o clima histórico.
- Solo AD4 de 55 mm é hipótese fixa, não perfil medido. O clima é um ponto de grade do NASA POWER, não o talhão.
- Reprodução da extensão: A e B publicados reproduzidos dia a dia com erro máximo de 0,0023 mm (portão: 0,01 mm). No app, a extensão só aparece quando os dias cobertos e de solo nu de cada safra são idênticos aos do pacote v2.
