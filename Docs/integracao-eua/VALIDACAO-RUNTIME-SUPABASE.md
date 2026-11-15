# API Supabase + Brasil/EUA no frontend

Data: 2026-11-15. Branch isolado: `codex/habilitar-supabase-runtime`, baseado em `5bec1dc` de `codex/integracao-eua-supabase`.

## O que foi ativado

A API local na porta 3010 usa `SIMULATION_US_SOURCE=supabase`. O projeto é `kgtvvdwwqnmmjbtcmbbu`. O Brasil continua vindo da publicação fixada `future-simulation-v1`; os EUA vêm do lote publicado no Supabase. As fontes são compostas pela API, sem copiar ou substituir o Brasil.

`GET /v1/simulations/capabilities` retorna um envelope `{data, meta}`. A verificação encontrou 249 locais: 4 BR e 245 US, com `pinned-br=ok` e `us-supabase=ok`. Isso é cobertura do catálogo; NÃO significa que toda combinação cultura/ano tenha série diária ou modelo validado.

Nenhuma migração, ativação de lote, mudança de política RLS ou promoção de modelo foi feita nesta etapa. Não houve alteração de `.env`, pesos ou dados científicos.

## Correções necessárias no frontend

- Ler `local`/`location_id` canônico (`BR:ibge:...` e `US:fips:...`), mantendo compatibilidade com o parâmetro `mun` do Brasil.
- Escolher a publicação pelo local, cultura e ano de colheita. Não abrir a série de 2027 quando a escolha for 2028.
- Oferecer seletores de lugar, cultura e safra com as capacidades reais do catálogo.
- Não substituir um county desconhecido por Sorriso.
- Só renderizar execução e série quando ambas tiverem o mesmo `run_id` e o local selecionado. O carregamento assíncrono não pode combinar cabeçalho novo com números antigos.
- Exibir rendimento sem inventar série diária quando a capacidade for `yield_only`.
- Preservar o selo de pesquisa nos resultados americanos, inclusive `research_confirmed`: isso não é promoção operacional.
- Manter as abas Campo / Indicadores / Configurar em telas estreitas.
- Adaptar os nomes equivalentes de chuva e déficit na leitura dos resumos. Não confundir estresse reprodutivo com estresse total; métrica ausente permanece sem valor.

## Evidência de navegação real

| Fluxo | Resultado observado |
| --- | --- |
| Uberlândia, soja, 2027 e 2028 | Série brasileira e referência PAM preservadas; datas mudam com a safra |
| Story County / Iowa, soja, 2027 e 2028 | Execuções distintas; série recebida da API com fonte Supabase |
| Iowa, central / mais seca / avançar semana | Chuva, reserva e data acompanham a trajetória selecionada |
| York County / Nebraska, milho, 2027 | Série diária e rendimento de pesquisa exibidos |
| Sumner County / Kansas, trigo de inverno, 2027 | Somente rendimento de pesquisa; nenhum gráfico diário fabricado |
| Sumner County, trigo de inverno, 2028 | Série diária e Perfil do solo disponíveis |
| Celular | Seletores em Configurar e números em Indicadores acessíveis |
| Retorno dos EUA ao Brasil | Seleção e referência brasileiras permanecem corretas |

Exemplos: Story 2027 `sim_398456425c79190084246453`, Story 2028 `sim_cfba00f1f99db69aa12e4200`, York milho 2027 `sim_77aaf197811ae7425d0972ce`, Sumner 2028 `sim_058579a503ee56335a086db1`.

## Verificação

- Frontend: suíte completa 267/267 antes da última proteção de identidade assíncrona. A proteção foi reproduzida com teste que falhava e revalidada: 16/16 testes focados passaram após a correção.
- API: suíte padrão 53/53, com as mesmas exclusões do script `test` do projeto.
- TypeScript do frontend passou; build Vite passou. Há aviso de chunks grandes, que não impede o build.
- Os testes dedicados `live.science.test.ts` e `policies.database.test.ts` não estão configurados nesta instância (serviço Python/contas de teste). Uma execução ampla confirmou essas precondições ausentes; não se declara validação de inferência Python ao vivo nem de operações privadas de contas.
- Verificação no navegador foi manual, sobre a API real na 3010, além dos testes automatizados com fixtures.

## Configuração de execução/deploy

Na API, injetar pelo ambiente do serviço, sem versionar valores sensíveis:

```text
SIMULATION_US_SOURCE=supabase
SUPABASE_URL=https://kgtvvdwwqnmmjbtcmbbu.supabase.co
SUPABASE_PUBLISHABLE_KEY=<chave publicável configurada no ambiente>
SIMULATION_CACHE_MB=32
SIMULATION_BATCH_TTL_SECONDS=300
SIMULATION_FETCH_TIMEOUT_MS=30000
```

Não é necessária uma service-role para a leitura das publicações públicas. Não usar credenciais administrativas no frontend. Os valores de cache são um ponto inicial econômico, não uma medição do consumo total de RAM do processo.

Build do frontend: `VITE_APP_API_MODE=http`, e URL/chave publicável do Supabase nas variáveis Vite existentes. A instância local serve frontend e `/v1` na mesma origem, com `FRONTEND_DIST_DIR` apontando para `apps/web/dist`. Os nomes Vite/API devem seguir a configuração já existente do projeto; não substituir os fluxos de autenticação.

O launcher local reproduzível fica em `ideias_nasa/handoff/us-v2-supabase/start-app.ps1`. Ele lê somente URL e chave publicável do `.env` autorizado, define variáveis apenas para o processo e inicia uma janela oculta. Não altera o arquivo. Suporta `-RepositoryPath`, `-ConfigPath`, `-Port`, `-Build` e `-BuildOnly`. Recusa iniciar se a porta estiver ocupada.

Após `-BuildOnly`, reiniciar apenas a instância correspondente: as rotas estáticas do Fastify são registradas no início, e os nomes dos chunks podem mudar. Nunca encerrar processos apenas por nome `node`; conferir PID, caminho e porta.

## Coordenação e limites

O checkout do Claude em `Documents/Gaiapus-APP-eua` e os servidores anteriores em 5173/3001 não foram alterados/encerrados. Esta implementação está em worktree próprio. O responsável pela integração deve revisar/aplicar este commit sobre a branch de integração antes de publicar; a main não foi modificada nesta etapa.

A ativação é de consulta a simulações publicadas. Não habilita treinamento, geração de cenários privados ou inferência científica ao vivo. 2027/2028 continuam cenários climatológicos, não previsões meteorológicas diárias. O mapa e os componentes de raiz/solo não foram reescritos.

Acabamentos já existentes que continuam pendentes: alguns rótulos internos de trigo/eventos não estão traduzidos e o cabeçalho global de Demonstração pode refletir o contexto geral, distinto da seleção local do simulador. A identidade científica exibida no resultado deve ser a da execução selecionada.
