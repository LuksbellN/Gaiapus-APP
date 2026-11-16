# Entrega

Branch `feat/field-shift-exposicao-chuva`, criada de `origin/main` em `1144ef1` (já com os PRs #15, #16 e #17). O número do PR, o commit de merge e o resultado do deploy ficam no próprio PR, em comentário feito depois da conferência em produção: este arquivo é escrito antes do merge.

## O que muda na tela

1. **Field Shift, tabela das estratégias.** O grupo "Cultura ou cobertura presente" ganha duas linhas, marcadas "derivado da série diária":
   - dias sem cultura nem cobertura de novembro a abril: A 0, B 0, C 93,3;
   - chuva nos dias sem cultura nem cobertura, no ano agrícola: A 114,8 mm, B 75,9 mm, C 1.032,3 mm.
   As diferenças seguem a referência escolhida e o ponto de chuva. Uma nota abaixo da tabela diz como as linhas são obtidas e o que não são.
2. **Field Shift, matriz agronômica.** Uma frase abaixo da matriz liga a linha "Erosão" (que continua "não avaliado") à linha de chuva da tabela.
3. **Rodapé de fonte** (Visão geral, Município, Planejar, Lugar, Simulador, Field Shift v1). "Publicação …" e "contrato …" passam a sair no idioma da tela, inclusive ao trocar de idioma sem recarregar.

## Arquivos

Novos:
- `apps/web/src/teammate/sim/field-shift-exposure.ts` e `field-shift-exposure.test.ts`
- `apps/web/src/teammate/ui/source.test.tsx`
- `Docs/aproveitamento-field-shift/20261115-221309/`

Alterados:
- `apps/web/src/teammate/sim/field-shift-decision.ts`: `pyRound2` e o pareamento por safra (`pairedStat`) passam a ser exportados; o comportamento é o mesmo.
- `apps/web/src/teammate/pages/FieldShiftStrategies.tsx`, `FieldShiftDecision.tsx`, `FieldShift.test.tsx`
- `apps/web/src/teammate/adapters/core.ts`, `http.ts`, `index.ts`, `locations.ts`, `http.test.ts`
- `apps/web/src/teammate/ui/index.tsx` (`Source`)
- `apps/web/src/teammate/i18n/messages/{pt-BR,en,es,fr,de}.ts`
- `apps/web/design/teammate-source-history.json` (registro da mudança em `ui/index.tsx`)
- `tests/e2e/regressao/field-shift.spec.ts`

Não alterados: pacote `field-shift-v2` e demais dados publicados, contratos, API, serviço Python, workflow de deploy, relatórios técnicos, plantas e tema, Minha área.

## Proveniência

- Ideia do indicador e identificação do rodapé em português: LaraLLC, branch `feat/field-shift-rotacoes` (`07c1c11`, `963c6d0`, `937c3c5`). Os textos de `source.version` e `source.contract` são dela, com o alemão ajustado.
- Código do indicador, testes e demais textos: escritos nesta entrega. Nenhum arquivo da branch dela foi copiado; ela não foi mergeada e continua como está no remoto.

## Limites

- Os números valem para Sorriso, MT, seis safras (2015/16 a 2020/21), um ponto de grade do NASA POWER e o calendário fixo do cenário. Não são medição de campo.
- "Sem cultura nem cobertura" é uma classificação sim ou não por dia. Palhada e porcentagem de cobertura não entram; em B os 15 dias depois da dessecação contam como sem cobertura.
- Não há estimativa de erosão ou de perda de solo.
- Novembro a abril é uma convenção da tela; outubro, fora da janela, teve 8,3% da chuva das seis safras.
- Com chuva ±20% as duas linhas não trazem resultado novo do modelo: o calendário é o mesmo e a chuva muda na proporção.
- Traduções es, fr e de sem revisão de falante nativo.
- Outros textos do rodapé continuam como vêm do dado (por exemplo `forecast_projection` e a frase de evidência em inglês).

## Fora desta entrega

- Seção do README sobre o desafio e declaração de uso de IA (ver DECISOES.md).
- Auditoria final pós-PR prevista em `2026-11-15-auditoria-final-pos-pr-gaiapus.md`: este PR deve entrar no lote auditado.
