# Estados americanos no Explorar

Correção limitada à navegação geográfica. Nenhum modelo, dado agrícola, autenticação ou tela científica foi substituído.

- País: `USA` no mapa Natural Earth; `US` aceito como alias de URL.
- Estado: ISO 3166-2, por exemplo `US-IA`. Nunca enviar FIPS de estado a endpoints de municípios IBGE.
- Condado: preservar `US:fips:19169` e a rota existente `#/municipio?id=US%3Afips%3A19169`.
- Associação condado/estado: `LocationSummary.admin1_code`, fornecido pelo catálogo, sem inferir pelo nome.
- 50 estados e Washington, D.C. pesquisáveis, selecionáveis e com contornos. Estados sem dados continuam acessíveis; ausência de dados não é erro de rede.
- Estados com condados publicados ficam primeiro; isso não equivale a cobertura agrícola estadual.
- Visão inicial dos EUA enquadra o território contíguo; Alaska e Hawaii são acessíveis pela lista e busca. Alaska usa enquadramento contínuo através do antimeridiano.
- Os contornos são generalizados, para navegação regional. Não substituem malha cadastral ou limites de talhão.

## Fonte cartográfica

Natural Earth, Admin 1 states/provinces, escala 1:50m, domínio público.
Fonte: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_1_states_provinces.geojson
Licença: https://www.naturalearthdata.com/about/terms-of-use/
Extração: somente `adm0_a3 = USA`; 51 feições; preservar geometria original WGS84 e apenas code/name/sigla/id.
SHA256 do download: 69a0e06e640b2d505858ae1cb63034e4677f3000b35a98e16312932b98c426b9

## Integração com o trabalho simultâneo

Alterações preparadas sobre o conteúdo local existente; hashes conferidos antes de gravar. Não substituir arquivos inteiros por cópias de outra branch. As traduções específicas estão em `i18n/usStates.ts` para não disputar os cinco catálogos em edição pelo Claude.
Não houve commit nem push automático.

## Verificação

Testes de IDs comprovam que `pais=USA&uf=US-IA` preserva Iowa e que `uf=19` não vira uma UF brasileira.
Testes cartográficos verificam 51 identidades únicas, associação por admin1_code, Alaska, Hawaii e regressão brasileira.
Testes de interface cobrem seleção, busca, condados, aviso de ausência, erros do catálogo e retorno ao Brasil.
Executar typecheck e os testes de regressão antes de publicar.

### Resultado verificado nesta entrega

- TypeScript: `pnpm --filter @gaiapus/web typecheck` passou.
- 24 testes unitários direcionados passaram (IDs, geometrias, painel e busca existente).
- 7 jornadas existentes de EUA passaram; 4 novas jornadas passaram (lista, busca global, catálogo indisponível, clique no polígono com zoom).
- Build Vite de produção passou, gerado fora do `dist` da sessão ativa, em pasta temporária.
- Malha: 267.899 bytes em GeoJSON; chunk de produção 95,07 kB gzip, carregado sob demanda.
- Preview validado: http://localhost:5174/#/explorar?pais=USA
- O Node local é 22.23.2; o workspace declara >=22.23.4 <23. Houve aviso de engine, sem falha de tipo, teste ou build. Ambiente não foi alterado.
