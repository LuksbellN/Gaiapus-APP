# Gaiapus — coorte v6, dois produtos e contratos do backend

Execução de 14/11/2026, continuação do [guia 24](gaiapus-24-coleta-subset-e-mlp.md). Todos os números foram medidos nesta execução e podem ser reproduzidos com os comandos da seção 7. **O teste de rendimento 2022–2024 não foi aberto.** Nenhum resultado é operacional: as datas históricas de publicação dos insumos e dos rótulos não estão comprovadas.

## 1. O que o app pode mostrar com a evidência atual

| Produto | O que mostrar | Evidência | O que não mostrar |
|---|---|---|---|
| Estimativa de rendimento na colheita | kg/ha por município, cultura e corte de 30, 45, 60, 75, 90 ou 105 dias após a semeadura. Em dias intermediários, usar o maior corte validado anterior ao dia. Exibir o MAE e o viés desse corte, a cobertura e o rótulo "retrospectivo" | Validação em janela móvel 2019–2021 em 631 municípios de soja e 287 de milho no treino, além de 159 e 86 municípios fora do treino | Intervalo de previsão, rendimento de talhão, data real de semeadura |
| Projeção de risco hídrico | Reserva de água, déficit e estresse por dia para N dias, com emissão da previsão. N até 7 dias marcado como avaliado; dias 8 a 15 marcados como experimentais | Backtest com previsões ECMWF IFS arquivadas, 32 safras-município, 3.536 origens por antecedência | Efeito no rendimento, que não foi avaliado; perfil de solo medido |
| Cenário de seca por fase | Simulação com redução de chuva em uma fase (já existente no [guia 19](gaiapus-19-balanco-hidrico-et0.md)) | Invariantes físicos testados | Probabilidade do cenário |

As duas respostas são produtos distintos e não se misturam: a projeção hídrica traz `yield_effect: null`.

## 2. Coorte v6

[`cohort_v6.py`](../../../data/ingest/cohort_v6.py) amplia a coorte para os 15 estados produtores de soja. Os rótulos vêm do IBGE PAM (tabelas 5457 e 839), com safras até 2021. O forçamento é NASA POWER diário por ponto representativo do município.

| Item | Medido |
|---|---|
| Municípios | 859 (790 com soja, 375 com milho 2ª safra) |
| Safras independentes | 15.744 de soja, 6.687 de milho |
| Linhas (safra × corte) | 134.586, com 6 cortes por safra e nenhuma exclusão por lacuna |
| Volume bruto | 1,18 GB (POWER e SIDRA) |
| Seleção | ≥10 anos (soja) ou ≥8 (milho) com rótulo válido em 2002–2016 e área média mínima, calculadas só nesses anos |
| Rótulos rejeitados | Produção / área divergente do rendimento publicado em mais de 0,5% |
| Semeadura | Calendário fixo por estado, hipotético (MT 05/10, MG 05/11, RS 10/11 etc.) |

### Divisões, conferidas no disco

- **Janela móvel.** O ano-alvo Y é estimado com modelos ajustados apenas em safras até Y−2, o atraso assumido de publicação da PAM: Y=2019 usa 2002–2017, Y=2020 usa até 2018, Y=2021 usa até 2019.
- **Municípios fora do treino.** 20% dos municípios, sorteados por hash estável, não entram em nenhum ajuste: 159 na soja e 86 no milho. Entre os do MVP, Uberaba (3170107) e Sinop (5107909) estão fora do treino.
- **Família do rótulo.** Os seis cortes da mesma colheita compartilham ano e município e caem sempre no mesmo grupo (verificado para 100% das safras).
- **Seleção de hiperparâmetros.** Feita uma única vez, nos anos de treino do primeiro alvo (até 2017), com divisão temporal interna nos três últimos anos.
- **Teste.** As safras 2022–2024 não foram baixadas para a tabela de treino. O caminho para abri-las é separado (`cohort_v6 --test` e `train_v6 --test`), grava um marcador e recusa uma segunda avaliação.

## 3. Rendimento: MLP, Ridge, gradient boosting e baseline nas mesmas safras

[`train_v6.py`](../../../data/ingest/train_v6.py). O baseline usa tendência e rendimento defasado (Y−2 a Y−4) e é igual em todos os cortes. Ridge e HGB, um por corte, e um MLP por cultura, que recebe o corte como entrada, aprendem o desvio em relação a esse baseline. As fontes entram de forma cumulativa: clima (POWER/IMERG), balanço hídrico por fase e local (latitude, longitude, altitude). Regra do campeão, congelada antes da validação: menor MAE temporal agregado; um MLP só vence se também superar no escopo espacial e se ≥80% das sementes ficarem abaixo do melhor concorrente.

### MAE em kg/ha (validação 2019–2021)

| Cultura | Modelo | Municípios no treino | Fora do treino | MG + MT | MVP no treino | MVP fora do treino |
|---|---|---:|---:|---:|---:|---:|
| Soja | Baseline (tendência + histórico) | 435 | 424 | 205 | 178 | 212 |
| Soja | **Ridge, todas as fontes (campeão)** | **386** | **378** | 244 | 177 | 169 |
| Soja | HGB, todas as fontes | 432 | 418 | 199 | 147 | 227 |
| Soja | MLP, todas as fontes | 393 | 381 | 166 | 134 | 237 |
| Milho 2ª | Baseline | 1.203 | 1.250 | 1.012 | 1.670 | 1.561 |
| Milho 2ª | **Ridge, todas as fontes (campeão)** | **1.147** | **1.152** | 982 | 1.515 | 1.439 |
| Milho 2ª | HGB, todas as fontes | 1.244 | 1.266 | 1.065 | 1.593 | 1.544 |
| Milho 2ª | MLP, todas as fontes | 1.551 | 1.592 | 1.582 | 2.276 | 2.478 |

Safras independentes por escopo: soja 1.893 / 477 / 273 / 18 / 6; milho 859 / 258 / 177 / 18 / 6. O MVP tem só 18 e 6 safras: diferenças ali não permitem escolher modelo.

Viés médio (previsto − observado), municípios no treino: soja +344 no baseline, +219 no Ridge e +231 no MLP; milho +260 no baseline, +91 no Ridge e −402 no MLP. A soja é superestimada em 2019–2021, puxada pela quebra de 2020 no Sul. Nos municípios de MG/MT do MVP, o milho é subestimado em todos os modelos (−556 a −975 kg/ha).

### Os oito municípios do MVP

Erro absoluto médio em 2019–2021 (3 safras por município), nos cortes de 60 e 90 dias. O asterisco marca os municípios fora do treino.

| Município | Soja: baseline | Soja: Ridge 60 / 90 | Soja: MLP 60 / 90 | Milho: baseline | Milho: Ridge 60 / 90 | Milho: MLP 60 / 90 |
|---|---:|---:|---:|---:|---:|---:|
| Uberlândia | 104 | 74 / 119 | 126 / 147 | 1.555 | 1.280 / 1.144 | 2.940 / 2.868 |
| Uberaba* | 298 | 258 / 166 | 326 / 319 | 2.401 | 2.168 / 2.065 | 4.222 / 4.076 |
| Unaí | 176 | 154 / 246 | 107 / 207 | 3.672 | 3.364 / 3.163 | 3.817 / 3.599 |
| Paracatu | 285 | 324 / 189 | 219 / 105 | 2.690 | 2.450 / 2.277 | 3.651 / 3.527 |
| Sorriso | 202 | 89 / 142 | 175 / 175 | 866 | 911 / 879 | 1.049 / 1.202 |
| Sinop* | 126 | 94 / 85 | 169 / 131 | 720 | 776 / 722 | 1.115 / 981 |
| Lucas do Rio Verde | 190 | 69 / 161 | 75 / 84 | 803 | 834 / 844 | 1.399 / 1.290 |
| Campo Novo do Parecis | 112 | 166 / 240 | 64 / 84 | 437 | 390 / 374 | 1.050 / 1.104 |

O milho de MG concentra o erro do MVP. Unaí e Paracatu tiveram rendimento médio de 7.300 a 7.500 kg/ha em 2019–2021, acima do MT (6.100 a 6.400). Uma hipótese, **ainda não verificada**, é a parcela irrigada por pivô no Noroeste mineiro, que um modelo guiado por chuva não representa. Até verificar com área irrigada (ANA/Embrapa) ou máscara agrícola, a estimativa de milho em MG deve aparecer com o erro do município e uma nota de baixa confiança.

Ganho do campeão sobre o baseline, com intervalo de 95% por reamostragem de municípios: soja −49 kg/ha (−58 a −39); milho −56 kg/ha (−85 a −28).

### Quanto cada fonte acrescentou (Ridge, municípios no treino)

| Fontes | Soja | Milho 2ª |
|---|---:|---:|
| Tendência + histórico | 435 | 1.203 |
| + clima | 403 | 1.188 |
| + balanço hídrico por fase | 391 | 1.152 |
| + local | 386 | 1.147 |

Na soja, o clima traz o maior ganho e o balanço hídrico acrescenta 12 kg/ha. No milho, o balanço hídrico é a maior contribuição (−36). O local acrescenta pouco nas duas culturas.

### Erro por corte (Ridge campeão, municípios no treino)

| Corte (dias) | 30 | 45 | 60 | 75 | 90 | 105 |
|---|---:|---:|---:|---:|---:|---:|
| Soja | 414 | 411 | 346 | 391 | 382 | 374 |
| Soja, fora do treino | 405 | 408 | 344 | 378 | 370 | 363 |
| Milho 2ª | 1.200 | 1.193 | 1.124 | 1.149 | 1.128 | 1.086 |
| Milho 2ª, fora do treino | 1.190 | 1.204 | 1.156 | 1.147 | 1.124 | 1.090 |
| Baseline (todas) | soja 435, milho 1.203 | | | | | |

O campeão supera o baseline nos seis cortes, que por isso são todos publicados. No milho, a vantagem em 30 dias é de 3 kg/ha, desprezível. O erro não cai de forma monótona: o corte de 60 dias da soja é melhor que o de 75–90.

### Por que o MLP não foi promovido

- Na seleção interna (2015–2017) o MLP teve o menor erro nas duas culturas. Na janela móvel 2019–2021 ele perdeu para o Ridge: soja 393 contra 386, milho 1.551 contra 1.147.
- Na soja, a parada antecipada escolheu 1 a 2 épocas: o resíduo do baseline praticamente não generalizou entre anos. No milho, a rede (até 256-128-64) treinou 13 a 27 épocas e terminou com viés de −400 a −636 kg/ha.
- No máximo 1 de 5 sementes (20%, soja com todas as fontes) ficou abaixo do melhor concorrente; no milho, nenhuma. O desvio entre sementes foi de 6–7 kg/ha na soja e de 82–122 kg/ha no milho.
- Subconjuntos favorecem o MLP na soja (MG + MT: 166 contra 244 do Ridge; MVP no treino: 134 contra 177). Isso foi observado depois da regra congelada e não muda o campeão. Um modelo regional precisa de regra declarada antes e de avaliação no teste reservado.

Referências provisórias da v5, preservadas e ainda válidas no recorte MG/MT de 123 municípios: Ridge com histórico para soja (MAE 262) e MLP residual com clima para milho (MAE 756). Os números da v5 e da v6 não são comparáveis diretamente: os protocolos de treino e os conjuntos de municípios diferem.

### Artefatos

- `data/processed/training_v6/`: `samples.parquet`, `validation_metrics.csv`, `validation_metrics_by_horizon.csv`, `mvp_validation_predictions.csv`, `hyperparameter_search.csv`, `validation_champions.json`, `cohort_by_state.csv`, `quality_report.json`.
- `data/models/research_v6/`: pacotes joblib por cultura, fonte e modelo do último alvo (2021, treinado até 2019), `hyperparameters.json` e `manifest.json` com hash da entrada e `test_evaluated: false`.
- Os pacotes carregam em outro processo. Um defeito anterior gravava as classes como `__main__` e foi corrigido; um teste carrega o artefato em processo novo.

## 4. Piloto Meteomatics: umidade do solo

[`meteomatics_soil.py`](../../../data/ingest/meteomatics_soil.py) coletou, para os 123 municípios de MG/MT da v6, índice de umidade do solo em três camadas, chuva e evapotranspiração diárias de 2001 a 2024.

| Item | Medido |
|---|---|
| Pedidos | 168 de 168 (lotes de 20 pontos × 24 anos), sem falha. Lotes de 60 pontos excediam o tempo do servidor (HTTP 408) e foram abandonados |
| Volume | 392 MB, cada resposta com recibo e SHA-256 |
| Parâmetros | `soil_moisture_index_-15cm`, `-50cm` e `-150cm` (camadas 7–28, 28–100 e 100–289 cm), `precip_24h:mm` e `evapotranspiration_24h:mm` |
| Unidade e significado | Índice adimensional: 0 no ponto de murcha, 1 na capacidade de campo, pode passar de 1 após chuva |
| Exemplos com janela completa | 23.106 (MG/MT); fora de MG/MT não foi coletado |
| Fonte histórica | A documentação não informa qual produto alimenta o "mix" em datas passadas. Série reconstruída em 2026; não há versão nem horário de emissão |

Comparação nas mesmas safras, cortes e municípios (MG/MT, janela móvel 2019–2021), com e sem as 12 features de umidade:

| Cultura | Modelo | Escopo | Sem umidade | Com umidade | Δ MAE (IC 95%) |
|---|---|---|---:|---:|---:|
| Soja | Ridge | No treino (273 safras) | 177,0 | 184,2 | +7,2 (+4,5 a +9,9) |
| Soja | Ridge | Fora do treino (93) | 199,3 | 209,2 | +9,8 (+5,7 a +13,9) |
| Soja | HGB | No treino | 169,0 | 166,9 | −2,1 (−7,0 a +2,1) |
| Milho 2ª | Ridge | No treino (177) | 962,7 | 915,7 | **−47,0 (−63,5 a −30,8)** |
| Milho 2ª | Ridge | Fora do treino (66) | 915,9 | 920,0 | +4,1 (−35,7 a +48,8) |
| Milho 2ª | HGB | No treino | 957,3 | 925,1 | −32,2 (−59,2 a −4,7) |

Decisão: a umidade do solo **piora a soja** e fica fora. No milho, há ganho nos municípios do treino, mas ele não se confirma fora do treino. Fica registrado como ganho experimental e não entra no campeão até uma nova avaliação geográfica.

## 5. Projeção de risco hídrico para N dias

[`water_projection.py`](../../../data/ingest/water_projection.py) avança o mesmo balanço hídrico do app (CAD AD4, 70% de água na semeadura) com a chuva e a ET0 previstas.

**Backtest.** A API Previous Runs do Open-Meteo guarda, para cada dia, o valor previsto 1 a 7 dias antes pelo ECMWF IFS 0,25°. Para uma origem t e antecedência k, o forçamento do dia t+k é a previsão emitida k dias antes. A referência simples é a climatologia diária 2001–2021 de cada município. A regra foi fixada antes de calcular: o maior N em que todas as antecedências até N têm MAE da reserva ≤15% da CAD, superam a climatologia e têm ≥90% de cobertura.

| Antecedência (dias) | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---:|---:|---:|---:|---:|---:|---:|
| MAE da reserva (mm) | 2,0 | 2,9 | 3,6 | 3,9 | 4,3 | 4,7 | 5,0 |
| Climatologia (mm) | 3,6 | 5,4 | 6,5 | 7,3 | 7,9 | 8,4 | 8,7 |
| Erro do déficit acumulado (mm) | 0,06 | 0,14 | 0,22 | 0,30 | 0,38 | 0,50 | 0,67 |
| Acerto de estresse no dia | 97,5% | 96,5% | 95,5% | 95,5% | 94,9% | 94,1% | 93,5% |
| Cobertura | 98,6% | 98,6% | 98,6% | 98,6% | 97,7% | 97,7% | 97,3% |

Limite da regra: 8,2 mm (15% de 55 mm). 32 safras-município: 8 municípios do MVP × soja e milho × safras 2025 e 2026, 3.536 origens. Soja e milho passam isoladamente até 7 dias.

**Maior N avaliado: 7 dias.** O limite vem do arquivo, que não guarda antecedência maior; o erro em 7 dias ainda está abaixo do limite, então o limite verdadeiro pode ser maior e fica em aberto. Dias 8 a 15 da previsão atual saem marcados como `validated_lead: false`.

Limitações:

- A verificação é a série de menor antecedência do mesmo provedor, não pluviômetro. O erro contra observação de campo será maior.
- A climatologia de referência vem do POWER (2001–2021), e a verificação vem do ECMWF. Uma diferença sistemática entre as duas fontes pode aumentar o erro da referência e, com isso, a vantagem aparente da previsão. O critério absoluto (≤15% da CAD) não depende dessa referência.
- O arquivo informa a emissão com resolução de dia. Na projeção ao vivo, o horário de inicialização e o de disponibilidade do run vêm dos metadados do modelo e são gravados na resposta. O dia da decisão é tratado como antecedência 1, o que é conservador.
- Acerto de estresse precisa ser lido contra a prevalência: com estresse em 8% (soja) e 18% (milho) dos dias, prever "sem estresse" já acerta 82–92%. A climatologia acerta 84–96%.
- O solo é uma hipótese fixa, e a reserva inicial é simulada desde a semeadura, não medida.
- Efeito no rendimento não foi avaliado e não é mostrado.

## 6. Contratos do backend

Esquemas JSON Schema 2020-12 em [`contracts/`](../../../contracts/), código em [`data/serving/products.py`](../../../data/serving/products.py) e exemplos gerados a partir dos artefatos reais em `contracts/examples/`.

### `yield-estimate.schema.json`

| Campo | Significado |
|---|---|
| `status` | `ready`, `before_first_cutoff` (antes de 30 dias) ou `not_supported` |
| `days_after_sowing_requested`, `cutoff_days_used`, `supported_cutoffs_days` | Dia pedido e o maior corte validado não posterior a ele |
| `estimate_kg_ha` | Número só quando `status = ready`; o schema recusa número sem validação |
| `validation` | Anos, corte, MAE, viés, safras e municípios, e o erro fora do treino |
| `observed_through`, `coverage` | Último dia usado e dias de forçamento presentes |
| `model` | Versão, tipo, fontes, hash do artefato e última safra de treino |
| `sowing_basis`, `availability` | Calendário hipotético e insumos retrospectivos |

### `water-projection.schema.json`

| Campo | Significado |
|---|---|
| `decision_at`, `forecast.issued_at`, `forecast.available_at` | Momento do pedido e emissão do run usado |
| `horizon_days_requested`, `horizon_days_served`, `max_validated_lead_days` | N pedido, N servido (limitado pela previsão e pelo ciclo) e N avaliado |
| `initial_state` | Reserva no fim do dia anterior à decisão |
| `days[]` | Por dia: chuva, ET0, reserva, fração disponível, déficit, Ks, estresse e `validated_lead` |
| `reference_days[]` | O mesmo balanço com a climatologia, para comparação |
| `evaluation.by_lead` | Resultado do backtest por antecedência |
| `status` | `ready` (tudo avaliado), `partially_validated` (há dias além do avaliado) ou `not_supported` |
| `yield_effect` | Sempre `null` |

## 7. Reprodução

```powershell
# Ambiente: venv uv fora do OneDrive com os pacotes do sistema
$py = "$env:USERPROFILE\.venvs\gaiapus\Scripts\python.exe"
& $py -m unittest discover -s tests
& $py -m data.ingest.imerg_subset --build-only
& $py -m data.ingest.imerg_equivalence
& $py -m data.ingest.train_imerg_products
& $py -m data.ingest.cohort_v6            # --download para baixar
& $py -m data.ingest.train_v6
& $py -m data.ingest.meteomatics_soil --states 31,51   # --download com credenciais
& $py -m data.ingest.meteomatics_ablation
& $py -m data.ingest.water_projection
& $py -m data.serving.build_examples
& $py -m data.fake.telemetry
```

Credenciais: `EARTHDATA_TOKEN`, `METEOMATICS_USER` e `METEOMATICS_PASSWORD` como variáveis de ambiente do usuário. Nunca são gravadas em arquivo nem impressas. A conta Meteomatics é do hackathon e expira em 22/11/2026.

## 8. Plano 2: modelo com ou sem sensor de campo

O [protocolo de dados](../../../protocolo-dados.md) define o quadro LoRa de 25 bytes, o JSON do gateway e os eventos do app. Para preparar o modelo que poderá usar ou não o hardware:

- [`data/fake/telemetry.py`](../../../data/fake/telemetry.py) gera uma base **sintética**: quadros de 25 bytes, mensagens do gateway e eventos por profundidade. A umidade segue o balanço hídrico com o clima real do município. A calibração é inventada. O gerador injeta reenvios do buffer (`idade_min > 0`), duplicatas, perdas, queda de bateria e erro de sensor em taxas conhecidas, e grava a verdade-terreno para testar ingestão e deduplicação. Exemplo: Sorriso, soja 2023/24, 3 sondas, com 17.246 quadros, 34.492 eventos e 1.372 duplicatas.
- A seleção do modelo deve vir do catálogo: sem sonda vinculada, o modelo atual; com sonda calibrada e cobertura mínima no período, um modelo treinado com as features do sensor. Esse modelo só pode ser treinado com leituras reais pareadas a rendimento de talhão. A base sintética serve para testar o encanamento e as regras de qualidade, nunca para treinar ou validar previsão.
- Saída gerada em `data/fake/telemetry_v1/`, fora do Git; só o gerador é versionado.
