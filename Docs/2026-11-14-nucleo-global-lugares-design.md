---
title: Núcleo global de dados por lugar (Brasil + EUA)
date: 2026-11-14
status: desenho para aprovação
decisões: Leandro, 14/11/2026 — opção A (núcleo global, sem rendimento nos EUA) e caminho 3 (endpoint novo, aditivo)
repositórios: LeandroJerse/Gaiapus_nasa (ciência), LuksbellN/Gaiapus-APP (contratos, API, frontend)
---

# Núcleo global de dados por lugar

## 1. Por que

Hoje cada lugar com dado tem um formato diferente:

- **Uberlândia, Rio Verde e Barreiras** vêm da publicação do MVP: um recorte de lavoura com NDVI (HLS) e chuva observada (POWER/IMERG), só em 2024.
- **Sorriso** vem do pacote científico v6/v7: balanço hídrico diário simulado (FAO-56, 6 safras, 2 cenários), previsão de 10 dias, Field Shift e rendimento. Não tem recorte.

O contrato da API só aceita Brasil: `country_id` é fixo em `"BR"` e todo pedido científico exige um código IBGE de 7 dígitos. Os textos da interface também presumem o IBGE.

O Gaiapus deve funcionar no mundo. Para a NASA Space Apps, mostrar a mesma análise em soja e milho nos dois hemisférios — Sorriso e o Corn Belt — com as mesmas fontes da NASA e o mesmo método, é um diferencial direto.

## 2. Objetivos, não objetivos e anti-objetivos

**Objetivos**
1. Um **núcleo de dados igual para todo lugar**:
   - limite administrativo e um recorte de lavoura;
   - clima diário: chuva, ET0 e temperaturas;
   - balanço hídrico FAO-56 diário;
   - NDVI do recorte;
   - previsão de 10 dias.
2. **Sete lugares na primeira entrega:**
   - Brasil: Sorriso, Uberlândia, Rio Verde e Barreiras.
   - EUA: Story County (Iowa), York County (Nebraska) e Sumner County (Kansas). São os pilotos de prioridade 1 do plano `2026-11-14-gaiapus-armazenamento-coleta-mg-mt-eua.md`.
3. **Identificador de lugar que funcione para qualquer país**, sem quebrar os ids atuais.
4. **Frontend sem lugar fixo no código:** a aba Clima e a busca leem o núcleo de qualquer lugar.
5. **Proveniência em cada camada:** fonte, período, hipóteses e, quando faltar, o motivo.

**Não objetivos (nesta entrega)**
- Rendimento nos EUA. Os rótulos USDA NASS ainda não foram auditados e não existe modelo.
- Field Shift e cenários nos EUA.
- Mudar os contratos atuais de rendimento, previsão de água e Field Shift do Brasil.
- Cobrir mais condados ou estados inteiros.

**Anti-objetivos (seria falha mesmo funcionando)**
- Inventar dado:
  - rendimento sintético;
  - NDVI interpolado onde houve nuvem;
  - previsão "ao vivo" que na verdade é antiga.
- Reaproveitar números ou modelos do Brasil nos EUA.
- Treinar qualquer modelo, ou alterar avaliações e exemplos congelados (v6, v7, smoke).
- Criar uma caixa geográfica única que una Brasil e EUA, ou baixar imagem de estados inteiros.
- Quebrar qualquer endpoint, contrato ou teste existente.

## 3. Restrições herdadas

- `Docs/gaiapus-28-handoff-front-back.md`: o código IBGE é tratado como texto.
- `2026-11-14-gaiapus-armazenamento-coleta-mg-mt-eua.md`, seção 8:
  - FIPS de condado com 5 dígitos, como texto, preservando zero inicial;
  - códigos resolvidos por tabela oficial, nunca adivinhados;
  - Brasil e EUA nunca misturados no treino.
- `services/science-adapter/README.md`: o adaptador não treina, não monta features e não baixa clima. O gerador do núcleo, portanto, fica no repositório científico, não no adaptador.
- Arquivos `.env*` e chaves nunca entram em commit nem em log. As fontes usadas aqui (POWER, Planetary Computer, Open-Meteo e Census TIGER) não pedem chave.
- O manifesto visual do frontend continua: toda mudança deliberada é registrada com `scripts/record-visual-change.mjs`.

## 4. Caminhos considerados

| | Caminho | Por que não / por que sim |
|---|---|---|
| 1 | Estender o contrato atual (`country_id` BR ou US, código FIPS nos schemas v7) | Mexe em schemas usados pelos exemplos congelados e pelo adaptador. Alto risco de quebrar o que funciona |
| 2 | JSON estático dos EUA no frontend | Repete o problema que motivou este trabalho: formato por lugar, fixo no código |
| **3 (escolhido)** | **Gerador no repositório científico, que publica um pacote "núcleo" por lugar. A API serve esse pacote num endpoint novo e versionado** | Mudança só aditiva; os quatro lugares do Brasil ganham o mesmo núcleo; os contratos científicos ficam intactos |

## 5. Desenho

### 5.1 Identificador de lugar

```text
place_id = "<ISO 3166-1 alfa-2>:<esquema>:<código>"
BR:ibge:5107925    Sorriso, MT
BR:ibge:3170206    Uberlândia, MG
BR:ibge:5218805    Rio Verde, GO
BR:ibge:2903201    Barreiras, BA
US:fips:19169      Story County, IA
US:fips:31185      York County, NE
US:fips:20191      Sumner County, KS
```

- Esquemas aceitos nesta entrega: `ibge` (`^[0-9]{7}$`) e `fips` (`^[0-9]{5}$`).
- O validador recusa qualquer outro esquema. Novos esquemas entram por nova versão do contrato.
- Os ids atuais (`5107925`, `BR-MT`, `published-field-*`) continuam valendo nos endpoints existentes.
- O núcleo informa o id antigo equivalente em `legacy_area_id`, quando houver, para o frontend ligar as duas coisas.
- **A confirmar por tabela oficial antes de publicar:** os três códigos FIPS acima (Census, tabela de condados). Eles vieram de memória.

### 5.2 Contrato `PlaceCore` v1 (novo)

Endpoints novos, públicos e só de leitura, no `packages/contracts`:

```text
GET /v1/places                 → { places: PlaceSummary[], publication }
GET /v1/places/:id/core        → PlaceCore
```

Formato do `PlaceCore` (nomes em inglês, unidades no SI agronômico):

```text
PlaceCore {
  schema_version: "place-core.v1"
  place: { id, country, scheme, code, name, admin1_name, legacy_area_id?, centroid:[lon,lat], boundary_url }
  field: { polygon (GeoJSON), area_ha, rationale, inside_boundary: true } | null
  crop: { id: "soy"|"maize1"|"maize2"|"wheat_winter", calendar_source, sowing_date, harvest_date, is_hypothesis: true }
  soil: { capacity_mm, source, is_hypothesis }
  layers: {
    weather:       Layer<{ date, rain_mm, et0_mm, tmin_c, tmax_c }>
    water_balance: Layer<{ date, storage_mm, available_fraction, etc_mm, eta_mm, deficit_mm, drainage_mm, ks, stage }>
    ndvi:          Layer<{ date, ndvi|null, valid_fraction, scene_id, collection }>
    forecast:      Layer<{ date, rain_mm, et0_mm, storage_mm, stress:boolean }> & { issued_at }
  }
  provenance: { generated_at, generator: "gaiapus_nasa@<commit>", inputs:[{ source, url_or_dataset, retrieved_at, sha256 }] }
}
Layer<T> = { status: "available"|"unavailable", reason_code?, source, method?, period:{start,end}, rows: T[] }
```

- **Sem rótulo de lugar no conteúdo:** os textos de interface são traduzidos no frontend, que recebe apenas códigos (`reason_code`, `crop.id`).
- **`reason_code` fechado:**
  - `no_field_imagery`
  - `too_few_clear_scenes`
  - `forecast_not_in_publication`
  - `crop_calendar_unknown`
  - `out_of_season`
  - `source_unavailable`
- **Previsão:** no modo fixture (publicação), a previsão é a emitida na data da geração e mostra `issued_at`. O frontend a apresenta como "previsão emitida em …", nunca como atual.

### 5.3 Gerador (repositório científico `Gaiapus_nasa`)

- **Catálogo declarativo `data/serving/places.v1.json`**, uma entrada por lugar:
  - id e nome;
  - fonte do limite (IBGE Malhas v4 ou Census TIGER condados);
  - caixa do recorte, escolhida dentro de área agrícola;
  - cultura, calendário e capacidade de água do solo, cada um com fonte.
- **Script `data/serving/place_core.py`**, que reaproveita:
  - `data/ingest/field_imagery.py` para o NDVI do recorte. Hoje presume `BR.geojson`, MG e `city.geojson`: generalizar para "limite do lugar" e "máscara do lugar".
  - `data/models/water_balance.py` (`et0_daily`, `simulate`).
  - o cliente POWER já usado em `data/raw/power/*.json`.
  - a previsão Open-Meteo `ecmwf_ifs025` no mesmo formato do exemplo `water-soy-5107925-N10`.
- **Culturas novas no `water_balance.CROPS`:**
  - `maize1`: milho de safra cheia;
  - `wheat_winter`: trigo de inverno.
  - Duração das fases e Kc vêm da tabela FAO-56 (tabelas 11 e 12, com a linha usada citada). São marcadas como hipótese, sem calibração local.
  - `soy` e `maize2` não mudam.
- **Calendários e solo:**
  - **Calendário nos EUA:** data mediana de semeadura e colheita do USDA NASS Crop Progress por estado, citando o relatório e o ano.
  - **Calendário no Brasil:** o calendário fixo por estado já usado.
  - **Solo:** AD4 (55 mm) como hipótese declarada nos dois países. Um valor por condado vindo do SSURGO fica como evolução.
- **Período:**
  - clima e balanço hídrico: 2015-01-01 a 2024-12-31, para todos os lugares;
  - NDVI: uma safra por lugar — EUA abril a outubro de 2024; Brasil outubro de 2023 a abril de 2024 (soja); os recortes atuais de 2024 seguem publicados como estão.
- **Saída:**
  - `data/serving/place-core/<place_id com ":" trocado por "_">.json`;
  - `data/serving/place-core/manifest.json`, com o sha256 de cada arquivo e o commit do gerador.
- **Volume:** cabe no piloto de até 2 GB do plano de armazenamento.
  - As imagens HLS são lidas por janela, no recorte.
  - Nunca há caixa geográfica que una países.

### 5.4 Publicação na API (`Gaiapus-APP`)

- O pacote gerado é copiado, sem mudança, para `packages/contracts/fixtures/place-core/`, com `pin.json` (commit e hashes). É o mesmo padrão do `upstream/v7/pin.json`.
- `schema-definition.mjs` ganha `PlaceSummary` e `PlaceCore`. `pnpm contracts:generate` produz tipos e rotas; `generate:check` impede divergência.
- A API serve os arquivos fixados (modo fixture) e valida com Ajv na carga.
- Os limites dos três condados vão para `apps/api/public/publications/…/US-<estado>-<fips>.geojson`.
- Nada muda em `/v1/coverage`, `/v1/observations`, `/v1/examples` nem no adaptador Python.

### 5.5 Frontend

- **Novo adaptador `places.core(id)`.** A aba Clima do Município e a Visão geral passam a ler o núcleo para qualquer lugar. A série diária de Sorriso deixa de estar fixa em `adapters/index.ts`.
- **Field Shift, rendimento e cenários de Sorriso** continuam vindo dos exemplos v7, como camadas por cima do núcleo.
- **Exploração:**
  - os EUA entram no índice de cobertura;
  - nos EUA, a navegação vai de estado a condado;
  - os limites de condado vêm da publicação.
- **Textos:**
  - "código do IBGE" vira "código oficial (IBGE no Brasil, FIPS nos EUA)";
  - o código só aparece com o esquema certo;
  - textos novos entram nas cinco línguas (Codex, terminologia do doc 08).
- **A faixa "De onde é este dado"** mostra lugar, país, período, cultura e as hipóteses do calendário e do solo.

### 5.6 Ordem de entrega

1. **Contrato `PlaceCore` v1 e fixtures sintéticas de teste**, no `Gaiapus-APP`, revisado pelo Lucas. Libera o frontend.
2. **Gerador e os 7 pacotes**, no `Gaiapus_nasa`.
3. **Publicação fixada e endpoints na API.**
4. **Frontend**, nos moldes do PR #1: testes, registro no manifesto visual, PR.

### 5.7 Decisões do implementador (Claude, 14/11/2026 — para o Leandro conferir)

Pontos levantados na revisão independente do desenho. Têm precedência sobre o texto acima onde houver conflito.

1. **Balanço hídrico por safra, não contínuo.**
   - `simulate()` roda um ciclo completo por vez. A camada `water_balance` é uma lista de safras `seasons[]`, cada uma com `crop`, `season` (ex.: `2023/24`), `sowing_date`, `harvest_date` e `rows`.
   - Não há linhas na entressafra.
   - O armazenamento inicial de cada safra é a fração inicial já usada pelo `water_balance_v1`, declarada como hipótese.
   - Teste de referência: reproduzir o `water_balance_v1` de Sorriso (safras com início em 05/10, AD4) dentro de 0,1 mm, com os mesmos insumos. A série `scenario/*_daily.csv` da v7 continua só no Field Shift.
2. **Mais de uma cultura por lugar.** `crop` vira `crops[]`. Cultura em cada lugar nesta entrega:

   | Lugar | Culturas |
   |---|---|
   | Sorriso | soja e `maize2` (safrinha) |
   | Uberlândia, Rio Verde, Barreiras | soja |
   | Story (IA) | soja e `maize1` |
   | York (NE) | `maize1` |
   | Sumner (KS) | `wheat_winter`, safra 2023/24, de outubro a junho |

   A janela de NDVI segue a safra de cada cultura, não uma janela fixa por país.
3. **Previsão de 10 dias.**
   - O gerador baixa o POWER até a data de geração só para iniciar o balanço da safra em curso.
   - Se não houver safra em curso na data de emissão (por exemplo milho dos EUA em novembro), a previsão fica `unavailable` com o novo `reason_code` `out_of_season`.
   - A previsão nunca é apresentada como atual: sempre mostra `issued_at`.
4. **Calendário de Goiás e Bahia.** Usar a janela do ZARC (MAPA) para soja no município, com a data central da janela como hipótese, citando a portaria e o ano. Se o ZARC não cobrir, o lugar recebe `crop_calendar_unknown` e o balanço fica `unavailable`; nada de data inventada.
5. **Exploração e `PlaceSummary`.**
   - `/v1/places` é a fonte da navegação nos EUA.
   - `PlaceSummary` = { id, country, admin1_code (ISO 3166-2, ex.: `US-IA`, `BR-MT`), name, centroid, bbox, legacy_area_id?, layers: { weather, water_balance, ndvi, forecast: status } }.
   - O frontend unifica os lugares do Brasil pelo `legacy_area_id`: um lugar, uma linha.
   - Os limites estaduais de IA, NE e KS vêm do Census TIGER (cartographic boundary 1:500k), publicados como os de BR.
6. **Recortes.**
   - Uberlândia, Rio Verde e Barreiras reaproveitam o polígono já publicado (`published-field-*`), que precisa passar no teste "dentro do limite".
   - O NDVI do núcleo cobre a safra de soja 2023/24 no mesmo polígono.
   - Sorriso e os 3 condados ganham recorte novo, escolhido com MapBiomas ou CDL.
   - Na interface, a aba Imagem passa a ler o núcleo; `/v1/observations` continua existindo, sem mudança, para quem já o usa.
7. **Rotas.** `/v1/places` já existe, como rota privada dos lugares monitorados de cada usuário. As rotas novas são `GET /v1/locations` e `GET /v1/locations/:id/core`, e os tipos se chamam `LocationSummary` e `LocationCore`. O identificador continua `BR:ibge:…` / `US:fips:…`.

## 6. Testes de aceite

- **Contrato:**
  - Ajv aceita os 7 pacotes;
  - recusa um FIPS de 4 dígitos, um esquema desconhecido e uma camada `available` sem linhas.
- **Gerador:**
  - FIPS com zero inicial preservado;
  - recorte fora do limite rejeitado;
  - menos de 3 cenas limpas resulta em `ndvi.status = unavailable` (sem interpolação);
  - hash do manifesto confere;
  - balanço hídrico reproduz o exemplo atual de Sorriso dentro de 0,1 mm com os mesmos insumos.
- **API:**
  - rotas novas;
  - id inválido retorna 400, lugar inexistente retorna 404;
  - endpoints antigos inalterados (testes atuais verdes).
- **Frontend:**
  - Story, York e Sumner abrem com clima, balanço e NDVI;
  - nenhum número de Sorriso aparece num lugar dos EUA;
  - previsão rotulada com `issued_at`;
  - textos nas cinco línguas;
  - RT-25 sem rolagem horizontal.

## 7. Deixado para quem implementar

- **Recorte de cada lugar:** a caixa exata dentro de área agrícola. Usar o Cropland Data Layer (EUA) ou o MapBiomas (Brasil) só para escolher a área, sem publicar essa camada.
- Formato interno do script e nomes de funções.
- Paginação e compressão de `/v1/places/:id/core`. A previsão de tamanho é de 1 a 2 MB por lugar com 10 anos diários; se passar disso, filtrar por `start` e `end` na query.

## 8. Precisa de decisão do Lucas

- Nome e prefixo das rotas novas (`/v1/places` está livre hoje).
- Se a API deve, numa segunda etapa, ler o núcleo direto do Supabase Storage em vez de fixtures. Os planos de hospedagem de 14/11 tratam disso.
