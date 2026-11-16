# Relatórios técnicos das simulações futuras

Primeira entrega de `simulation-technical-report.v1`: toda simulação futura concluída tem um relatório técnico
legível pelo produtor, gerado sem clique no idioma que a aplicação está exibindo (pt-BR, en, es, fr, de; inglês
quando o idioma falta, é inválido ou não tem suporte). O texto vem de modelos determinísticos: nenhum modelo de
linguagem é chamado em tempo de execução, nenhum número científico é recalculado e os artefatos científicos
(`run.json`, `series.json.gz`) e seus hashes não são tocados.

Especificação de origem: `docs/superpowers/plans/2026-11-15-relatorios-tecnicos-simulacoes-futuras.md`, no
repositório científico.

## O que foi entregue

| Parte | Onde |
|---|---|
| Contrato aditivo (escopo, fatos, representação, documento, envelope, resolução de idioma) e duas rotas | `packages/contracts/scripts/report-definition.mjs` (tipos e OpenAPI gerados) |
| Fatos a partir de um run salvo e verificado, com digest estável | `apps/api/src/modules/simulations/reports/{input,facts,registry}.ts` |
| Idioma, formatadores explícitos, catálogos dos cinco idiomas, narrativa | `reports/{locale,format,document,chart,render}.ts`, `reports/messages/*.ts` |
| Exportações HTML e Markdown do mesmo documento | `reports/{html,markdown}.ts` |
| Serviço idempotente, rotas, armazenamento, precomputação | `reports/{service,handlers,repository,precompute,precompute-cli}.ts` |
| Relatórios em inglês das sete execuções brasileiras fixadas | `apps/api/data/report-publications/future-simulation-v1/` |
| Entrada no planejamento da safra, página de leitura, exportação e impressão | `apps/web/src/teammate/{sim/ReportEntry.tsx,sim/useSimulationReport.ts,sim/report-model.ts,pages/SimulationReport.tsx,pages/SimulationReport.css,ui/ReportDocument.tsx,adapters/simulation-reports.ts}` |

## Rotas

As duas rotas são públicas e servem apenas relatórios de publicações regionais públicas. O acesso é decidido a
partir do run em toda requisição: conhecer um `run_id` ou um `report_id` não autoriza nada.

### `POST /v1/simulations/:id/report`

Garante a representação (idempotente). Corpo opcional, só com identificadores e apresentação:

```json
{ "locale": "pt-BR", "scope": { "kind": "season", "crop_id": "soy", "harvest_year": 2027 }, "display_profile": { "time_zone": "America/Sao_Paulo" } }
```

- `locale`: texto não confiável, limitado a 256 caracteres; resolvido no servidor (`pt`, `pt-PT` → `pt-BR`;
  `en-*`, `es-*`, `fr-*`, `de-*` → idioma base; ausente, malformado ou sem suporte → `en`). Nada é lido de
  `Accept-Language`, IP, país da cultura ou conta.
- `scope`: execução completa (padrão) ou uma safra existente no run.
- `display_profile.time_zone`: fuso IANA para os instantes (padrão `UTC`). Datas de calendário nunca mudam.
- Qualquer outro campo (métricas, orçamento, área, versão de modelo, caminho) é recusado com `422`.

Resposta `200` (`Cache-Control: no-store`, porque traz a resolução de idioma desta requisição):

```json
{ "data": {
    "state": "succeeded", "report_id": "rep_…32 hex", "run_id": "sim_…", "reused": true,
    "locale_resolution": { "requested_locale": "pt-BR", "resolved_locale": "pt-BR", "fallback_reason": null },
    "representation": { "contract": "simulation-technical-report.v1", "facts_digest": "…", "resolved_locale": "pt-BR",
      "generated_at": "…", "sections": [], "conclusions": [], "actions": [], "document": {}, "artifacts": [] },
    "links": { "json": "/v1/simulations/sim_…/report?report_id=rep_…&format=json", "html": "…&format=html", "md": "…&format=md" },
    "error": null },
  "meta": { "app_contract_version": "0.1.0", "request_id": "…", "context_key": "simulation-technical-report.v1", "publication_version": "…" } }
```

A geração é síncrona (modelos de texto, dezenas de milissegundos): não existe fila, o estado vai direto a
`succeeded`, e `202` nunca é devolvido. Uma falha de renderização devolve `200` com `state: "failed"`,
`error: { code, attempts }` e `representation: null`; a simulação continua acessível e repetir o POST repete só
o relatório.

| Situação | Resposta |
|---|---|
| Run inexistente, publicação não pública, `report_id` de outro run | `404 not_found`, `private, no-store` |
| Run que não está `succeeded` | `409 simulation_not_succeeded` (a mensagem cita o estado) |
| Artefato do run com hash ou tamanho diferente do índice | `500 internal_error` “Artifact integrity check failed”; nenhum relatório anterior é servido |
| Série com hash diferente | relatório parcial, com identidade própria, seção de gráficos `unavailable` (`series_integrity_failed`) |
| Fonte de publicação fora do ar | `503 simulation_source_unavailable` (tentar de novo; nada degradado é guardado) |
| Corpo maior que 4 kB | `413 payload_too_large` |
| Muitas representações novas no mesmo minuto (processo inteiro) | `429 rate_limited`; reuso nunca é limitado |

### `GET /v1/simulations/:id/report?report_id=rep_…&format=json|html|md`

Lê uma representação guardada, no idioma em que foi guardada. `json` devolve o mesmo envelope (com
`locale_resolution: null`, pois nenhuma língua foi pedida). `html` é um documento completo e inerte
(`Content-Security-Policy: default-src 'none'; style-src 'sha256-…'`, sem script, link, imagem remota ou
atributo `style`), `md` é Markdown com todo texto escapado. Não existe `pdf`: o PDF é salvo pelo diálogo de
impressão do navegador. `ETag` é o SHA-256 do arquivo. `Cache-Control` é `public, max-age=31536000, immutable`
quando o relatório está em disco (precomputado ou em `REPORT_STORE_DIR`) e `public, max-age=300` quando está só
na memória do processo, porque uma reinicialização o regeneraria com outra data de geração.

## Como o relatório é gerado sozinho

1. **Publicação, sem usuário (inglês).** `pnpm --filter @gaiapus/api reports:precompute` grava o relatório de
   execução completa de cada run público em `apps/api/data/report-publications/future-simulation-v1/`
   (`index.json` + `reports/<report_id>/{report.json,report.html,report.md}`). Este é o gancho a chamar depois
   de fixar (`pin-future-simulation.mjs`) ou ativar uma publicação. `reports:check` verifica sem escrever; o
   teste “the reports pinned in the repository are current” falha se os relatórios fixados ficarem defasados.
   Opções: `--source <dir da publicação>`, `--out <dir>`, `--locales en,pt-BR,…`, `--prune`.
2. **Partida da API (opcional).** Com `REPORT_WARM=on`, a API garante em segundo plano o relatório em inglês de
   todo run público que as fontes listam. Fica **desligado por padrão**: isso lê o `run.json` e a série de todas
   as execuções de todas as fontes, e o lote dos EUA no Supabase tem 710 execuções (cerca de 152 MB). Sem essa
   opção, o relatório em inglês de um run que não está fixado no repositório nasce no primeiro pedido. Uma falha
   aqui só gera um aviso no log.
3. **Tela.** Ao exibir um run `succeeded`, o planejamento da safra faz um POST com o idioma efetivamente
   renderizado e escopo de execução completa. Trocar o dia, a trajetória, a vista ou o tema não pede nada.
   Trocar o idioma ou o run cancela o pedido anterior; uma resposta atrasada nunca é mostrada.

O produtor científico externo (`future_simulation_publish.py`, em outro repositório) **não foi alterado**: a
ligação com a finalização é o comando do item 1.

## Armazenamento

Relatórios ficam separados dos artefatos científicos. `ReportRepository` tem três implementações com a mesma
semântica (endereçamento por `report_id`, o primeiro a gravar vence, exportação só é servida se os bytes batem
com os hashes da representação):

- `FileReportRepository` somente leitura sobre os relatórios fixados no repositório;
- `MemoryReportRepository` limitado em bytes (padrão do processo para relatórios novos);
- `FileReportRepository` gravável quando `REPORT_STORE_DIR` é definido (sobrevive a reinicialização).

`report_id` é o hash de: versões de esquema, modelo e textos; `run_id`; hashes dos artefatos usados; escopo;
idioma resolvido; perfil de exibição; nível de acesso. Tema, câmera, zoom e cursor não participam. O
`facts_digest` (SHA-256 dos fatos canônicos) é o mesmo em todos os idiomas do mesmo run e escopo.

Variáveis: `REPORT_STORE_DIR`, `REPORT_CACHE_MB` (64), `REPORT_GENERATIONS_PER_MINUTE` (120), `REPORT_WARM`
(`off`).

**Supabase.** Não há migration nesta entrega. No caminho das simulações o Supabase é uma fonte de publicação
lida com a chave publicável; a API não tem credencial de escrita, então não poderia gravar relatórios lá. O
que falta para persistir no Supabase: (a) uma tabela aditiva de variantes de relatório (única por
`report_id`, com `run_id`, hashes das fontes, escopo, idioma, versões, bucket/caminho e SHA-256 de cada
exportação), leitura pública apenas para publicações regionais visíveis e escrita só pelo papel de serviço;
(b) a ferramenta de publicação enviar os relatórios precomputados junto com o lote; (c) uma implementação de
`ReportRepository` que leia essa tabela e o bucket público. Nada foi aplicado em banco algum.

## Regras de conteúdo que os testes fixam

- Estatísticas da safra são os quantis publicados; o déficit não é refeito subtraindo ETc e ETa; quantis de dias
  continuam fracionários; valor positivo abaixo da precisão aparece como `<0,1`, nunca zero.
- Contagem de eventos só é derivada quando `share × members` é inteiro (tolerância 1e-6); caso contrário a
  contagem é omitida e o problema é registrado. Frequência nunca é chamada de probabilidade calibrada.
- Rendimento é discriminado pela forma do resultado (indisponível, referência histórica, modelo), não pelo
  campo `status`. Referência municipal traz anos, escala e independência dos cenários.
- Gráficos usam só as três trajetórias representativas e a faixa diária publicada; cada gráfico tem tabela.
- Economia e comparação de manejos são declaradas indisponíveis; nenhuma moeda, custo, margem ou lâmina de
  irrigação aparece.
- Texto livre da fonte sem tradução conhecida é citado no original, rotulado, e o resumo avisa no idioma do
  relatório. Caminhos internos do pipeline são removidos; `sources` e `identity` nunca são expostos crus.
- Métrica ou evento fora do registro não recebe nome nem unidade: aparece com o identificador e um aviso.

## Verificação

```powershell
pnpm --filter @gaiapus/contracts test ; pnpm contracts:check
pnpm --filter @gaiapus/api test ; pnpm --filter @gaiapus/api typecheck ; pnpm --filter @gaiapus/api build
pnpm --filter @gaiapus/api reports:check
pnpm --filter @gaiapus/web test ; pnpm --filter @gaiapus/web typecheck ; pnpm --filter @gaiapus/web build
# Com a API (rotas de relatório) e o Vite deste checkout no ar:
$env:GAIAPUS_API_URL = 'http://127.0.0.1:3031'   # alvo do proxy do Vite (padrão: 3001)
$env:GAIAPUS_WEB_URL = 'http://127.0.0.1:5181' ; pnpm --filter @gaiapus/web test:e2e
```

Medição: `pnpm exec tsx scripts/measure-reports.ts` em `apps/api` (resultado em `medicoes.json`).
Capturas: `node scripts/shots-relatorio.mjs [run sem série]` em `apps/web` (resultado em `evidencias/`).

## Medições (15/11/2026)

Observadas em uma única sessão, numa máquina de desenvolvimento compartilhada (Windows 11, Node 22.23.2,
Intel Core i9-14900K, 64 GB), com outros processos em execução; não são uma meta de desempenho. Detalhe por
run em `medicoes.json`.

| O que | Resultado nas sete execuções brasileiras |
|---|---|
| Primeiro relatório de um run num processo novo (lê, confere hash e descomprime os artefatos) | mediana 68 ms, máximo 127 ms |
| Nova representação com os artefatos já em memória (20 repetições × 5 idiomas por run) | mediana por run de 8,6 a 14,7 ms; máximo 24 ms |
| Reuso em memória (mesmo pedido de novo, 200 repetições por run) | mediana 0,03 ms; máximo 1,6 ms |
| `POST` reutilizando relatório fixado em disco (30 por run, sem rede) | mediana 8,3 ms; máximo 18,6 ms |
| `GET` html / md / json (30 por run, sem rede) | medianas 1,3 / 0,8 / 2,7 ms |
| Tamanho em inglês, 2 safras | HTML 68–70 kB, Markdown 20–22 kB, JSON 58–60 kB |
| Tamanho em inglês, 4 safras | HTML 123–127 kB, Markdown 31–35 kB, JSON 100–106 kB |
| Outros idiomas | HTML 3 % a 5 % maior que o inglês |

## Limitações desta entrega

- Sem PDF gerado no servidor; sem motor econômico; sem comparação de manejos (o resultado
  `management-comparison-result.v1` não está ligado à API).
- Só publicações regionais públicas têm relatório. Relatório privado (orçamento, área, anotações) exigiria rota
  autenticada e variante privada própria.
- Capability com rendimento e `run_ids: []` continua sendo mostrada pelo catálogo, como antes; não existe
  relatório independente de capability.
- Um run sem série não abre no planejamento da safra (comportamento anterior da tela); o relatório dele é
  alcançado pelo endereço `#/relatorio?run=<id>`.
- Regras de publicação de rendimento dos EUA (`label_release_rule`) não têm tradução registrada: aparecem
  citadas em inglês, rotuladas.
- Com armazenamento só em memória, uma reinicialização regenera os relatórios não fixados com nova data de
  geração (mesmo `report_id`, mesmos fatos).
