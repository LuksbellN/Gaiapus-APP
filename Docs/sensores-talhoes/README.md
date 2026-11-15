# Minha área — sensores e talhões · estado da entrega

Branch `feat/sensores-talhoes` (15/11/2026). Especificação: `handoff/gaiapus-sensores-regioes-spec.md` (workspace `ideias_nasa`).
Referências de hardware e firmware: `Documents/imagens_sensor/firmware.md` e `hardware.md`.

## 1. Onde foi implementado

A especificação apontava `gaiapus-web` como "provável" frontend. O frontend ativo é este repositório
(`apps/web/src/teammate`). Diferenças encontradas:

| Especificação | Neste repositório |
|---|---|
| "conta é local, sem autenticação de servidor" | Sessão Supabase (PKCE, e-mail confirmado) em `src/features/auth`; `store.session` só é preenchida por essa ponte. A API tem rotas privadas com bearer e RLS (`GET /v1/me` etc.). |
| "build de arquivo único" | Não existe aqui (`vite.config.ts` gera só o build web). Nada foi inventado; a verificação é do build web. |
| Bun | O repositório fixa pnpm 10.14 e o lockfile; foi usado pnpm, sem alterar o lockfile. |
| "hardware provisório em `Field3D.tsx`" | `Field3D.tsx` (vista Talhão) nunca desenhou equipamento. A estaca provisória ficava em `SoilProfile3D.tsx` (vista Perfil do solo) e no esquema 2D `Profile2D.tsx`. |

## 2. Real, demonstração e pendente

**Integração real**
- Identidade: a tela só abre com a sessão Supabase verificada. Sem sessão, mostra apenas o convite para entrar.
- Autorização no servidor: ao abrir, chama a rota privada `GET /v1/me` (bearer validado pela API, linhas próprias sob RLS). Resposta 401/403 fecha a tela sem mostrar dado; falha de rede é mostrada como "sessão não confirmada".
- Isolamento por conta no navegador: cada usuário tem seu próprio bucket (`gaiapus.v1.user.<id>`), trocado no login/logout.

**Demonstração rotulada (permanente na tela: "Demonstração local — sem dispositivo real conectado")**
- Talhões com contorno, estacas, instalações, ajustes e leituras ficam no bucket do navegador (`area/adapter.ts`, `demoSensors`).
- A posse da estaca não é validada: só o formato do código é conferido, e o código é descartado.
- Nenhuma leitura real chega. Existe um botão explícito que insere a leitura de exemplo do `firmware.md` §8.2, marcada como sintética.
- Ajustes ficam em "Guardado neste navegador — nada foi enviado à estaca". Nenhum temporizador avança o estado.
- Visitante sem conta pode abrir a demonstração por escolha explícita (`?demo=1`), com aviso de que não é autenticação.

**Pendente (servidor, firmware, contrato)**
1. Rotas e tabelas para propriedades, talhões, estacas, instalações e ajustes. Proposta em `supabase/proposals/20261115_sensors_plots.sql` (não é migration; testada só em contêiner local por `supabase/tests/sensors.proposal.test.mjs`). Faltam as rotas em `apps/api` e os contratos em `packages/contracts`.
2. Leituras: ingestão MQTT → banco, identidade da medição (`device_id-seq-profundidade` colide após reset ou estouro de `seq`), consulta por conta.
3. Publicação do comando retido com o estado desejado completo, por um serviço do backend; o navegador nunca fala com o broker.
4. Divergências de protocolo a resolver antes de ligar hardware: ACK de 6 bytes (firmware) × downlink de 2 bytes (`Docs/protocolo-dados.md`); bit 3 "carregando" só no firmware; TCXO × cristal.
5. Broker com autenticação e TLS; o rádio LoRa P2P atual não autentica pacotes. Login no app não corrige isso.
6. Calibração por sonda e perfil de solo validado (sem isso não há m³/m³ nem percentual).
7. Estado dos gateways (`radio_ok`, `wifi_rssi`, `uptime_s`) e regra de visibilidade de gateway comunitário.
8. Papel de "manutenção autorizada" para o LED manual; hoje é só um bloco separado na tela.
9. Trilha de auditoria para correção cadastral de ponto; transferência de estaca entre contas.
10. Mapa de fundo com imagem ou ruas: o fundo atual (MapLibre demotiles) só tem contornos de países.
11. Leitor de QR em navegadores sem `BarcodeDetector` (iOS Safari, desktop): hoje cai na digitação ou no link aberto pela câmera do sistema.

## 3. Modelo 3D da estaca

Arquivo fornecido: `gaiapus-stake-revG-assembly.glb` (não versionado, não alterado).

| | Original | Publicado (`apps/web/src/teammate/assets/gaiapus-stake-revG.glb`) |
|---|---|---|
| Tamanho | 93 004 744 bytes | 1 068 300 bytes |
| Triângulos | 3 056 748 | 184 373 |
| Nós / malhas / primitivas | 3 085 / 3 000 / 29 846 | 23 / 23 / 32 |
| Materiais | 86 | 32 (os dos elementos mantidos, com os mesmos valores); sem texturas |
| Unidades, eixo | metros, Y para cima | iguais |
| Caixa envolvente | 0,328 × 0,662 × 0,300 m (o 0,300 é a placa "soil line") | 0,235 × 0,662 × 0,112 m |

Ferramenta: glTF-Transform 4.5.1 + meshoptimizer 1.3.0, script `apps/web/scripts/optimize-stake-glb.mjs`.
Passos: remover `soil line` (a cena já tem solo), `head PCB`, `18650 LiFePO4` e `plunger` (dentro do case opaco);
`dedup`, `flatten`, `join`, `weld`, `simplify` (razão 0,06, erro 0,0006 da extensão de cada malha), `prune`;
compressão `EXT_meshopt_compression` nível médio. Nenhum nó foi escalado ou movido.

Medidas lidas do modelo: linha do solo em y = −0,074 m; ponta a 0,508 m abaixo do solo; antena a 0,154 m acima;
case 114 × 88 mm; tubo Ø 32 mm; placa-sonda de −0,054 a −0,504 m (eletrodos a 15 e 40 cm ficam dentro dela).

**Escala: real (1:1), sem exagero.** A cena do perfil é em metros, com régua de profundidade. Para a estaca ser
reconhecível sem ampliá-la, a cena ganhou um botão "Ver a estaca de perto" (preset de câmera).
O marcador anterior tinha 0,30 m acima do solo e 0,45 m abaixo; essas medidas não são as da revisão G.

Cenas: `SoilProfile3D` usa o modelo (o cilindro/esfera foi removido). `Profile2D` (sem WebGL) continua um esquema,
agora com as medidas da rev G. `Field3D` e `RootSystem3D` nunca desenharam equipamento e não foram alterados.

## 4. Evidências

`Docs/sensores-talhoes/evidencias/`: `simulacao-perfil-*-antes.png` e `-depois.png` (desktop, celular, zoom),
`simulacao-estaca-de-perto-*.png`, `minha-area-*.png` (acesso, sensor, talhão, edição, mapa no celular, gateways).
Geradas por `apps/web/scripts/shots-sensores.mjs`.
