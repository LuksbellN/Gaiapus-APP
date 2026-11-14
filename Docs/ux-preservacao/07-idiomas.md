# 07 — Cinco idiomas

Português, inglês, espanhol, francês e alemão. Nada disso existe hoje: não há biblioteca, catálogo, seletor nem chave de preferência (D-17). Marcas: [N] navegador, [C] código, [T] teste, [D] documentação, [H] hipótese.

## 1. Idiomas e rótulos

| Idioma | Rótulo no seletor | Tag | Formatação padrão |
|---|---|---|---|
| Português | Português | `pt-BR` | `pt-BR` |
| Inglês | English | `en` | `en-US` para números e datas [decisão minha, corrigível; ver seção 6] |
| Espanhol | Español | `es` | `es` |
| Francês | Français | `fr` | `fr` |
| Alemão | Deutsch | `de` | `de` |

Sem bandeiras. Cada rótulo escrito na própria língua e marcado com `lang` (`<span lang="de">Deutsch</span>`), para leitor de tela pronunciar certo.

## 2. Seletor

```text
Desktop  [🌐 Português ▾]        Celular  [🌐 PT ▾]
         ┌───────────────┐
         │ ✓ Português   │
         │   English     │
         │   Español     │
         │   Français    │
         │   Deutsch     │
         └───────────────┘
```

- No cabeçalho, em todas as telas, antes e depois do login. Também em "Mais › Conta e ajuda" e na tela de Conta.
- Elemento: `<select>` nativo estilizado ou botão + lista com `role="listbox"`. Recomendo o `<select>` nativo: teclado, leitor de tela e celular resolvidos de graça, e o projeto já estiliza `select` (`styles.css`).
- Ícone `Languages` do Lucide (já instalado, `lucide-react/dist/esm/icons/languages.js`). Nome acessível "Idioma" na língua atual **e** "Language" fixo no `title`, para quem caiu numa língua que não lê.
- Trocar não recarrega a página, não muda a rota nem os parâmetros, não sai da conta, não reinicia a linha do tempo, não perde rascunho, não reinicia o tutorial.

## 3. Preferência e escolha inicial

```text
idiomaAtivo =
  1. escolha explícita guardada neste aparelho
  2. senão, primeiro de navigator.languages que case com pt, en, es, fr, de
     (pt-PT, pt → pt-BR; en-GB → en; es-MX → es; fr-CA → fr; de-AT → de)
  3. senão, inglês
```

- Onde guardar: chave nova `gaiapus.prefs` no `localStorage`, **fora** dos baldes `gaiapus.v1.guest` e `gaiapus.v1.user.<id>`. Conteúdo: `{ "v": 1, "locale": "de", "theme": "light" }`. O tema vai junto, resolvendo D-20.
- Por quê fora do balde da conta: é preferência do aparelho, não dado privado. Trocar de conta não troca o idioma; sair da conta também não.
- `index.html` lê `gaiapus.prefs` antes do primeiro desenho para `lang`, título e tema (hoje lê a chave antiga, D-20).
- Migração: na primeira carga, se `gaiapus.prefs` não existir, copiar `theme` do balde ativo. Não apagar nada dos baldes.
- Sincronizar com a conta: só depois que `/v1/me` aceitar os cinco idiomas (hoje `Preferences.locale` é `'pt-BR' | 'en'`). Quando houver, a regra é: escolha local explícita vence; sem escolha local, usar a da conta.
- Idioma **não** vai na URL. Um link compartilhado abre na língua de quem recebe. Exceção: `?lang=` aceito só nos testes.
- **Decidido (Leandro, 14/11/2026): inglês é o idioma de reserva.**

## 4. Catálogo de mensagens

### Biblioteca

Avaliei três caminhos:

| Opção | Tamanho | A favor | Contra |
|---|---|---|---|
| Módulo próprio (`t(key, vars)` + `Intl.PluralRules`) | ~2 kB | Sem dependência; controle total; cabe no padrão do projeto | Plural e seleção por gênero feitos à mão; sem ferramenta de extração |
| `i18next` + `react-i18next` | ~15 kB gzip | Maduro; plural, contexto, carregamento por namespace | Dependência nova no lockfile da raiz (coordenar com o responsável pela API) |
| `@formatjs/intl` / ICU MessageFormat | ~20 kB | Formato padrão de mercado, bom para tradutores | Maior; curva de aprendizado |

**Recomendação:** módulo próprio. Volume moderado (~800 trechos), cinco línguas, plural simples, e o monorepo pede coordenação para mexer no lockfile. Se a equipe de tradução exigir ICU, migrar depois: as chaves não mudam.

### Interface

```ts
// apps/web/src/teammate/i18n/index.ts
export type Locale = 'pt-BR' | 'en' | 'es' | 'fr' | 'de';
export function useI18n(): { locale: Locale; t: (key: MessageKey, vars?: Record<string, string | number>) => string; setLocale: (l: Locale) => void; fmt: Formatters };
```

- Chaves estáveis, por módulo: `nav.*`, `explore.*`, `geo.*`, `overview.*`, `municipality.*`, `plan.*`, `sim.*`, `fieldShift.*`, `records.*`, `devices.*`, `account.*`, `auth.*`, `errors.*`, `science.*`, `tour.*`, `common.*`.
- Interpolação por nome (`{lugar}`), nunca concatenação de frases. Plural por `Intl.PluralRules` (`{count, plural}` resolvido no módulo).
- Tipagem: `MessageKey` gerado do catálogo `pt-BR`; `tsc` acusa chave inexistente.
- Carregamento: `pt-BR` no pacote principal (é o público principal e o texto-fonte); `en`, `es`, `fr`, `de` como módulos sob demanda (~25–35 kB cada, [H]). Falha no carregamento: mantém o idioma anterior e mostra "Não foi possível carregar o idioma. Tentar de novo." Nenhum idioma depende de requisição a cada tela.
- O build por arquivo do protótipo não é alvo (README do monorepo); se voltar a ser, ele embute os cinco.

### O que traduzir

Navegação, botões, campos, dicas, placeholders, erros, avisos, selos (`Pill`), origem (`Source`), legendas e eixos de gráfico, estados vazios, capacidades, avisos científicos, títulos de tela e do documento, textos acessíveis (`aria-label`, `sr-only`), mensagens de `lib/api/client.ts`, `adapters/http.ts`, `adapters/session.ts`, `features/auth/*`, `main.tsx` (falha de inicialização, em texto embutido nas cinco línguas porque o catálogo pode não ter carregado) e todos os passos de tutorial.

### O que não traduzir

Marca "Gaiapus" (`translate="no"`), conteúdo digitado pelo usuário, nomes de propriedade e talhão, nomes de modelo (`Ridge`, `MLP`, `HGB`), versões, códigos (IBGE, cena HLS), nomes de fonte de dado (NASA POWER, IMERG, Open-Meteo, ECMWF IFS), texto original vindo da API. Avisos científicos que chegam como texto livre da API (`warnings`, `evidence`) aparecem no original com um rótulo "texto original da fonte"; onde o frontend já os reescreve (ex.: `FieldShift.tsx:25`), a reescrita vira chave traduzida.

### Problemas de montagem a corrigir

- `.toLowerCase()` em nomes (15 usos, D-17): substituir por chaves com o nome no caso certo, ou por frases que não precisam de minúscula ("Cultura: Soja").
- Frases quebradas em pedaços JSX (`Overview.tsx:34`, `Plan.tsx:56`): uma chave por frase com marcação rica (`<b>` por placeholder).
- Comparação por rótulo (`Plan.tsx:49` `=== 'Irrigado'`): passa a comparar o código.

## 5. Valores gravados: códigos em vez de rótulos

Hoje registros e planos guardam o texto da opção (`Records.tsx:51-56`, `Plan.tsx:22`). Traduzir as opções sem mudar isso gravaria `'Rainfed'` num registro e `'Sequeiro'` em outro.

Proposta: gravar código; exibir rótulo traduzido; ler os dois.

| Campo | Valores gravados hoje | Código novo |
|---|---|---|
| irrigação | `Sequeiro`, `Irrigado` | `rainfed`, `irrigated` |
| solo | `Não sei`, `Arenoso`, `Médio`, `Argiloso` | `unknown`, `sandy`, `medium`, `clay` |
| sistema | `Plantio direto`, `Convencional`, `Cultivo mínimo` | `no_till`, `conventional`, `minimum_till` |
| tipo de manejo | `Emergência` … `Outro` (9) | `emergence`, `flowering`, `irrigation`, `fertilization`, `pruning`, `pest_disease`, `damage`, `soil_test`, `other` |
| forma do café | `Cereja`, `Coco`, `Beneficiado` | `cherry`, `dried_cherry`, `green` |
| origem da colheita | `Pesagem`, `Romaneio do armazém`, `Estimativa própria` | `weighing`, `warehouse_ticket`, `own_estimate` |
| situação da venda | `Realizado`, `Previsto` | `actual`, `planned` |
| cultura | nome (`Soja`) + `cultura_id` já existe | só `cultura_id`; nome mantido para leitura antiga |
| unidade | `saca`, `kg`, `t` | já são códigos; manter |
| moeda | `BRL`, `USD` | já são códigos ISO 4217; manter |
| prioridade | `margem`, `producao`, `conservacao` | já são códigos; manter |

Migração aditiva, como a de culturas (`store.ts:22-23`):

- Ao carregar, para cada registro e plano, acrescentar `<campo>_code` quando o texto em português casar com a tabela. Não apagar nem reescrever o texto original.
- Texto que não casa (digitado à mão, versão antiga desconhecida) fica sem código e aparece como está, com "Completar" quando o campo é de escolha.
- Novas gravações escrevem os dois (`irrigacao: 'Sequeiro'`, `irrigacao_code: 'rainfed'`) durante uma versão, para quem voltar a uma versão antiga não perder leitura. Depois, só o código.
- `schema` do registro sobe de `1` para `2`; exportação inclui os dois campos.
- "Café" ambíguo continua pedindo complemento; tradução nenhuma transforma em arábica.

Rascunhos: guardados como texto digitado e **interpretados no idioma em que foram digitados**. Cada rascunho passa a carregar `__locale`. Rascunho antigo sem `__locale` é tratado como `pt-BR`.

## 6. Números, datas, moeda e unidades

### Formatação

Uma camada `fmt` com `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.PluralRules`, `Intl.DisplayNames`, instanciada pelo locale ativo e cacheada. Substitui `format.ts:2-15` (meses em array fixo) e os 17 `toLocaleString('pt-BR')` espalhados.

| Valor | pt-BR | en (en-US) | es | fr | de |
|---|---|---|---|---|---|
| 1234,5 | 1.234,5 | 1,234.5 | 1234,5 | 1 234,5 (espaço fino) | 1.234,5 |
| Data | 14 nov 2026 | Nov 14, 2026 | 14 nov 2026 | 14 nov. 2026 | 14. Nov. 2026 |
| Moeda BRL | R$ 63.000,00 | R$63,000.00 | 63.000,00 R$ | 63 000,00 R$ | 63.000,00 R$ |

Valores são ilustrativos; o teste compara com a saída do `Intl` da própria plataforma, não com string fixa.

### Leitura de números digitados (corrige D-03)

`Intl.NumberFormat` formata, não lê. Proposta de `parseLocaleNumber(texto, locale)`:

1. Remove espaços normais e não separáveis (U+00A0, U+202F) só quando o locale usa espaço como agrupador (fr); nos outros, espaço é erro.
2. Descobre os separadores do locale com `formatToParts(1234.5)`.
3. Aceita: dígitos, no máximo um separador decimal do locale, agrupadores do locale em posições de 3 dígitos.
4. **Recusa com orientação** quando o texto usa o separador decimal de outro locale de forma ambígua. Exemplo em pt-BR: `10.5` → "Use vírgula para decimais: 10,5". Em en: `10,5` → "Use a period for decimals: 10.5". `1.234` em pt-BR continua sendo mil duzentos e trinta e quatro (padrão de agrupamento válido); `1.5` não é.
5. Recusa notação científica (`10e2`), sinais soltos e mais de um separador decimal.
6. Devolve `{ ok: true, value }` ou `{ ok: false, reason: 'ambiguous' | 'invalid', hint }`.

Casos de teste obrigatórios:

| Entrada | pt-BR | en | es | fr | de |
|---|---|---|---|---|---|
| `10,5` | 10.5 | recusa (dica) | 10.5 | 10.5 | 10.5 |
| `10.5` | recusa (dica) | 10.5 | recusa | recusa | recusa |
| `1.234,5` | 1234.5 | recusa | 1234.5 | recusa | 1234.5 |
| `1,234.5` | recusa | 1234.5 | recusa | recusa | recusa |
| `1 234,5` (U+202F) | recusa | recusa | recusa | 1234.5 | recusa |
| `1.5` | recusa | 1.5 | recusa | recusa | recusa |
| `10e2` | recusa | recusa | recusa | recusa | recusa |
| `0` | 0 | 0 | 0 | 0 | 0 |

Valores salvos: o número canônico vai para o campo calculado; o texto digitado continua salvo como está (para edição e para rascunho). Trocar de idioma **nunca** reinterpreta strings salvas: um rascunho digitado em pt-BR continua sendo lido como pt-BR.

### Datas agronômicas

- Datas só-dia (`2026-11-14`) são tratadas como data de calendário, sem fuso. Hoje `format.ts:8` resolve isso montando `T12:00:00`; manter a técnica com `Intl.DateTimeFormat(..., { timeZone: 'UTC' })` sobre `Date.UTC`.
- Instantes (`issued_at`, `last_reading_at`) mostram o fuso: "14 nov, 03:00 (horário de Brasília)" em vez de "(hora local)" quando o dado é do Brasil; o fuso vem do dado ou da área.
- Data prevista e data realizada continuam campos separados.
- `<input type="date">` já entrega ISO; o rótulo do calendário vem do navegador.

### Moeda e unidades

- Idioma não é região: escolher inglês **não** converte BRL em USD, hectare em acre, nem kg/ha em bushel/acre. Nenhuma taxa de câmbio é inventada.
- `money(valor, moeda)` sempre com código ISO explícito do registro (`BRL` ou `USD`, já existe em `Records.tsx:114`). O plano hoje é sempre R$: o rótulo traduz "R$ por saca" como "BRL per bag", mantendo a moeda.
- "Saca" traduzida como termo com explicação ("bag (saca), weight you enter"), porque o peso é sempre informado (`units.ts:1`).

## 7. Glossário científico

Termos que precisam de tradução revisada, não automática. Linguagem do agricultor primeiro, termo técnico entre parênteses.

| Chave | pt-BR | en | es | fr | de |
|---|---|---|---|---|---|
| `science.et0` | Demanda de água da atmosfera (ET0) | Atmospheric water demand (ET0) | Demanda de agua de la atmósfera (ET0) | Demande en eau de l'atmosphère (ET0) | Wasserbedarf der Atmosphäre (ET0) |
| `science.storage` | Reserva de água no solo | Soil water reserve | Reserva de agua del suelo | Réserve en eau du sol | Bodenwasservorrat |
| `science.deficit` | Déficit hídrico (falta de água para a planta) | Water deficit (crop short of water) | Déficit hídrico (falta de agua para la planta) | Déficit hydrique (manque d'eau pour la plante) | Wasserdefizit (Pflanze bekommt zu wenig Wasser) |
| `science.ndvi` | NDVI (verde da vegetação visto do satélite, 0 a 1) | NDVI (vegetation greenness seen from satellite, 0 to 1) | NDVI (verdor de la vegetación visto desde satélite, 0 a 1) | NDVI (verdeur de la végétation vue par satellite, 0 à 1) | NDVI (Grün der Vegetation vom Satelliten aus gesehen, 0 bis 1) |
| `science.municipalScale` | Escala municipal: média do município, não do seu talhão | Municipal scale: municipality average, not your field | Escala municipal: promedio del municipio, no de su parcela | Échelle communale : moyenne de la commune, pas de votre parcelle | Gemeindeebene: Mittel der Gemeinde, nicht Ihres Schlags |
| `science.scenario` | Cenário hipotético (simulação com hipóteses declaradas) | Hypothetical scenario (simulation under stated assumptions) | Escenario hipotético (simulación con supuestos declarados) | Scénario hypothétique (simulation sous hypothèses déclarées) | Hypothetisches Szenario (Simulation unter genannten Annahmen) |
| `science.retrospective` | Retrospectivo (calculado para uma safra passada) | Retrospective (computed for a past season) | Retrospectivo (calculado para una campaña pasada) | Rétrospectif (calculé pour une campagne passée) | Rückblickend (für eine vergangene Saison berechnet) |
| `science.mae` | Erro médio (MAE), não é intervalo de confiança | Mean absolute error (MAE), not a confidence interval | Error absoluto medio (MAE), no es un intervalo de confianza | Erreur absolue moyenne (MAE), pas un intervalle de confiance | Mittlerer absoluter Fehler (MAE), kein Konfidenzintervall |
| `science.notReleased` | Não liberado para uso operacional | Not released for operational use | No liberado para uso operativo | Non autorisé pour un usage opérationnel | Nicht für den operativen Einsatz freigegeben |
| `science.climatology` | Climatologia (média de 2001–2021 para os mesmos dias) | Climatology (2001–2021 average for the same days) | Climatología (promedio 2001–2021 para los mismos días) | Climatologie (moyenne 2001–2021 pour les mêmes jours) | Klimatologie (Mittel 2001–2021 für dieselben Tage) |
| `science.fallow` | Pousio (solo sem cobertura) | Fallow (bare soil) | Barbecho (suelo descubierto) | Jachère (sol nu) | Brache (unbedeckter Boden) |
| `science.brachiaria` | Braquiária (planta de cobertura) | Brachiaria (cover crop) | Braquiaria (cultivo de cobertura) | Brachiaria (culture de couverture) | Brachiaria (Zwischenfrucht) |
| `science.safrinha` | Milho 2ª safra (safrinha) | Second-season maize (safrinha) | Maíz de segunda cosecha (safrinha) | Maïs de seconde saison (safrinha) | Zweitfrucht-Mais (Safrinha) |

**Revisão obrigatória antes de publicar** (fallback não substitui): avisos científicos (`science.*`, cartões de situação, Field Shift), consentimento de pesquisa, mensagens de exclusão de dados, erros de autenticação. As traduções desta pasta são rascunho técnico feito por mim; precisam de revisor fluente em cada língua com noção de agronomia. Quem revisa é decisão do Leandro.

## 8. Autenticação e idioma

- Formulários, erros e callbacks de `features/auth` traduzidos pelo mesmo catálogo.
- Trocar o idioma em `/auth/callback` ou `/auth/recovery` não toca em `location.search` nem no hash: o código PKCE já foi removido do histórico em `AuthPage.tsx:22`, e a troca de idioma não navega.
- Os e-mails do Supabase seguem o modelo configurado no painel (português ou o padrão do provedor). Traduzi-los por idioma exige templates por locale no Supabase, que é configuração externa: fica registrado, não faz parte desta etapa.
- Nenhum token, e-mail ou código entra no módulo de tradução nem em logs de chave ausente.

## 9. Acessibilidade e texto longo

- `document.documentElement.lang` atualizado na troca; `title` por tela traduzido.
- Avisos dinâmicos (`role="status"`) no idioma ativo.
- Alemão e francês tendem a 20–35 % mais longos que o português [H]. Pontos de risco observados nas capturas: trilho lateral de 88 px (rótulos "Visão geral", "Field Shift"), barra inferior de 5 itens em 390 px, abas do simulador no celular, selos no cabeçalho, botões da Visão geral. Proposta: rótulos curtos com chave própria (`nav.overview.short`), quebra em duas linhas permitida no trilho, nunca reticências em ação principal.
- Fontes: Bricolage Grotesque e Source Sans 3 com subconjunto `latin` cobrem os acentos das cinco línguas (á, ç, ß, ü, œ, ñ, é, è) [H, conferir `document.fonts.check` com "ßœñ"].

## 10. Testes

Definidos em `05`, seção 5: RT-14 (parser), RT-20 (seletor, persistência, troca preservando estado), RT-21 (cobertura de chaves e variáveis), RT-22 (callback com idioma trocado), RT-25 (texto longo em de/fr), RT-27 (preferências fora do balde de conta).
