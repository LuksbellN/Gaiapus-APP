# Validação

Executada em 15/11/2026, entre 22:13 e 22:50 (UTC−03:00), na branch `feat/field-shift-exposicao-chuva`, criada de `origin/main` em `1144ef18afa0f7c98ab2c2fd93ed1dda3b91d937`. Windows 11, Node v22.23.2 (o repositório pede ≥ 22.23.4 e < 23; o pnpm avisa, os comandos rodam), pnpm 10.14.0.

## Comandos e resultados

| Comando | Resultado |
|---|---|
| `pnpm --filter @gaiapus/web test` | 63 arquivos, 600 de 600 |
| `pnpm --filter @gaiapus/web typecheck` | sem erros |
| `pnpm --filter @gaiapus/web build` | concluído |
| `pnpm exec playwright test` (Vite da branch em 5181 → API da branch em 3031, dados de exemplo locais) | 171 de 171 |
| `pnpm --filter @gaiapus/api test` | 154 de 154 |
| `pnpm --filter @gaiapus/contracts test` · `pnpm contracts:check` | 33 de 33 · contratos conferem |
| `pnpm --filter @gaiapus/api reports:check` | nenhum relatório defasado |

Os testes de API, contratos e relatórios rodaram antes das correções da revisão; depois delas só mudaram arquivos do app web, e a suíte web, o typecheck, o build e o navegador foram repetidos.

Não executado: testes do serviço Python e de banco (nada disso mudou); teste de carga; aparelho real (o celular foi emulado a 390 px); revisão das traduções es/fr/de por falante nativo.

## Testes novos

- `sim/field-shift-exposure.test.ts` (14): fórmula em caso feito à mão; mesma contagem de dias em outras datas dá outra chuva; colunas ilegíveis recusadas (chuva não finita, negativa ou nula; marca que não é sim/não; data fora do calendário; comprimentos diferentes; coluna ausente; safra repetida); valores do pacote; referência C; chuva −20% e +20%; recusas (dia marcado diferente, chuva alterada, outro fator, outro lugar, safra a menos, ponto de chuva com outro calendário ou outra chuva, fator inválido, mesma contagem em outros dias, chuva movida dentro da safra, dia repetido, safra fora da semeadura publicada).
- `pages/FieldShift.test.tsx` (+3): linhas e valores na tabela; referência C com chuva −20%; série incoerente retém só as duas linhas.
- `ui/source.test.tsx` (3): rodapé em pt, en, de, fr e es na mesma tela, sem novo carregamento; rodapé sem versão; rodapé só com versão.
- `adapters/http.test.ts` (+1, 1 alterado): versão e contrato chegam como dados; a estimativa de rendimento mantém a versão.
- `tests/e2e/regressao/field-shift.spec.ts` (+2): valores, referência e chuva no navegador; troca de idioma sem recarregar no Field Shift e no rodapé de Visão geral.

Antes da implementação os testes novos falharam (módulo inexistente; 5 falhas na primeira rodada da tela e do rodapé; 11 na rodada das correções da revisão).

## Conferência independente dos números

Recalculados em Python, com aritmética decimal, a partir de `series.json` e `summary.json` do pacote `field-shift-v2-0d12285bf7a9`:

| | A | B | C |
|---|---:|---:|---:|
| Dias sem cultura nem cobertura de novembro a abril | 0 | 0 | 93,333 |
| Chuva nesses dias, ano agrícola (mm) | 114,807 | 75,883 | 1.032,348 |
| Idem com chuva × 0,8 | 91,845 | 60,707 | 825,879 |
| Idem com chuva × 1,2 | 137,768 | 91,060 | 1.238,818 |

Diferenças pareadas com a chuva histórica: B − A = −38,92 (−119,13 a −2,15); C − A = +917,54 (+625,35 a +1.106,34). Parcela da chuva de novembro a abril: 9.960,08 de 11.736,52 mm (84,9%). Os três pontos de chuva do pacote têm o mesmo calendário, e a chuva anual publicada difere de fator × soma diária em no máximo 0,05 mm.

## Revisão independente

Feita por outro agente sobre o diff, sem acesso às minhas conclusões além do contexto da tarefa. Recalculou todos os valores acima e confirmou. Achados e tratamento:

| Achado | Tratamento |
|---|---|
| A conferência só comparava totais por safra: mesma contagem em outros dias, ou chuva movida dentro da safra, passariam. | Corrigido: quatro verificações a mais (ver DECISOES.md) e três testes com os casos apontados. O limite que resta está escrito no código e em DECISOES.md. |
| Arredondamento duplo mostrava 1.032,4 e 91,9 onde o valor é 1.032,3 e 91,8. | Corrigido; os testes agora fixam os textos exatos. |
| Qualquer erro virava a mesma frase, sem motivo visível. | A linha passa a trazer o código do motivo (`data-reason`) e a frase foi generalizada. |
| A frase sobre erosão prometia um valor mesmo com as linhas retidas. | Reescrita para dizer o que a linha é. |
| Linhas derivadas sem marca visível. | Marca "derivado da série diária" nas duas linhas. |
| Alemão: "Vertrag" fora do termo do catálogo. | Trocado por "Schnittstellenvertrag". |
| "Convenção deste estudo" sugeria que o pacote define a janela. | "Convenção desta tela". |
| Faltavam testes do portão, da versão na estimativa de rendimento e do rodapé só com versão. | Acrescentados. |

Itens que a revisão registrou como anteriores e não tocados: a cobertura ainda mostra a versão sem a palavra "Publicação"; `result_basis` e a frase de evidência em inglês aparecem como vêm do dado; a matriz de culturas tem uma fonte em português.

## Evidências

`evidencias/capturas.txt` lista cada imagem com endereço, idioma, tema e janela. "Antes" é a produção (`https://gaiapus.space`, `main` em `1144ef1`); "depois" é a branch servida localmente.

- Tabela, grupo "Cultura ou cobertura presente": pt claro, en escuro, referência C com chuva −20%, celular a 390 px.
- Nota abaixo da tabela e matriz agronômica.
- Rodapé de fonte em inglês na Visão geral: antes "Publicação science-… · contrato water_risk_projection"; depois "Publication science-… · contract water_risk_projection".
