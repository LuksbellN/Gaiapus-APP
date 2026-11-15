# 06 — Exploração global

Regra de produto: **a geografia que se pode navegar e os dados agrícolas são camadas independentes.** Um país sem previsão, NDVI ou simulação continua selecionável no globo, na lista e na busca, em todos os idiomas. Marcas: [N] navegador, [C] código, [T] teste, [D] documentação, [H] hipótese.

## 1. Situação atual

| Aspecto | Hoje | Evidência |
|---|---|---|
| Países navegáveis | 232 (Natural Earth, recorte do tile 0/0/0 do MapLibre demotiles), por globo, lista e busca | [N] `data/geo/countries.json` |
| Nomes dos países | Só português, gerados por `Intl.DisplayNames` a partir do nome em inglês | [C] script de geração do protótipo (`gaiapus-web/scripts/build-countries.mjs`), não trazido para o monorepo |
| Estados | 27 UFs (IBGE) | [C] `data/geo/states.json` |
| Municípios com malha | MG (853) e MT (142) | [C] `adapters/index.ts:26-29` |
| Catálogo da API | 12 áreas: `BR`, 4 estados, 4 municípios, 3 recortes publicados; `country_id` só aceita `'BR'` | [N] `GET /v1/geography`; [C] `Geography` em `packages/contracts/src/generated/types.ts:708-722` |
| Cobertura por produto | `GET /v1/coverage?area_id=` devolve `history`, `yield_estimate`, `water_risk_projection`, `strategy_comparison` com `availability`, `reason_code`, `periods` | [N] |
| Destaque de cobertura | Lista local com dois municípios; marcadores fixos | [C] `adapters/index.ts:67-77`, `Explore.tsx:13` |
| Busca | Nomes em português + código; corta em 12; some se a API falhar | [N] D-01, D-11 |

Cobertura real que a API declara hoje [N]:

| Área | Produtos disponíveis | Período |
|---|---|---|
| `5107925` Sorriso, MT | rendimento, projeção hídrica, comparação Field Shift | 2020–2021; 5 out a 19 nov 2026; safras 2015/16–2020/21 |
| `3170206` Uberlândia, MG | rendimento (antes do 1º corte) | 5 nov 2020 |
| `published-field-uberlandia` | histórico (NDVI e chuva) | 1 abr a 31 jul 2024 |
| `published-field-rio-verde` | histórico | 1 jun a 31 jul 2024 |
| `published-field-barreiras` | histórico | conforme `periods` da API |
| `5218805` Rio Verde, `2903201` Barreiras, `BR`, estados | nenhum produto | — |
| Qualquer outro código | `404 not_found` | — |

Duas consequências: (1) Rio Verde e Barreiras têm **imagem**, mas só no recorte, não no município (D-08); (2) um `404` em `coverage` significa "a API não conhece esta área", não "sem dados no mundo".

## 2. Comportamento proposto

### 2.1 Primeira entrada e retorno

```text
Primeira visita                                Visitas seguintes (havia seleção salva)
┌──────────────────────────┐                   ┌──────────────────────────────────────┐
│ [Buscar país, região…]   │                   │ Continuar em Sorriso, MT  [Abrir]    │
│ Mundo                    │                   │ [Explorar o mundo]                   │
│ Onde está sua lavoura?   │                   │ [Buscar país, região…]               │
│ ★ Regiões com dados (5)  │ ← novo            │ …                                    │
│ Filtrar 232 países…      │                   └──────────────────────────────────────┘
│ Brasil · Com análise     │
│ Afeganistão …            │
└──────────────────────────┘
```

- A última seleção do explorador é guardada como preferência do aparelho (não da conta, para não vazar entre usuários: ela é só um lugar público). Se o link traz `pais/uf/mun`, o link vence.
- "Continuar em…" nunca seleciona sozinho; é uma ação. "Explorar o mundo" volta ao mundo sem apagar o que estava salvo.

### 2.2 Regiões com dados

Lista montada **do catálogo da API**, não do código:

```text
Regiões com dados
  Sorriso, MT            Água (previsão) · Field Shift (simulação histórica) · Rendimento (retrospectivo)
  Uberlândia, MG         Rendimento (retrospectivo) · Imagem orbital do recorte (abr–jul 2024)
  Rio Verde, GO          Imagem orbital do recorte (jun–jul 2024)
  Barreiras, BA          Imagem orbital do recorte
  ─
  Fonte: catálogo de cobertura da API · publicação {publication_version}
```

Montagem: `GET /v1/geography?limit=100` (12 áreas), depois `GET /v1/coverage?area_id=` para municípios e recortes, em paralelo, com cache por `publication_version`. Recorte publicado aparece sob o seu município (`parent_id`), com o escopo escrito ("recorte rural demonstrativo, não o município inteiro").

Marcadores do globo: um por município que tem produto próprio ou recorte com produto. Nunca pintar um estado ou um país inteiro por haver dado num município. O selo "Com análise" da lista de estados passa a significar "há pelo menos um município ou recorte com produto neste estado" e não "há malha carregada" (D-09).

Se o catálogo falhar: a lista mostra "Cobertura ainda não consultável" com Tentar de novo; países, estados e municípios do pacote continuam navegáveis; nada é marcado como "sem análise".

### 2.3 Todos os países acessíveis

- Globo: clique em qualquer país (já funciona, E-02).
- Lista: os 232 itens, filtro por nome no idioma escolhido, nome original, aliases e códigos (ISO alfa-2, alfa-3, ADM0_A3).
- Busca: mesmo índice da lista; resultados locais sempre; "Ver todos os N resultados" quando passar de 12.
- Nenhum filtro por "tem modelo". Ranking: correspondência exata primeiro, depois prefixo, depois contém; área com dados ganha desempate, nunca passa à frente de uma correspondência exata.

Equivalências que o índice precisa resolver (todas para o mesmo ID):

| ID interno | pt-BR | en | es | fr | de | Original e aliases |
|---|---|---|---|---|---|---|
| `ne:DEU` | Alemanha | Germany | Alemania | Allemagne | Deutschland | DE, DEU |
| `ne:USA` | Estados Unidos | United States | Estados Unidos | États-Unis | Vereinigte Staaten | USA, US, EUA |
| `ne:JPN` | Japão | Japan | Japón | Japon | Japan | 日本, JP, JPN |
| `ne:CIV` | Costa do Marfim | Côte d'Ivoire | Costa de Marfil | Côte d'Ivoire | Elfenbeinküste | CI |
| `br` | Brasil | Brazil | Brasil | Brésil | Brasilien | BR, BRA |

Nomes por idioma: gerados em build com `Intl.DisplayNames(locale, { type: 'region' })` a partir do alfa-2 (`Intl.DisplayNames` exige código suportado; o mapeamento ADM0_A3 → alfa-2 é a tabela `ALIAS` que já existia no script do protótipo, ampliada). Territórios sem alfa-2 (Somalilândia, Chipre do Norte, Kosovo) recebem nome manual nas cinco línguas. Nome original: campo `NAME_LONG`/`NAME` do Natural Earth (em inglês) mais endônimo quando conhecido; endônimos em escrita não latina são aceitos na busca, sem obrigação de exibir.

Tamanho estimado: 232 países × 5 idiomas + aliases ≈ 40–60 kB sem compressão, carregado sob demanda com o explorador [H].

### 2.4 Seleção de qualquer país

Ao selecionar: destaque, câmera, título, trilha, painel e URL atualizam (já ocorre). Nunca redirecionar para o Brasil. Voltar e avançar percorrem as escolhas.

### 2.5 Níveis administrativos

| Fonte disponível | Níveis navegáveis | Termos exibidos |
|---|---|---|
| Brasil (IBGE no pacote) | País › Estado › Município | "Estado", "Município" |
| Brasil fora de MG/MT | País › Estado | "Municípios deste estado ainda não carregados" |
| Área do catálogo da API sem malha local (Rio Verde, Barreiras) | País › Estado › Município, nome vindo do catálogo, sem contorno | "Contorno ainda não carregado" (não "não encontrado") |
| Outros países | País | "Regiões deste país ainda não carregadas nesta versão" |

Termo genérico para níveis fora do Brasil: "região" e "localidade", traduzidos; nunca "estado"/"município" por padrão.

### 2.6 Estado sem dados útil

Mantém o lugar selecionado, diz a causa e oferece duas saídas. Abrir uma demonstração de outro lugar é sempre ação explícita.

## 3. Matriz de estados de cobertura

Seis estados, cada um com texto, ação e causa técnica distinta. Textos em pt-BR aqui; as cinco línguas ficam no catálogo de mensagens (`07`).

| Estado | Quando (regra técnica) | Texto-base | Ações |
|---|---|---|---|
| **Dados disponíveis** | `coverage` com ≥ 1 produto `available` | "Há dados de {produtos} para {lugar}, {período}." Cada produto com tipo (previsão, histórico, simulação, observação) e origem | Abrir cada produto |
| **Dados parciais** | Produtos com `available` e outros com `no_data`, ou `availability: partial` | "Para {lugar} há {presentes}. Ainda não há {ausentes}." | Usar o disponível; "O que falta e por quê" |
| **Sem análise para a seleção** | `coverage` respondeu e todos os produtos são `no_data`; ou país fora do catálogo | "Você selecionou {lugar}. Ainda não há análise disponível nesta versão para essa seleção." | "Continuar explorando" · "Ver regiões com dados" |
| **Cobertura não consultável** | `coverage` respondeu `404` para área que existe no pacote, ou o catálogo inteiro falhou com erro não temporário | "Não foi possível saber, pelo serviço atual, se há dados para {lugar}. Isso não quer dizer que não existam." | "Ver regiões com dados"; exemplo separado só se pedido |
| **Geografia detalhada não carregada** | País sem subdivisões no pacote; estado sem malha municipal; município do catálogo sem contorno | "{lugar} está selecionado. As {regiões/municípios} ainda não estão carregadas nesta versão." | Continuar no nível atual; buscar pelo nome |
| **Falha temporária** | Rede, `5xx`, tempo esgotado | "A consulta falhou. Isso não significa que não haja dados." + data do último resultado, se houver | Tentar de novo |

Regras que valem para os seis:

- Nenhum vira zero, curva, número agregado por país ou desaparecimento do lugar.
- Dado parcial é mostrado; a ausência ao lado é explicada.
- O texto nunca diz que "não há imagem de satélite" no mundo; diz que **esta integração** não tem para a seleção.
- `reason_code` da API vira frase: `no_published_coverage` → "sem publicação para esta área"; `strategy_not_provided` → "comparação de manejo não fornecida para esta área"; `unsupported_crop` → "cultura não aceita por este produto"; `current_season_unavailable` → "safra atual ainda não disponível"; `incomplete_forcing` → "dados de clima incompletos para o período"; `missing_artifacts`, `fixture_not_available` → "cálculo indisponível neste ambiente".

## 4. Identidade técnica

Hoje: país é `BR` ou ADM0_A3; UF é o código IBGE de 2 dígitos; município é IBGE de 7; recorte é `published-field-*`. A UF é deduzida do prefixo (D-10).

Proposta: identificador interno com sistema de origem, sem tradução e sem derivar do nome.

| Tipo | Formato interno | Exemplo | Para a API | Para a URL de hoje |
|---|---|---|---|---|
| País (Natural Earth) | `ne:{ADM0_A3}` | `ne:ARG` | não enviado | `pais=ARG` |
| Brasil | `br` | `br` | `BR` | `pais=BR` (e `BRA` aceito) |
| Estado do Brasil | `ibge:uf:{2}` | `ibge:uf:51` | `BR-MT` | `uf=51` |
| Município do Brasil | `ibge:mun:{7}` | `ibge:mun:5107925` | `5107925` | `mun=5107925` |
| Recorte publicado | `pub:{area_id}` | `pub:published-field-rio-verde` | igual ao `area_id` | `recorte=published-field-rio-verde` (novo, opcional) |
| Região fora do Brasil (futuro) | `{fonte}:{id}` | `gb:ARG-ADM1-…` | não enviado | `regiao=…` (futuro) |

- URLs atuais continuam aceitas; os parâmetros antigos são convertidos na entrada. Nada é reescrito sem necessidade.
- Dedução por prefixo só vale para `ibge:mun:` → `ibge:uf:`.
- Endpoints que exigem município IBGE (`/v1/coverage` para municípios, `POST /v1/yield-estimates`, `POST /v1/water-balance/scenarios`) recebem só `ibge:mun:`. Uma função `toApiAreaId(id)` devolve `null` para qualquer outra origem, e a interface trata `null` como "sem análise para a seleção" sem fazer a chamada.
- Cadastro de propriedade: continua exigindo `ibge:mun:` (contrato `Property.municipalityCode` de 7 dígitos, `store.ts:4`). Selecionar um lugar fora do Brasil **não** oferece "Cadastrar propriedade aqui"; em vez disso: "O cadastro de propriedades aceita municípios do Brasil nesta versão."

## 5. Fontes para ampliar regiões e cidades

Não é para esta etapa. Fica documentado para decisão. Licenças conferidas nas páginas oficiais em 14/11/2026.

| Fonte | O que dá | Licença | Uso proposto | Limites |
|---|---|---|---|---|
| Natural Earth (atual) | Países, nível 0; nível 1 simplificado | Domínio público; crédito dispensado | Manter para o globo e a lista | Nível 1 grosseiro para navegação fina |
| geoBoundaries | Limites administrativos de todos os países, vários níveis | CC BY 4.0; crédito obrigatório ("geoBoundaries" com link) | Candidato para "Regiões deste país" (ADM1), em arquivos estáticos por país, sob demanda | Tamanho: precisa simplificar e servir por país; atribuição na legenda do mapa |
| GeoNames | Localidades com nomes alternativos em vários idiomas | CC BY; crédito obrigatório | Candidato para busca de cidades, como índice estático filtrado por população | Volume: índice por país sob demanda; atualização periódica no build |
| Nominatim (OSM, serviço público) | Geocodificação | ODbL; política proíbe autocompletar e limita a 1 req/s | **Não usar** para a busca digitada | Exigiria servidor próprio e cache |
| IBGE (atual) | Malhas do Brasil | Dado público | Ampliar malha municipal para as outras UFs sob demanda (mesmo formato de `mun-31.json`) | 535 kB para MG: carregar por UF, nunca tudo |

Recomendação: **primeira versão só com países** (já pronta) + malha municipal do IBGE para as UFs que entrarem no catálogo da API. geoBoundaries e GeoNames só depois de decidir hospedagem e atribuição. Não prometer busca de cidades do mundo enquanto o índice cobrir apenas países e municípios de MG e MT.

Offline: países e nomes ficam no pacote (funcionam sem rede, exceto o mapa-base). Fontes futuras: cache por país após o primeiro uso.

## 6. Dependências do backend

| Necessidade | Hoje | Pedido ao responsável pela API |
|---|---|---|
| Lista de áreas com produto | Deduzida de 12 chamadas | Opcional: `GET /v1/coverage` em lote, ou campo de resumo em `/v1/geography` |
| Geometria do recorte | Local só para Uberlândia | Já existe `geometry_ref`; confirmar que é servido por `/publications/...` |
| `country_id` | Só `'BR'` no contrato | Nada agora; mudar só quando houver área fora do Brasil |
| Preferência de idioma | `Preferences.locale: 'pt-BR' \| 'en'` em `/v1/me` | Ampliar para `es`, `fr`, `de` antes de sincronizar idioma com a conta |

## 7. Testes

Definidos em `05-implementacao-e-aceite.md`, seção 5: RT-01 (navegação e câmera), RT-02 (estados de cobertura), RT-03 (sem WebGL, mapa-base offline), RT-04 (busca com API fora), RT-05 (aliases e "ver todos").
