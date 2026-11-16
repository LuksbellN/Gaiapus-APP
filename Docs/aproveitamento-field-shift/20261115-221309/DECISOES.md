# Decisões

## Aproveitado (adaptado)

1. **Chuva em dias sem cultura nem cobertura.** Ideia do colaborador (commits `07c1c11` e `963c6d0` de `feat/field-shift-rotacoes`, LaraLLC). A implementação é nova:
   - contagem e soma no navegador sobre as colunas diárias do pacote v2 já fixado; nenhum balanço hídrico é refeito;
   - a identidade da série vem do pacote: os bytes de `series.json` são conferidos contra o sha256 do manifesto quando o app é construído (`field-shift-decision.test.ts`);
   - ao abrir a tela há uma conferência de coerência, e as duas linhas só aparecem se ela passar: as três estratégias têm a mesma chuva e os mesmos dias; a marca de cobertura concorda com o uso da terra do dia; os dias são consecutivos; cada safra começa e termina nas semeaduras publicadas; e os dias sem cobertura, a duração e a chuva de cada safra são os do resumo (tolerância de 0,1 mm, o arredondamento do valor anual publicado). Se não passar, as duas linhas dizem que não foram calculadas e o restante da tabela continua;
   - limite dessa conferência: ela não prova a posição de cada dia. Uma série alterada de modo coerente em todos esses pontos ao mesmo tempo passaria; contra isso existe só a conferência dos bytes na construção;
   - duas linhas no grupo "Cultura ou cobertura presente" da tabela existente, marcadas na tela como "derivado da série diária": dias de novembro a abril e chuva no ano agrícola inteiro. Seguem a referência escolhida (A, B ou C), o ponto de chuva e a ordem da prioridade;
   - com chuva ±20% o valor é o histórico multiplicado pelo fator, depois de conferir que o ponto do pacote tem o mesmo calendário e a chuva anual correspondente. A nota diz que é proporção, não resultado novo;
   - as médias ficam sem arredondar até a tela, para arredondar uma vez só (C aparece como 1.032,3 mm, de 1.032,348);
   - novembro–abril aparece como convenção desta tela (o pacote não define estação chuvosa), com a parcela da chuva das seis safras que caiu nesses meses, calculada da própria série: 85%. Outubro, que fica fora, teve 8,3% da chuva;
   - a nota diz que é exposição sob a hipótese de calendário, não perda de solo, e que palhada não entra na classificação. A linha "Erosão" da matriz continua "não avaliado"; a frase abaixo dela diz o que a linha da tabela é.
2. **Rodapé de fonte no idioma da tela.** Problema achado pelo colaborador (commit `937c3c5`). As chaves `source.version` e `source.contract` e seus textos são dele, exceto o alemão, que passou de "Vertrag" para "Schnittstellenvertrag", o termo que o catálogo já usa. A implementação muda: versão e contrato viram campos do metadado e são traduzidos por `Source` ao desenhar, de modo que trocar de idioma sem recarregar atualiza o texto.

## Já atendido na `main`

- Frase por prioridade: os cartões já mostram os mesmos números, na ordem da prioridade.
- Rodapé de apoio à decisão: cada cartão já traz lacunas e riscos para revisar no local.
- Solo AD4 de 55 mm como hipótese fixa: rodapé da tabela e evidência dos cartões.
- Tela em inglês e tabelas a 375 px nos testes de navegador.

## Descartado

- `field_shift_rotations.py`, seus testes e `sorriso-field-shift-rotations.json`: segundo motor para números que a série publicada já contém.
- `checkBareSoil`: compara contagens anuais; duas máscaras com a mesma contagem e chuvas diferentes passariam.
- Cartão separado com diferenças fixas contra A ao lado de uma tabela que acompanha a referência.
- "Rotação atual" para A, "solo nu", "proxy de exposição à erosão" e "9×".
- Nota de Planejar sobre o Field Shift: efeito que a navegação atual não produz.
- Itens de NDVI e de satélite × estação × sonda no guia.
- Déficit de implantação de 1,88 mm (5 transições): não entra em lugar nenhum; a tela mantém 1,57 mm (6 safras).

## Não incorporado por falta de evidência

- Seção do README que descreve "o que o brief pede": a íntegra do brief não está nos repositórios.
- Declaração de uso de IA no README: texto da equipe, fora do escopo desta entrega.
