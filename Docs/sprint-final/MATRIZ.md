# Sprint final Field Shift — matriz de achados

Plano: `ideias_nasa/docs/superpowers/plans/2026-11-15-sprint-final-field-shift-consolidado.md`.
Origem: **A** = avaliação externa (amigo), **C** = revisão do Claude (`Docs/revisao-produto-2026-11-15/REVISAO.md`), **X** = Codex.
A coluna "commit" só é preenchida quando o commit existe; "—" significa ainda não feito.

| # | Achado | Origem | Já resolvido? | Evidência | Tarefa | Teste | Commit |
|---|---|---|---|---|---|---|---|
| 1 | Simulador abria em safras passadas; sem escolha de lugar/cultura/ano | C | Sim (lote 1 de UX) | `PlanningSimulator.test.tsx`, `jornada.spec.ts` | — (não repetir) | os mesmos | `aa5ba36` |
| 2 | Sem botão "simular aqui" em Município e Explorar | C | Sim (lote 1) | `jornada.spec.ts` | — | os mesmos | `aa5ba36` |
| 3 | Trajetória climática sem explicação; execução abria no aquecimento (solo exposto) | C | Sim (lote 1) | `planning-member-help`, `planning-period` | — | os mesmos | `aa5ba36` |
| 4 | EUA: integração de contratos, API, lotes e ferramenta | X/C | Sim, no `main` | PR #7 | — | suíte da API | `13a140d` |
| 5 | EUA: lote publicado e ativo no Supabase | X | Sim | `handoff/us-v2-supabase/ESTADO.md` | — (não repetir) | `remote-verification.json` 1.422/1.422 | fora do Git |
| 6 | Roteiro do operador dizia "não aplicado / não enviado" | X | Sim | nota de atualização em `EXECUCAO-PARCEIRO.md` | 0 | leitura | M0 |
| 7 | Produção sem EUA | X | **Não** — configuração do serviço | `GET https://gaiapus.space/v1/simulations/capabilities` → 4 BR, 0 US (15/11, 15h40) | 0 / 6 | leitura | operador |
| 8 | Troca de lugar/safra com rede lenta podia mostrar a execução anterior sob o título novo | X | Sim | reproduzido no HEAD `50c828c` (2 testes falhando), corrigido | 1A | `PlanningSimulator.us.test.tsx` (3 novos), `jornada.spec.ts` (rede lenta) | M0 |
| 9 | Atendimento hídrico = razão de medianas (`p50(ETa)/(p50(ETa)+p50(déficit))`) | X | Sim | `waterSatisfaction`: mediana das razões por trajetória | 1B | `planning-model.test.ts` | M0 |
| 10 | Estresse reprodutivo exibido sob o rótulo de estresse do ciclo na comparação | X | Sim | duas linhas; ausente = "não calculado" | 1B | `PlanningSimulator.test.tsx` | M0 |
| 11 | Selo "Melhor atendimento hídrico" lia-se como melhor cultura; empate escolhia a primeira | X | Sim | "Maior atendimento hídrico", só quando único na precisão exibida | 1B | `planning-model.test.ts` | M0 |
| 12 | Só duas estratégias (A/B) no Field Shift | A | Não | — | 2 | `test_field_shift_extension.py`, `FieldShift.test.tsx` | — |
| 13 | Resumo e série diária do Field Shift seguem caminhos diferentes | X | Não | `adapters/index.ts` | 2 | teste de pacote incompatível | — |
| 14 | Prioridade do produtor não tem efeito na comparação | A/C | Não | `Plan.tsx`, `store.ts` | 3 | `field-shift-decision.test.ts` | — |
| 15 | Sem teste de sensibilidade de chuva | A | Não | — | 4 | `test_field_shift_forcing.py` | — |
| 16 | Temperatura +1,5 °C | A | Não (P2) | — | 4 | — | — |
| 17 | Glossário ET0/ETc/ETa, escala dos produtos, NDVI | A/C | Não | — | 5 | — | — |
| 18 | README em inglês, tabela de números e rastreabilidade | A | Não | — | 6 | — | — |
| 19 | Lotes 2–5 da revisão do Claude | C | Não — fora do sprint, exceto o que bloqueia a jornada | `REVISAO.md` §7 | 5 (parcial) | — | — |

Números citados na avaliação externa (por exemplo +115, −8,5, +8,8) são exemplos do texto, não resultados: nenhum foi copiado.
