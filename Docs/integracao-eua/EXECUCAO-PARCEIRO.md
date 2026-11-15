# Integração EUA — execução no Supabase (roteiro do operador)

**Data:** 15/11/2026. **Destino definido por Leandro:** projeto Supabase `kgtvvdwwqnmmjbtcmbbu` (conta leandrojerse@gmail.com). **Quem executa:** o Codex ou o parceiro, logado nessa conta. As sessões do Claude não executaram nada nesse projeto.

> **Regra de conta:** a CLI do Supabase da máquina do Leandro usada pelo Claude está logada em outra organização (Blips). Nada do Gaiapus vai para lá. Antes de qualquer comando com efeito, confirme que o projeto alvo é `kgtvvdwwqnmmjbtcmbbu`.

## 1. O que está preparado e o que está implantado

| Item | Estado |
|---|---|
| Contratos, API, lógica de seleção, traduções | Implementado e testado localmente no branch `codex/integracao-eua-supabase` (sem push) |
| Migração `20261115163549_simulation_publication_batches.sql` | Escrita e testada em Postgres 17 isolado (Docker). **Não aplicada em nenhum Supabase** |
| Ferramenta `scripts/simulations/publication-tool.mjs` | Testada contra um emulador HTTP em memória e contra Postgres isolado. **Nunca executada contra um Supabase real** |
| Pacote `gaiapus-us-v2-publication-69c23cefe48e.zip` | Gerado e conferido. **Não enviado** |
| SQL do lote `us-74a444b5fb7f886e` (metadados, ativação, rollback) | Gerado; aplicado duas vezes, ativado e revertido em Postgres isolado. **Não aplicado no destino** |
| Tela de planejamento abrindo os EUA | **Não feito** — reservado para a outra sessão do Claude |
| Deploy | **Não feito** |

O que **não** foi verificado contra um Supabase real e deve ser observado na primeira execução: os caminhos da API de Storage (`POST /storage/v1/object/<bucket>/<chave>` com `x-upsert: false`, leitura pública em `/storage/v1/object/public/<bucket>/<chave>`), a resposta a objeto duplicado, a leitura anônima da tabela de lotes pelo PostgREST e limites de tamanho de objeto do plano (maior objeto do lote: 810.670 bytes).

## 2. O que você recebe

Pasta de entrega (fora do Git): `C:\Users\leand\Backups\gaiapus\entrega-eua\`

| Arquivo | Bytes | SHA-256 |
|---|---:|---|
| `gaiapus-us-v2-publication-69c23cefe48e.zip` | 153.405.598 | `1c7dd29abe7a1c71e642ccdefb62cb21526abb99b29257b7cac48611864a9d57` |
| `us-74a444b5fb7f886e.metadata.sql` | 1.877.421 | `ab7c658b9097f329dfa4e38b326d25541921cd34019c7e50dda6e09b6caa411b` |
| `us-74a444b5fb7f886e.activate.sql` | 731 | `725403ec03802bfab62bcaf3660fe76c14d2b2f83167129ffb2eee68cc3a48a5` |
| `us-74a444b5fb7f886e.rollback.sql` | 715 | `0929057806e204d365253a0e7d9967fccbe054022baac6169a3024146a325251` |

Conteúdo do zip (1.442 arquivos, 152.872.159 bytes, sem compressão adicional): `MANIFEST.sha256.json`, `publication/` (catálogo, índice, 710 execuções com `run.json` e `series.json.gz`), `product/` (resumos, membros e 15 exemplos de rendimento, incluindo 2026 e trigo KS 2027), `contracts/` e o relatório científico. Sem modelos, rótulos, credenciais ou dados de agricultores.

Lote: chave `us-74a444b5fb7f886e`, manifesto `74a444b5fb7f886eb6e826c87d31e6743ea109b3df40fcdb6a52415c426d8bd8`, prefixo no Storage `us/batches/us-74a444b5fb7f886e`, 1.422 objetos, 151.873.694 bytes (151,87 MB decimais; 144,84 MiB), 245 lugares.

| Safra | Capacidades | Com série diária | Só rendimento |
|---|---:|---:|---:|
| 2026 | 400 | 0 | 400 (pós-colheita) |
| 2027 | 400 | 310 | 90 (trigo KS, em safra) |
| 2028 | 400 | 400 | 0 |

## 3. Pré-requisitos

- Node `>=22.23.4 <23` e pnpm 10.14.0 (versões do `package.json`). Docker só para repetir os testes de banco.
- Checkout do commit de release deste branch. Não use `git reset` para sincronizar.
- `psql` (cliente Postgres 15+) ou o editor SQL do painel. O arquivo de metadados tem 1,9 MB: prefira `psql`.
- Variáveis **no seu ambiente, nunca em arquivo versionado ou mensagem**:

| Variável | Usada por | Para quê |
|---|---|---|
| `SUPABASE_URL` | ferramenta (`plan`, `upload`, `verify-remote`) e API | URL do projeto `https://kgtvvdwwqnmmjbtcmbbu.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | **somente** `upload` | escrita no bucket público; não vai para API, frontend, build ou log |
| `DATABASE_URL` | `psql` | string de conexão do banco (painel → Connect) |
| `SUPABASE_PUBLISHABLE_KEY` | API | leitura do lote ativo (já usada pelo APP) |

```powershell
pnpm install --frozen-lockfile
pnpm --filter @gaiapus/contracts build      # a ferramenta importa os validadores compilados
```

## 4. Conferir o pacote (sem rede)

```powershell
Get-FileHash .\gaiapus-us-v2-publication-69c23cefe48e.zip -Algorithm SHA256   # deve ser 1c7dd29a…4a9d57
Expand-Archive .\gaiapus-us-v2-publication-69c23cefe48e.zip -DestinationPath .\entrega
node scripts/simulations/publication-tool.mjs inspect  --dir .\entrega\publication
node scripts/simulations/publication-tool.mjs validate --dir .\entrega\publication
```

`validate` deve terminar com `"ok": true`, `publications: 710`, `artifacts: 1420`, `places: 245` e a chave `us-74a444b5fb7f886e`. Ele confere schemas, SHA-256, tamanhos, IDs, datas (`as_of <= issued_at`), país único e procura credenciais ou e-mails nos textos. Qualquer outra chave significa que o conteúdo mudou: pare.

## 5. Backup e baseline do destino

1. Registre no retorno (seção 10): versão do APP, lista de migrações aplicadas e o resultado da consulta abaixo.
2. Faça backup do banco e copie os objetos de Storage existentes. São duas cópias distintas.

```sql
-- baseline: publicações correntes por país (guarde o resultado)
select split_part(location_id, ':', 1) as pais, count(*) from public.regional_simulation_publications where is_current group by 1 order by 1;
select count(*) as runs, (select count(*) from public.simulation_artifacts) as artefatos from public.simulation_runs;
```

Se essas tabelas não existirem, as migrações anteriores ainda não foram aplicadas (seção 6).

## 6. Migrações (somente as pendentes)

Ordem: `202611140001_personal.sql` → `202611150001_future_simulations.sql` → `20261115163549_simulation_publication_batches.sql`. A terceira depende das duas primeiras.

A migração nova foi criada com `supabase migration new` na CLI 2.98.2. Os comandos de aplicação abaixo são os do guia existente do APP (`Docs/2026-11-14-gaiapus-supabase-setup.md`); **confira com `supabase --version` e `supabase db push --help`**, porque a CLI v3 mudou destinos e confirmações.

```powershell
supabase --version
supabase link --project-ref kgtvvdwwqnmmjbtcmbbu
supabase migration list            # compare local × remoto antes de qualquer push
supabase db push --dry-run         # deve listar só o que falta
supabase db push
```

- Se o banco recebeu SQL manualmente e o histórico não bate, pare e reconcilie; não use `db reset` nem `migration repair` às cegas.
- A migração nova não altera linhas existentes. Ela troca um índice (a chave de publicação corrente passa a incluir as safras), substitui uma função de visibilidade e uma política por versões que escondem lotes ainda não ativos, e cria um gatilho que impede sobreposição de safras correntes do mesmo lugar e plano.
- Depois, confira:

```sql
select to_regclass('public.simulation_publication_batches') is not null as lotes,
       exists(select 1 from pg_indexes where indexname='regional_publications_current' and indexdef like '%harvest_years%') as chave_por_safra,
       (select count(*) from storage.buckets where id in ('simulation-public','simulation-private')) as buckets;   -- esperado: t, t, 2
```

## 7. Importar o lote

Cada passo é separado; nenhum ativa o lote até o passo 7.5.

```powershell
# 7.1 plano, somente leitura (não precisa da chave administrativa)
node scripts/simulations/publication-tool.mjs plan --dir .\entrega\publication
#     esperado na primeira vez: to_upload 1422, already_identical 0, conflicting []

# 7.2 envio (único passo que usa SUPABASE_SERVICE_ROLE_KEY). Pode ser interrompido e repetido.
node scripts/simulations/publication-tool.mjs upload --dir .\entrega\publication
#     nunca sobrescreve: objeto diferente na mesma chave interrompe com erro

# 7.3 verificação remota: baixa tudo, confere SHA-256, descomprime e valida
node scripts/simulations/publication-tool.mjs verify-remote --dir .\entrega\publication
#     esperado: "ok": true, "verified": 1422, "total": 1422

# 7.4 metadados, ainda inativos (idempotente; aplicar duas vezes não duplica)
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f .\us-74a444b5fb7f886e.metadata.sql
#     última linha esperada: us-74a444b5fb7f886e | US | staged | 710 | 245

# 7.5 ativação, uma transação; só depois de 7.3 e 7.4
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f .\us-74a444b5fb7f886e.activate.sql
#     os dois contadores "other_countries_current_*" devem ser iguais (Brasil intacto)
```

Os arquivos SQL também podem ser regerados a partir do pacote (`metadata-sql`, `activate-sql`, `rollback-sql --out arquivo.sql`); o conteúdo deve ter os mesmos SHA-256 da seção 2.

Enquanto o lote está em `staged`, visitantes não veem nenhuma linha dele. Os objetos no bucket público, porém, já são legíveis por URL desde o envio: por isso o bucket só recebe resultados regionais sanitizados.

## 8. Configurar a API

| Variável | Valores | Padrão |
|---|---|---|
| `SIMULATION_US_SOURCE` | `off`, `local`, `supabase` | `off` (só Brasil, como hoje) |
| `SIMULATION_US_LOCAL_DIR` | diretório com `index.json` e `catalog.json` (modo `local`) | — |
| `SIMULATION_CACHE_MB` | 1..1024 | 64 |
| `SIMULATION_FETCH_TIMEOUT_MS` | 100..120000 | 10000 |
| `SIMULATION_BATCH_TTL_SECONDS` | 1..3600 (com que frequência a API relê o lote ativo) | 60 |

Para servir os EUA do Supabase: `SIMULATION_US_SOURCE=supabase` com `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` (os mesmos do login). A API usa só a chave publicável e leituras públicas. Valor inválido faz a API recusar a partida, em vez de subir meio configurada.

O Brasil continua vindo do diretório fixado no repositório, independentemente dessa configuração. Se a fonte dos EUA falhar, as rotas do Brasil respondem normalmente, `source_status` mostra `us-supabase: unavailable` e um run dos EUA responde 503 `simulation_source_unavailable`.

`SCIENCE_MODE` e a seleção de modelos não mudam. Nenhum modelo é promovido por esta configuração.

## 9. Aceitação

```powershell
curl "$APP/health"
curl "$APP/v1/simulations/capabilities?location_id=US:fips:19169"     # Story: 2026 só rendimento; 2027 e 2028 com run
curl "$APP/v1/simulations/capabilities?location_id=US:fips:20191"     # Sumner: 2027 source_unavailable com yield_result; 2028 ready
curl "$APP/v1/simulations/regional?location_id=US:fips:31185&harvest_year=2028"
curl "$APP/v1/simulations/regional?location_id=BR:ibge:5107925"       # Brasil igual ao baseline
```

- [ ] Contagem de publicações correntes do Brasil igual à da seção 5.
- [ ] 2027 e 2028 de Story (`us_soy`) aparecem como dois runs distintos.
- [ ] 2026 não tem run nem série; traz `yield_result` com `position_vs_season: post_harvest_pre_release`.
- [ ] Um run e sua série dos EUA abrem; `meta.publication_version` cita as duas fontes.
- [ ] Visitante não consegue escrever em `simulation_publication_batches` nem chamar as funções de ativação.

A tela de planejamento ainda não abre os EUA (pendência da outra sessão); a aceitação acima é pela API.

## 10. Rollback

```powershell
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f .\us-74a444b5fb7f886e.rollback.sql
```

Retira o lote ativo dos EUA e restaura o anterior, se houver. Não apaga linhas nem objetos e não toca no Brasil. Alternativa imediata sem banco: `SIMULATION_US_SOURCE=off` e reiniciar a API.

Limites do rollback: objetos já enviados ao bucket público continuam acessíveis por URL; a migração não tem script de reversão (é aditiva, e o APP anterior funciona com ela aplicada). Um lote retirado fica como `withdrawn`; para republicar o mesmo conteúdo é preciso intervenção manual no status.

## 11. Testes que sustentam este roteiro

| Comando | O que prova | Resultado em 15/11/2026 |
|---|---|---|
| `pnpm --filter @gaiapus/contracts test` | contratos, fixture EUA, métricas nulas, 2026, KS 2027, FIPS | 28 passam |
| `pnpm --filter @gaiapus/api test` | fontes local e remota, Storage fora do ar, artefato corrompido, cache, Brasil preservado | 53 passam |
| `pnpm --filter @gaiapus/web test` | seleção por safra, cobertura por produto, regressão do web | 264 passam |
| `pnpm test:publication-tool` | plano sem escrita, envio interrompido e retomado, recusa de sobrescrita, verificação remota, SQL | 8 passam |
| `node supabase/tests/simulation-batches.test.mjs` | lote invisível até ativar, 2027/2028 juntos, Brasil intacto, rollback | passa |
| `node supabase/tests/simulations.policies.test.mjs` | políticas existentes com todas as migrações | passa |
| `node supabase/tests/publication-tool.database.test.mjs` | SQL gerado aplicado duas vezes, ativado e revertido (fixture e lote real de 710 runs via `PUBLICATION_DIR`) | passa |
| `pnpm build`, `pnpm contracts:check` | build e contratos gerados em dia | passam |

Falha anterior a este trabalho: `node supabase/tests/policies.test.mjs` exige o contêiner `gaiapus-policy-test-20261114`, que não existe na máquina onde os testes rodaram.

Não foram rodados: E2E de navegador no build de produção, testes de duas contas contra Auth real e qualquer teste contra o projeto de destino.

## 12. Medições (máquina de desenvolvimento)

Intel i9-14900K, 64 GB, Windows, Node 22.23.2; API em processo único com Brasil fixado e EUA de diretório local (não Supabase).

| Medida | Valor |
|---|---:|
| RSS em repouso | 114 MiB |
| Catálogo completo, primeira leitura / seguinte | 64 ms / 14 ms (613 kB de resposta, 249 lugares) |
| Catálogo de um lugar | 1,8 ms (4,3 kB) |
| Primeira série / mesma série em cache | 21 ms / 2,6 ms (88 kB de resposta) |
| Cinco séries distintas simultâneas, frias | 64 ms |
| RSS após uma série / cinco séries | 125 MiB / 125 MiB |
| RSS após pedir as 710 séries em sequência (cache limitado a 64 MB) | 361 MiB de pico |

O RSS é do processo inteiro e inclui lixo ainda não coletado. Com o Supabase como fonte, os tempos frios incluirão a rede e não foram medidos. Para um servidor com pouca memória, reduza `SIMULATION_CACHE_MB`. A página deve consultar o catálogo por lugar, não o catálogo completo.

## 13. Retorno esperado

```text
APP: commit e versão da imagem
Supabase: projeto kgtvvdwwqnmmjbtcmbbu, versão da CLI e do Postgres
Migrações aplicadas: lista
Lote EUA: us-74a444b5fb7f886e, manifesto 74a444b5…, 245 lugares, 710 runs
Verificação remota: 1422 / 1422
Brasil: contagem antes e depois
Permissões: visitante, usuário A, usuário B
Desempenho: tempos e RAM medidos no destino
Modelos promovidos: nenhum
Pendências e erros encontrados (sem tokens)
```
