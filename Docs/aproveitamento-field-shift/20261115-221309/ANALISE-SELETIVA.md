# Field Shift — análise seletiva da branch `feat/field-shift-rotacoes`

Registro iniciado em 15/11/2026 22:13 (UTC−03:00). Roteiro: `docs/superpowers/plans/2026-11-15-aproveitamento-seletivo-field-shift-rotacoes.md` (repositório científico).

## Referências comparadas

| Papel | Referência | SHA | Situação |
|---|---|---|---|
| Base integrada | `origin/main` | `1144ef18afa0f7c98ab2c2fd93ed1dda3b91d937` | Contém os PRs #8 a #17. |
| Colaborador (LaraLLC) | `origin/feat/field-shift-rotacoes` | `937c3c5047eb279e493ddc58f4b4b13c11f799a9` | 6 commits próprios sobre `397d7b4`; sem PR. |
| Trabalho recente A | `feat/relatorios-tecnicos` | `9b22813a2922a7eeac8a00b55994e8a0cd5e3dd3` | PR #17, integrado em `1144ef1` (merge commit, mesma árvore). |
| Trabalho recente B | `feat/visual-refresh` | `8c17f667d5ffa8b425a112fd0fe6d5b06a4f284b` | PR #15, integrado em `12f23b6`; ancestral da `main`. |
| Compatibilidade | `feat/minha-area-estaca-3d` | `a880a989ec88a212a0ce70aa42011733dcb3bc5d` | PR #16, integrado em `66f4e05`; ancestral da `main`. |

As duas linhas recentes já estão na `main`. Por isso a base da entrega é a própria `main` em `1144ef1`, sem commits de PR pendente.

Ancestral comum colaborador/`main`: `397d7b47219beeed1c9e2c6493cff2626fecb507`. Dos 23 arquivos alterados pelo colaborador, 5 também mudaram na `main` (os cinco catálogos de idioma). Nenhum arquivo do Field Shift foi alterado pelos PRs #9 a #17.

Leituras feitas: diff do ancestral ao colaborador (intenção), conteúdo final do colaborador contra a `main` (estado) e recálculo dos números a partir dos dados versionados (comportamento). Nenhum worktree de outra sessão foi alterado.

## Conferência numérica

O arquivo `sorriso-field-shift-rotations.json` do colaborador foi comparado com o pacote `field-shift-v2-0d12285bf7a9` que já está na `main` (`apps/web/src/teammate/data/field-shift-v2/series.json`, colunas `date`, `agricultural_year`, `soil_covered` e `rain_mm`).

| Grandeza (média de 6 safras) | A | B | C | Arquivo do colaborador |
|---|---:|---:|---:|---|
| Dias sem cultura nem cobertura | 130,33 | 15,00 | 250,33 | idêntico, safra a safra |
| Desses dias, quantos caem de novembro a abril | 0,00 | 0,00 | 93,33 | idêntico, safra a safra |
| Chuva nesses dias, ano agrícola inteiro (mm) | 114,81 | 75,88 | 1.032,35 | 114,82 · 75,88 · 1.032,35 |
| Chuva nesses dias, só de novembro a abril (mm) | 0,00 | 0,00 | 874,94 | não publicado |

- Maior diferença por safra entre a soma da série e o valor do colaborador, ou entre a soma da chuva diária e `year_rain_mm` do resumo v2: 0,05 mm (o valor anual é publicado com uma casa).
- **Conclusão:** os dois indicadores novos são contagem e soma sobre colunas que o pacote v2 já publica. O segundo motor (`services/science-adapter/field_shift_rotations.py`) e o arquivo extra não são necessários para obtê-los.
- "Cerca de 9×": a razão das médias C/A é 8,99. A média das razões por safra é 22,2, porque em 2019/2020 A teve 9,4 mm (82×). A frase muda conforme a conta escolhida; a tela mostra valores e diferenças pareadas, sem razão.
- "Redução de um terço em B": 33,9% sobre as médias anuais (114,81 → 75,88 mm). Vale só para essa grandeza; não é redução de erosão.
- A janela novembro–abril pertence à contagem de dias; a chuva publicada pelo colaborador é a do ano agrícola inteiro. No cartão dele as duas ficam sob o mesmo título.
- Com chuva ±20% o calendário não muda (o pacote publica os mesmos `bare_days` nos três pontos). A chuva nesses dias muda na mesma proporção; não é resultado novo do modelo.

## Matriz

| Item | `main` atual | Relatórios (A) | Visual (B) | Colaborador | Ganho e evidência | Decisão | Trabalho necessário |
|---|---|---|---|---|---|---|---|
| Exposição de chuva em dias sem cobertura modelada | Só "dias sem cultura nem cobertura" (130 · 15 · 250). | Não trata; os relatórios são de simulações futuras. | Não trata. | Cartão próprio com dias nov–abr e chuva nesses dias, lido de arquivo extra gerado por um segundo motor; diferenças fixas contra A; portão que compara só contagens anuais. | **Real.** A contagem de dias (C ≈ 2× A) esconde que os dias de A caem na seca e os de C na estação chuvosa: 114,8 mm contra 1.032,4 mm por ano. Reproduzido da série fixada. | **Adaptar a ideia.** | Derivar da série do pacote v2; conferir contra o resumo do mesmo pacote; linhas na tabela existente (seguem referência, chuva e prioridade); rótulo "sem cultura nem cobertura", sem "solo nu" nem razão. |
| Integração da prioridade | Seletor, origem (escolha, plano ou padrão), ordem dos grupos e linhas dos cartões por prioridade. | — | — | Frase com os mesmos números dos cartões; destaque do cartão novo; nota de Planejar dizendo que a prioridade "ordena os indicadores do Field Shift". | Nenhum. A frase repete os cartões. A nota promete um efeito que só existe com `?plano=` no endereço, e Planejar não abre o Field Shift com esse parâmetro (`Plan.tsx:40` abre o simulador). | **Já atendido** (frase) · **Descartar** (nota). | — |
| Texto de referência/apoio à decisão | "A é a referência da demonstração. Só é a sua rotação atual se você disser que é." Cartões com lacunas e riscos para revisar no local. | — | — | `bare.intro` volta a chamar A de "rotação atual"; rodapé "Apoia, não substitui, a decisão do produtor e do agrônomo". | Regressão no rótulo de A. O rodapé não acrescenta informação ao que cada cartão já lista para revisar no local. | **Descartar** (rótulo) · **Já atendido** (rodapé). | — |
| Guia NDVI/solo/sensores | Guia com ET0, ETc, ETa, déficit, reserva e escala. Solo "hipótese fixa, não é perfil medido" no rodapé da tabela e nos cartões. NDVI explicado no glossário e na tela Município. | — | — | Três itens novos no guia: solo, NDVI/HLS e satélite × estação × sonda. | Solo: já dito na tela. NDVI: a tela não usa NDVI. Fontes: junta POWER e IMERG numa só resolução, diz que o HLS "vê o talhão" e cita uma "tela Sondas" que hoje é Minha área. As profundidades de 15 e 40 cm conferem com `firmware.md` e `hardware.md`, mas já estão no simulador e em Minha área. | **Já atendido** (solo) · **Descartar** (NDVI e fontes). | — |
| Idioma de fontes e exportações | O rodapé de fonte sai "Publicação …" e "contrato water_risk_projection" em qualquer idioma (`adapters/http.ts:22`, `index.ts:132`, `locations.ts:10`). | Os relatórios têm idioma próprio, separado dos fatos; não usam esse rodapé. | — | Passa o texto por `translate` na hora do carregamento. | **Real**, e em telas compartilhadas (Município, Planejar, Lugar, Field Shift v1). A correção do colaborador fixa o idioma no momento da leitura: trocar de idioma sem recarregar mantém o texto antigo. | **Adaptar a ideia.** | Guardar versão e contrato como dados no metadado e traduzir na apresentação (`Source`); teste de troca de idioma sem recarregar. |
| Método, pacote e testes | Pacote v2 com identidade (hash da meteorologia, do código e dos arquivos) e reprodução do v1. | — | — | Reimplementa o balde FAO-56 no adaptador, lê `sorriso-daily.json` (v1), reproduz A/B com erro de 0,0023 mm e recalcula C; 7 testes Python; déficit de implantação com 5 transições (1,88) ao lado de 1,57 (6 safras). | Nenhum para o que será mostrado: os indicadores saem da série v2. Um segundo motor é risco de divergência futura. | **Descartar** (script, JSON, portão por contagem). Testes de navegador em inglês e a 375 px: **já atendido** (`field-shift.spec.ts` da `main`). | Testes novos próprios, incluindo máscara diferente com a mesma contagem. |
| README/números da apresentação | README sem seção do desafio. Números e rastreabilidade em `docs/submission/` do repositório científico e em `Docs/sprint-final/MATRIZ.md`. | — | — | Seção "How Gaiapus answers Field Shift" com coluna "what the brief asks", A como "current rotation", "9×", "tela Probes" e declaração de uso de IA. | **Não verificável** na parte que cita o brief (a íntegra não está nos repositórios). O restante repete documentos existentes ou traz os rótulos descartados acima. | **Não incorporar.** | — |

Decisões e justificativas: [DECISOES.md](DECISOES.md).
