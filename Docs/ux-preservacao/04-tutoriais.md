# 04 — Tutoriais interativos opcionais

Não existe hoje nenhum sistema de tutorial, ajuda ou glossário no código [C]. Tudo aqui é acréscimo. O tutorial complementa a interface; os problemas de contexto e nomenclatura de `02` são corrigidos antes, não explicados por um passo de tutorial.

## 1. Comportamento

| Regra | Detalhe |
|---|---|
| Abre sozinho só duas vezes | **Decisão do Leandro, 14/11/2026, substitui "nunca começa sozinho":** o roteiro da tela abre sozinho (1) na primeira abertura do app neste navegador e (2) na primeira visita depois de criar uma conta (conta com `created_at` do Supabase há menos de 7 dias, uma vez por conta neste navegador). Se a tela de entrada não tiver roteiro, abre na próxima que tiver. "Pular" pula **todos** os roteiros: nenhum abre sozinho de novo e os convites viram o botão "Como usar esta tela". Fora disso, aparece um convite discreto "Conhecer esta tela · Agora não", sem modal |
| Sempre reabrível | Botão "Como usar esta tela" (ícone `CircleHelp`) ao lado do título; página "Ajuda" lista todos os roteiros e o glossário |
| Curto | 3 a 5 passos por roteiro; assunto longo vira dois roteiros |
| Controles | Voltar, Avançar, Pular, Fechar (×); `Esc` fecha; contador "2 de 4" |
| Demonstrado × feito | Passo com ação real mostra "Experimente: …" e avança quando a ação acontece **ou** quando o usuário clica Avançar. Concluir não exige gravar nada |
| Sem efeito colateral | Nunca salva, envia, apaga, marca consentimento, pede localização ou finge sucesso do backend |
| Contexto real só com troca explícita | Se o passo precisa de outro lugar (ex.: Sorriso), oferece "Abrir a demonstração de Sorriso para este passo"; ao fechar, oferece "Voltar para {lugar anterior}" |
| Fechar não desfaz | Ações reais feitas durante o tour ficam; formulário em andamento fica |
| Alvo ausente | Espera até 3 s pelo alvo (`data-tour="…"`). Se não aparecer, o passo mostra o texto sem destaque e diz "Este controle não está visível agora"; nunca trava |
| Mudança de rota | Fecha o tour atual guardando o progresso; não abre o da nova tela |
| Idioma | Mesmo ID e progresso; trocar idioma redesenha o passo atual traduzido |

## 2. Persistência

Chave separada `gaiapus.tours` no `localStorage`, fora dos baldes de conta:

```json
{ "v": 1, "tours": { "explore@1": { "state": "done", "step": 4, "at": "2026-11-14T18:00:00Z" },
                     "overview@1": { "state": "dismissed", "at": "…" } } }
```

- Estados: `new`, `dismissed`, `in_progress` (com `step`), `done`. A versão no ID (`@1`) reabre o convite quando o roteiro mudar de fato.
- Escopo: este navegador. A Ajuda diz isso ("O progresso dos tutoriais fica neste navegador").
- Não toca em `gaiapus.v1*`, não apaga rascunho. "Apagar todos os dados deste aparelho" (C-13) também limpa `gaiapus.tours` e deixa isso escrito no diálogo.
- Por que fora da conta: é progresso de leitura de interface, não dado agrícola. Sincronizar no futuro pede política própria e endpoint; não faz parte desta etapa.

## 3. Componente

- Um `TourProvider` no `App`, um `TourPopover` e roteiros declarativos em `teammate/tours/*.ts`. Carregado sob demanda quando o usuário aceita o convite ou clica em "Como usar esta tela": não entra no pacote inicial.
- Âncoras: atributo `data-tour="<id>"` nos alvos. Nunca texto traduzido nem seletor de CSS.
- Sem biblioteca de onboarding. O destaque é um contorno (`outline` com `--focus`) no alvo e um painel ancorado com os componentes existentes (`card`, `btn`). O alvo continua clicável: não há véu escuro bloqueando a tela.
- Posicionamento: abaixo ou acima do alvo; no celular, sempre como painel fixo no rodapé, acima da barra de navegação e do `safe-area-inset-bottom`, com rolagem até o alvo (`scrollIntoView({ block: 'center' })`).

## 4. Acessibilidade

| Aspecto | Especificação |
|---|---|
| Papel | Painel `role="dialog"` **não modal** (`aria-modal="false"`), `aria-labelledby` no título do passo, `aria-describedby` no texto |
| Foco | Ao abrir, foco no título do passo. Avançar move o foco para o novo título. Fechar devolve o foco ao botão que abriu ou ao `h1` |
| Teclado | Tab circula entre alvo e painel; `Esc` fecha; `Alt+→` / `Alt+←` avançam e voltam |
| Anúncio | Mudança de passo anunciada por `aria-live="polite"`: "Passo 2 de 4: Escolha um estado" |
| Movimento | Sem animação com `prefers-reduced-motion`; rolagem instantânea |
| Zoom | Painel com largura máxima de 360 px e texto que quebra; testado a 200 % |
| Contraste | Tokens existentes; contorno de destaque ≥ 3:1 |

## 5. Ajuda sem tour

A página Ajuda (`#/ajuda`, rota nova) funciona sem animação: lista de roteiros com "Abrir", glossário (`07`, seção 7) e perguntas curtas ("Por que vejo Sorriso?", "O que é escala municipal?", "Meus dados ficam onde?"). Cada termo do glossário tem âncora (`#/ajuda#ndvi`) para ser ligado a partir dos cartões.

## 6. Roteiros

Formato de cada passo: **ID · rota · alvo (`data-tour`) · chave · entrada · ação esperada · avança quando · pula quando · celular**, seguido do texto nas cinco línguas (título — corpo). Textos em en, es, fr e de são rascunho técnico e dependem de revisão linguística (ver `07`, seção 7).

### 6.1 Explorar — `explore@1`

Entrada do roteiro: rota `/explorar`, qualquer seleção. Ensina explicitamente que qualquer país é selecionável e que a análise varia.

**explore.1** · `/explorar` · `explore-search` · `tour.explore.1` · sempre · digitar ≥ 2 letras · resultado aparece ou Avançar · nunca · busca no topo
- pt-BR: **Busque qualquer lugar** — Digite um país, estado, município ou código do IBGE. Funciona com nomes em vários idiomas.
- en: **Search any place** — Type a country, state, municipality or IBGE code. Names work in several languages.
- es: **Busque cualquier lugar** — Escriba un país, estado, municipio o código IBGE. Acepta nombres en varios idiomas.
- fr: **Cherchez n'importe quel lieu** — Saisissez un pays, un État, une commune ou un code IBGE. Les noms fonctionnent en plusieurs langues.
- de: **Jeden Ort suchen** — Geben Sie ein Land, einen Bundesstaat, eine Gemeinde oder einen IBGE-Code ein. Namen funktionieren in mehreren Sprachen.

**explore.2** · `/explorar` · `explore-map` (sem WebGL: `explore-country-list`) · `tour.explore.2` · sempre · clicar em um país · `pais` muda na URL ou Avançar · nunca · painel inferior em altura média
- pt-BR: **Qualquer país pode ser escolhido** — Clique no mapa ou na lista. Todos os países ficam navegáveis, mesmo sem análise.
- en: **Any country can be selected** — Click the map or the list. Every country stays navigable, even without analysis.
- es: **Se puede elegir cualquier país** — Haga clic en el mapa o en la lista. Todos los países se pueden explorar, aunque no tengan análisis.
- fr: **Tous les pays sont sélectionnables** — Cliquez sur la carte ou dans la liste. Chaque pays reste consultable, même sans analyse.
- de: **Jedes Land ist auswählbar** — Klicken Sie auf die Karte oder in die Liste. Alle Länder bleiben erkundbar, auch ohne Analyse.

**explore.3** · `/explorar` · `explore-coverage` · `tour.explore.3` · há seleção · ler · Avançar · sem seleção: mostra o texto apontando para "Regiões com dados" · painel inferior expandido
- pt-BR: **O que existe aqui** — Cada lugar mostra quais dados existem, de que período e de que tipo. Se não houver análise, dizemos por quê.
- en: **What exists here** — Each place shows which data exist, for which period and of which kind. If there is no analysis, we say why.
- es: **Qué hay aquí** — Cada lugar muestra qué datos existen, de qué período y de qué tipo. Si no hay análisis, decimos por qué.
- fr: **Ce qui existe ici** — Chaque lieu indique les données disponibles, leur période et leur nature. S'il n'y a pas d'analyse, nous expliquons pourquoi.
- de: **Was es hier gibt** — Jeder Ort zeigt, welche Daten es gibt, für welchen Zeitraum und welcher Art. Gibt es keine Analyse, sagen wir warum.

**explore.4** · `/explorar` · `explore-with-data` · `tour.explore.4` · sempre · abrir a lista · Avançar · nunca · idem
- pt-BR: **Regiões com dados** — Aqui ficam os lugares com análise nesta versão, como Sorriso e Uberlândia. Abrir um deles é sempre escolha sua.
- en: **Regions with data** — Places with analysis in this version, such as Sorriso and Uberlândia. Opening one is always your choice.
- es: **Regiones con datos** — Los lugares con análisis en esta versión, como Sorriso y Uberlândia. Abrir uno siempre es decisión suya.
- fr: **Régions avec données** — Les lieux analysés dans cette version, comme Sorriso et Uberlândia. En ouvrir un reste toujours votre choix.
- de: **Regionen mit Daten** — Orte mit Analyse in dieser Version, etwa Sorriso und Uberlândia. Sie entscheiden immer selbst, ob Sie einen dieser Orte öffnen.

**explore.5** · `/explorar` · `explore-lists` · `tour.explore.5` · sempre · ler · Concluir · nunca · idem
- pt-BR: **Sem mapa também funciona** — Se o mapa não carregar, use a busca e as listas. Elas levam aos mesmos lugares.
- en: **It works without the map too** — If the map does not load, use search and the lists. They lead to the same places.
- es: **También funciona sin mapa** — Si el mapa no carga, use la búsqueda y las listas. Llevan a los mismos lugares.
- fr: **Ça marche aussi sans carte** — Si la carte ne se charge pas, utilisez la recherche et les listes. Elles mènent aux mêmes lieux.
- de: **Es geht auch ohne Karte** — Lädt die Karte nicht, nutzen Sie Suche und Listen. Sie führen zu denselben Orten.

### 6.2 Visão geral — `overview@1`

**overview.1** · `/visao-geral` · `scope-strip` · `tour.overview.1` · sempre · ler · Avançar · nunca · topo
- pt-BR: **De onde é este dado** — Esta faixa diz o lugar, o período e se é demonstração. Confira antes de ler os números.
- en: **Where this data comes from** — This strip shows the place, the period and whether it is a demo. Check it before reading the numbers.
- es: **De dónde son estos datos** — Esta franja indica el lugar, el período y si es una demostración. Revísela antes de leer los números.
- fr: **D'où viennent ces données** — Ce bandeau indique le lieu, la période et s'il s'agit d'une démonstration. Vérifiez-le avant de lire les chiffres.
- de: **Woher diese Daten stammen** — Dieser Streifen nennt Ort, Zeitraum und ob es eine Demo ist. Prüfen Sie ihn, bevor Sie die Zahlen lesen.

**overview.2** · `/visao-geral` · `overview-alert` · `tour.overview.2` · dados carregados · ler · Avançar · erro: texto sem destaque · rola até o alerta
- pt-BR: **Alerta de água** — Mostra se a planta deve receber menos água do que precisa, por quê e por quantos dias. Nada é recomendado automaticamente.
- en: **Water alert** — Shows whether the crop is expected to get less water than it needs, why, and for how many days. Nothing is recommended automatically.
- es: **Alerta de agua** — Muestra si se espera que el cultivo reciba menos agua de la que necesita, por qué y durante cuántos días. No se recomienda nada automáticamente.
- fr: **Alerte eau** — Indique si la culture devrait manquer d'eau, pourquoi et pendant combien de jours. Rien n'est recommandé automatiquement.
- de: **Wasserwarnung** — Zeigt, ob die Pflanze voraussichtlich weniger Wasser erhält, als sie braucht, warum und für wie viele Tage. Nichts wird automatisch empfohlen.

**overview.3** · `/visao-geral` · `overview-days` · `tour.overview.3` · dados carregados · ler · Avançar · erro: idem · tabela rola de lado
- pt-BR: **Próximos dias** — Chuva, demanda da atmosfera e reserva de água dia a dia. A linha tracejada é a média de anos anteriores.
- en: **Coming days** — Rain, atmospheric demand and water reserve, day by day. The dashed line is the average of past years.
- es: **Próximos días** — Lluvia, demanda de la atmósfera y reserva de agua día a día. La línea discontinua es el promedio de años anteriores.
- fr: **Prochains jours** — Pluie, demande de l'atmosphère et réserve en eau, jour par jour. La ligne en tirets est la moyenne des années passées.
- de: **Nächste Tage** — Regen, Wasserbedarf der Atmosphäre und Bodenwasservorrat Tag für Tag. Die gestrichelte Linie ist das Mittel früherer Jahre.

**overview.4** · `/visao-geral` · `overview-actions` · `tour.overview.4` · sempre · escolher uma ação ou Concluir · clique em ação encerra o tour como concluído · nunca · rola até as ações
- pt-BR: **Próximo passo** — Planeje um plantio, acompanhe a safra no simulador ou registre uma atividade do seu talhão.
- en: **Next step** — Plan a planting, follow the season in the simulator or record an activity for your field.
- es: **Siguiente paso** — Planifique una siembra, siga la campaña en el simulador o registre una actividad de su parcela.
- fr: **Étape suivante** — Planifiez un semis, suivez la saison dans le simulateur ou enregistrez une activité de votre parcelle.
- de: **Nächster Schritt** — Planen Sie eine Aussaat, verfolgen Sie die Saison im Simulator oder erfassen Sie eine Tätigkeit auf Ihrem Schlag.

### 6.3 Município — `municipality@1`

**municipality.1** · `/municipio` · `mun-tabs` · `tour.municipality.1` · sempre · trocar de aba · `aba` muda ou Avançar · nunca · abas roláveis
- pt-BR: **Quatro assuntos** — Clima, água, safra e imagem de satélite. Os dados valem para o município, não para um talhão.
- en: **Four topics** — Climate, water, crop season and satellite image. Data refer to the municipality, not to a single field.
- es: **Cuatro temas** — Clima, agua, cosecha e imagen satelital. Los datos son del municipio, no de una parcela.
- fr: **Quatre thèmes** — Climat, eau, campagne agricole et image satellite. Les données portent sur la commune, pas sur une parcelle.
- de: **Vier Themen** — Klima, Wasser, Ernte und Satellitenbild. Die Daten gelten für die Gemeinde, nicht für einen Schlag.

**municipality.2** · `/municipio?aba=safra` · `mun-crop` · `tour.municipality.2` · aba Safra (o passo oferece abrir) · trocar cultura · `cultura` muda ou Avançar · nunca · idem
- pt-BR: **Escolha a cultura** — Cada cultura tem o seu próprio resultado. Nunca usamos números da soja para outra planta.
- en: **Choose the crop** — Each crop has its own result. We never reuse soybean numbers for another crop.
- es: **Elija el cultivo** — Cada cultivo tiene su propio resultado. Nunca usamos números de la soja para otro cultivo.
- fr: **Choisissez la culture** — Chaque culture a son propre résultat. Nous ne réutilisons jamais les chiffres du soja pour une autre culture.
- de: **Kultur wählen** — Jede Kultur hat ihr eigenes Ergebnis. Sojazahlen werden nie für eine andere Kultur verwendet.

**municipality.3** · `/municipio?aba=safra` · `yield-card` · `tour.municipality.3` · há cartão · ler · Avançar · sem cartão: aponta para "O que dá para fazer" · idem
- pt-BR: **Origem e período** — Cada cartão diz o modelo, a versão, o ano e o erro médio. "Retrospectivo" quer dizer safra passada.
- en: **Source and period** — Each card shows the model, version, year and mean absolute error (MAE). "Retrospective" means a past season.
- es: **Origen y período** — Cada tarjeta indica el modelo, la versión, el año y el error absoluto medio (MAE). "Retrospectivo" significa campaña pasada.
- fr: **Source et période** — Chaque carte indique le modèle, la version, l'année et l'erreur absolue moyenne (MAE). « Rétrospectif » signifie campagne passée.
- de: **Quelle und Zeitraum** — Jede Karte nennt Modell, Version, Jahr und mittleren absoluten Fehler (MAE). „Rückblickend“ heißt vergangene Saison.

**municipality.4** · `/municipio?aba=imagem` · `ndvi-chart` · `tour.municipality.4` · aba Imagem com recorte · ler · Concluir · sem imagem: texto explica que o recorte não existe para este lugar · gráfico com rolagem
- pt-BR: **Verde visto do satélite** — O NDVI vai de 0 a 1. Onde houve nuvem a imagem foi descartada e a linha se interrompe; nada é estimado. Vale só para o recorte marcado.
- en: **Green seen from space** — NDVI ranges from 0 to 1. Cloudy images were discarded and the line breaks there; nothing is estimated. It applies only to the marked area.
- es: **Verde visto desde el satélite** — El NDVI va de 0 a 1. Las imágenes con nubes se descartaron y la línea se interrumpe; nada se estima. Solo se aplica a la zona delimitada.
- fr: **Le vert vu du satellite** — Le NDVI va de 0 à 1. Les images nuageuses ont été écartées et la ligne s'interrompt ; rien n'est estimé. Valable seulement pour la zone indiquée.
- de: **Grün aus dem All** — NDVI reicht von 0 bis 1. Bewölkte Bilder wurden verworfen, dort bricht die Linie ab; nichts wird geschätzt. Gilt nur für den markierten Ausschnitt.

### 6.4 Planejar — `plan@1`

**plan.1** · `/planejar` · `plan-place` · `tour.plan.1` · sempre · ler · Avançar · nunca · topo
- pt-BR: **Para onde é o plano** — O plano usa o local do link, do seu talhão ou a demonstração. O selo diz qual.
- en: **Where the plan applies** — The plan uses the place from the link, from your field, or the demo. The badge tells which.
- es: **Para dónde es el plan** — El plan usa el lugar del enlace, de su parcela o la demostración. La etiqueta indica cuál.
- fr: **Où s'applique le plan** — Le plan utilise le lieu du lien, de votre parcelle ou la démonstration. Le badge l'indique.
- de: **Für welchen Ort der Plan gilt** — Der Plan nutzt den Ort aus dem Link, von Ihrem Schlag oder die Demo. Die Kennzeichnung zeigt, welcher Ort verwendet wird.

**plan.2** · `/planejar` · `plan-form` · `tour.plan.2` · sempre · preencher um campo · Avançar · nunca · idem
- pt-BR: **Seu plano** — Cultura, área, irrigação e solo. Qualquer cultura pode ser planejada, mesmo sem análise disponível.
- en: **Your plan** — Crop, area, irrigation and soil. Any crop can be planned, even without available analysis.
- es: **Su plan** — Cultivo, superficie, riego y suelo. Puede planificar cualquier cultivo, aunque no haya análisis.
- fr: **Votre plan** — Culture, surface, irrigation et sol. Toute culture peut être planifiée, même sans analyse disponible.
- de: **Ihr Plan** — Kultur, Fläche, Bewässerung und Boden. Jede Kultur ist planbar, auch ohne verfügbare Analyse.

**plan.3** · `/planejar` · `plan-dates` · `tour.plan.3` · sempre · ler · Avançar · nunca · rola até o bloco
- pt-BR: **Comparar datas** — Mostra a água no solo em cada data de semeadura, quando há simulação para a cultura e o local. Não é recomendação de plantio.
- en: **Compare dates** — Shows soil water at each sowing date when a simulation exists for the crop and place. It is not a planting recommendation.
- es: **Comparar fechas** — Muestra el agua del suelo en cada fecha de siembra cuando hay simulación para el cultivo y el lugar. No es una recomendación de siembra.
- fr: **Comparer les dates** — Montre l'eau du sol à chaque date de semis quand une simulation existe pour la culture et le lieu. Ce n'est pas une recommandation de semis.
- de: **Termine vergleichen** — Zeigt das Bodenwasser je Aussaattermin, wenn es für Kultur und Ort eine Simulation gibt. Keine Aussaatempfehlung.

**plan.4** · `/planejar` · `plan-eco` · `tour.plan.4` · sempre · ler · Avançar · nunca · idem
- pt-BR: **Margem, se quiser** — Só com os seus números: rendimento, preço, peso da saca e custo. Não preenchemos preço nem rendimento.
- en: **Margin, if you want** — Only with your own numbers: yield, price, bag weight and cost. We never fill in price or yield.
- es: **Margen, si quiere** — Solo con sus números: rendimiento, precio, peso de la bolsa y costo. No completamos precio ni rendimiento.
- fr: **La marge, si vous voulez** — Uniquement avec vos chiffres : rendement, prix, poids du sac et coût. Nous ne renseignons ni le prix ni le rendement.
- de: **Marge, wenn Sie möchten** — Nur mit Ihren eigenen Zahlen: Ertrag, Preis, Sackgewicht und Kosten. Preis und Ertrag tragen wir nie ein.

**plan.5** · `/planejar` · `plan-save` · `tour.plan.5` · sempre · nenhuma (o tour não salva) · Concluir · nunca · rola até os botões
- pt-BR: **Salvar é com você** — O plano fica neste aparelho quando você clicar em Salvar. O tutorial não salva nada.
- en: **Saving is up to you** — The plan stays on this device when you click Save. The tutorial saves nothing.
- es: **Guardar depende de usted** — El plan queda en este dispositivo cuando hace clic en Guardar. El tutorial no guarda nada.
- fr: **C'est vous qui décidez d'enregistrer** — Le plan reste sur cet appareil quand vous cliquez sur Enregistrer. Le tutoriel n'enregistre rien.
- de: **Sie entscheiden, ob Sie speichern** — Der Plan bleibt auf diesem Gerät, wenn Sie auf Speichern klicken. Das Tutorial speichert nichts.

### 6.5 Simulador — `simulator@1`

Entrada: série diária disponível (soja em Sorriso). Na tela "sem série compatível" o roteiro é `simulator-unavailable@1` (um passo só, abaixo).

**sim.1** · `/simulador` · `sim-mode` · `tour.sim.1` · sempre · trocar o tipo de dado · `modo` muda ou Avançar · nunca · aba Configurar
- pt-BR: **Tipo de dado** — Histórico, cenário hipotético, previsão ou climatologia. O selo no campo sempre diz qual está na tela.
- en: **Data type** — Historical, hypothetical scenario, forecast or climatology. The badge on the field always shows which one is on screen.
- es: **Tipo de dato** — Histórico, escenario hipotético, pronóstico o climatología. La etiqueta del campo siempre indica cuál se muestra.
- fr: **Type de données** — Historique, scénario hypothétique, prévision ou climatologie. Le badge sur la parcelle indique toujours lequel est affiché.
- de: **Datenart** — Historisch, hypothetisches Szenario, Vorhersage oder Klimatologie. Die Kennzeichnung am Schlag zeigt immer, welche Datenart angezeigt wird.

**sim.2** · `/simulador` · `sim-year` · `tour.sim.2` · modo histórico ou cenário · trocar o ano · Avançar · previsão/climatologia: pula · aba Configurar
- pt-BR: **Safra** — Escolha uma das seis safras simuladas, de 2015/16 a 2020/21.
- en: **Season** — Pick one of the six simulated seasons, 2015/16 to 2020/21.
- es: **Campaña** — Elija una de las seis campañas simuladas, de 2015/16 a 2020/21.
- fr: **Campagne** — Choisissez l'une des six campagnes simulées, de 2015/16 à 2020/21.
- de: **Saison** — Wählen Sie eine der sechs simulierten Saisons, 2015/16 bis 2020/21.

**sim.3** · `/simulador` · `sim-timeline` · `tour.sim.3` · sempre · mover o cursor (clique, setas) · cursor muda ou Avançar · nunca · aba Campo
- pt-BR: **Mova no tempo** — Clique na linha do tempo ou use as setas. Campo, fase e números acompanham o dia escolhido.
- en: **Move through time** — Click the timeline or use the arrow keys. Field, stage and numbers follow the chosen day.
- es: **Muévase en el tiempo** — Haga clic en la línea de tiempo o use las flechas. Campo, fase y números siguen el día elegido.
- fr: **Avancez dans le temps** — Cliquez sur la frise ou utilisez les flèches. Parcelle, stade et chiffres suivent le jour choisi.
- de: **Durch die Zeit gehen** — Klicken Sie auf die Zeitleiste oder nutzen Sie die Pfeiltasten. Die Darstellung des Schlags, das Entwicklungsstadium und die Zahlen passen sich dem gewählten Tag an.

**sim.4** · `/simulador` · `sim-ab` · `tour.sim.4` · sempre · marcar A/B · `ab=1` ou Avançar · nunca · aba Configurar
- pt-BR: **Compare A e B** — Mostra duas situações lado a lado, como pousio e braquiária, e a diferença no dia.
- en: **Compare A and B** — Shows two situations side by side, such as fallow and brachiaria, and the difference that day.
- es: **Compare A y B** — Muestra dos situaciones lado a lado, como barbecho y braquiaria, y la diferencia del día.
- fr: **Comparez A et B** — Affiche deux situations côte à côte, comme jachère et brachiaria, et l'écart du jour.
- de: **A und B vergleichen** — Zeigt zwei Situationen nebeneinander, etwa Brache und Brachiaria, und den Unterschied am Tag.

**sim.5** · `/simulador` · `sim-limits` · `tour.sim.5` · sempre · ler · Concluir · nunca · aba Indicadores
- pt-BR: **O que o 3D não diz** — A cena é ilustração com fases demonstrativas. O rendimento não muda com o cursor: o efeito do manejo no rendimento não foi avaliado.
- en: **What the 3D does not say** — The scene is an illustration with demo stages. Yield does not change with the cursor: the effect of management on yield was not evaluated.
- es: **Lo que el 3D no dice** — La escena es una ilustración con fases de demostración. El rendimiento no cambia con el cursor: no se evaluó el efecto del manejo sobre el rendimiento.
- fr: **Ce que la 3D ne dit pas** — La scène est une illustration avec des stades de développement présentés à titre de démonstration. Le rendement ne varie pas avec le curseur : l'effet de la conduite culturale sur le rendement n'a pas été évalué.
- de: **Was 3D nicht sagt** — Die Szene ist eine Illustration mit Demo-Stadien. Der Ertrag ändert sich nicht mit dem Cursor: Die Auswirkung der Bewirtschaftung auf den Ertrag wurde nicht untersucht.

**sim-unavailable.1** · `/simulador?cultura=…` sem série · `sim-missing` · `tour.simUnavailable.1` · tela sem série · ler · Concluir · nunca · idem
- pt-BR: **Por que não há simulação** — Para esta cultura e local não há série diária. Mostramos o que existe e o que falta, sem desenhar curva de outra cultura.
- en: **Why there is no simulation** — There is no daily series for this crop and place. We show what exists and what is missing, without drawing another crop's curve.
- es: **Por qué no hay simulación** — No hay serie diaria para este cultivo y lugar. Mostramos lo que existe y lo que falta, sin dibujar la curva de otro cultivo.
- fr: **Pourquoi il n'y a pas de simulation** — Aucune série quotidienne pour cette culture et ce lieu. Nous montrons ce qui existe et ce qui manque, sans tracer la courbe d'une autre culture.
- de: **Warum es keine Simulation gibt** — Für diese Kultur und diesen Ort gibt es keine Tagesreihe. Wir zeigen, was es gibt und was fehlt, ohne die Kurve einer anderen Kultur.

### 6.6 Field Shift — `fieldShift@1`

**fs.1** · `/field-shift` · `fs-question` · `tour.fs.1` · sempre · ler · Avançar · nunca · topo
- pt-BR: **A pergunta** — O que muda na água do solo se, depois do milho safrinha, a área ficar com braquiária em vez de pousio?
- en: **The question** — What changes in soil water if, after second-season maize, the field is covered with brachiaria instead of being left fallow?
- es: **La pregunta** — ¿Qué cambia en el agua del suelo si, tras el maíz de segunda cosecha, el área queda con braquiaria en vez de barbecho?
- fr: **La question** — Qu'est-ce qui change pour l'eau du sol si, après le maïs de seconde saison, la parcelle est couverte de brachiaria au lieu d'être laissée en jachère ?
- de: **Die Frage** — Was ändert sich beim Bodenwasser, wenn nach dem Zweitfrucht-Mais Brachiaria statt Brache steht?

**fs.2** · `/field-shift` · `fs-year` · `tour.fs.2` · sempre · trocar o ano · Avançar · nunca · rola até o gráfico
- pt-BR: **Escolha a safra** — Veja dia a dia a reserva de água nos dois casos.
- en: **Pick a season** — See the water reserve day by day in both cases.
- es: **Elija la campaña** — Vea día a día la reserva de agua en ambos casos.
- fr: **Choisissez la campagne** — Voyez jour par jour la réserve en eau dans les deux cas.
- de: **Saison wählen** — Sehen Sie Tag für Tag den Bodenwasservorrat in beiden Fällen.

**fs.3** · `/field-shift` · `fs-table` · `tour.fs.3` · sempre · ler · Avançar · nunca · tabela rola de lado
- pt-BR: **A diferença** — B − A mostra quanto muda em cada indicador, na média das seis safras.
- en: **The difference** — B − A shows how much each indicator changes, averaged over six seasons.
- es: **La diferencia** — B − A muestra cuánto cambia cada indicador, en promedio de seis campañas.
- fr: **L'écart** — B − A montre la variation de chaque indicateur, en moyenne sur six campagnes.
- de: **Der Unterschied** — B − A zeigt, wie stark sich jeder Indikator im Mittel von sechs Saisons ändert.

**fs.4** · `/field-shift` · `fs-limits` · `tour.fs.4` · sempre · ler · Concluir · nunca · idem
- pt-BR: **Limites** — O benefício depende da hipótese de palhada. Rendimento, carbono, infiltração e nitrogênio não foram simulados.
- en: **Limits** — The benefit depends on the assumed crop residue cover. Yield, carbon, infiltration and nitrogen were not simulated.
- es: **Límites** — El beneficio depende del supuesto de rastrojo. No se simularon rendimiento, carbono, infiltración ni nitrógeno.
- fr: **Limites** — Le bénéfice dépend de l'hypothèse de couverture du sol par des résidus de culture. Rendement, carbone, infiltration et azote n'ont pas été simulés.
- de: **Grenzen** — Der Nutzen hängt von der Mulch-Annahme ab. Ertrag, Kohlenstoff, Infiltration und Stickstoff wurden nicht simuliert.

### 6.7 Propriedades e Registros — `farm@1`

**farm.1** · `/propriedades` · `farm-local` · `tour.farm.1` · sempre · ler · Avançar · nunca · topo
- pt-BR: **Seus dados ficam aqui** — Propriedades e registros ficam salvos neste aparelho. Entrar na conta não envia esses dados.
- en: **Your data stay here** — Farms and records are saved on this device. Signing in does not upload them.
- es: **Sus datos quedan aquí** — Propiedades y registros se guardan en este dispositivo. Iniciar sesión no los envía.
- fr: **Vos données restent ici** — Exploitations et enregistrements sont stockés sur cet appareil. La connexion ne les envoie pas.
- de: **Ihre Daten bleiben hier** — Betriebe und Einträge werden auf diesem Gerät gespeichert. Die Anmeldung lädt sie nicht hoch.

**farm.2** · `/propriedades` · `farm-property-form` · `tour.farm.2` · sempre · preencher · Avançar · nunca · rola até o formulário
- pt-BR: **Propriedade e talhão** — Primeiro a propriedade e o município, depois o talhão com área, solo e irrigação.
- en: **Farm and field** — First the farm and its municipality, then the field with area, soil and irrigation.
- es: **Propiedad y parcela** — Primero la propiedad y el municipio, luego la parcela con superficie, suelo y riego.
- fr: **Exploitation et parcelle** — D'abord l'exploitation et sa commune, puis la parcelle avec surface, sol et irrigation.
- de: **Betrieb und Schlag** — Zuerst der Betrieb und die Gemeinde, dann der Schlag mit Fläche, Boden und Bewässerung.

**farm.3** · `/registros` · `records-kinds` · `tour.farm.3` · há talhão (o passo oferece ir a Registros) · escolher um tipo · `novo` muda ou Avançar · sem talhão: aponta para o formulário de talhão · idem
- pt-BR: **Tipo de registro** — Plantio, manejo, colheita ou venda. Cada um pede só os campos dele.
- en: **Record type** — Planting, management, harvest or sale. Each asks only for its own fields.
- es: **Tipo de registro** — Siembra, manejo, cosecha o venta. Cada uno pide solo sus campos.
- fr: **Type d'enregistrement** — Semis, intervention, récolte ou vente. Chacun ne demande que ses champs.
- de: **Eintragsart** — Aussaat, Maßnahme, Ernte oder Verkauf. Jede fragt nur ihre eigenen Felder ab.

**farm.4** · `/registros?novo=…` · `record-draft` · `tour.farm.4` · formulário aberto · ler · Avançar · formulário fechado: pula · idem
- pt-BR: **Rascunho guardado** — O que você digita fica guardado até salvar, separado por talhão e tipo. Use vírgula ou ponto conforme o idioma escolhido.
- en: **Draft kept** — What you type is kept until you save, per field and type. Use the decimal mark of the chosen language.
- es: **Borrador guardado** — Lo que escribe se guarda hasta que lo guarde, por parcela y tipo. Use el separador decimal del idioma elegido.
- fr: **Brouillon conservé** — Ce que vous saisissez est conservé jusqu'à l'enregistrement, par parcelle et par type. Utilisez le séparateur décimal de la langue choisie.
- de: **Entwurf gespeichert** — Ihre Eingaben bleiben bis zum Speichern erhalten, je Schlag und Art. Nutzen Sie das Dezimalzeichen der gewählten Sprache.

**farm.5** · `/registros?novo=…` · `record-save` · `tour.farm.5` · formulário aberto · nenhuma · Concluir · formulário fechado: pula · idem
- pt-BR: **Você decide quando salvar** — O registro só é gravado quando você clica em Salvar. Dá para editar depois; excluir pede confirmação.
- en: **You decide when to save** — The record is stored only when you click Save. You can edit later; deleting asks for confirmation.
- es: **Usted decide cuándo guardar** — El registro solo se guarda al hacer clic en Guardar. Puede editarlo después; eliminar pide confirmación.
- fr: **Vous décidez quand enregistrer** — L'enregistrement n'est stocké que lorsque vous cliquez sur Enregistrer. Modifiable ensuite ; la suppression demande confirmation.
- de: **Sie entscheiden, wann gespeichert wird** — Der Eintrag wird erst beim Klick auf Speichern abgelegt. Sie können den Eintrag später bearbeiten; das Löschen erfordert eine Bestätigung.

### 6.8 Sondas e Alertas — `monitoring@1`

**mon.1** · `/dispositivos` · `devices-synthetic` · `tour.mon.1` · sempre · ler · Avançar · nunca · topo
- pt-BR: **Leituras sintéticas** — Nenhuma sonda real está conectada. Estas leituras servem para testar e não entram em alertas.
- en: **Synthetic readings** — No real probe is connected. These readings are for testing and do not feed alerts.
- es: **Lecturas sintéticas** — No hay ninguna sonda real conectada. Estas lecturas son de prueba y no alimentan alertas.
- fr: **Relevés synthétiques** — Aucune sonde réelle n'est connectée. Ces relevés servent aux tests et n'alimentent pas les alertes.
- de: **Synthetische Messwerte** — Keine echte Sonde ist verbunden. Die Werte dienen Tests und fließen nicht in Warnungen ein.

**mon.2** · `/dispositivos` · `device-card` · `tour.mon.2` · sempre · ler · Avançar · nunca · idem
- pt-BR: **Profundidade e calibração** — Cada sonda mede a uma profundidade. Sem calibração de campo, o valor é aproximado. Falha de sonda não é alerta de água.
- en: **Depth and calibration** — Each probe reads at one depth. Without field calibration the value is approximate. A probe fault is not a water alert.
- es: **Profundidad y calibración** — Cada sonda mide a una profundidad. Sin calibración de campo el valor es aproximado. Una falla de sonda no es alerta de agua.
- fr: **Profondeur et étalonnage** — Chaque sonde mesure à une profondeur. Sans étalonnage au champ, la valeur est approximative. Une panne de sonde n'est pas une alerte eau.
- de: **Tiefe und Kalibrierung** — Jede Sonde misst in einer Tiefe. Ohne Feldkalibrierung ist der Wert ungefähr. Ein Sondenfehler ist keine Wasserwarnung.

**mon.3** · `/alertas` · `alert-card` · `tour.mon.3` · há alerta (o passo oferece ir a Alertas) · ler · Concluir · sem alerta: aponta para "Outros tipos" · idem
- pt-BR: **Como ler um alerta** — Motivo, período, fonte, o que fazer e incerteza. Sem dado, não há alerta.
- en: **How to read an alert** — Reason, period, source, what to do and uncertainty. No data, no alert.
- es: **Cómo leer una alerta** — Motivo, período, fuente, qué hacer e incertidumbre. Sin datos, no hay alerta.
- fr: **Lire une alerte** — Motif, période, source, que faire et incertitude. Sans données, pas d'alerte.
- de: **Eine Warnung lesen** — Grund, Zeitraum, Quelle, was zu tun ist und Unsicherheit. Ohne Daten keine Warnung.

### 6.9 Conta — `account@1`

**acc.1** · `/conta` · `account-local` · `tour.acc.1` · sempre · ler · Avançar · nunca · topo
- pt-BR: **Conta e aparelho** — A conta identifica você. Propriedades, registros e planos continuam neste aparelho, separados por conta.
- en: **Account and device** — The account identifies you. Farms, records and plans stay on this device, separated by account.
- es: **Cuenta y dispositivo** — La cuenta lo identifica. Propiedades, registros y planes siguen en este dispositivo, separados por cuenta.
- fr: **Compte et appareil** — Le compte vous identifie. Exploitations, enregistrements et plans restent sur cet appareil, séparés par compte.
- de: **Konto und Gerät** — Das Konto identifiziert Sie. Betriebe, Einträge und Pläne bleiben auf diesem Gerät, getrennt nach Konto.

**acc.2** · `/conta` · `account-export` · `tour.acc.2` · conectado · ler · Avançar · sem conta: pula · rola até o bloco
- pt-BR: **Exportar** — Baixe seus dados em um arquivo. Nome e e-mail não entram.
- en: **Export** — Download your data as a file. Name and email are not included.
- es: **Exportar** — Descargue sus datos en un archivo. No incluye nombre ni correo.
- fr: **Exporter** — Téléchargez vos données dans un fichier. Nom et e-mail ne sont pas inclus.
- de: **Exportieren** — Laden Sie Ihre Daten als Datei herunter. Name und E-Mail sind nicht enthalten.

**acc.3** · `/conta` · `account-consent` · `tour.acc.3` · conectado · nenhuma (o tour nunca marca) · Concluir · sem conta: pula · idem
- pt-BR: **Pesquisa é opcional** — Autorizar o uso em pesquisa é separado e pode ser revogado. Nesta versão nada é enviado, com ou sem autorização.
- en: **Research is optional** — Allowing research use is separate and can be revoked. In this version nothing is sent, with or without permission.
- es: **La investigación es opcional** — Autorizar el uso en investigación es aparte y se puede revocar. En esta versión no se envía nada, con o sin autorización.
- fr: **La recherche est facultative** — Autoriser l'usage pour la recherche est distinct et révocable. Dans cette version, rien n'est envoyé, avec ou sans accord.
- de: **Forschung ist freiwillig** — Die Freigabe für Forschung ist getrennt und widerrufbar. In dieser Version wird nichts gesendet, mit oder ohne Zustimmung.

## 7. Textos de interface do sistema de tutorial

| Chave | pt-BR | en | es | fr | de |
|---|---|---|---|---|---|
| `tour.invite` | Conhecer esta tela | Take a tour of this screen | Conocer esta pantalla | Découvrir cet écran | Diese Ansicht kennenlernen |
| `tour.notNow` | Agora não | Not now | Ahora no | Pas maintenant | Nicht jetzt |
| `tour.howTo` | Como usar esta tela | How to use this screen | Cómo usar esta pantalla | Comment utiliser cet écran | So nutzen Sie diese Ansicht |
| `tour.back` | Voltar | Back | Atrás | Retour | Zurück |
| `tour.next` | Avançar | Next | Siguiente | Suivant | Weiter |
| `tour.skip` | Pular | Skip | Omitir | Passer | Überspringen |
| `tour.done` | Concluir | Done | Terminar | Terminer | Fertig |
| `tour.close` | Fechar tutorial | Close tutorial | Cerrar tutorial | Fermer le tutoriel | Tutorial schließen |
| `tour.step` | Passo {n} de {total} | Step {n} of {total} | Paso {n} de {total} | Étape {n} sur {total} | Schritt {n} von {total} |
| `tour.tryIt` | Experimente: | Try it: | Pruebe: | Essayez : | Probieren Sie: |
| `tour.targetMissing` | Este controle não está visível agora. | This control is not visible right now. | Este control no está visible ahora. | Cet élément de commande n'est pas visible pour le moment. | Dieses Element ist gerade nicht sichtbar. |
| `tour.openDemo` | Abrir a demonstração de Sorriso para este passo | Open the Sorriso demo for this step | Abrir la demostración de Sorriso para este paso | Ouvrir la démonstration de Sorriso pour cette étape | Sorriso-Demo für diesen Schritt öffnen |
| `tour.backTo` | Voltar para {lugar} | Back to {lugar} | Volver a {lugar} | Revenir à {lugar} | Zurück zu {lugar} |
| `tour.storageNote` | O progresso dos tutoriais fica neste navegador. | Tutorial progress is kept in this browser. | El progreso de los tutoriales queda en este navegador. | La progression des tutoriels reste dans ce navigateur. | Der Tutorial-Fortschritt bleibt in diesem Browser. |

## 8. Quando falta dado

| Situação | Comportamento do passo |
|---|---|
| Tela em erro (API fora) | Passos que dependem do dado mostram o texto sem destaque e acrescentam "Os dados não carregaram agora; tente de novo depois" |
| Sem análise para o lugar | Passo explica o estado; oferece abrir a demonstração como ação explícita |
| Sem WebGL | `explore.2` aponta para a lista; `sim.*` apontam para o campo 2D |
| Formulário fechado | Passos de formulário são pulados e contados como pulados, não concluídos |
| Sem conta | Passos de conta conectada são pulados |

## 9. Revisão linguística pendente

Todos os textos en, es, fr e de deste documento. Prioridade: `sim.5`, `fs.4`, `municipality.3`, `municipality.4`, `acc.3`, `farm.1`, `overview.2`, que carregam limitação científica ou de privacidade.
