# Desempenho do talhão ilustrativo — antes e depois

Medido em 15/11/2026 com `apps/web/scripts/perf-field.mjs` (Playwright + Chrome), servidor de desenvolvimento do Vite
(React em modo de desenvolvimento, sem minificação). "Antes" é o commit `2278246` (cones e icosaedros); "depois" é este ramo.

**Ressalva da máquina:** uma única máquina de mesa, com ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Ti (0x00002782) Direct3D11 vs_5_0 ps_5_0, D3D11). É uma placa forte: os tempos de quadro com GPU
ficam muito abaixo de qualquer meta e não dizem como um notebook ou um celular se comportam. O "celular" abaixo é só o
viewport 390×844 nesta mesma máquina, não um aparelho. Não houve medição em dispositivo móvel real.

**Como ler:** a cena desenha sob demanda. "Quadro em órbita" é o intervalo entre quadros girando a câmera um passo
por quadro. "Passo de um dia" é o tempo entre acionar "Avançar 1 dia" e o segundo quadro seguinte: inclui a
atualização da página inteira (gráfico, painel), não só a cena; "pose nova" constrói a geometria da planta pela
primeira vez, "pose em cache" reutiliza. A vista de perto ("detail") não existia antes: a coluna "antes" repete o
caso do talhão.

### GPU da máquina (Chrome com janela, vsync desligado)

| Caso | Viewport | Triângulos antes → depois | Chamadas de desenho | Quadro em órbita p50 / p95 (ms) antes → depois | Passo de um dia, pose nova p50 / p95 (ms) antes → depois | Passo de um dia, pose em cache p50 / p95 (ms) |
| --- | --- | ---: | ---: | --- | --- | --- |
| soy reproductive (field) | desktop 1440x900 | 55.092 → 346.968 | 4 → 9 | 0.7 / 0.9 → 0.7 / 0.9 | 20.1 / 29 → 23.9 / 30.5 | 21.9 / 25.8 |
| maize reproductive (field) | desktop 1440x900 | 55.092 → 137.064 | 4 → 9 | 0.6 / 0.9 → 0.7 / 1 | 19 / 28.5 → 21.3 / 31.2 | 16.1 / 19.2 |
| maize + brachiaria (field) | desktop 1440x900 | 55.092 → 195.828 | 4 → 15 | 0.7 / 0.9 → 0.7 / 1 | 19.7 / 31.3 → 22.4 / 30.7 | 17.2 / 20 |
| soy reproductive (detail) | desktop 1440x900 | 55.092 → 346.968 | 4 → 9 | 0.7 / 0.9 → 0.5 / 0.8 | 20.1 / 29 → 21 / 29.1 | 19.1 / 23.3 |
| maize + brachiaria (detail) | desktop 1440x900 | 55.092 → 195.828 | 4 → 15 | 0.7 / 0.9 → 0.6 / 1.3 | 19.7 / 31.3 → 20.6 / 26.9 | 17.8 / 21.3 |
| soy reproductive (field) | phone 390x844 dpr2 | 55.092 → 163.920 | 4 → 9 | 0.6 / 0.9 → 0.6 / 0.8 | 17.7 / 27.7 → 23.8 / 32.9 | 18.3 / 21.4 |
| maize reproductive (field) | phone 390x844 dpr2 | 55.092 → 78.152 | 4 → 9 | 0.6 / 0.8 → 0.7 / 1.6 | 18.1 / 27.9 → 20.8 / 30.5 | 16.9 / 20.1 |
| maize + brachiaria (field) | phone 390x844 dpr2 | 55.092 → 114.824 | 4 → 15 | 0.6 / 0.8 → 0.6 / 0.9 | 18.3 / 27.6 → 20.9 / 30.3 | 15.9 / 18.1 |
| soy reproductive (detail) | phone 390x844 dpr2 | 55.092 → 163.920 | 4 → 9 | 0.6 / 0.9 → 0.4 / 0.6 | 17.7 / 27.7 → 19.2 / 40.9 | 17.6 / 21.3 |
| maize + brachiaria (detail) | phone 390x844 dpr2 | 55.092 → 114.824 | 4 → 15 | 0.6 / 0.8 → 0.7 / 1 | 18.3 / 27.6 → 19.3 / 27.2 | 17 / 20.4 |

### Renderizador por software (SwiftShader, sem GPU: o pior caso; é o que a suíte e2e usa)

| Caso | Viewport | Triângulos antes → depois | Chamadas de desenho | Quadro em órbita p50 / p95 (ms) antes → depois | Passo de um dia, pose nova p50 / p95 (ms) antes → depois | Passo de um dia, pose em cache p50 / p95 (ms) |
| --- | --- | ---: | ---: | --- | --- | --- |
| soy reproductive (field) | desktop 1440x900 | 55.092 → 163.920 | 4 → 9 | 21.6 / 24 → 64.9 / 71.4 | 61.1 / 107.9 → 117.9 / 173.5 | 96.4 / 149.6 |
| maize reproductive (field) | desktop 1440x900 | 55.092 → 78.152 | 4 → 9 | 21.2 / 37 → 30.9 / 34.2 | 83 / 88.3 → 73.7 / 89.6 | 73.5 / 77.3 |
| maize + brachiaria (field) | desktop 1440x900 | 55.092 → 114.824 | 4 → 15 | 32.9 / 61.4 → 39.6 / 42.9 | 82.9 / 87.9 → 79.7 / 119.5 | 83.4 / 88.9 |
| soy reproductive (detail) | desktop 1440x900 | 55.092 → 163.920 | 4 → 9 | 21.6 / 24 → 50.2 / 55.6 | 61.1 / 107.9 → 88.1 / 107.5 | 82.8 / 88.1 |
| maize + brachiaria (detail) | desktop 1440x900 | 55.092 → 114.824 | 4 → 15 | 32.9 / 61.4 → 41.2 / 48 | 82.9 / 87.9 → 84.7 / 126.9 | 81 / 85.7 |
| soy reproductive (field) | phone 390x844 dpr2 | 55.092 → 163.920 | 4 → 9 | 33 / 36.3 → 40.8 / 44.6 | 52.5 / 86.8 → 66 / 97.8 | 63.6 / 76.7 |
| maize reproductive (field) | phone 390x844 dpr2 | 55.092 → 78.152 | 4 → 9 | 32.5 / 59 → 27.6 / 30.4 | 52.1 / 56.7 → 56.5 / 66.4 | 54.4 / 65.6 |
| maize + brachiaria (field) | phone 390x844 dpr2 | 55.092 → 114.824 | 4 → 15 | 32.5 / 61.9 → 35.9 / 72.1 | 50.8 / 57.7 → 67.9 / 81.5 | 67.1 / 74.5 |
| soy reproductive (detail) | phone 390x844 dpr2 | 55.092 → 163.920 | 4 → 9 | 33 / 36.3 → 47.2 / 70.7 | 52.5 / 86.8 → 80.6 / 99.3 | 71.8 / 79.9 |
| maize + brachiaria (detail) | phone 390x844 dpr2 | 55.092 → 114.824 | 4 → 15 | 32.5 / 61.9 → 48.8 / 63.5 | 50.8 / 57.7 → 77.9 / 100.4 | 64.6 / 86.3 |

## Orçamento do briefing (§8) e resultado

| Item | Meta do briefing | Medido |
| --- | --- | --- |
| Planta de detalhe | cerca de 1.500–4.000 triângulos | soja até 3.456, milho até 2.314, linha de cobertura da prancha (touceira, consórcio, palhada) até 1.188; poses da prancha, variante 0 |
| Planta no talhão | 300–900 | soja até 522, milho até 184 (abaixo da faixa: planta esguia), braquiária até 144 |
| Nível distante/celular | 80–250 | soja até 174, milho até 72, braquiária até 60 |
| Cena desktop | ≤ 500 mil triângulos, ≤ 35 chamadas | 137 mil a 347 mil; 9 a 15 chamadas |
| Cena celular | ≤ 180 mil, DPR ≤ 1,5 | 78 mil a 164 mil; DPR 1,5 |
| Repouso | sem laço contínuo | `frameloop="demand"` mantido |
| p95 em órbita, desktop | 16,7 ms | 0,8 a 1,3 ms nesta GPU; **não medido em hardware modesto** |
| p95 em órbita, celular | 33,3 ms | **não medido em aparelho real** |

O teste `rotation-plants.test.ts` recalcula o total da cena (14 plantas no nível de detalhe + 526 no nível do
talhão ou distante, com a cobertura) e falha se passar de 500 mil / 180 mil triângulos.

Sem GPU (renderizador por software) cada triângulo é pago na CPU. Por isso a cena detecta esse caso pelo nome do
renderizador e usa o nível distante em todo o talhão, como no celular (por isso a coluna "depois" da tabela de
software mostra 164 mil triângulos no desktop, e não 347 mil). Mesmo assim o quadro em órbita da soja ficou em
65 ms (p50) contra 22 ms antes: sem aceleração gráfica a cena nova é mais lenta que a antiga.

Os números com GPU foram colhidos antes do último ajuste de tamanho de folha nos níveis leves (mesma contagem de
triângulos); não foram repetidos depois dele.
