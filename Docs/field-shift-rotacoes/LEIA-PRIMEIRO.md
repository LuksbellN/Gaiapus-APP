# Field Shift — rotações: leia primeiro

Branch `feat/field-shift-rotacoes`, criada a partir do `main` em `397d7b4`. Sem PR e sem merge: o merge no `main` dispara o deploy no Azure (`.github/workflows/deploy-azure.yml`, `on: push: branches: [main]`). Lista de arquivos: [ARQUIVOS-ALTERADOS.txt](ARQUIVOS-ALTERADOS.txt). Números da demo: [NUMEROS-DEMO.md](NUMEROS-DEMO.md).

## O que mudou e por quê

O `main` já tinha as três estratégias (pacote `field-shift-v2-0d12285bf7a9`), a prioridade do produtor, os cartões de decisão, a sensibilidade de chuva e o guia de leitura (PR #8). Esta branch fecha o que ainda faltava no brief "Field Shift", sem criar uma segunda versão de C: tabela, gráfico e cartões continuam lendo só o pacote v2.

1. **Ciência** (`07c1c11`): `services/science-adapter/field_shift_rotations.py` reproduz A e B publicados com o motor FAO-56 do pacote (erro máximo de 0,0023 mm; falha e não gera nada acima de 0,01 mm) e só então calcula C e a sensibilidade de chuva ±20%. Saída versionada: `apps/web/src/teammate/data/sorriso-field-shift-rotations.json`. `sorriso-daily-soy-fallow.json` não foi versionado, porque a série diária de C já está em `field-shift-v2/series.json`.
2. **Solo nu e estações vulneráveis** (`963c6d0`): cartão novo com dias de solo nu, dias de solo nu na estação chuvosa (nov–abr) e chuva sobre solo nu ("proxy de exposição à erosão, não erosão"), A/B/C com B − A e C − A pareados por safra, linhas de chuva ±20% rotuladas como teste de sensibilidade e temperatura +1,5 °C como não simulada. O cartão só aparece se os dias cobertos e de solo nu de cada safra forem idênticos aos do pacote v2; se não forem, não mostra nenhum número. Com a prioridade "conservação", ele vem antes dos cartões de rotação. A matriz agronômica continua "não avaliado" e aponta para este cartão na linha de erosão.
3. **Decisão** (`b117d79`): rodapé "Apoia, não substitui, a decisão do produtor e do agrônomo." nos cartões; frase gerada no seletor de prioridade, com os números do ponto de chuva na tela; `plan.form.priorityNote` passou a dizer "Ordena os indicadores do Field Shift; não altera os cálculos." (o texto anterior dizia que a prioridade não alterava nada).
4. **README e documentos**: seção "How Gaiapus answers Field Shift" no `README.md` e esta pasta.
5. **Guia de leitura**: o bloco "Como ler estes números" ganhou a reserva de água do solo (AD4, 55 mm, lida do pacote), NDVI (HLS, 30 m, só em dias sem nuvem) e satélite × estação × sonda (POWER/IMERG = ponto de grade do município; HLS = talhão; sonda = um ponto a 15 e 40 cm). A tela Sondas aparece como demonstrativa, com dados sintéticos.
6. **Inglês e celular**: a varredura de 15 rotas em inglês achou só o rodapé de fonte em português ("Publicação science-…", "contrato water_risk_projection", vindo de `adapters/http.ts`, `locations.ts` e `index.ts`); agora ele passa por `translate`. O e2e `tests/e2e/regressao/field-shift.spec.ts` ganhou o cartão de solo nu (pt-BR), a tela em inglês sem português e as tabelas A/B/C a 375 px em pt-BR e en (rolagem dentro do quadro, página sem rolagem lateral).

## Resultado dos testes (15/11/2026, nesta branch)

| Comando | Resultado |
|---|---|
| `pnpm --filter @gaiapus/web typecheck` | sem erros |
| `pnpm --filter @gaiapus/web test` | 52 arquivos, 442 de 442 |
| `pnpm test` (contratos e API) | 28 de 28 · 56 de 56 |
| `pytest tests/test_field_shift_rotations.py` | 7 de 7 |
| `pnpm exec playwright test` (Vite 5174 → API 3001 em modo fixture) | 145 de 145 |
| `vite build` | concluído |

Numa das execuções completas da suíte web, falhou o teste intermitente "Brazil → US → Brazil", já registrado em `Docs/sprint-final/ESTADO.md`. Ele passou isolado 2 de 2 vezes, e as execuções seguintes deram 442 de 442.

**Escolhas registradas**
- O déficit na implantação na tela continua 1,57 mm (v2, 6 safras). O 1,88 mm da extensão (5 transições) só aparece na nota de `NUMEROS-DEMO.md`.
- A drenagem **não** foi rotulada como "proxy de lixiviação": o pacote v2 e a tela já dizem que drenagem não mede erosão, lixiviação nem infiltração, e o rótulo novo contradiria isso.
- O README não afirma a comunidade "AG" do NASA POWER, porque o repositório não a registra.

## Como testar

```powershell
pnpm install --frozen-lockfile
pnpm --filter @gaiapus/contracts build      # sem isso, typecheck e testes não acham @gaiapus/contracts
pnpm --filter @gaiapus/web typecheck
pnpm --filter @gaiapus/web test
pnpm test
cd services/science-adapter; python -m pytest tests/test_field_shift_rotations.py
```

Com Node 25 ou mais novo (o repositório pede 22), o `localStorage` embutido do Node quebra os testes de preferências e sessão no jsdom. Nesse caso, rode os testes web com `$env:NODE_OPTIONS='--no-experimental-webstorage'`. Com Node 22 não é preciso.

Para conferir na tela, abra `/#/field-shift`; com outra prioridade, `/#/field-shift?prioridade=producao`; e com chuva −20%, `/#/field-shift?chuva=-20`.

## Arquivos

Novos:
- `services/science-adapter/field_shift_rotations.py`
- `services/science-adapter/tests/test_field_shift_rotations.py`
- `apps/web/src/teammate/data/sorriso-field-shift-rotations.json`
- `apps/web/src/teammate/sim/field-shift-bare-soil.ts` e `field-shift-bare-soil.test.ts`
- `apps/web/src/teammate/pages/FieldShiftBareSoil.tsx`
- `Docs/field-shift-rotacoes/` (este arquivo, `NUMEROS-DEMO.md`, `ARQUIVOS-ALTERADOS.txt`)

Modificados:
- `apps/web/src/teammate/adapters/index.ts` (`simulations.fieldShiftBareSoil`)
- `apps/web/src/teammate/pages/FieldShift.tsx` (posição do cartão, frase), `FieldShiftDecision.tsx` (frase, rodapé, nota da matriz), `FieldShift.test.tsx`
- `apps/web/src/teammate/adapters/http.ts`, `locations.ts` (rodapé de fonte traduzido)
- `tests/e2e/regressao/field-shift.spec.ts`
- `apps/web/src/teammate/ui/ScienceReadingGuide.tsx` (reserva, NDVI, satélite × estação × sonda)
- `apps/web/src/teammate/i18n/messages/{pt-BR,en,es,fr,de}.ts`
- `README.md`

Não alterados: os pacotes com hash (`delivery/v7/`, `upstream/v7/`, `publications/science-*`, `Docs/gaiapus-v7-integracao-regional/`, `field-shift-v2/`), `sorriso-field-shift.json` e `sorriso-daily.json`.

## Traduções para revisão (es, fr, de: tradução direta)

Chaves novas, todas em `fieldShift.v2`, exceto a última:
- `bare.*`: `title`, `kind`, `intro`, `highlight`, `metric.bare_days`, `metric.bare_days_nov_apr`, `metric.rain_on_bare_soil_mm`, `proxy`, `sens.title`, `sens.label`, `sens.method`, `sens.rain`, `sens.comparison`, `sens.temperature`, `source`, `mismatch.title`, `mismatch.text`
- `matrix.erosionLink`
- `card.footer`
- `guide.soil`, `guide.ndvi`, `guide.sources`
- `source.version`, `source.contract` (fora de `fieldShift.v2`: rodapé de fonte)
- `priority.sentence.conservacao`, `priority.sentence.producao`, `priority.sentence.margem`
- `plan.form.priorityNote` (texto trocado)
