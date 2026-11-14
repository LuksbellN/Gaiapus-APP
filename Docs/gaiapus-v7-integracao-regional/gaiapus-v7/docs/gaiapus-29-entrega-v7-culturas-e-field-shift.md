# Gaiapus — entrega v7: culturas, GPU e caso Field Shift

Execução de 14/11/2026, a partir do [guia 27](gaiapus-27-plano-modelo-funcional.md). Continua o [guia 26](gaiapus-26-v6-produtos-e-contratos.md). Todos os números foram medidos nesta execução. **O teste 2022–2024 continua fechado.** O frontend e o backend ficam com o parceiro; este guia entrega modelos, contratos, exemplos, métricas e comandos.

## 1. Escolhido na validação ≠ liberado para uso operacional

| Termo | Significado aqui |
|---|---|
| **Modelo escolhido na validação** | O vencedor pela regra congelada antes de ver a validação 2019–2021 (janela móvel, municípios fora do treino) |
| **Status de validação** | `validated` (ganho sobre o histórico com intervalo abaixo de zero e erro espacial ≤ 1,15 × temporal), `experimental`, `reference_only` ou `unavailable` |
| **Liberado para uso operacional** | **Nenhum recorte.** Faltam a comprovação das datas de publicação dos insumos e dos rótulos e a avaliação única no teste 2022–2024 |

O app pode mostrar a estimativa com o rótulo "retrospectiva — validada em 2019–2021" e o erro do recorte. Não deve apresentá-la como previsão operacional.

## 2. Caso Field Shift: Sorriso (MT)

[`field_shift_case.py`](../../../data/ingest/field_shift_case.py), resposta em [`contracts/examples/field-shift-sorriso.json`](../../../contracts/examples/field-shift-sorriso.json), schema [`field-shift.schema.json`](../../../contracts/field-shift.schema.json).

**Cenários.** Referência: soja seguida de milho safrinha e pousio sem cobertura. Alternativa: soja seguida de milho consorciado com braquiária, mantida como cobertura até a dessecação, 15 dias antes da soja seguinte. A base agronômica é o consórcio milho–braquiária usado em integração lavoura-pecuária no Cerrado. Seis anos agrícolas (2015/16 a 2020/21) com clima diário real do NASA POWER.

**Semeadura usada e origem.** Soja em 05/10, do calendário hipotético de MT (o mesmo do treino). Milho no dia seguinte ao fim do ciclo da soja (115 dias), regra derivada. Braquiária semeada com o milho, manejo assumido.

**Prioridade do produtor assumida.** Manter o solo coberto entre as safras sem aumentar o déficit hídrico da soja seguinte na implantação.

**Indicadores simulados (média dos seis anos).** Nenhum é medição.

| Indicador | Soja → milho (pousio) | Soja → milho + braquiária | Diferença |
|---|---:|---:|---:|
| Dias com solo coberto | 235 | 350 | **+115** |
| Consumo de água na entressafra (mm) | 47,7 | 56,5 | +8,8 |
| Drenagem na entressafra (mm) | 38,7 | 30,2 | −8,5 |
| Reserva na semeadura seguinte (mm, CAD 55) | 44,2 | 43,9 | −0,4 |
| Déficit da soja seguinte nos 15 primeiros dias (mm) | 1,57 | 1,22 | −0,35 |
| Déficit no ciclo do milho (mm) / dias de estresse | 54,1 / 26 | 54,1 / 26 | 0 |

**Sensibilidade às hipóteses** (diferença braquiária − pousio):

| Hipótese variada | Consumo na entressafra | Reserva na semeadura | Déficit na implantação |
|---|---:|---:|---:|
| Central (Kc 0,80; palhada 0,8; CAD 55; 05/10) | +8,8 | −0,4 | −0,35 |
| Kc da braquiária 0,75 / 0,85 | +8,1 / +9,5 | −0,4 / −0,4 | −0,35 |
| Efeito da palhada 0,7 / 0,9 / 1,0 (nenhum) | +8,8 | −0,4 | −0,52 / −0,18 / 0,0 |
| CAD 32 mm (AD2) / 95 mm (AD6) | +8,2 / +9,7 | 0,0 / −2,8 | −0,28 / −0,47 |
| Soja 15 dias antes / depois | +6,5 / +26,7 | −1,5 / −0,1 | −1,0 / 0,0 |

Leitura: com essas hipóteses, a braquiária acrescenta ~115 dias de cobertura e consome 7–27 mm a mais na seca. Esse consumo é limitado pela própria falta de água. As chuvas de setembro e outubro recompõem a reserva até a semeadura seguinte, com diferença de 0 a 3 mm. O menor déficit na implantação vem só da hipótese da palhada: sem ela, é zero.

**Não simulado nem medido:** rendimento, carbono do solo, infiltração, plantas daninhas e nitrogênio. A resposta traz `yield_effect: null`. A estimativa municipal de rendimento é a resposta separada `yield_estimate`.

Séries diárias exportadas em `data/processed/field_shift_v1/` (`reference_fallow_daily.csv`, `brachiaria_daily.csv`), com tipo de cobertura, chuva, ET0, Kc, ETc, ETa, déficit, drenagem, reserva, fração de água disponível e Ks. O JSON inclui a série do último ano agrícola de cada cenário.

## 3. Reprodução de soja e milho safrinha em GPU

[`train_v7.py`](../../../data/ingest/train_v7.py) roda o mesmo protocolo da v6 com o MLP obrigatoriamente em CUDA.

| Cultura | Histórico ajustado | Referência simples (média defasada) | Ridge | HGB | MLP CUDA | Escolhido na validação | Status | Operacional |
|---|---:|---:|---:|---:|---:|---|---|---|
| Soja | 435,4 | 399,2 | **386,3** | 429,8 | 394,5 | Ridge, todas as fontes | validated (−49; IC −58 a −39) | não liberado |
| Milho 2ª safra | 1.203,0 | 1.223,6 | **1.146,7** | 1.244,4 | 1.170,9 | Ridge, todas as fontes | validated (−56; IC −85 a −28) | não liberado |

MAE em kg/ha, municípios do treino, 2019–2021. O Ridge reproduz a v6 exatamente (386,3 e 1.146,7). O MLP em GPU melhorou no milho, de 1.551 na v6 (CPU) para 1.171, mas não superou o Ridge (0% e 20% das sementes abaixo dele). **Indicação: Ridge para soja e para milho safrinha.**

### GPU

| Item | Medido |
|---|---|
| Dispositivo | NVIDIA GeForce RTX 4070 Ti, 12 GiB, capacidade 8.9, PyTorch 2.11.0 + CUDA 12.8 |
| Passo real de treino | forward, perda, gradientes, parâmetros e estado do otimizador em CUDA; pesos alterados |
| Execução sem CUDA | interrompida com diagnóstico, sem recair para CPU |
| Determinismo | `torch.use_deterministic_algorithms(True)` e `CUBLAS_WORKSPACE_CONFIG=:4096:8` |
| Piloto (soja, fold 2019) | batch 256 / 1.024 / 4.096: 0,48 / 0,13 / 0,042 s por época; VRAM de pico 84 MB; transferência 0,05 s |
| Precisão mista | mesmo erro e 30% mais lenta; não adotada |
| Tempo do lote | soja 106 s, milho 2ª 103 s (seleção com 16 redes × 3 conjuntos de fontes + 3 folds × 5 sementes) |
| Pesos portáteis | `state_dict` (`.pt`) + JSON com ordem das features, mediana de imputação, média e escala; carregados em processo novo, só CPU, com paridade (teste) |

## 4. Matriz de culturas e regiões

### Coorte v7, conferida no disco antes do treino

[`cohort_v7.py`](../../../data/ingest/cohort_v7.py) com registro em [`crops.py`](../../../data/ingest/crops.py). A coleta terminou normalmente: rótulos SIDRA, POWER de 1.949 municípios (689 reaproveitados da v6, nenhuma falha) e 1,82 GB brutos. A base final tem 323.694 linhas e 58.425 safras independentes. Nenhuma chave duplicada, nenhum corte posterior à janela da safra, uma única divisão por safra (os cortes da mesma colheita ficam juntos) e nenhuma linha de 2022–2024. Dos 336.703 rótulos lidos, 122.657 foram rejeitados. Quase todos são município sem a cultura no ano (`all_fields_absent`); só 133 têm divergência entre produção, área e rendimento, e 300 têm área colhida zero.

### Resultado por cultura (validação em janela móvel 2019–2021)

MAE em kg/ha nas mesmas safras. "Referência" é a melhor regra sem ajuste (média dos rendimentos publicados em Y−2 a Y−4; no café, também as regras de bienalidade). "Histórico" é o Ridge com tendência e rendimentos defasados.

| Cultura | Safras / municípios | Regiões | Validação (no treino / fora) | Média kg/ha | Referência | Histórico | Ridge | HGB | MLP CUDA | Escolhido na validação | MAE (% da média) | Viés | Fora do treino | Status de validação |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|
| Soja | 15.744 / 790 | 15 UFs | 1.893 / 477 | 2.817 | 399,2 | 435,4 | **386,3** | 429,8 | 394,5 | Ridge, todas as fontes | 386,3 (13,7%) | +219 | 378,0 | validated |
| Milho 2ª safra | 6.687 / 375 | 8 UFs | 859 / 258 | 4.169 | 1.223,6 | 1.203,0 | **1.146,7** | 1.244,4 | 1.170,9 | Ridge, todas as fontes | 1.146,7 (27,5%) | +91 | 1.151,9 | validated |
| Milho 1ª safra | 17.161 / 919 | 12 UFs | 2.220 / 498 | 5.378 | **1.185,1** | 1.393,5 | 1.384,1 | 1.305,9 | 1.327,0 | Referência (média defasada) | 1.185,1 (22,0%) | +155 | 1.152,3 | reference_only |
| Trigo | 9.224 / 468 | 8 UFs | 1.098 / 274 | 2.349 | 543,2 | 524,2 | 498,3 | **491,4** | 531,0 | HGB, todas as fontes | 491,4 (20,9%) | −79 | 469,1 | validated |
| Arroz | 13.406 / 699 | 11 UFs | 1.546 / 318 | 3.120 | 413,8 | 416,0 | 418,8 | **406,7** | 415,3 | HGB, todas as fontes | 406,7 (13,0%) | −62 | 425,3 | validated |
| Feijão 1ª safra | 5.505 / 298 | 9 UFs | 720 / 134 | 1.480 | **283,8** | 312,1 | 311,7 | 304,6 | 304,9 | Referência (média defasada) | 283,8 (19,2%) | −18 | 273,1 | reference_only |
| Feijão 2ª safra | 4.177 / 242 | 9 UFs | 524 / 113 | 1.426 | 304,2 | 328,5 | 336,5 | **304,0** | 329,7 | HGB, todas as fontes | 304,0 (21,3%) | +8 | 293,2 | validated |
| Café arábica | 2.476 / 311 | MG | 753 / 174 | 1.552 | 303,8 | 281,8 | 287,2 | **262,7** | 276,7 | HGB, todas as fontes | 262,7 (16,9%) | +12 | 270,0 | validated |
| Café conilon | 480 / 60 | ES | 156 / 24 | 1.840 | **615,6** | 708,2 | 847,7 | 696,7 | 746,1 | Referência (última safra publicada) | 615,6 (33,5%) | −432 | 850,2 | reference_only |
| Café total MG | 5.996 / 317 | MG | 768 / 180 | 1.372 | 307,1 | 301,7 | 310,0 | **292,3** | 307,9 | HGB, clima + balanço | 292,3 (21,3%) | +76 | 292,4 | validated |

**Operacional: nenhuma linha está liberada.** As datas de publicação dos insumos e dos rótulos não estão comprovadas e o teste 2022–2024 continua fechado.

Leitura:

- **Modelo indicado.** Ridge para soja e milho safrinha, como pedido e confirmado pela regra congelada. Nas novas culturas, a mesma regra escolheu HGB para trigo, arroz, feijão 2ª safra e café arábica. Em milho 1ª safra, feijão 1ª safra e conilon, nenhum modelo superou a referência simples; o app deve mostrar a referência com o erro dela.
- **Ganho sobre a referência simples, não só sobre o histórico.** O status compara com o histórico ajustado, conforme declarado. Contra a média defasada, porém, o ganho é pequeno em arroz (−7 kg/ha) e praticamente nulo em feijão 2ª safra (−0,2). Nessas culturas o modelo é tecnicamente "validated", mas a vantagem prática é marginal.
- **MLP em CUDA.** Não venceu em nenhuma cultura. A fração de sementes abaixo do melhor concorrente foi 0%, exceto feijão 1ª safra (60%, mas lá a referência simples venceu). O MLP ficou próximo do melhor em arroz (415 contra 407), milho 2ª (1.171 contra 1.147) e soja (395 contra 386).
- **Capacidade.** A busca interna escolheu redes de 64-32 até 256-128-64. A capacidade maior não se converteu em ganho na janela móvel; o limite está na variação entre anos, não no tamanho da rede.

### Regiões (UF, municípios no treino, modelo escolhido contra o histórico)

`data/processed/training_v7/crop_region_matrix.csv` traz MAE, viés, safras e municípios por cultura e UF. Pontos que mudam a leitura:

| Cultura | UF | Safras | Histórico | Escolhido | Melhor MLP |
|---|---|---:|---:|---:|---:|
| Soja | MG | 96 | 224,5 | 243,7 | **200,8** |
| Soja | MT | 177 | 194,9 | 244,0 | **135,8** |
| Soja | RS | 507 | 723,6 | **564,1** | 637,3 |
| Soja | PR | 531 | 404,0 | **349,7** | 372,7 |
| Milho 2ª | MT | 159 | 839,4 | 838,9 | **796,4** |
| Milho 2ª | MG | 18 | 2.538,1 | 2.249,2 | **2.090,2** |
| Arroz | RS (irrigado) | 267 | 540,2 | 584,2 | **523,3** |
| Trigo | PR | 494 | 454,6 | **445,1** | 453,3 |

**Na soja de MG e MT, recorte do MVP, o Ridge escolhido no agregado é pior que o histórico, e o MLP é o melhor.** O agregado nacional é dominado por PR e RS, inclusive pela quebra de 2020 no Sul. A regra congelada declarou que não haveria modelo separado de MG/MT nesta rodada, então a indicação não muda. Para a próxima rodada, recomendo pré-registrar uma regra de escolha por região (MG + MT) antes de abrir o teste 2022–2024; caso contrário, o recorte do MVP continua sendo atendido por um modelo pior que o histórico local.

### Café: espécie, fase e bienalidade

Marcos por espécie, com dados até cada marco e contados a partir de 1º de junho do ano anterior à colheita. Arábica: pré-florada em 31/08, pós-florada em 30/11 e granação em 28/02. Conilon: 31/07, 31/10 e 31/01. Na pré-florada, a PAM do ano Y−2 ainda não está publicada, então só entram defasagens de 3 anos ou mais. Balanço hídrico próprio do café: Kc 0,95, p 0,40 (FAO-56) e CAD 95 mm (hipótese).

MAE (kg/ha) do café arábica, municípios no treino (753 safras por marco):

| Recorte | Histórico | Mesma fase (Y−2) | Última publicada | Média bienal | HGB (escolhido) | MLP |
|---|---:|---:|---:|---:|---:|---:|
| Pré-florada | 265 | 366 | 417 | 341 | **257** | 286 |
| Pós-florada | 290 | 298 | 296 | 285 | **267** | 270 |
| Granação | 290 | 298 | 296 | 285 | **264** | 274 |
| Anos de baixa (472 safras) | 277 | 299 | 311 | 262 | **242** | 259 |
| Anos de alta (281 safras) | 290 | 358 | 379 | 373 | 298 | 307 |

- As regras de bienalidade funcionam em anos de baixa (média bienal 262) e falham em anos de alta (373). O HGB reduz o erro nos dois casos.
- Pós-florada e granação têm erros quase iguais: o clima entre os dois marcos acrescenta pouco à informação dos rendimentos defasados.
- Fora do treino (174 safras), o HGB mantém 255–298 kg/ha.
- **Conilon (ES)**: 60 municípios, 8 fora do treino e 24 safras de validação espacial. A última safra publicada é a melhor regra (616 kg/ha), mas o erro fora do treino sobe para 850, com viés de −432. A coorte é pequena e fica como `reference_only`, sem modelo.
- **Café total MG** (2003–2021, espécie não separada, coorte identificada): HGB com clima e balanço, 292 kg/ha. A série mais longa não melhorou o resultado em relação ao arábica.

Tempos de GPU por coorte: 26 s (conilon) a 124 s (arábica), seleção incluída. Pico de VRAM abaixo de 100 MB.

## 5. Fontes testadas uma por vez

- **Umidade do solo (Meteomatics).** Piora a soja (Ridge +7 kg/ha, IC +4,5 a +9,9). No milho 2ª safra, melhora −47 kg/ha nos municípios do treino (IC −64 a −31) e não se confirma fora dele (+4, IC −36 a +49). Mantido fora do modelo indicado. Detalhes no [guia 26, seção 4](gaiapus-26-v6-produtos-e-contratos.md).
- **Irrigação em Unaí e Paracatu** ([`irrigation_census.py`](../../../data/ingest/irrigation_census.py), Censo Agro 2017, SIDRA 6857). Área com pivô central de 75.912 ha em Unaí e 62.059 ha em Paracatu, 1,9 e 1,8 vez a área de milho 2ª colhida em 2017. Em Sorriso, Sinop, Lucas do Rio Verde e Campo Novo do Parecis, a proporção é de 0,01 a 0,03. Isso é compatível com a hipótese de que parte do milho do Noroeste mineiro é irrigada, o que explicaria o erro de 2.300 a 3.700 kg/ha. Pivô mostra a infraestrutura de 2016/17; não informa qual cultura foi irrigada em cada safra. Próximo passo: o levantamento de pivôs da ANA/Embrapa por ano, como atributo, comparado nas mesmas safras.
- **Calendário** ([`calendar_sensitivity.py`](../../../data/ingest/calendar_sensitivity.py)). Deslocar a semeadura em ±15 dias muda a estimativa do Ridge v6 em média 59–136 kg/ha (máximo 431) nos municípios do MVP. Na soja, isso é da ordem do próprio erro (161–165 kg/ha). As respostas passam a informar a origem da data, e uma data informada pelo produtor gera aviso, porque o modelo foi validado no calendário fixo.

## 6. Contratos e exemplos para o parceiro

| Resposta | Schema | Exemplo |
|---|---|---|
| Estimativa de rendimento | [`yield-estimate.schema.json`](../../../contracts/yield-estimate.schema.json) | `yield-soy-5107925-day75.json`, `yield-maize2-5107925-day75.json`, `yield-soy-3170206-day20.json` |
| Projeção de risco hídrico | [`water-projection.schema.json`](../../../contracts/water-projection.schema.json) | `water-soy-5107925-N10.json` |
| Cenário Field Shift | [`field-shift.schema.json`](../../../contracts/field-shift.schema.json) | `field-shift-sorriso.json` |

As três respostas trazem a data de semeadura e a origem (`hypothetical_fixed_calendar_per_state` ou `reported_by_user`). Os modelos portáteis v7 são carregados por [`data/serving/yield_model.py`](../../../data/serving/yield_model.py) em CPU (`YieldModel(path).predict(row)`). O carregador recusa corte não suportado e feature obrigatória ausente.

## 7. Reprodução

```powershell
$py = "$env:USERPROFILE\.venvs\gaiapus\Scripts\python.exe"   # venv uv com PyTorch CUDA
& $py -m unittest discover -s tests
& $py -m data.ingest.cohort_v7 --download      # rótulos SIDRA + POWER, reaproveita v6
& $py -m data.ingest.train_v7 --cohorts soy,maize2
& $py -m data.ingest.train_v7 --cohorts maize1,wheat,rice,bean1,bean2
& $py -m data.ingest.train_v7 --cohorts coffee_arabica,coffee_conilon,coffee_total_mg
& $py -m data.ingest.crop_matrix
& $py -m data.ingest.field_shift_case
& $py -m data.ingest.calendar_sensitivity
& $py -m data.ingest.irrigation_census
& $py -m data.serving.build_examples
```

`train_v7` encerra com diagnóstico se não houver CUDA. Brutos, Parquet e pesos ficam fora do Git. Credenciais como variáveis de ambiente do usuário.
