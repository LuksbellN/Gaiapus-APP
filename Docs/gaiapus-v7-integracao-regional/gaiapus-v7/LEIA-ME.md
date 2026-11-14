# Gaiapus v7 — entrega para frontend e backend

## Comece aqui

- **Frontend:** integre primeiro com os schemas em `contracts/` e os exemplos em `contracts/examples/`. Os JSONs de rendimento usam o **Ridge nacional v7**. As entradas reproduzíveis estão em `smoke/`.
- **Backend Node/TypeScript:** mantenha a API pública, validação, autenticação e cobertura. Chame um serviço Python interno para cálculos. O ZIP não contém um servidor HTTP pronto. No MVP, publique o caso histórico de Sorriso como fixture e, quando o adaptador estiver pronto, reproduza primeiro os exemplos locais.
- **Python:** `model-registry.json` informa o artefato e as features por corte. `predict.py` carrega os modelos em CPU e reproduz todas as amostras com `uv run --with-requirements requirements.txt python predict.py`. Envie os valores exatamente nas unidades do pipeline; `null` é ausência explícita tratada pelo pré-processamento, não zero. Sem o cálculo das features do mesmo corte e fonte, não emita rendimento. Aceite arquivos Joblib apenas deste pacote confiável.
- **Documentação:** guia 28 para arquitetura; guia 29 para validação e Field Shift; guia 26 para a origem dos fixtures v6. Eles foram copiados do projeto e seus links relativos remetem à estrutura do repositório. O inventário acima prevalece para este ZIP. Referência de código: https://github.com/LeandroJerse/Gaiapus_nasa/tree/ecae8c4

## Modelos e cobertura

Soja e milho 2ª safra usam Ridge. Trigo, arroz, feijão 2ª safra, café arábica MG e café total MG usam HistGradientBoosting. Os cinco boosting foram reconstruídos com o protocolo e as bases originais; a paridade numérica refere-se ao corte de validação da safra 2021. O registro informa as linhas comparadas e o erro máximo de reprodução. A métrica de seleção (e o erro para mostrar no app) está nas matrizes da validação 2019–2021. Em MG/MT especificamente, o Ridge de soja perdeu para a referência histórica ajustada; não atribua ao recorte a vantagem agregada nacional. Milho e feijão 1ª safra e conilon são apenas referência.

Todos os artefatos são **retrospectivos, não liberados para operação**. O teste 2022–2024 continua fechado; a estabilidade dos dados conforme a data de publicação ainda precisa de validação. O resultado estima rendimento municipal, em kg/ha. Não use como rendimento de talhão nem como recomendação automática de plantio. Use as matrizes para habilitar recortes demonstrados; fora de cobertura, exiba “dados insuficientes”.

## Sorriso, MT (IBGE 5107925)

Abra `contracts/examples/field-shift-sorriso.json` e trate como **simulação histórica**. Compare soja → milho safrinha → pousio com soja → milho safrinha + braquiária. Use `scenario/*_daily.csv` para séries diárias dos dois cenários e `scenario/sensitivity.csv` para as hipóteses de sensibilidade. Mostre chuva, reserva de água e déficit, com mm e período visíveis. O efeito da palhada depende de hipótese de simulação; sem ela, o benefício no déficit de implantação da soja foi zero. Não apresente rendimento ou resultado real de fazenda como consequência dessa comparação.

## Erros e decisão regional

Valide antes da inferência com `data/serving/yield_request.py`. Devolva HTTP 400 para `invalid_crop` ou `invalid_municipality_code` e HTTP 422 para `municipality_not_covered`. O corpo segue `contracts/yield-error.schema.json`; a elegibilidade vem do catálogo para a cultura, município e safra atendidos. `before_first_cutoff` continua uma resposta normal, sem estimativa. Para a soja MG/MT, veja o pré-registro no guia 30: o registro congelado em data/frozen/ seleciona o MLP com clima, balanço hídrico e localização para soja em MG/MT. O catálogo anterior está marcado como exploratório. O teste 2022–2024 continua fechado. O carregador e as fixtures deste ZIP seguem usando o Ridge nacional para soja e milho safrinha. O ZIP inclui a decisão regional, mas não os pesos do MLP.
