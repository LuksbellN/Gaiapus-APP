# 08 — Revisão das traduções

Data: 14/11/2026. Escopo: textos en, es, fr e de dos tutoriais (`04`, seções 6 e 7) e do glossário científico (`07`, seção 7).

## Como foi feita

1. Rascunho técnico das traduções por mim (Claude).
2. Revisão independente pelo Codex CLI (`codex-cli 0.169.0-alpha.11.1`), em modo somente leitura, com o pedido em `evidencias/2cf2881/scripts/codex-review-prompt.md`. Critérios: sentido idêntico ao pt-BR (sobretudo ressalvas científicas e de privacidade), terminologia agronômica, registro formal (usted, vous, Sie), tipografia de cada língua, consistência e preservação de variáveis.
3. Conferência de cada apontamento por mim. Parecer completo do Codex: `evidencias/2cf2881/revisao-codex.md`.

## Resultado

| | Quantidade |
|---|---|
| Apontamentos do Codex | 41, em 26 chaves |
| Aceitos e aplicados | 41 (37 substituições de texto + espaços finos do francês em todas as linhas fr) |
| Recusados | 0 |
| Variáveis `{n}`, `{total}`, `{lugar}` | preservadas nas cinco línguas |

### Correções que mudavam o sentido (gravidade alta)

| Chave | Idioma | Problema | Correção aplicada |
|---|---|---|---|
| `tour.overview.2` | es, de | Falta de água afirmada como certa; o original diz "deve receber" | "se espera que…" / "voraussichtlich…" |
| `tour.plan.3` | fr | "Não é recomendação" sem o objeto | "…recommandation de semis" |
| `tour.sim.5` | es, fr, de | "Efeito do manejo não avaliado", sem "no rendimento": ampliava a ressalva | Acrescentado "sobre el rendimiento / sur le rendement / auf den Ertrag" |
| `tour.farm.5` | de | Confirmação de exclusão pouco clara | "das Löschen erfordert eine Bestätigung" |
| `science.notReleased` | fr | "Non validé" (validação científica) em vez de "não liberado" (autorização de uso) | "Non autorisé pour un usage opérationnel" |

### Terminologia unificada

| Conceito | en | es | fr | de |
|---|---|---|---|---|
| Talhão | field | parcela | parcelle | Schlag |
| Safra | crop season | campaña agrícola | campagne agricole | Anbausaison |
| Semeadura | sowing | siembra | semis | Aussaat |
| Rendimento | yield | rendimiento | rendement | Ertrag |
| Reserva de água no solo | soil water reserve | reserva de agua del suelo | réserve en eau du sol | Bodenwasservorrat |
| Erro médio (MAE) | mean absolute error (MAE) | error absoluto medio (MAE) | erreur absolue moyenne (MAE) | mittlerer absoluter Fehler (MAE) |
| Selo de contexto | badge | etiqueta | badge | Kennzeichnung |
| Palhada | crop residue cover | rastrojo | couverture du sol par des résidus de culture | Ernterückstände |

Tipografia francesa: espaço fino inseparável (U+202F) antes de `; ? !`, espaço inseparável (U+00A0) antes de `:` e dentro de `« »`.

## O que esta revisão não cobre

- Os ~800 textos de interface que ainda serão extraídos das telas (tarefa I5). Eles passam pelo mesmo processo quando forem escritos, usando a terminologia acima.
- Revisão por falante nativo com prática agronômica. Recomendada antes de divulgar fora da equipe, principalmente para `science.*` e consentimento.
