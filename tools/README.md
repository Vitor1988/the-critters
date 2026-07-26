# bancada da fala

Ferramentas de desenvolvimento. **Não entram no container** — o `Dockerfile` copia
ficheiros por nome, portanto esta pasta fica de fora por construção, não por um
`.dockerignore` que alguém se possa esquecer de manter.

Existem por uma razão concreta: duas alterações ao rig da boca passaram na simulação
sintética e prenderam a boca na cara real (ver *Cicatrizes* no `README.md` da raiz). A
bancada mede em **vídeo de pessoas mesmo a falar**, contra o áudio delas. Não substitui o
A/B ao vivo — serve para rejeitar más ideias em minutos, para que só chegue à câmara o que
já sobreviveu a alguma coisa.

## O que é cada peça

| Ficheiro | Papel |
|---|---|
| `fetch-datasets.sh` | traz os 16 clips do RAVDESS (Zenodo 1188976, actores 01 e 02) e normaliza-os com ffmpeg |
| `capture.py` | vídeo → trace JSON pelo MediaPipe (o **mesmo** modelo e opções da CDN de produção) |
| `replay.js` | replay de um trace pela cadeia real do `engine.js` (sem cópia: carrega o ficheiro de produção) |
| `metrics.js` | métricas da timeline contra o envelope do áudio: `r`, `lag`, alcance, jitter, fecho |
| `regress.js` | goldens numéricos (v1/v2 bit a bit) + asserções da v3 |
| `gridsearch.js` | afinação do `RIG_V3`: grelha de 324 + descida por coordenadas, com guardas duros |
| `tabela.js` | o relatório: tabela por clip e médias, separadas em treino e holdout |
| `verify-bancada.js` | verifica a **bancada**, não o rig: determinismo, sanidade da métrica, sensibilidade à calibração |
| `lib/guardas.js` | as poses sintéticas e as asserções — partilhadas pelo regress e pelo grid, de propósito |
| `lib/clips.js` | a divisão treino/holdout, num sítio só, para o grid não lhe poder tocar por distracção |
| `_parity.html` + `parity-server.js` | paridade Python↔browser do tracker num clip |
| `_enginetest.html` | o engine corrido num browser: apanha o que o node não apanha |

`clips/`, `traces/`, `out/` e `models/` estão no `.gitignore` — são grandes e
reconstrutíveis. Os números que interessam vivem no `README.md` da raiz, não em JSON.

## Correr

Preparar os dados (uma vez; o `capture.py` é o passo lento):

```bash
cd tools
./fetch-datasets.sh                              # ~1.1 GB do Zenodo -> clips/
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python capture.py                      # clips/ -> traces/
.venv/bin/python capture.py <clip> --frames 30   # um só, para testar o ambiente
node verify-bancada.js --com-v3                  # a bancada vale alguma coisa?
```

Medir:

```bash
node regress.js                          # goldens + asserções da v3   <- correr sempre
node tabela.js v1 v2 v3 --out final      # a tabela + out/final.json
node tabela.js --hz 30 v1 v3             # à cadência do mobile
node replay.js <clip> --modo v3          # um clip, para ir ver o que se passa nele
node gridsearch.js                       # afinação do RIG_V3 (--rapido: grelha grossa)
```

O `gridsearch.js` **não escreve no `engine.js`**: grava a vencedora em
`out/gridsearch.json` e os valores copiam-se à mão para o `RIG_V3`. É de propósito — uma
alteração à cadeia da boca passa sempre por alguém a olhar para ela.

Armadilha conhecida no WSL: `mediapipe` puxa `opencv-python`, que precisa de `libGL.so.1`.
O `requirements.txt` fixa a variante `-headless` justamente por isso.

**Antes de qualquer commit que toque na cadeia da boca**: `node regress.js`. Ele compara
com `goldens.json` bit a bit — se a v1 ou a v2 mudarem um dígito, o toggle não era neutro
e a alteração está errada, seja o que for que as métricas digam.

## Guião do A/B ao vivo

A bancada não decide. Isto decide.

No **studio**, painel `sensibilidade`: o select `fala` comuta `v1` ↔ `v3` ao vivo, sem
recarregar. Tecla `d` liga a linha de debug — na v3 mostra `V3`, `ap` (abertura crua,
antes da oclusão) e `oc` (oclusão). É o par que separa sinal de pose: **se a boca não abre
com o `ap` alto, quem a está a fechar é a oclusão**, e isso é um parâmetro, não um bug do
tracker.

Alternar v1↔v3 **a meio de cada exercício**, não entre exercícios — a memória para
diferenças pequenas é curta.

- **(a) fala corrida, 20 s.** Falar normal, do que calhar. A boca acompanha ou vai atrás?
- **(b) bilabiais.** "um bom pombo bebe", "pá-pé-pó". **Tem de fechar** em cada M/B/P. Se
  não fechar, ver o `oc` — se ele sobe e a boca não fecha, é ganho a menos; se não sobe, o
  tracker não está a dar o sinal.
- **(c) vogais sustentadas.** "aaaaa", "ooooo", 5 s cada. A boca fica parada ou treme?
- **(d) fala baixinha**, quase a murmurar — com a checkbox `auto range` desligada e depois
  ligada. É o único exercício em que o auto range pode ganhar; na bancada perde em 11 dos
  12 clips, portanto se não ganhar claramente aqui, fica desligado para sempre.
- **(e) falar a sorrir.** O "eee" continua a ler-se, mas o sorriso não pode roubar altura
  às vogais nem manter a boca aberta.
- **(f) silêncio, 10 s.** Cara parada, boca fechada. Zero flicker — nem um tremor.

Reportar em palavras, não em números: **boca presa** (abre menos do que devia), **atraso**,
**tremor**, **aberturas fantasma** (abre sem ninguém falar). Em qual dos exercícios, e em
qual das versões.

Se a v3 ganhar: promove-se a omissão numa alteração separada, e o select fica para trás.
Se perder, ou empatar, fica onde está — atrás do select. Empate não promove.

Depois disto: 3-5 clips do próprio utilizador a falar português (30-60 s, luz normal, à
distância a que usa isto de verdade) entram em `clips/user/` e ficam **holdout
permanente** — nunca entram em nenhum grid-search. É o que falta à bancada, e sabe-se.
