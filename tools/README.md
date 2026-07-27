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
| `capture.py` | vídeo → trace JSON pelo MediaPipe (o **mesmo** modelo e opções da CDN de produção) + o áudio (envelope e bandas) |
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
python3 capture.py --so-audio                    # só o bloco `audio` dos traces que já existem
node verify-bancada.js --com-v3                  # a bancada vale alguma coisa?
```

O `--so-audio` recalcula o `envDb` e as `bandas` a partir dos clips e reescreve-os nos
traces **sem tocar nos landmarks** — e sem precisar do mediapipe (o `import` dele é
tardio de propósito, porque um espectro só precisa de numpy e do ffmpeg). É como as
bandas entraram em traces já capturados, e aborta se o envelope sair diferente do que lá
estava: um envelope diferente mudava todos os números da bancada por baixo.

Medir:

```bash
node regress.js                          # goldens + asserções da v3 e do áudio  <- sempre
node tabela.js v1 v2 v3 --out final      # a tabela + out/final.json
node tabela.js --hz 30 v1 v3             # à cadência do mobile
node replay.js <clip> --modo v3          # um clip, para ir ver o que se passa nele
node gridsearch.js                       # afinação do RIG_V3 (--rapido: grelha grossa)

node replay.js <clip> --modo v3 --audio 0.7 --ruido -55      # com o microfone simulado
node replay.js <clip> --modo v3 --visemes 0.7 --ruido -55    # com o espectro do microfone
```

### o microfone na bancada

`--audio <0..1>` injecta o `audio.envDb` do próprio trace no `processLandmarks` pelo mesmo
parâmetro que ao vivo traz o microfone, alinhado por timestamp. `--ruido <dB>` soma-lhe um
chão de sala — obrigatório para ter algum sentido, porque o RAVDESS é de estúdio e o
silêncio dele é *digital* (−120 dB, zeros exactos); sem chão, o gate automático nunca é
exercitado. −55 dB é um portátil típico.

**A regra que aqui se aplica é diferente das outras: o `r` e o `fecho` não valem.** Ambos
se medem contra o envelope, e um híbrido alimentado por esse envelope correlaciona-se com
ele por construção — o `r` sobe de 0.66 para 0.88 e não quer dizer nada. O que a bancada
pode dizer sobre o híbrido é só isto: o vale entre sílabas, o jitter, a amplitude, o gate
contra ruído, e se a oclusão do vídeo continua a ganhar. As asserções em `lib/guardas.js`
(`assercoesAudio`) são exactamente essas, e correm no `regress.js` como as da v3.

### o espectro na bancada (`--visemes`)

`--visemes <0..1>` injecta o `audio.bandas` do trace (7 log-energias a 100 Hz) no
`au.bandas`, exactamente pelo parâmetro que ao vivo traz a AnalyserNode. A derivação
— brilho, baseline por mediana, canais redondo/fenda — corre **dentro do engine**: a
bancada não tem uma cópia dela, tal como não tem uma cópia da cadeia da boca.

Três avisos sobre o que estes números valem:

- **um clip isolado não chega.** Em 4 segundos a baseline não assenta, e com a trava de
  arranque (~1.2 s de voz) um clip do RAVDESS não produz forma nenhuma. Os números do
  README saíram de correr os 16 clips **seguidos**, como um minuto de conversa.
- **não há verdade fonética aqui.** Mediu-se o contraste entre a frase que começa em
  "Kids" e a que começa em "Dogs" e deu **−0.06** — nada, e com o sinal trocado. O
  ataque de cada frase é uma plosiva e sem alinhamento forçado não se isola a vogal.
- **o que se pode provar** é o resto, e está em `assercoesVisemes`: a direcção (graves →
  O/U, agudos → E/I), que a forma **não escreve abertura** (`sig.mouth` bit a bit igual
  com a dose no máximo), o silêncio, o arranque e a vogal longa.

### a calibração de máximo na bancada

Simula-se passando `maxJaw`/`maxLip` no `sens` do `replay` — o "AAA" da pessoa é o p98
do queixo dos clips fortes de cada actor. Serviu para escolher as guardas (média
geométrica e o chão de 0.55×) com números em vez de intuição; a tabela está no
`README.md` da raiz. As asserções de contrato estão em `assercoesMaximo`: sem medição o
span é o fixo **bit a bit**, um curso largo contém a boca, um curto solta-a, uma medição
absurda fica presa pelas guardas e a bilabial continua a fechar.

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

## Guião do A/B do áudio

Independente do anterior: o slider `áudio (mistura mic)` funciona em qualquer das cadeias.
Pôr em **0.7**, aceitar o microfone (só é pedido quando o slider sai do zero), e comparar
**0 vs 0.7 vs 1** dentro de cada exercício. No debug (`d`) aparece `+A` e `au`, o nível
depois do gate.

- **(a) fala corrida, 20 s.** O exercício que decide. O ritmo fica mais colado às sílabas?
  Se ficar *atrasado*, é o release de 90 ms (`RIG_AUDIO.relMs`) e diz-se.
- **(b) "pá-pé-pó", "um bom pombo bebe".** Tem de continuar a fechar. Na bancada fecha ao
  nível do vídeo, mas é aqui que o veto da oclusão se vê ou não se vê.
- **(c) silêncio com o ruído de fundo da sala, 10 s.** Boca quieta, `au` a 0.00.
- **(d) falar baixinho.** Onde o tecto adaptativo devia ganhar ao vídeo sozinho.
- **(e) assobiar e bater palmas.** O assobio contínuo é um tom estacionário e **não deve**
  abrir a boca; as palmas são transientes com muita energia e **passam o gate** — espera
  uma abertura curta por palma. É a consequência de um detector de energia não saber o que
  é voz, não um defeito da implementação. Reportar o que de facto acontece.

Reportar em palavras: **atraso**, **tremor**, **aberturas fantasma**, **boca presa** — em
qual exercício e em que posição do slider.

## Guião de A/B dos visemes por áudio e da calibração de máximo

Os dois guiões completos estão no `README.md` da raiz, nas secções respectivas. Em duas
linhas, porque é o que se esquece:

- **`áudio nas vogais`** — "ooo/eee/aaa" alternados a 0 vs 0.7 (a forma tem de ficar
  nítida) e depois fala normal (não pode fazer caretas). No debug, `fo R.. S..`.
- **`calibrar máximo`** — calibrar, falar normal e baixinho, limpar, repetir. No debug,
  ` · span 0.31/0.07`. A direcção do efeito depende do curso da boca de quem calibra:
  não há um "melhor" à partida.

Depois disto: 3-5 clips do próprio utilizador a falar português (30-60 s, luz normal, à
distância a que usa isto de verdade) entram em `clips/user/` e ficam **holdout
permanente** — nunca entram em nenhum grid-search. É o que falta à bancada, e sabe-se.
